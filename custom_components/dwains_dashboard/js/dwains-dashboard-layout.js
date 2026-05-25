// Tiny preload script for Dwains Dashboard.
//
// It defines ONLY the `dwains-dashboard-layout` VIEW LAYOUT element, as a
// standalone custom element with no dependencies, so it loads/executes almost
// instantly. The main ~600KB bundle loads async; if HA renders the dwains view
// before that bundle is ready, the view's layout element would be undefined and
// HA shows "Configuration error" for the whole view (HA auto-recovers undefined
// *cards* via whenDefined, but NOT view layouts). By defining the layout here in
// a tiny file that wins the load race, the view always has a valid layout, and
// `homepage-card`/`devices-card` (ordinary cards in the big bundle) auto-recover
// if they're briefly late.
//
// The big bundle's own define is guarded by `if(!customElements.get(...))`, so
// it becomes a no-op once this script has defined the element.
(function () {
  "use strict";
  if (!window.customElements || customElements.get("dwains-dashboard-layout")) {
    return;
  }
  class DwainsDashboardLayout extends HTMLElement {
    constructor() {
      super();
      const sr = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent =
        '#dwains_dashboard{margin:0 auto;font-family:"Open Sans",sans-serif;padding-top:10px;padding-bottom:50px}' +
        "@media only screen and (max-width:768px),only screen and (max-width:1800px) and (hover:none){" +
        "#dwains_dashboard{padding-top:1px;margin-top:-55px}}";
      sr.appendChild(style);
      this._wrap = document.createElement("div");
      this._wrap.id = "dwains_dashboard";
      sr.appendChild(this._wrap);
    }
    // Lovelace view-layout contract:
    setConfig(config) {
      this._config = config;
    }
    set hass(h) {
      this._hass = h;
      if (this._cards) {
        for (const c of this._cards) {
          if (c && "hass" in c) {
            try { c.hass = h; } catch (e) {}
          }
        }
      }
    }
    get hass() { return this._hass; }
    set narrow(n) { this._narrow = n; }
    get narrow() { return this._narrow; }
    set cards(cards) {
      this._cards = cards;
      this._render();
    }
    get cards() { return this._cards; }
    // No-ops in case HA calls LitElement-style APIs on the layout:
    requestUpdate() {}
    get updateComplete() { return Promise.resolve(true); }
    _render() {
      if (!this._wrap) return;
      this._wrap.textContent = "";
      if (this._cards) {
        for (const c of this._cards) {
          if (c) this._wrap.appendChild(c);
        }
      }
    }
  }
  try {
    customElements.define("dwains-dashboard-layout", DwainsDashboardLayout);
    console.info("[dwains-preload] dwains-dashboard-layout defined");
  } catch (e) {}

  // --- Self-heal errored dwains views ---------------------------------------
  // HA renders a view's custom *layout* element exactly once. The big bundle
  // (and even this preload) load asynchronously via add_extra_js_url, so on a
  // warm hard-reload HA often renders the dwains view BEFORE the layout element
  // is defined -> the whole view becomes a permanent "Configuration error". HA
  // retries undefined *cards* (whenDefined -> ll-rebuild) but NOT undefined view
  // *layouts*, so the error sticks even though the layout IS defined moments
  // later. The backend config is fine (verified: lovelace/config returns OK), so
  // all we need is to make HA rebuild the view now that the layout exists.
  //
  // We watch for hui-error-card on /dwains-dashboard and, when found, (1) fire
  // the same `ll-rebuild` event HA uses internally for card recovery, and (2)
  // force hui-root to re-create the active view via `_selectView(idx, true)`.
  // Both are no-ops if there's nothing to fix. Throttled, time-boxed, no reload.
  (function selfHeal() {
    function deep(root, tag, out, depth) {
      if (!root || depth > 14) return out;
      var nodes;
      try { nodes = root.querySelectorAll("*"); } catch (e) { return out; }
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.localName === tag) out.push(n);
        if (n.shadowRoot) deep(n.shadowRoot, tag, out, depth + 1);
      }
      return out;
    }
    function huiRoot() {
      try {
        var e = document.querySelector("home-assistant");
        e = e && e.shadowRoot && e.shadowRoot.querySelector("home-assistant-main");
        e = e && e.shadowRoot;
        var ppr = e && e.querySelector("ha-drawer partial-panel-resolver");
        e = (ppr && ppr.shadowRoot) || e;
        e = e && e.querySelector("ha-panel-lovelace");
        e = e && e.shadowRoot && e.shadowRoot.querySelector("hui-root");
        return e || null;
      } catch (e) { return null; }
    }
    function onDwains() {
      try { return location.pathname.lastIndexOf("/dwains-dashboard", 0) === 0; }
      catch (e) { return false; }
    }
    // ROOT CAUSE: HA swaps window.customElements (scoped-custom-element-registry)
    // AFTER this preload's initial define, so our layout ends up on a registry HA
    // doesn't read -> diagnostic showed `customElements.get(...) === false` even
    // though we defined it. So keep (re)defining it on whatever registry is live
    // right now. A constructor can't be reused across registries, so each time we
    // define a fresh throwaway subclass (identical behaviour).
    function ensureLayoutDefined() {
      try {
        if (!customElements.get("dwains-dashboard-layout")) {
          customElements.define("dwains-dashboard-layout", class extends DwainsDashboardLayout {});
          console.warn("[dwains-preload] (re)defined layout on live registry");
        }
      } catch (e) {}
    }
    // Same registry problem, for the cards: the big bundle defines homepage-card /
    // devices-card / etc. but can land on a stale registry ("Custom element doesn't
    // exist: homepage-card"). It stashes every dwains class in window.__dd_ctors;
    // here we (re)define any that are missing on the LIVE registry. A constructor
    // can't be reused across registries, so define a throwaway subclass. Once
    // homepage-card exists on the live registry HA's own whenDefined->ll-rebuild
    // recovers the card automatically (the rebuild below is just a backstop).
    function ensureCardsDefined() {
      var ctors = window.__dd_ctors, n = 0;
      if (!ctors) return 0;
      for (var name in ctors) {
        try {
          if (ctors[name] && !customElements.get(name)) {
            customElements.define(name, class extends ctors[name] {});
            console.warn("[dwains-preload] (re)defined " + name + " on live registry");
            n++;
          }
        } catch (e) {}
      }
      return n;
    }
    // When we just (re)defined a card while a dwains popup/settings dialog is open,
    // its card was created against the stale registry ("setConfig is not a function")
    // -> re-make it now that the class exists on the live registry. card-tools-popup
    // builds its card in _makeCard() (also bound to the dialog's @ll-rebuild).
    function rebuildOpenPopups() {
      var pops = deep(document, "card-tools-popup", [], 0);
      for (var i = 0; i < pops.length; i++) {
        try {
          if (pops[i].open && typeof pops[i]._makeCard === "function") {
            pops[i]._makeCard();
            console.warn("[dwains-preload] re-made open popup card on live registry");
          }
        } catch (e) {}
      }
    }
    // Only real, configured, connected error cards -- not the empty placeholder
    // hui-error-cards that live unused inside some third-party cards' shadow DOM.
    // hui-error-card config can be {error: ...} OR {message: ...} ("Custom element
    // doesn't exist: ..."), so check both.
    function realErrorCards() {
      var all = deep(document, "hui-error-card", [], 0), out = [];
      for (var i = 0; i < all.length; i++) {
        var ec = all[i], cfg = ec._config || {};
        if (ec.isConnected && (cfg.error || cfg.message || cfg.origConfig || (ec.textContent || "").trim())) out.push(ec);
      }
      return out;
    }
    var tries = 0, lastAction = 0;
    function tick() {
      tries++;
      ensureLayoutDefined();
      if (ensureCardsDefined() > 0) rebuildOpenPopups();
      // The view-level config-error self-heal is only needed shortly after load;
      // the registry ensure above must run forever (settings/popup cards can be
      // defined lazily long after load, when their dialog is first opened).
      if (tries < 120 && onDwains()) {
        var errs = realErrorCards();
        if (errs.length && Date.now() - lastAction > 1200) {
          lastAction = Date.now();
          console.warn("[dwains-preload] heal: real errors=", errs.length,
            "| layout=", !!customElements.get("dwains-dashboard-layout"),
            "| homepage-card=", !!customElements.get("homepage-card"),
            "| firstError=", (errs[0]._config && (errs[0]._config.message || errs[0]._config.error)));
          for (var i = 0; i < errs.length; i++) {
            try { errs[i].dispatchEvent(new Event("ll-rebuild", { bubbles: true, composed: true })); } catch (e) {}
          }
          try {
            var hr = huiRoot();
            if (hr && typeof hr._selectView === "function") {
              var idx = hr._curView != null ? hr._curView : (hr.___curView != null ? hr.___curView : 0);
              hr._selectView(idx, true);
            }
          } catch (e) {}
        }
      }
      // Heartbeat forever: fast burst at first, then a cheap steady poll so a
      // lazily-defined settings/popup card still gets moved to the live registry.
      setTimeout(tick, tries < 15 ? 200 : (tries < 120 ? 600 : 1500));
    }
    tick();
  })();
})();
