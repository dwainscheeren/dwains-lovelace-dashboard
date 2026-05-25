/*! For license information please see dwains-dashboard.js.LICENSE.txt */
(function() {
  'use strict';
// === Dwains reliability patches (v20) ===
if (window.__dd_loaded_bundle__) { console.info('Dwains bundle already loaded; skipping second init'); }
else window.__dd_loaded_bundle__ = true;

// --- Recover from broken HA icon cache (IndexedDB) ---
// Known HA bug: "IDBDatabase.transaction: 'mdi-icon-store' is not a known
// object store name" leaves hass-icon-db without its object store, which blocks
// ALL mdi icons (area icons render blank, and a flood of these rejections can
// stall boot). Delete the broken DB so HA recreates it. NEVER create it if it's
// absent (an empty DB would itself trigger the bug).
(function(){
  function resetIconDb(){
    if (window.__dd_iconDbReset) return;
    window.__dd_iconDbReset = true;
    try { indexedDB.deleteDatabase('hass-icon-db'); } catch(_){}
  }
  // Reactive: if the rejection fires anyway, clear the DB for the next load.
  try {
    window.addEventListener('unhandledrejection', function(ev){
      try {
        var m = ev && ev.reason && (ev.reason.message || ('' + ev.reason));
        if (m && m.indexOf('mdi-icon-store') !== -1) resetIconDb();
      } catch(_){}
    });
  } catch(_){}
  // Proactive: at boot, if hass-icon-db exists but is missing its store, reset it.
  try {
    if (window.indexedDB && indexedDB.databases) {
      indexedDB.databases().then(function(list){
        if (!list || !list.some(function(d){ return d && d.name === 'hass-icon-db'; })) return;
        var req = indexedDB.open('hass-icon-db');
        req.onsuccess = function(){
          var broken = false;
          try { var db = req.result; broken = !db.objectStoreNames.contains('mdi-icon-store'); db.close(); }
          catch(_) { broken = true; }
          if (broken) resetIconDb();
        };
      }).catch(function(){});
    }
  } catch(_){}
})();

// --- Lazy-mount wrapper: only attaches a (pre-created) card element once it
// scrolls near the viewport, so chart-heavy areas don't fetch 20-30 histories
// at once. Once mounted it stays mounted (pairs with sticky areas: no re-fetch). ---
if (window.customElements && !customElements.get('dd-lazy-card')) {
  class DDLazyCard extends HTMLElement {
    set card(c){
      if (this.__c === c) return;
      this.__c = c;
      // If already mounted (e.g. _loadData rebuilt the cards on a disable/hide/sort
      // reload and re-bound a NEW card element), swap the child in place. Otherwise
      // it will mount when scrolled into view.
      if (this.__mounted) {
        try { while (this.firstChild) this.removeChild(this.firstChild); } catch(e){}
        if (c) this.appendChild(c);
      }
    }
    get card(){ return this.__c; }
    connectedCallback(){
      if (this.__mounted) return;
      this.style.display = 'block';
      if (!this.style.minHeight) this.style.minHeight = '48px';
      if (!this.__io && 'IntersectionObserver' in window) {
        this.__io = new IntersectionObserver((entries)=>{
          for (const en of entries){ if (en.isIntersecting){ this._mount(); break; } }
        }, { rootMargin: '400px 0px' });
      }
      if (this.__io) this.__io.observe(this); else this._mount();
    }
    disconnectedCallback(){ if (this.__io) this.__io.disconnect(); }
    _mount(){
      if (this.__mounted || !this.__c) return;
      this.__mounted = true;
      if (this.__io) this.__io.disconnect();
      this.style.minHeight = '';
      this.appendChild(this.__c);
    }
  }
  try { customElements.define('dd-lazy-card', DDLazyCard); } catch(e){}
}

// Robust hass getter to avoid a.mo() race
window.__dd_get_hass = function(){
  try {
    return (function(){var el=document.querySelector('home-assistant');return el&&el.hass?el.hass:undefined;})()
        || (function(){var el=document.querySelector('hc-main');return el&&el.hass?el.hass:undefined;})()
        || (function(){var el=document.querySelector('home-assistant');return el&&el.__hass?el.__hass:undefined;})()
        || window.hass
        || undefined;
  } catch(_) { return undefined; }
};

// Reliable loader for card helpers with retries/backoff
if (!window.__dd_wait_card_helpers) window.__dd_wait_card_helpers = async function(maxTries=20){
  for (let i=0;i<maxTries;i++){
    try{
      if (window.loadCardHelpers){
        const h = await window.loadCardHelpers();
        if (h && typeof h.createCardElement==='function') return h;
      }
    }catch(_){}
    await new Promise(r=>setTimeout(r, i<5?100:300));
  }
  throw new Error('Card helpers not loaded');
};

// Close parent ha-dropdown (HA 2026 menu behavior)
if (!window.__dd_close_parent_dropdown) window.__dd_close_parent_dropdown = function(ev){
  try{
    let dd = null;
    const p = ev && typeof ev.composedPath === 'function' ? ev.composedPath() : [];
    if (Array.isArray(p)) dd = p.find((el)=>el && el.localName==='ha-dropdown') || null;
    if (!dd && ev && ev.currentTarget && ev.currentTarget.closest) dd = ev.currentTarget.closest('ha-dropdown');
    if (!dd && ev && ev.target && ev.target.closest) dd = ev.target.closest('ha-dropdown');
    if (dd){
      if (typeof dd.close === 'function') dd.close();
      else if ('open' in dd) dd.open = false;
      else dd.removeAttribute('open');
    }
  }catch(_){}
};

// Intercept element registration to patch dwains-homepage-card at define-time

// Adapt card-mod applyToElement API across versions without touching call sites
try{
  customElements.whenDefined('card-mod').then(function(){
    try{
      var cm = window.cardMod;
      if(cm && typeof cm.applyToElement === 'function'){
        var orig = cm.applyToElement;
        if(!cm.__dd_wrapped){
          cm.applyToElement = function(){
            if (orig.length <= 3){
              // New API: (el, style, options)
              var el = arguments[0], style = arguments[1], opts = arguments[2] || {};
              return orig.call(cm, el, style, opts);
            } else {
              // Old API: (el, tag, style, options, path, recursive)
              return orig.apply(cm, arguments);
            }
          };
          cm.__dd_wrapped = true;
        }
      }
    }catch(e){}
  });
}catch(e){}

(function(){
  const __orig_define__ = customElements.define.bind(customElements);
  customElements.define = function(name, ctor, opts){
    if ((name === 'dwains-homepage-card' || name === 'homepage-card') && ctor && ctor.prototype && !ctor.prototype.__dd_defined_patched){
      try{
        const P = ctor.prototype;

        const __dd_set_hass_safe = (target,h)=>{ try{ if(target) target.hass=h; }catch(_){ } };
        const __dd_propagate = (self,h)=>{
          try{
            const kids=['card','badgesCard','roomsCard','favoritesCard','personsCard','houseInfoCard','devicesCard','areasCard','headerCard','footerCard','header','bodyCard','servicesCard','shortcutsCard','chipsCard'];
            for(const k of kids){ const v=self[k]; if(!v) continue; if(Array.isArray(v)){ for(const c of v){ __dd_set_hass_safe(c,h);} } else { __dd_set_hass_safe(v,h);} }
            // Sweep any arrays/objects on instance for {hass} or nested .card/.badgesCard
            for(const key of Object.keys(self)){
              const val=self[key];
              if(Array.isArray(val)){
                for(const item of val){ if(!item) continue; if('hass' in item) __dd_set_hass_safe(item,h); if(item.card) __dd_set_hass_safe(item.card,h); if(item.badgesCard) __dd_set_hass_safe(item.badgesCard,h); }
              } else if(val && typeof val==='object'){
                if('hass' in val) __dd_set_hass_safe(val,h);
                if(val.card) __dd_set_hass_safe(val.card,h);
                if(val.badgesCard) __dd_set_hass_safe(val.badgesCard,h);
              }
            }
          }catch(_){}
        };

        // Safe hass setter
        const desc = Object.getOwnPropertyDescriptor(P,'hass');
        const oldSet = desc && desc.set;
        Object.defineProperty(P,'hass',{ configurable:true, enumerable:true, set(h){
          try{ this._hass = h; }catch(_){}
          try{ __dd_propagate(this,h); }catch(_){}
          try{ oldSet && oldSet.call(this,h); }catch(_){}
        }});

        // Safe _update_hass
        const oldUpd = P._update_hass;
        P._update_hass = function(h){
          try{ this._hass = h; }catch(_){}
          try{ __dd_propagate(this,h); }catch(_){}
          try{ oldUpd && oldUpd.call(this,h); }catch(_){}
        };

        // Safe createCardElement2 waiting for helpers
        const oldC2 = P.createCardElement2;
        P.createCardElement2 = async function(cfg){
          const helpers = await (window.__dd_wait_card_helpers ? window.__dd_wait_card_helpers() : window.loadCardHelpers());
          let card;
          try{ card = await helpers.createCardElement(cfg); }
          catch(err){
            let fb=null; if(cfg){
              if(cfg.entity) fb={type:'entities',entities:[cfg.entity]};
              else if(Array.isArray(cfg.entities)&&cfg.entities.length) fb={type:'entities',entities:cfg.entities};
              else if(cfg.card&&(cfg.card.entity||(Array.isArray(cfg.card.entities)&&cfg.card.entities.length)))
                fb={type:'entities',entities:cfg.card.entities?cfg.card.entities:[cfg.card.entity]};
            }
            card = await helpers.createCardElement(fb||{type:'entities',entities:[]});
          }
          const ha = this._hass || (window.__dd_get_hass && window.__dd_get_hass());
          if (ha) try{ card.hass = ha; }catch(_){}
          return card;
        };

        ctor.prototype.__dd_defined_patched = true;
      }catch(e){ console.warn('dwains-homepage-card define-time patch failed', e); }
    }
    return __orig_define__(name, ctor, opts);
  };
})();

  
  if (typeof customElements !== 'undefined') {
    const originalDefine = customElements.define;
    // IMPORTANT: only guard Dwains' OWN elements against double-definition.
    // HA core and every other element must pass straight through to the native
    // define, untouched (no skip, no swallowed errors). HA's boot awaits
    // customElements.whenDefined() on core elements, so if this shim ever drops
    // or hides one of those registrations the app hangs forever on the logo.
    customElements.define = function(name, constructor, options) {
      var isDwains = (typeof name === 'string') && (name.indexOf('dwains-') === 0 || name === 'homepage-card');
      if (isDwains) {
        if (customElements.get(name)) return;
        try { return originalDefine.call(this, name, constructor, options); } catch (e) { console.error('[dwains] define failed:', name, e); }
        return;
      }
      return originalDefine.call(this, name, constructor, options);
    };
  }
  
  // Error handler: LOG everything, suppress NOTHING (diagnostics).
  window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('Illegal constructor')) {
      console.error('[dwains] Illegal constructor (NOT suppressed):', e.message, (e.filename||'') + ':' + (e.lineno||''));
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    try { console.error('[dwains] unhandledrejection:', (e.reason && (e.reason.message||e.reason)) || e); } catch(_){}
  });
  
  console.log('Custom elements workaround loaded');
})();
(()=>{var e={165:(e,t,i)=>{"use strict";i.d(t,{CZ3:()=>a,TdJ:()=>n,noC:()=>o});var a="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",n="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z",o="M19 13C19.7 13 20.37 13.13 21 13.35V9L15 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.9 21 5 21H13.35C13.13 20.37 13 19.7 13 19C13 15.69 15.69 13 19 13M14 4.5L19.5 10H14V4.5M23 18V20H20V23H18V20H15V18H18V15H20V18H23Z"},924:(e,t,i)=>{"use strict";i.d(t,{r:()=>n});var a=i(79);function n(e,t,i=null){if((e=new Event(e,{bubbles:!0,cancelable:!1,composed:!0})).detail=t||{},i)i.dispatchEvent(e);else{var n=(0,a._R)();n&&n.dispatchEvent(e)}}},79:(e,t,i)=>{"use strict";function a(){return document.querySelector("hc-main")?document.querySelector("hc-main").hass:document.querySelector("home-assistant")?document.querySelector("home-assistant").hass:void 0}function n(e){return document.querySelector("hc-main")?document.querySelector("hc-main").provideHass(e):document.querySelector("home-assistant")?document.querySelector("home-assistant").provideHass(e):void 0}function o(){var e=document.querySelector("hc-main");return e?(e=(e=(e=e&&e.shadowRoot)&&e.querySelector("hc-lovelace"))&&e.shadowRoot)&&e.querySelector("hui-view")||e.querySelector("hui-panel-view"):(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=document.querySelector("home-assistant"))&&e.shadowRoot)&&e.querySelector("home-assistant-main"))&&e.shadowRoot)&&e.querySelector("ha-drawer partial-panel-resolver")||e.querySelector("app-drawer-layout partial-panel-resolver"))&&e.shadowRoot||e)&&e.querySelector("ha-panel-lovelace"))&&e.shadowRoot)&&e.querySelector("hui-root"))&&e.shadowRoot)&&(e.querySelector("ha-app-layout")||e))&&e.querySelector("#view"))&&(e.querySelector("hui-view")||e.querySelector("hui-panel-view")||e.querySelector("hui-unused-entities")||e.firstElementChild)}async function s(){if(customElements.get("hui-view"))return!0;if(window.loadCardHelpers){try{await window.loadCardHelpers()}catch(c){}if(customElements.get("hui-view"))return!0}await customElements.whenDefined("partial-panel-resolver");const e=document.createElement("partial-panel-resolver");e.hass={panels:[{url_path:"tmp",component_name:"lovelace"}]};try{"function"==typeof e._updateRoutes?e._updateRoutes():(e.route={prefix:"",path:"/tmp"},await e.updateComplete)}catch(c){}try{await e.routerOptions.routes.tmp.load()}catch(c){}if(!customElements.get("ha-panel-lovelace"))return!1;const t=document.createElement("ha-panel-lovelace");return t.hass=a(),void 0===t.hass&&(await new Promise((e=>{window.addEventListener("connection-status",(t=>{console.log(t),e()}),{once:!0})})),t.hass=a()),t.panel={config:{mode:null}},t._fetchConfig(),!0}i.d(t,{N6:()=>s,_R:()=>o,mo:()=>a,zo:()=>n})},437:(e,t,i)=>{"use strict";async function a(e,t,i=!1){let a=e;"string"==typeof t&&(t=t.split(/(\$| )/)),""===t[t.length-1]&&t.pop();for(const[e,n]of t.entries())if(n.trim().length){if(!a)return null;a.localName&&a.localName.includes("-")&&await customElements.whenDefined(a.localName),a.updateComplete&&await a.updateComplete,a="$"===n?i&&e==t.length-1?[a.shadowRoot]:a.shadowRoot:i&&e==t.length-1?a.querySelectorAll(n):a.querySelector(n)}return a}async function n(e,t,i=!1,n=1e4){return Promise.race([a(e,t,i),new Promise(((e,t)=>setTimeout((()=>t(new Error("timeout"))),n)))]).catch((e=>{if(!e.message||"timeout"!==e.message)throw e;return null}))}i.d(t,{V:()=>n})},752:(e,t,i)=>{"use strict";i.d(t,{Q:()=>o});var a=i(924),n=i(437);async function o(e,t=!1){const i=document.querySelector("hc-main")||document.querySelector("home-assistant");(0,a.r)("hass-more-info",{entityId:e},i);const o=await(0,n.V)(i,"$ ha-more-info-dialog");return o&&(o.large=t),o}},153:(e,t,i)=>{"use strict";var a,n,o;function s(){return(s=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var i=arguments[t];for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(e[a]=i[a])}return e}).apply(this,arguments)}i.d(t,{QD:()=>r,mD:()=>l,oo:()=>d}),(o=a||(a={})).language="language",o.system="system",o.comma_decimal="comma_decimal",o.decimal_comma="decimal_comma",o.space_comma="space_comma",o.none="none",function(e){e.language="language",e.system="system",e.am_pm="12",e.twenty_four="24"}(n||(n={}));var r=function(e,t,i,a){void 0===a&&(a=!1),e._themes||(e._themes={});var n=t.default_theme;("default"===i||i&&t.themes[i])&&(n=i);var o=s({},e._themes);if("default"!==n){var r=t.themes[n];Object.keys(r).forEach((function(t){var i="--"+t;e._themes[i]="",o[i]=r[t]}))}if(e.updateStyles?e.updateStyles(o):window.ShadyCSS&&window.ShadyCSS.styleSubtree(e,o),a){var l=document.querySelector("meta[name=theme-color]");if(l){l.hasAttribute("default-content")||l.setAttribute("default-content",l.getAttribute("content"));var d=o["--primary-color"]||l.getAttribute("default-content");l.setAttribute("content",d)}}};function l(e){return e.substr(0,e.indexOf("."))}new Set(["fan","input_boolean","light","switch","group","automation"]);new Set(["call-service","divider","section","weblink","cast","select"]);var d=function(e,t,i){void 0===i&&(i=!1),i?history.replaceState(null,"",t):history.pushState(null,"",t),function(e,t,i,a){a=a||{},i=null==i?{}:i;var n=new Event(t,{bubbles:void 0===a.bubbles||a.bubbles,cancelable:Boolean(a.cancelable),composed:void 0===a.composed||a.composed});n.detail=i,e.dispatchEvent(n)}(window,"location-changed",{replace:i})}},331:(e,t,i)=>{"use strict";function a(e,t){var i=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),i.push.apply(i,a)}return i}function n(e){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?a(Object(i),!0).forEach((function(t){s(e,t,i[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(i)):a(Object(i)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(i,t))}))}return e}function o(e){return o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},o(e)}function s(e,t,i){return t in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}function r(){return r=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var i=arguments[t];for(var a in i)Object.prototype.hasOwnProperty.call(i,a)&&(e[a]=i[a])}return e},r.apply(this,arguments)}function l(e,t){(null==t||t>e.length)&&(t=e.length);for(var i=0,a=new Array(t);i<t;i++)a[i]=e[i];return a}function d(e){if("undefined"!=typeof window&&window.navigator)return!!navigator.userAgent.match(e)}i.d(t,{A:()=>wt});var c=d(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),h=d(/Edge/i),p=d(/firefox/i),u=d(/safari/i)&&!d(/chrome/i)&&!d(/android/i),m=d(/iP(ad|od|hone)/i),g=d(/chrome/i)&&d(/android/i),f={capture:!1,passive:!1};function _(e,t,i){e.addEventListener(t,i,!c&&f)}function b(e,t,i){e.removeEventListener(t,i,!c&&f)}function v(e,t){if(t){if(">"===t[0]&&(t=t.substring(1)),e)try{if(e.matches)return e.matches(t);if(e.msMatchesSelector)return e.msMatchesSelector(t);if(e.webkitMatchesSelector)return e.webkitMatchesSelector(t)}catch(e){return!1}return!1}}function y(e){return e.host&&e!==document&&e.host.nodeType?e.host:e.parentNode}function w(e,t,i,a){if(e){i=i||document;do{if(null!=t&&(">"===t[0]?e.parentNode===i&&v(e,t):v(e,t))||a&&e===i)return e;if(e===i)break}while(e=y(e))}return null}var x,$=/\s+/g;function k(e,t,i){if(e&&t)if(e.classList)e.classList[i?"add":"remove"](t);else{var a=(" "+e.className+" ").replace($," ").replace(" "+t+" "," ");e.className=(a+(i?" "+t:"")).replace($," ")}}function C(e,t,i){var a=e&&e.style;if(a){if(void 0===i)return document.defaultView&&document.defaultView.getComputedStyle?i=document.defaultView.getComputedStyle(e,""):e.currentStyle&&(i=e.currentStyle),void 0===t?i:i[t];t in a||-1!==t.indexOf("webkit")||(t="-webkit-"+t),a[t]=i+("string"==typeof i?"":"px")}}function S(e,t){var i="";if("string"==typeof e)i=e;else do{var a=C(e,"transform");a&&"none"!==a&&(i=a+" "+i)}while(!t&&(e=e.parentNode));var n=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return n&&new n(i)}function E(e,t,i){if(e){var a=e.getElementsByTagName(t),n=0,o=a.length;if(i)for(;n<o;n++)i(a[n],n);return a}return[]}function A(){return document.scrollingElement||document.documentElement}function D(e,t,i,a,n){if(e.getBoundingClientRect||e===window){var o,s,r,l,d,h,p;if(e!==window&&e.parentNode&&e!==A()?(s=(o=e.getBoundingClientRect()).top,r=o.left,l=o.bottom,d=o.right,h=o.height,p=o.width):(s=0,r=0,l=window.innerHeight,d=window.innerWidth,h=window.innerHeight,p=window.innerWidth),(t||i)&&e!==window&&(n=n||e.parentNode,!c))do{if(n&&n.getBoundingClientRect&&("none"!==C(n,"transform")||i&&"static"!==C(n,"position"))){var u=n.getBoundingClientRect();s-=u.top+parseInt(C(n,"border-top-width")),r-=u.left+parseInt(C(n,"border-left-width")),l=s+o.height,d=r+o.width;break}}while(n=n.parentNode);if(a&&e!==window){var m=S(n||e),g=m&&m.a,f=m&&m.d;m&&(l=(s/=f)+(h/=f),d=(r/=g)+(p/=g))}return{top:s,left:r,bottom:l,right:d,width:p,height:h}}}function T(e,t,i){for(var a=B(e,!0),n=D(e)[t];a;){var o=D(a)[i];if(!("top"===i||"left"===i?n>=o:n<=o))return a;if(a===A())break;a=B(a,!1)}return!1}function z(e,t,i,a){for(var n=0,o=0,s=e.children;o<s.length;){if("none"!==s[o].style.display&&s[o]!==Ve.ghost&&(a||s[o]!==Ve.dragged)&&w(s[o],i.draggable,e,!1)){if(n===t)return s[o];n++}o++}return null}function M(e,t){for(var i=e.lastElementChild;i&&(i===Ve.ghost||"none"===C(i,"display")||t&&!v(i,t));)i=i.previousElementSibling;return i||null}function q(e,t){var i=0;if(!e||!e.parentNode)return-1;for(;e=e.previousElementSibling;)"TEMPLATE"===e.nodeName.toUpperCase()||e===Ve.clone||t&&!v(e,t)||i++;return i}function P(e){var t=0,i=0,a=A();if(e)do{var n=S(e),o=n.a,s=n.d;t+=e.scrollLeft*o,i+=e.scrollTop*s}while(e!==a&&(e=e.parentNode));return[t,i]}function B(e,t){if(!e||!e.getBoundingClientRect)return A();var i=e,a=!1;do{if(i.clientWidth<i.scrollWidth||i.clientHeight<i.scrollHeight){var n=C(i);if(i.clientWidth<i.scrollWidth&&("auto"==n.overflowX||"scroll"==n.overflowX)||i.clientHeight<i.scrollHeight&&("auto"==n.overflowY||"scroll"==n.overflowY)){if(!i.getBoundingClientRect||i===document.body)return A();if(a||t)return i;a=!0}}}while(i=i.parentNode);return A()}function j(e,t){return Math.round(e.top)===Math.round(t.top)&&Math.round(e.left)===Math.round(t.left)&&Math.round(e.height)===Math.round(t.height)&&Math.round(e.width)===Math.round(t.width)}function N(e,t){return function(){if(!x){var i=arguments;1===i.length?e.call(this,i[0]):e.apply(this,i),x=setTimeout((function(){x=void 0}),t)}}}function O(e,t,i){e.scrollLeft+=t,e.scrollTop+=i}function I(e){var t=window.Polymer,i=window.jQuery||window.Zepto;return t&&t.dom?t.dom(e).cloneNode(!0):i?i(e).clone(!0)[0]:e.cloneNode(!0)}function L(e,t){C(e,"position","absolute"),C(e,"top",t.top),C(e,"left",t.left),C(e,"width",t.width),C(e,"height",t.height)}function V(e){C(e,"position",""),C(e,"top",""),C(e,"left",""),C(e,"width",""),C(e,"height","")}function U(e,t,i){var a={};return Array.from(e.children).forEach((function(n){var o,s,r,l;if(w(n,t.draggable,e,!1)&&!n.animated&&n!==i){var d=D(n);a.left=Math.min(null!==(o=a.left)&&void 0!==o?o:1/0,d.left),a.top=Math.min(null!==(s=a.top)&&void 0!==s?s:1/0,d.top),a.right=Math.max(null!==(r=a.right)&&void 0!==r?r:-1/0,d.right),a.bottom=Math.max(null!==(l=a.bottom)&&void 0!==l?l:-1/0,d.bottom)}})),a.width=a.right-a.left,a.height=a.bottom-a.top,a.x=a.left,a.y=a.top,a}var R="Sortable"+(new Date).getTime();var H=[],G={initializeByDefault:!0},W={mount:function(e){for(var t in G)G.hasOwnProperty(t)&&!(t in e)&&(e[t]=G[t]);H.forEach((function(t){if(t.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")})),H.push(e)},pluginEvent:function(e,t,i){var a=this;this.eventCanceled=!1,i.cancel=function(){a.eventCanceled=!0};var o=e+"Global";H.forEach((function(a){t[a.pluginName]&&(t[a.pluginName][o]&&t[a.pluginName][o](n({sortable:t},i)),t.options[a.pluginName]&&t[a.pluginName][e]&&t[a.pluginName][e](n({sortable:t},i)))}))},initializePlugins:function(e,t,i,a){for(var n in H.forEach((function(a){var n=a.pluginName;if(e.options[n]||a.initializeByDefault){var o=new a(e,t,e.options);o.sortable=e,o.options=e.options,e[n]=o,r(i,o.defaults)}})),e.options)if(e.options.hasOwnProperty(n)){var o=this.modifyOption(e,n,e.options[n]);void 0!==o&&(e.options[n]=o)}},getEventProperties:function(e,t){var i={};return H.forEach((function(a){"function"==typeof a.eventProperties&&r(i,a.eventProperties.call(t[a.pluginName],e))})),i},modifyOption:function(e,t,i){var a;return H.forEach((function(n){e[n.pluginName]&&n.optionListeners&&"function"==typeof n.optionListeners[t]&&(a=n.optionListeners[t].call(e[n.pluginName],i))})),a}};function F(e){var t=e.sortable,i=e.rootEl,a=e.name,o=e.targetEl,s=e.cloneEl,r=e.toEl,l=e.fromEl,d=e.oldIndex,p=e.newIndex,u=e.oldDraggableIndex,m=e.newDraggableIndex,g=e.originalEvent,f=e.putSortable,_=e.extraEventProperties;if(t=t||i&&i[R]){var b,v=t.options,y="on"+a.charAt(0).toUpperCase()+a.substr(1);!window.CustomEvent||c||h?(b=document.createEvent("Event")).initEvent(a,!0,!0):b=new CustomEvent(a,{bubbles:!0,cancelable:!0}),b.to=r||i,b.from=l||i,b.item=o||i,b.clone=s,b.oldIndex=d,b.newIndex=p,b.oldDraggableIndex=u,b.newDraggableIndex=m,b.originalEvent=g,b.pullMode=f?f.lastPutMode:void 0;var w=n(n({},_),W.getEventProperties(a,t));for(var x in w)b[x]=w[x];i&&i.dispatchEvent(b),v[y]&&v[y].call(t,b)}}var X=["evt"],Y=function(e,t){var i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},a=i.evt,o=function(e,t){if(null==e)return{};var i,a,n=function(e,t){if(null==e)return{};var i,a,n={},o=Object.keys(e);for(a=0;a<o.length;a++)i=o[a],t.indexOf(i)>=0||(n[i]=e[i]);return n}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(a=0;a<o.length;a++)i=o[a],t.indexOf(i)>=0||Object.prototype.propertyIsEnumerable.call(e,i)&&(n[i]=e[i])}return n}(i,X);W.pluginEvent.bind(Ve)(e,t,n({dragEl:J,parentEl:Z,ghostEl:Q,rootEl:ee,nextEl:te,lastDownEl:ie,cloneEl:ae,cloneHidden:ne,dragStarted:_e,putSortable:ce,activeSortable:Ve.active,originalEvent:a,oldIndex:oe,oldDraggableIndex:re,newIndex:se,newDraggableIndex:le,hideGhostForTarget:Ne,unhideGhostForTarget:Oe,cloneNowHidden:function(){ne=!0},cloneNowShown:function(){ne=!1},dispatchSortableEvent:function(e){K({sortable:t,name:e,originalEvent:a})}},o))};function K(e){F(n({putSortable:ce,cloneEl:ae,targetEl:J,rootEl:ee,oldIndex:oe,oldDraggableIndex:re,newIndex:se,newDraggableIndex:le},e))}var J,Z,Q,ee,te,ie,ae,ne,oe,se,re,le,de,ce,he,pe,ue,me,ge,fe,_e,be,ve,ye,we,xe=!1,$e=!1,ke=[],Ce=!1,Se=!1,Ee=[],Ae=!1,De=[],Te="undefined"!=typeof document,ze=m,Me=h||c?"cssFloat":"float",qe=Te&&!g&&!m&&"draggable"in document.createElement("div"),Pe=function(){if(Te){if(c)return!1;var e=document.createElement("x");return e.style.cssText="pointer-events:auto","auto"===e.style.pointerEvents}}(),Be=function(e,t){var i=C(e),a=parseInt(i.width)-parseInt(i.paddingLeft)-parseInt(i.paddingRight)-parseInt(i.borderLeftWidth)-parseInt(i.borderRightWidth),n=z(e,0,t),o=z(e,1,t),s=n&&C(n),r=o&&C(o),l=s&&parseInt(s.marginLeft)+parseInt(s.marginRight)+D(n).width,d=r&&parseInt(r.marginLeft)+parseInt(r.marginRight)+D(o).width;if("flex"===i.display)return"column"===i.flexDirection||"column-reverse"===i.flexDirection?"vertical":"horizontal";if("grid"===i.display)return i.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(n&&s.float&&"none"!==s.float){var c="left"===s.float?"left":"right";return!o||"both"!==r.clear&&r.clear!==c?"horizontal":"vertical"}return n&&("block"===s.display||"flex"===s.display||"table"===s.display||"grid"===s.display||l>=a&&"none"===i[Me]||o&&"none"===i[Me]&&l+d>a)?"vertical":"horizontal"},je=function(e){function t(e,i){return function(a,n,o,s){var r=a.options.group.name&&n.options.group.name&&a.options.group.name===n.options.group.name;if(null==e&&(i||r))return!0;if(null==e||!1===e)return!1;if(i&&"clone"===e)return e;if("function"==typeof e)return t(e(a,n,o,s),i)(a,n,o,s);var l=(i?a:n).options.group.name;return!0===e||"string"==typeof e&&e===l||e.join&&e.indexOf(l)>-1}}var i={},a=e.group;a&&"object"==o(a)||(a={name:a}),i.name=a.name,i.checkPull=t(a.pull,!0),i.checkPut=t(a.put),i.revertClone=a.revertClone,e.group=i},Ne=function(){!Pe&&Q&&C(Q,"display","none")},Oe=function(){!Pe&&Q&&C(Q,"display","")};Te&&!g&&document.addEventListener("click",(function(e){if($e)return e.preventDefault(),e.stopPropagation&&window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation(),e.stopImmediatePropagation&&e.stopImmediatePropagation(),$e=!1,!1}),!0);var Ie=function(e){if(J){e=e.touches?e.touches[0]:e;var t=(n=e.clientX,o=e.clientY,ke.some((function(e){var t=e[R].options.emptyInsertThreshold;if(t&&!M(e)){var i=D(e),a=n>=i.left-t&&n<=i.right+t,r=o>=i.top-t&&o<=i.bottom+t;return a&&r?s=e:void 0}})),s);if(t){var i={};for(var a in e)e.hasOwnProperty(a)&&(i[a]=e[a]);i.target=i.rootEl=t,i.preventDefault=void 0,i.stopPropagation=void 0,t[R]._onDragOver(i)}}var n,o,s},Le=function(e){J&&J.parentNode[R]._isOutsideThisEl(e.target)};function Ve(e,t){if(!e||!e.nodeType||1!==e.nodeType)throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(e));this.el=e,this.options=t=r({},t),e[R]=this;var i,a,o={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(e.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return Be(e,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(e,t){e.setData("Text",t.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:!1!==Ve.supportPointer&&"PointerEvent"in window&&!u,emptyInsertThreshold:5};for(var s in W.initializePlugins(this,e,o),o)!(s in t)&&(t[s]=o[s]);for(var l in je(t),this)"_"===l.charAt(0)&&"function"==typeof this[l]&&(this[l]=this[l].bind(this));this.nativeDraggable=!t.forceFallback&&qe,this.nativeDraggable&&(this.options.touchStartThreshold=1),t.supportPointer?_(e,"pointerdown",this._onTapStart):(_(e,"mousedown",this._onTapStart),_(e,"touchstart",this._onTapStart)),this.nativeDraggable&&(_(e,"dragover",this),_(e,"dragenter",this)),ke.push(this.el),t.store&&t.store.get&&this.sort(t.store.get(this)||[]),r(this,(a=[],{captureAnimationState:function(){a=[],this.options.animation&&[].slice.call(this.el.children).forEach((function(e){if("none"!==C(e,"display")&&e!==Ve.ghost){a.push({target:e,rect:D(e)});var t=n({},a[a.length-1].rect);if(e.thisAnimationDuration){var i=S(e,!0);i&&(t.top-=i.f,t.left-=i.e)}e.fromRect=t}}))},addAnimationState:function(e){a.push(e)},removeAnimationState:function(e){a.splice(function(e,t){for(var i in e)if(e.hasOwnProperty(i))for(var a in t)if(t.hasOwnProperty(a)&&t[a]===e[i][a])return Number(i);return-1}(a,{target:e}),1)},animateAll:function(e){var t=this;if(!this.options.animation)return clearTimeout(i),void("function"==typeof e&&e());var n=!1,o=0;a.forEach((function(e){var i=0,a=e.target,s=a.fromRect,r=D(a),l=a.prevFromRect,d=a.prevToRect,c=e.rect,h=S(a,!0);h&&(r.top-=h.f,r.left-=h.e),a.toRect=r,a.thisAnimationDuration&&j(l,r)&&!j(s,r)&&(c.top-r.top)/(c.left-r.left)==(s.top-r.top)/(s.left-r.left)&&(i=function(e,t,i,a){return Math.sqrt(Math.pow(t.top-e.top,2)+Math.pow(t.left-e.left,2))/Math.sqrt(Math.pow(t.top-i.top,2)+Math.pow(t.left-i.left,2))*a.animation}(c,l,d,t.options)),j(r,s)||(a.prevFromRect=s,a.prevToRect=r,i||(i=t.options.animation),t.animate(a,c,r,i)),i&&(n=!0,o=Math.max(o,i),clearTimeout(a.animationResetTimer),a.animationResetTimer=setTimeout((function(){a.animationTime=0,a.prevFromRect=null,a.fromRect=null,a.prevToRect=null,a.thisAnimationDuration=null}),i),a.thisAnimationDuration=i)})),clearTimeout(i),n?i=setTimeout((function(){"function"==typeof e&&e()}),o):"function"==typeof e&&e(),a=[]},animate:function(e,t,i,a){if(a){C(e,"transition",""),C(e,"transform","");var n=S(this.el),o=n&&n.a,s=n&&n.d,r=(t.left-i.left)/(o||1),l=(t.top-i.top)/(s||1);e.animatingX=!!r,e.animatingY=!!l,C(e,"transform","translate3d("+r+"px,"+l+"px,0)"),this.forRepaintDummy=function(e){return e.offsetWidth}(e),C(e,"transition","transform "+a+"ms"+(this.options.easing?" "+this.options.easing:"")),C(e,"transform","translate3d(0,0,0)"),"number"==typeof e.animated&&clearTimeout(e.animated),e.animated=setTimeout((function(){C(e,"transition",""),C(e,"transform",""),e.animated=!1,e.animatingX=!1,e.animatingY=!1}),a)}}}))}function Ue(e,t,i,a,n,o,s,r){var l,d,p=e[R],u=p.options.onMove;return!window.CustomEvent||c||h?(l=document.createEvent("Event")).initEvent("move",!0,!0):l=new CustomEvent("move",{bubbles:!0,cancelable:!0}),l.to=t,l.from=e,l.dragged=i,l.draggedRect=a,l.related=n||t,l.relatedRect=o||D(t),l.willInsertAfter=r,l.originalEvent=s,e.dispatchEvent(l),u&&(d=u.call(p,l,s)),d}function Re(e){e.draggable=!1}function He(){Ae=!1}function Ge(e){for(var t=e.tagName+e.className+e.src+e.href+e.textContent,i=t.length,a=0;i--;)a+=t.charCodeAt(i);return a.toString(36)}function We(e){return setTimeout(e,0)}function Fe(e){return clearTimeout(e)}Ve.prototype={constructor:Ve,_isOutsideThisEl:function(e){this.el.contains(e)||e===this.el||(be=null)},_getDirection:function(e,t){return"function"==typeof this.options.direction?this.options.direction.call(this,e,t,J):this.options.direction},_onTapStart:function(e){if(e.cancelable){var t=this,i=this.el,a=this.options,n=a.preventOnFilter,o=e.type,s=e.touches&&e.touches[0]||e.pointerType&&"touch"===e.pointerType&&e,r=(s||e).target,l=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||r,d=a.filter;if(function(e){De.length=0;for(var t=e.getElementsByTagName("input"),i=t.length;i--;){var a=t[i];a.checked&&De.push(a)}}(i),!J&&!(/mousedown|pointerdown/.test(o)&&0!==e.button||a.disabled)&&!l.isContentEditable&&(this.nativeDraggable||!u||!r||"SELECT"!==r.tagName.toUpperCase())&&!((r=w(r,a.draggable,i,!1))&&r.animated||ie===r)){if(oe=q(r),re=q(r,a.draggable),"function"==typeof d){if(d.call(this,e,r,this))return K({sortable:t,rootEl:l,name:"filter",targetEl:r,toEl:i,fromEl:i}),Y("filter",t,{evt:e}),void(n&&e.cancelable&&e.preventDefault())}else if(d&&(d=d.split(",").some((function(a){if(a=w(l,a.trim(),i,!1))return K({sortable:t,rootEl:a,name:"filter",targetEl:r,fromEl:i,toEl:i}),Y("filter",t,{evt:e}),!0}))))return void(n&&e.cancelable&&e.preventDefault());a.handle&&!w(l,a.handle,i,!1)||this._prepareDragStart(e,s,r)}}},_prepareDragStart:function(e,t,i){var a,n=this,o=n.el,s=n.options,r=o.ownerDocument;if(i&&!J&&i.parentNode===o){var l=D(i);if(ee=o,Z=(J=i).parentNode,te=J.nextSibling,ie=i,de=s.group,Ve.dragged=J,he={target:J,clientX:(t||e).clientX,clientY:(t||e).clientY},ge=he.clientX-l.left,fe=he.clientY-l.top,this._lastX=(t||e).clientX,this._lastY=(t||e).clientY,J.style["will-change"]="all",a=function(){Y("delayEnded",n,{evt:e}),Ve.eventCanceled?n._onDrop():(n._disableDelayedDragEvents(),!p&&n.nativeDraggable&&(J.draggable=!0),n._triggerDragStart(e,t),K({sortable:n,name:"choose",originalEvent:e}),k(J,s.chosenClass,!0))},s.ignore.split(",").forEach((function(e){E(J,e.trim(),Re)})),_(r,"dragover",Ie),_(r,"mousemove",Ie),_(r,"touchmove",Ie),_(r,"mouseup",n._onDrop),_(r,"touchend",n._onDrop),_(r,"touchcancel",n._onDrop),p&&this.nativeDraggable&&(this.options.touchStartThreshold=4,J.draggable=!0),Y("delayStart",this,{evt:e}),!s.delay||s.delayOnTouchOnly&&!t||this.nativeDraggable&&(h||c))a();else{if(Ve.eventCanceled)return void this._onDrop();_(r,"mouseup",n._disableDelayedDrag),_(r,"touchend",n._disableDelayedDrag),_(r,"touchcancel",n._disableDelayedDrag),_(r,"mousemove",n._delayedDragTouchMoveHandler),_(r,"touchmove",n._delayedDragTouchMoveHandler),s.supportPointer&&_(r,"pointermove",n._delayedDragTouchMoveHandler),n._dragStartTimer=setTimeout(a,s.delay)}}},_delayedDragTouchMoveHandler:function(e){var t=e.touches?e.touches[0]:e;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){J&&Re(J),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var e=this.el.ownerDocument;b(e,"mouseup",this._disableDelayedDrag),b(e,"touchend",this._disableDelayedDrag),b(e,"touchcancel",this._disableDelayedDrag),b(e,"mousemove",this._delayedDragTouchMoveHandler),b(e,"touchmove",this._delayedDragTouchMoveHandler),b(e,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(e,t){t=t||"touch"==e.pointerType&&e,!this.nativeDraggable||t?this.options.supportPointer?_(document,"pointermove",this._onTouchMove):_(document,t?"touchmove":"mousemove",this._onTouchMove):(_(J,"dragend",this),_(ee,"dragstart",this._onDragStart));try{document.selection?We((function(){document.selection.empty()})):window.getSelection().removeAllRanges()}catch(e){}},_dragStarted:function(e,t){if(xe=!1,ee&&J){Y("dragStarted",this,{evt:t}),this.nativeDraggable&&_(document,"dragover",Le);var i=this.options;!e&&k(J,i.dragClass,!1),k(J,i.ghostClass,!0),Ve.active=this,e&&this._appendGhost(),K({sortable:this,name:"start",originalEvent:t})}else this._nulling()},_emulateDragOver:function(){if(pe){this._lastX=pe.clientX,this._lastY=pe.clientY,Ne();for(var e=document.elementFromPoint(pe.clientX,pe.clientY),t=e;e&&e.shadowRoot&&(e=e.shadowRoot.elementFromPoint(pe.clientX,pe.clientY))!==t;)t=e;if(J.parentNode[R]._isOutsideThisEl(e),t)do{if(t[R]&&t[R]._onDragOver({clientX:pe.clientX,clientY:pe.clientY,target:e,rootEl:t})&&!this.options.dragoverBubble)break;e=t}while(t=t.parentNode);Oe()}},_onTouchMove:function(e){if(he){var t=this.options,i=t.fallbackTolerance,a=t.fallbackOffset,n=e.touches?e.touches[0]:e,o=Q&&S(Q,!0),s=Q&&o&&o.a,r=Q&&o&&o.d,l=ze&&we&&P(we),d=(n.clientX-he.clientX+a.x)/(s||1)+(l?l[0]-Ee[0]:0)/(s||1),c=(n.clientY-he.clientY+a.y)/(r||1)+(l?l[1]-Ee[1]:0)/(r||1);if(!Ve.active&&!xe){if(i&&Math.max(Math.abs(n.clientX-this._lastX),Math.abs(n.clientY-this._lastY))<i)return;this._onDragStart(e,!0)}if(Q){o?(o.e+=d-(ue||0),o.f+=c-(me||0)):o={a:1,b:0,c:0,d:1,e:d,f:c};var h="matrix(".concat(o.a,",").concat(o.b,",").concat(o.c,",").concat(o.d,",").concat(o.e,",").concat(o.f,")");C(Q,"webkitTransform",h),C(Q,"mozTransform",h),C(Q,"msTransform",h),C(Q,"transform",h),ue=d,me=c,pe=n}e.cancelable&&e.preventDefault()}},_appendGhost:function(){if(!Q){var e=this.options.fallbackOnBody?document.body:ee,t=D(J,!0,ze,!0,e),i=this.options;if(ze){for(we=e;"static"===C(we,"position")&&"none"===C(we,"transform")&&we!==document;)we=we.parentNode;we!==document.body&&we!==document.documentElement?(we===document&&(we=A()),t.top+=we.scrollTop,t.left+=we.scrollLeft):we=A(),Ee=P(we)}k(Q=J.cloneNode(!0),i.ghostClass,!1),k(Q,i.fallbackClass,!0),k(Q,i.dragClass,!0),C(Q,"transition",""),C(Q,"transform",""),C(Q,"box-sizing","border-box"),C(Q,"margin",0),C(Q,"top",t.top),C(Q,"left",t.left),C(Q,"width",t.width),C(Q,"height",t.height),C(Q,"opacity","0.8"),C(Q,"position",ze?"absolute":"fixed"),C(Q,"zIndex","100000"),C(Q,"pointerEvents","none"),Ve.ghost=Q,e.appendChild(Q),C(Q,"transform-origin",ge/parseInt(Q.style.width)*100+"% "+fe/parseInt(Q.style.height)*100+"%")}},_onDragStart:function(e,t){var i=this,a=e.dataTransfer,n=i.options;Y("dragStart",this,{evt:e}),Ve.eventCanceled?this._onDrop():(Y("setupClone",this),Ve.eventCanceled||((ae=I(J)).removeAttribute("id"),ae.draggable=!1,ae.style["will-change"]="",this._hideClone(),k(ae,this.options.chosenClass,!1),Ve.clone=ae),i.cloneId=We((function(){Y("clone",i),Ve.eventCanceled||(i.options.removeCloneOnHide||ee.insertBefore(ae,J),i._hideClone(),K({sortable:i,name:"clone"}))})),!t&&k(J,n.dragClass,!0),t?($e=!0,i._loopId=setInterval(i._emulateDragOver,50)):(b(document,"mouseup",i._onDrop),b(document,"touchend",i._onDrop),b(document,"touchcancel",i._onDrop),a&&(a.effectAllowed="move",n.setData&&n.setData.call(i,a,J)),_(document,"drop",i),C(J,"transform","translateZ(0)")),xe=!0,i._dragStartId=We(i._dragStarted.bind(i,t,e)),_(document,"selectstart",i),_e=!0,u&&C(document.body,"user-select","none"))},_onDragOver:function(e){var t,i,a,o,s=this.el,r=e.target,l=this.options,d=l.group,c=Ve.active,h=de===d,p=l.sort,u=ce||c,m=this,g=!1;if(!Ae){if(void 0!==e.preventDefault&&e.cancelable&&e.preventDefault(),r=w(r,l.draggable,s,!0),I("dragOver"),Ve.eventCanceled)return g;if(J.contains(e.target)||r.animated&&r.animatingX&&r.animatingY||m._ignoreWhileAnimating===r)return V(!1);if($e=!1,c&&!l.disabled&&(h?p||(a=Z!==ee):ce===this||(this.lastPutMode=de.checkPull(this,c,J,e))&&d.checkPut(this,c,J,e))){if(o="vertical"===this._getDirection(e,r),t=D(J),I("dragOverValid"),Ve.eventCanceled)return g;if(a)return Z=ee,L(),this._hideClone(),I("revert"),Ve.eventCanceled||(te?ee.insertBefore(J,te):ee.appendChild(J)),V(!0);var f=M(s,l.draggable);if(!f||function(e,t,i){var a=D(M(i.el,i.options.draggable)),n=U(i.el,i.options,Q);return t?e.clientX>n.right+10||e.clientY>a.bottom&&e.clientX>a.left:e.clientY>n.bottom+10||e.clientX>a.right&&e.clientY>a.top}(e,o,this)&&!f.animated){if(f===J)return V(!1);if(f&&s===e.target&&(r=f),r&&(i=D(r)),!1!==Ue(ee,s,J,t,r,i,e,!!r))return L(),f&&f.nextSibling?s.insertBefore(J,f.nextSibling):s.appendChild(J),Z=s,H(),V(!0)}else if(f&&function(e,t,i){var a=D(z(i.el,0,i.options,!0)),n=U(i.el,i.options,Q);return t?e.clientX<n.left-10||e.clientY<a.top&&e.clientX<a.right:e.clientY<n.top-10||e.clientY<a.bottom&&e.clientX<a.left}(e,o,this)){var _=z(s,0,l,!0);if(_===J)return V(!1);if(i=D(r=_),!1!==Ue(ee,s,J,t,r,i,e,!1))return L(),s.insertBefore(J,_),Z=s,H(),V(!0)}else if(r.parentNode===s){i=D(r);var b,v,y,x=J.parentNode!==s,$=!function(e,t,i){var a=i?e.left:e.top,n=i?e.right:e.bottom,o=i?e.width:e.height,s=i?t.left:t.top,r=i?t.right:t.bottom,l=i?t.width:t.height;return a===s||n===r||a+o/2===s+l/2}(J.animated&&J.toRect||t,r.animated&&r.toRect||i,o),S=o?"top":"left",E=T(r,"top","top")||T(J,"top","top"),A=E?E.scrollTop:void 0;if(be!==r&&(v=i[S],Ce=!1,Se=!$&&l.invertSwap||x),b=function(e,t,i,a,n,o,s,r){var l=a?e.clientY:e.clientX,d=a?i.height:i.width,c=a?i.top:i.left,h=a?i.bottom:i.right,p=!1;if(!s)if(r&&ye<d*n){if(!Ce&&(1===ve?l>c+d*o/2:l<h-d*o/2)&&(Ce=!0),Ce)p=!0;else if(1===ve?l<c+ye:l>h-ye)return-ve}else if(l>c+d*(1-n)/2&&l<h-d*(1-n)/2)return function(e){return q(J)<q(e)?1:-1}(t);return(p=p||s)&&(l<c+d*o/2||l>h-d*o/2)?l>c+d/2?1:-1:0}(e,r,i,o,$?1:l.swapThreshold,null==l.invertedSwapThreshold?l.swapThreshold:l.invertedSwapThreshold,Se,be===r),0!==b){var P=q(J);do{P-=b,y=Z.children[P]}while(y&&("none"===C(y,"display")||y===Q))}if(0===b||y===r)return V(!1);be=r,ve=b;var B=r.nextElementSibling,j=!1,N=Ue(ee,s,J,t,r,i,e,j=1===b);if(!1!==N)return 1!==N&&-1!==N||(j=1===N),Ae=!0,setTimeout(He,30),L(),j&&!B?s.appendChild(J):r.parentNode.insertBefore(J,j?B:r),E&&O(E,0,A-E.scrollTop),Z=J.parentNode,void 0===v||Se||(ye=Math.abs(v-D(r)[S])),H(),V(!0)}if(s.contains(J))return V(!1)}return!1}function I(l,d){Y(l,m,n({evt:e,isOwner:h,axis:o?"vertical":"horizontal",revert:a,dragRect:t,targetRect:i,canSort:p,fromSortable:u,target:r,completed:V,onMove:function(i,a){return Ue(ee,s,J,t,i,D(i),e,a)},changed:H},d))}function L(){I("dragOverAnimationCapture"),m.captureAnimationState(),m!==u&&u.captureAnimationState()}function V(t){return I("dragOverCompleted",{insertion:t}),t&&(h?c._hideClone():c._showClone(m),m!==u&&(k(J,ce?ce.options.ghostClass:c.options.ghostClass,!1),k(J,l.ghostClass,!0)),ce!==m&&m!==Ve.active?ce=m:m===Ve.active&&ce&&(ce=null),u===m&&(m._ignoreWhileAnimating=r),m.animateAll((function(){I("dragOverAnimationComplete"),m._ignoreWhileAnimating=null})),m!==u&&(u.animateAll(),u._ignoreWhileAnimating=null)),(r===J&&!J.animated||r===s&&!r.animated)&&(be=null),l.dragoverBubble||e.rootEl||r===document||(J.parentNode[R]._isOutsideThisEl(e.target),!t&&Ie(e)),!l.dragoverBubble&&e.stopPropagation&&window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation(),g=!0}function H(){se=q(J),le=q(J,l.draggable),K({sortable:m,name:"change",toEl:s,newIndex:se,newDraggableIndex:le,originalEvent:e})}},_ignoreWhileAnimating:null,_offMoveEvents:function(){b(document,"mousemove",this._onTouchMove),b(document,"touchmove",this._onTouchMove),b(document,"pointermove",this._onTouchMove),b(document,"dragover",Ie),b(document,"mousemove",Ie),b(document,"touchmove",Ie)},_offUpEvents:function(){var e=this.el.ownerDocument;b(e,"mouseup",this._onDrop),b(e,"touchend",this._onDrop),b(e,"pointerup",this._onDrop),b(e,"touchcancel",this._onDrop),b(document,"selectstart",this)},_onDrop:function(e){var t=this.el,i=this.options;se=q(J),le=q(J,i.draggable),Y("drop",this,{evt:e}),Z=J&&J.parentNode,se=q(J),le=q(J,i.draggable),Ve.eventCanceled||(xe=!1,Se=!1,Ce=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),Fe(this.cloneId),Fe(this._dragStartId),this.nativeDraggable&&(b(document,"drop",this),b(t,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),u&&C(document.body,"user-select",""),C(J,"transform",""),e&&(_e&&(e.cancelable&&e.preventDefault(),!i.dropBubble&&e.stopPropagation()),Q&&Q.parentNode&&Q.parentNode.removeChild(Q),(ee===Z||ce&&"clone"!==ce.lastPutMode)&&ae&&ae.parentNode&&ae.parentNode.removeChild(ae),J&&(this.nativeDraggable&&b(J,"dragend",this),Re(J),J.style["will-change"]="",_e&&!xe&&k(J,ce?ce.options.ghostClass:this.options.ghostClass,!1),k(J,this.options.chosenClass,!1),K({sortable:this,name:"unchoose",toEl:Z,newIndex:null,newDraggableIndex:null,originalEvent:e}),ee!==Z?(se>=0&&(K({rootEl:Z,name:"add",toEl:Z,fromEl:ee,originalEvent:e}),K({sortable:this,name:"remove",toEl:Z,originalEvent:e}),K({rootEl:Z,name:"sort",toEl:Z,fromEl:ee,originalEvent:e}),K({sortable:this,name:"sort",toEl:Z,originalEvent:e})),ce&&ce.save()):se!==oe&&se>=0&&(K({sortable:this,name:"update",toEl:Z,originalEvent:e}),K({sortable:this,name:"sort",toEl:Z,originalEvent:e})),Ve.active&&(null!=se&&-1!==se||(se=oe,le=re),K({sortable:this,name:"end",toEl:Z,originalEvent:e}),this.save())))),this._nulling()},_nulling:function(){Y("nulling",this),ee=J=Z=Q=te=ae=ie=ne=he=pe=_e=se=le=oe=re=be=ve=ce=de=Ve.dragged=Ve.ghost=Ve.clone=Ve.active=null,De.forEach((function(e){e.checked=!0})),De.length=ue=me=0},handleEvent:function(e){switch(e.type){case"drop":case"dragend":this._onDrop(e);break;case"dragenter":case"dragover":J&&(this._onDragOver(e),function(e){e.dataTransfer&&(e.dataTransfer.dropEffect="move"),e.cancelable&&e.preventDefault()}(e));break;case"selectstart":e.preventDefault()}},toArray:function(){for(var e,t=[],i=this.el.children,a=0,n=i.length,o=this.options;a<n;a++)w(e=i[a],o.draggable,this.el,!1)&&t.push(e.getAttribute(o.dataIdAttr)||Ge(e));return t},sort:function(e,t){var i={},a=this.el;this.toArray().forEach((function(e,t){var n=a.children[t];w(n,this.options.draggable,a,!1)&&(i[e]=n)}),this),t&&this.captureAnimationState(),e.forEach((function(e){i[e]&&(a.removeChild(i[e]),a.appendChild(i[e]))})),t&&this.animateAll()},save:function(){var e=this.options.store;e&&e.set&&e.set(this)},closest:function(e,t){return w(e,t||this.options.draggable,this.el,!1)},option:function(e,t){var i=this.options;if(void 0===t)return i[e];var a=W.modifyOption(this,e,t);i[e]=void 0!==a?a:t,"group"===e&&je(i)},destroy:function(){Y("destroy",this);var e=this.el;e[R]=null,b(e,"mousedown",this._onTapStart),b(e,"touchstart",this._onTapStart),b(e,"pointerdown",this._onTapStart),this.nativeDraggable&&(b(e,"dragover",this),b(e,"dragenter",this)),Array.prototype.forEach.call(e.querySelectorAll("[draggable]"),(function(e){e.removeAttribute("draggable")})),this._onDrop(),this._disableDelayedDragEvents(),ke.splice(ke.indexOf(this.el),1),this.el=e=null},_hideClone:function(){if(!ne){if(Y("hideClone",this),Ve.eventCanceled)return;C(ae,"display","none"),this.options.removeCloneOnHide&&ae.parentNode&&ae.parentNode.removeChild(ae),ne=!0}},_showClone:function(e){if("clone"===e.lastPutMode){if(ne){if(Y("showClone",this),Ve.eventCanceled)return;J.parentNode!=ee||this.options.group.revertClone?te?ee.insertBefore(ae,te):ee.appendChild(ae):ee.insertBefore(ae,J),this.options.group.revertClone&&this.animate(J,ae),C(ae,"display",""),ne=!1}}else this._hideClone()}},Te&&_(document,"touchmove",(function(e){(Ve.active||xe)&&e.cancelable&&e.preventDefault()})),Ve.utils={on:_,off:b,css:C,find:E,is:function(e,t){return!!w(e,t,e,!1)},extend:function(e,t){if(e&&t)for(var i in t)t.hasOwnProperty(i)&&(e[i]=t[i]);return e},throttle:N,closest:w,toggleClass:k,clone:I,index:q,nextTick:We,cancelNextTick:Fe,detectDirection:Be,getChild:z},Ve.get=function(e){return e[R]},Ve.mount=function(){for(var e=arguments.length,t=new Array(e),i=0;i<e;i++)t[i]=arguments[i];t[0].constructor===Array&&(t=t[0]),t.forEach((function(e){if(!e.prototype||!e.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(e));e.utils&&(Ve.utils=n(n({},Ve.utils),e.utils)),W.mount(e)}))},Ve.create=function(e,t){return new Ve(e,t)},Ve.version="1.15.2";var Xe,Ye,Ke,Je,Ze,Qe,et=[],tt=!1;function it(){et.forEach((function(e){clearInterval(e.pid)})),et=[]}function at(){clearInterval(Qe)}var nt,ot=N((function(e,t,i,a){if(t.scroll){var n,o=(e.touches?e.touches[0]:e).clientX,s=(e.touches?e.touches[0]:e).clientY,r=t.scrollSensitivity,l=t.scrollSpeed,d=A(),c=!1;Ye!==i&&(Ye=i,it(),Xe=t.scroll,n=t.scrollFn,!0===Xe&&(Xe=B(i,!0)));var h=0,p=Xe;do{var u=p,m=D(u),g=m.top,f=m.bottom,_=m.left,b=m.right,v=m.width,y=m.height,w=void 0,x=void 0,$=u.scrollWidth,k=u.scrollHeight,S=C(u),E=u.scrollLeft,T=u.scrollTop;u===d?(w=v<$&&("auto"===S.overflowX||"scroll"===S.overflowX||"visible"===S.overflowX),x=y<k&&("auto"===S.overflowY||"scroll"===S.overflowY||"visible"===S.overflowY)):(w=v<$&&("auto"===S.overflowX||"scroll"===S.overflowX),x=y<k&&("auto"===S.overflowY||"scroll"===S.overflowY));var z=w&&(Math.abs(b-o)<=r&&E+v<$)-(Math.abs(_-o)<=r&&!!E),M=x&&(Math.abs(f-s)<=r&&T+y<k)-(Math.abs(g-s)<=r&&!!T);if(!et[h])for(var q=0;q<=h;q++)et[q]||(et[q]={});et[h].vx==z&&et[h].vy==M&&et[h].el===u||(et[h].el=u,et[h].vx=z,et[h].vy=M,clearInterval(et[h].pid),0==z&&0==M||(c=!0,et[h].pid=setInterval(function(){a&&0===this.layer&&Ve.active._onTouchMove(Ze);var t=et[this.layer].vy?et[this.layer].vy*l:0,i=et[this.layer].vx?et[this.layer].vx*l:0;"function"==typeof n&&"continue"!==n.call(Ve.dragged.parentNode[R],i,t,e,Ze,et[this.layer].el)||O(et[this.layer].el,i,t)}.bind({layer:h}),24))),h++}while(t.bubbleScroll&&p!==d&&(p=B(p,!1)));tt=c}}),30),st=function(e){var t=e.originalEvent,i=e.putSortable,a=e.dragEl,n=e.activeSortable,o=e.dispatchSortableEvent,s=e.hideGhostForTarget,r=e.unhideGhostForTarget;if(t){var l=i||n;s();var d=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:t,c=document.elementFromPoint(d.clientX,d.clientY);r(),l&&!l.el.contains(c)&&(o("spill"),this.onSpill({dragEl:a,putSortable:i}))}};function rt(){}function lt(){}rt.prototype={startIndex:null,dragStart:function(e){var t=e.oldDraggableIndex;this.startIndex=t},onSpill:function(e){var t=e.dragEl,i=e.putSortable;this.sortable.captureAnimationState(),i&&i.captureAnimationState();var a=z(this.sortable.el,this.startIndex,this.options);a?this.sortable.el.insertBefore(t,a):this.sortable.el.appendChild(t),this.sortable.animateAll(),i&&i.animateAll()},drop:st},r(rt,{pluginName:"revertOnSpill"}),lt.prototype={onSpill:function(e){var t=e.dragEl,i=e.putSortable||this.sortable;i.captureAnimationState(),t.parentNode&&t.parentNode.removeChild(t),i.animateAll()},drop:st},r(lt,{pluginName:"removeOnSpill"});var dt,ct,ht,pt,ut,mt=[],gt=[],ft=!1,_t=!1,bt=!1;function vt(e,t){gt.forEach((function(i,a){var n=t.children[i.sortableIndex+(e?Number(a):0)];n?t.insertBefore(i,n):t.appendChild(i)}))}function yt(){mt.forEach((function(e){e!==ht&&e.parentNode&&e.parentNode.removeChild(e)}))}Ve.mount(new function(){function e(){for(var e in this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0},this)"_"===e.charAt(0)&&"function"==typeof this[e]&&(this[e]=this[e].bind(this))}return e.prototype={dragStarted:function(e){var t=e.originalEvent;this.sortable.nativeDraggable?_(document,"dragover",this._handleAutoScroll):this.options.supportPointer?_(document,"pointermove",this._handleFallbackAutoScroll):t.touches?_(document,"touchmove",this._handleFallbackAutoScroll):_(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(e){var t=e.originalEvent;this.options.dragOverBubble||t.rootEl||this._handleAutoScroll(t)},drop:function(){this.sortable.nativeDraggable?b(document,"dragover",this._handleAutoScroll):(b(document,"pointermove",this._handleFallbackAutoScroll),b(document,"touchmove",this._handleFallbackAutoScroll),b(document,"mousemove",this._handleFallbackAutoScroll)),at(),it(),clearTimeout(x),x=void 0},nulling:function(){Ze=Ye=Xe=tt=Qe=Ke=Je=null,et.length=0},_handleFallbackAutoScroll:function(e){this._handleAutoScroll(e,!0)},_handleAutoScroll:function(e,t){var i=this,a=(e.touches?e.touches[0]:e).clientX,n=(e.touches?e.touches[0]:e).clientY,o=document.elementFromPoint(a,n);if(Ze=e,t||this.options.forceAutoScrollFallback||h||c||u){ot(e,this.options,o,t);var s=B(o,!0);!tt||Qe&&a===Ke&&n===Je||(Qe&&at(),Qe=setInterval((function(){var o=B(document.elementFromPoint(a,n),!0);o!==s&&(s=o,it()),ot(e,i.options,o,t)}),10),Ke=a,Je=n)}else{if(!this.options.bubbleScroll||B(o,!0)===A())return void it();ot(e,this.options,B(o,!1),!1)}}},r(e,{pluginName:"scroll",initializeByDefault:!0})}),Ve.mount(lt,rt),Ve.mount(new function(){function e(){this.defaults={swapClass:"sortable-swap-highlight"}}return e.prototype={dragStart:function(e){var t=e.dragEl;nt=t},dragOverValid:function(e){var t=e.completed,i=e.target,a=e.onMove,n=e.activeSortable,o=e.changed,s=e.cancel;if(n.options.swap){var r=this.sortable.el,l=this.options;if(i&&i!==r){var d=nt;!1!==a(i)?(k(i,l.swapClass,!0),nt=i):nt=null,d&&d!==nt&&k(d,l.swapClass,!1)}o(),t(!0),s()}},drop:function(e){var t,i,a,n,o,s,r=e.activeSortable,l=e.putSortable,d=e.dragEl,c=l||this.sortable,h=this.options;nt&&k(nt,h.swapClass,!1),nt&&(h.swap||l&&l.options.swap)&&d!==nt&&(c.captureAnimationState(),c!==r&&r.captureAnimationState(),i=nt,o=(t=d).parentNode,s=i.parentNode,o&&s&&!o.isEqualNode(i)&&!s.isEqualNode(t)&&(a=q(t),n=q(i),o.isEqualNode(s)&&a<n&&n++,o.insertBefore(i,o.children[a]),s.insertBefore(t,s.children[n])),c.animateAll(),c!==r&&r.animateAll())},nulling:function(){nt=null}},r(e,{pluginName:"swap",eventProperties:function(){return{swapItem:nt}}})}),Ve.mount(new function(){function e(e){for(var t in this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this));e.options.avoidImplicitDeselect||(e.options.supportPointer?_(document,"pointerup",this._deselectMultiDrag):(_(document,"mouseup",this._deselectMultiDrag),_(document,"touchend",this._deselectMultiDrag))),_(document,"keydown",this._checkKeyDown),_(document,"keyup",this._checkKeyUp),this.defaults={selectedClass:"sortable-selected",multiDragKey:null,avoidImplicitDeselect:!1,setData:function(t,i){var a="";mt.length&&ct===e?mt.forEach((function(e,t){a+=(t?", ":"")+e.textContent})):a=i.textContent,t.setData("Text",a)}}}return e.prototype={multiDragKeyDown:!1,isMultiDrag:!1,delayStartGlobal:function(e){var t=e.dragEl;ht=t},delayEnded:function(){this.isMultiDrag=~mt.indexOf(ht)},setupClone:function(e){var t=e.sortable,i=e.cancel;if(this.isMultiDrag){for(var a=0;a<mt.length;a++)gt.push(I(mt[a])),gt[a].sortableIndex=mt[a].sortableIndex,gt[a].draggable=!1,gt[a].style["will-change"]="",k(gt[a],this.options.selectedClass,!1),mt[a]===ht&&k(gt[a],this.options.chosenClass,!1);t._hideClone(),i()}},clone:function(e){var t=e.sortable,i=e.rootEl,a=e.dispatchSortableEvent,n=e.cancel;this.isMultiDrag&&(this.options.removeCloneOnHide||mt.length&&ct===t&&(vt(!0,i),a("clone"),n()))},showClone:function(e){var t=e.cloneNowShown,i=e.rootEl,a=e.cancel;this.isMultiDrag&&(vt(!1,i),gt.forEach((function(e){C(e,"display","")})),t(),ut=!1,a())},hideClone:function(e){var t=this,i=(e.sortable,e.cloneNowHidden),a=e.cancel;this.isMultiDrag&&(gt.forEach((function(e){C(e,"display","none"),t.options.removeCloneOnHide&&e.parentNode&&e.parentNode.removeChild(e)})),i(),ut=!0,a())},dragStartGlobal:function(e){e.sortable,!this.isMultiDrag&&ct&&ct.multiDrag._deselectMultiDrag(),mt.forEach((function(e){e.sortableIndex=q(e)})),mt=mt.sort((function(e,t){return e.sortableIndex-t.sortableIndex})),bt=!0},dragStarted:function(e){var t=this,i=e.sortable;if(this.isMultiDrag){if(this.options.sort&&(i.captureAnimationState(),this.options.animation)){mt.forEach((function(e){e!==ht&&C(e,"position","absolute")}));var a=D(ht,!1,!0,!0);mt.forEach((function(e){e!==ht&&L(e,a)})),_t=!0,ft=!0}i.animateAll((function(){_t=!1,ft=!1,t.options.animation&&mt.forEach((function(e){V(e)})),t.options.sort&&yt()}))}},dragOver:function(e){var t=e.target,i=e.completed,a=e.cancel;_t&&~mt.indexOf(t)&&(i(!1),a())},revert:function(e){var t=e.fromSortable,i=e.rootEl,a=e.sortable,n=e.dragRect;mt.length>1&&(mt.forEach((function(e){a.addAnimationState({target:e,rect:_t?D(e):n}),V(e),e.fromRect=n,t.removeAnimationState(e)})),_t=!1,function(e,t){mt.forEach((function(i,a){var n=t.children[i.sortableIndex+(e?Number(a):0)];n?t.insertBefore(i,n):t.appendChild(i)}))}(!this.options.removeCloneOnHide,i))},dragOverCompleted:function(e){var t=e.sortable,i=e.isOwner,a=e.insertion,n=e.activeSortable,o=e.parentEl,s=e.putSortable,r=this.options;if(a){if(i&&n._hideClone(),ft=!1,r.animation&&mt.length>1&&(_t||!i&&!n.options.sort&&!s)){var l=D(ht,!1,!0,!0);mt.forEach((function(e){e!==ht&&(L(e,l),o.appendChild(e))})),_t=!0}if(!i)if(_t||yt(),mt.length>1){var d=ut;n._showClone(t),n.options.animation&&!ut&&d&&gt.forEach((function(e){n.addAnimationState({target:e,rect:pt}),e.fromRect=pt,e.thisAnimationDuration=null}))}else n._showClone(t)}},dragOverAnimationCapture:function(e){var t=e.dragRect,i=e.isOwner,a=e.activeSortable;if(mt.forEach((function(e){e.thisAnimationDuration=null})),a.options.animation&&!i&&a.multiDrag.isMultiDrag){pt=r({},t);var n=S(ht,!0);pt.top-=n.f,pt.left-=n.e}},dragOverAnimationComplete:function(){_t&&(_t=!1,yt())},drop:function(e){var t=e.originalEvent,i=e.rootEl,a=e.parentEl,n=e.sortable,o=e.dispatchSortableEvent,s=e.oldIndex,r=e.putSortable,l=r||this.sortable;if(t){var d=this.options,c=a.children;if(!bt)if(d.multiDragKey&&!this.multiDragKeyDown&&this._deselectMultiDrag(),k(ht,d.selectedClass,!~mt.indexOf(ht)),~mt.indexOf(ht))mt.splice(mt.indexOf(ht),1),dt=null,F({sortable:n,rootEl:i,name:"deselect",targetEl:ht,originalEvent:t});else{if(mt.push(ht),F({sortable:n,rootEl:i,name:"select",targetEl:ht,originalEvent:t}),t.shiftKey&&dt&&n.el.contains(dt)){var h,p,u=q(dt),m=q(ht);if(~u&&~m&&u!==m)for(m>u?(p=u,h=m):(p=m,h=u+1);p<h;p++)~mt.indexOf(c[p])||(k(c[p],d.selectedClass,!0),mt.push(c[p]),F({sortable:n,rootEl:i,name:"select",targetEl:c[p],originalEvent:t}))}else dt=ht;ct=l}if(bt&&this.isMultiDrag){if(_t=!1,(a[R].options.sort||a!==i)&&mt.length>1){var g=D(ht),f=q(ht,":not(."+this.options.selectedClass+")");if(!ft&&d.animation&&(ht.thisAnimationDuration=null),l.captureAnimationState(),!ft&&(d.animation&&(ht.fromRect=g,mt.forEach((function(e){if(e.thisAnimationDuration=null,e!==ht){var t=_t?D(e):g;e.fromRect=t,l.addAnimationState({target:e,rect:t})}}))),yt(),mt.forEach((function(e){c[f]?a.insertBefore(e,c[f]):a.appendChild(e),f++})),s===q(ht))){var _=!1;mt.forEach((function(e){e.sortableIndex===q(e)||(_=!0)})),_&&(o("update"),o("sort"))}mt.forEach((function(e){V(e)})),l.animateAll()}ct=l}(i===a||r&&"clone"!==r.lastPutMode)&&gt.forEach((function(e){e.parentNode&&e.parentNode.removeChild(e)}))}},nullingGlobal:function(){this.isMultiDrag=bt=!1,gt.length=0},destroyGlobal:function(){this._deselectMultiDrag(),b(document,"pointerup",this._deselectMultiDrag),b(document,"mouseup",this._deselectMultiDrag),b(document,"touchend",this._deselectMultiDrag),b(document,"keydown",this._checkKeyDown),b(document,"keyup",this._checkKeyUp)},_deselectMultiDrag:function(e){if(!(void 0!==bt&&bt||ct!==this.sortable||e&&w(e.target,this.options.draggable,this.sortable.el,!1)||e&&0!==e.button))for(;mt.length;){var t=mt[0];k(t,this.options.selectedClass,!1),mt.shift(),F({sortable:this.sortable,rootEl:this.sortable.el,name:"deselect",targetEl:t,originalEvent:e})}},_checkKeyDown:function(e){e.key===this.options.multiDragKey&&(this.multiDragKeyDown=!0)},_checkKeyUp:function(e){e.key===this.options.multiDragKey&&(this.multiDragKeyDown=!1)}},r(e,{pluginName:"multiDrag",utils:{select:function(e){var t=e.parentNode[R];t&&t.options.multiDrag&&!~mt.indexOf(e)&&(ct&&ct!==t&&(ct.multiDrag._deselectMultiDrag(),ct=t),k(e,t.options.selectedClass,!0),mt.push(e))},deselect:function(e){var t=e.parentNode[R],i=mt.indexOf(e);t&&t.options.multiDrag&&~i&&(k(e,t.options.selectedClass,!1),mt.splice(i,1))}},eventProperties:function(){var e,t=this,i=[],a=[];return mt.forEach((function(e){var n;i.push({multiDragElement:e,index:e.sortableIndex}),n=_t&&e!==ht?-1:_t?q(e,":not(."+t.options.selectedClass+")"):q(e),a.push({multiDragElement:e,index:n})})),{items:(e=mt,function(e){if(Array.isArray(e))return l(e)}(e)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(e)||function(e,t){if(e){if("string"==typeof e)return l(e,t);var i=Object.prototype.toString.call(e).slice(8,-1);return"Object"===i&&e.constructor&&(i=e.constructor.name),"Map"===i||"Set"===i?Array.from(e):"Arguments"===i||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)?l(e,t):void 0}}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()),clones:[].concat(gt),oldIndicies:i,newIndicies:a}},optionListeners:{multiDragKey:function(e){return"ctrl"===(e=e.toLowerCase())?e="Control":e.length>1&&(e=e.charAt(0).toUpperCase()+e.substr(1)),e}}})});const wt=Ve},659:(e,t,i)=>{"use strict";var a=i(79),n=i(845);const o=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(o).then((async()=>{await new Promise((e=>setTimeout(e,2e3)));const e=await window.loadCardHelpers();class t extends n.WF{static get properties(){return{card:{},_hass:{}}}static getConfigElement(){return document.createElement("dwains-blueprint-card-editor")}set hass(e){null!=this.card&&0!==this.card.length&&(this.card.hass=e)}async setConfig(e){this._hass=window.__dd_get_hass();const t=e.data,i=e.input_entity?e.input_entity:"Error";let n;e.input_entity&&(n=e.input_name?e.input_name:window.__dd_get_hass().states[e.input_entity].attributes&&void 0===window.__dd_get_hass().states[e.input_entity].attributes.friendly_name?e.input_entity.replace(/_/g," "):window.__dd_get_hass().states[e.input_entity].attributes.friendly_name),this.cardConfig=e.card;const o=JSON.stringify(e.card).replace(/\$([0-9]|[aA-zZ])*\$/g,(function(a,o){const s=a.slice(1,-1);return"replace_with_input_entity"==s?i:"replace_with_input_name"==s?n:e.data?t[s]:void 0})).replaceAll('"false"',"false").replaceAll('"true"',"true");this.card=await this.createCardElement2(JSON.parse(o))}async createCardElement2(t){const i=await e,n=await i.createCardElement(t);return n.hass=window.__dd_get_hass(),n}render(){return n.qy`
              ${this.card}
            `}static get styles(){return n.AH`
          `}}customElements.define("dwains-blueprint-card",t);class i extends n.WF{static get styles(){return[n.AH`
            ha-formfield, ha-textfield,.formfield {
              width: 100%;
            }
            .formfield {
              margin-bottom: 10px;
            }
            `]}static get properties(){return{inputs:{},blueprint:{}}}async connectedCallback(){super.connectedCallback(),await this._loadBlueprints()}async _loadBlueprints(){if(this.blueprints=await this.hass.callWS({type:"dwains_dashboard/get_blueprints"}),null!=this.blueprints||0!=this.blueprints.length){const e=this.blueprints.blueprints[this._config.blueprint];if(e){if(this.blueprint=e,e.blueprint.input&&(this.inputs=e.blueprint.input,!this._config.data||0===this._config.data.length)){const e={};Object.entries(this.inputs).map((([t,i])=>e[t]=t)),this._config.data=e}this._config.card=e.card;const t=new Event("config-changed",{bubbles:!0,composed:!0});t.detail={config:this._config},this.dispatchEvent(t)}}}setConfig(e){this._config=e,this.hass=window.__dd_get_hass()}_inputChanged(e){const t=e.target.key,i=e.target.value,a=this._config;a.data[t]=i;const n=new Event("config-changed",{bubbles:!0,composed:!0});n.detail={config:a},this.dispatchEvent(n)}_checkboxChanged(e){const t=e.target.key,i=e.target.checked,a=this._config;a.data[t]=i;const n=new Event("config-changed",{bubbles:!0,composed:!0});n.detail={config:a},this.dispatchEvent(n)}_renderInput(e,t){let i,a="";return this._config.data&&this._config.data[e]&&this._config.data[e]!=e&&(a=this._config.data[e]),t.type&&"entity-picker"==t.type?i=n.qy`
            <ha-entity-picker
               label=${t.name}
                .value=${a}
                .key=${e}
                .hass=${this.hass}
                @value-changed=${this._inputChanged}
            ></ha-entity-picker>`:t.type&&"icon-picker"==t.type?i=n.qy`
            <ha-icon-picker
             label=${t.name}
              .value=${a}
              .key=${e}
              .name=${t.name}
              @value-changed=${this._inputChanged}
            ></ha-icon-picker>
            `:t.type&&"checkbox"==t.type?(a=!(a||!t.default_value)&&t.default_value,i=n.qy`
            <ha-formfield
                  style="display: block;"
                 label=${t.name}
                >
                <ha-checkbox
                    @change=${this._checkboxChanged}
                    .checked=${a}
                    .key=${e}
                    .name=${t.name}
                  ></ha-checkbox>
            </ha-formfield>
            `):i=n.qy`
            <ha-textfield 
               label=${t.name}
                .value=${a}
                .key=${e}
                @input=${this._inputChanged}
            ></ha-textfield>
            `,n.qy`
          <div class="formfield">
            <strong>${t.description}</strong>
            ${i}
          </div>
          `}render(){return null==this.blueprints||0===this.blueprints.length?n.qy``:this.blueprint?this.inputs&&0!==this.inputs.length?n.qy`
            ${Object.entries(this.inputs).map((([e,t])=>n.qy`${this._renderInput(e,t)}`))}
          `:n.qy``:n.qy`Blueprint not found!`}}customElements.define("dwains-blueprint-card-editor",i)}))},825:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(177),s=i(89);const r=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(r).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
        .edit-element {
          padding: 20px;
        }
        .add-button {
          font-size: 16px;
          border: 2px solid #4591B8;
          padding: 5px;
          margin-bottom: 50px;
          background: #459CEE;
          border-radius: 20px;
          color: white;
        }
        .card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: .75rem;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        .grid {
          display: grid;
          gap: 2rem;
        }
        @media (min-width: 768px){
          .grid-cols-2 {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }
        .pre-select {
          padding: 2.5rem;
        }
        .pre-select-option {
          padding: 2.5rem;
          border: 1px solid #4591B8;
          text-align: center;
          cursor: pointer;
        }
        .pre-selected-option:hover {
          border: 2px solid #4591B8;
        }
        .seperator {
          background-color: var(--secondary-background-color);
          width: 100%;
          height: 3px;
          margin-top: 15px;
          margin-bottom: 15px;
        }
        /*Start blueprint table*/
        .min-w-full {
          min-width: 100%;
        }
        table {
            text-indent: 0;
            border-color: inherit;
            border-collapse: collapse;
        }
        .bg-gray-50 {
          background-color: var(--secondary-background-color);
        }
        .tracking-wider {
            letter-spacing: .05em;
        }
        .text-sm {
          font-size: .875rem;
          line-height: 1.25rem;
        }
        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }
        .uppercase {
            text-transform: uppercase;
        }
        .font-medium {
            font-weight: 500;
        }
        .text-xs {
            font-size: .75rem;
            line-height: 1rem;
        }
        .text-left {
            text-align: left;
        }
        .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
        }
        .py-3 {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
        }
        .card-dd-settings {
          padding: 0.75rem;
          border: 2px solid grey;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 1rem;
        }
        ha-select, ha-textfield, ha-formfield {
          width: 100%;
        }
        h2,h3 {
          margin: 0;
          font-size: 1rem;
        }
        `]}static get properties(){return{mode:{},blueprints:{}}}setConfig(e){if(this.hass=window.__dd_get_hass(),this.mode=e.mode?e.mode:"pre-select",this.area_id=e.area?e.area:"",this.domain=e.domain?e.domain:"",this.position=e.position,this.page=e.page,e.cardConfig){const t=e.cardConfig;delete t.input_entity,delete t.input_name,this.cardConfig=t}else this.cardConfig="";this.filename=e.filename?e.filename.replace(".yaml",""):"",this.name=e.name?e.name:"Dwains Dashboard",this.rowSpan=e.rowSpan?e.rowSpan:"1",this.colSpan=e.colSpan?e.colSpan:"1",this.rowSpanLg=e.rowSpanLg?e.rowSpanLg:"1",this.colSpanLg=e.colSpanLg?e.colSpanLg:"1",this.rowSpanXl=e.rowSpanXl?e.rowSpanXl:"1",this.colSpanXl=e.colSpanXl?e.colSpanXl:"1";const t=document.createElement("hui-masonry-view");t.lovelace={editMode:!0},t.willUpdate(new Map)}async connectedCallback(){super.connectedCallback(),await this._loadBlueprints();const e=await window.loadCardHelpers(),t=await e.createCardElement({type:"button"});await t.constructor.getConfigElement()}async _loadBlueprints(){this.blueprints=await this.hass.callWS({type:"dwains_dashboard/get_blueprints"})}magicStuff(e){this.cardConfig=e.detail.config,this.mode="editor-element",this.requestUpdate()}magicStuffSecond(e){}_sendCard(){this.shadowRoot&&this.shadowRoot.querySelectorAll("ha-select").forEach((e=>{const t=e.name||e.type;t&&void 0!==e.value&&(this[t]=`${e.value}`)}));const e=JSON.stringify(this.cardConfig);this.hass.connection.sendMessagePromise({type:"dwains_dashboard/add_card",card_data:e,area_id:this.area_id,domain:this.domain,position:this.position,filename:this.filename,page:this.page,rowSpan:this.rowSpan,colSpan:this.colSpan,rowSpanLg:this.rowSpanLg,colSpanLg:this.colSpanLg,rowSpanXl:this.rowSpanXl,colSpanXl:this.colSpanXl}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_removeCard(){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_card",area_id:this.area_id,domain:this.domain,filename:this.filename,page:this.page}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_switchMode(e){const t=e.currentTarget.mode;this.mode=t,this.requestUpdate()}_handleDeleteBlueprintClicked(e){const t=e.currentTarget.blueprint;this.hass.connection.sendMessagePromise({type:"dwains_dashboard/delete_blueprint",blueprint:t}).then((e=>{console.log(e),this._loadBlueprints(),this.requestUpdate()}),(e=>{console.error("Message failed!",e)}))}_handleUseBlueprintClicked(e){const t=e.currentTarget.blueprint;this.mode="editor-element",this.name=this.blueprints.blueprints[t].blueprint.name,this.cardConfig={type:"custom:dwains-blueprint-card",blueprint:t,card:this.blueprints.blueprints[t].card}}_installBlueprintYamlChanged(e){this.installBlueprintYaml=e.target.value}_handleInstallBlueprintClicked(e){this.installBlueprintYaml||alert("No YAML code entered!"),this.hass.connection.sendMessagePromise({type:"dwains_dashboard/install_blueprint",yamlCode:JSON.stringify(this.installBlueprintYaml)}).then((e=>{console.log(e),e.succesfull?(alert(this.hass.localize("ui.common.successfully_saved")),this._loadBlueprints(),this.requestUpdate()):alert(e.error)}),(e=>{console.error("Message failed!",e)}))}_haSelectChanged(e){e.stopPropagation();const t=e.currentTarget||e.target,i=t&&t.type?t.type:t&&t.name?t.name:t&&t.dataset&&t.dataset.field?t.dataset.field:void 0;let a=void 0!==e.detail&&void 0!==e.detail.value?e.detail.value:void 0!==e.detail&&void 0!==e.detail.index?t&&t.children&&t.children[e.detail.index]&&void 0!==t.children[e.detail.index].value?t.children[e.detail.index].value:t&&t.items&&t.items[e.detail.index]&&void 0!==t.items[e.detail.index].value?t.items[e.detail.index].value:void 0:e.target&&e.target!==t&&void 0!==e.target.value?e.target.value:t&&void 0!==t.value?t.value:void 0!==t&&void 0!==t.selectedValue?t.selectedValue:void 0!==t&&void 0!==t._value?t._value:void 0;i&&void 0!==a&&(this[i]=`${a}`,this.requestUpdate())}_stopPropagation(e){e.stopPropagation()}_checkCustomCard(e){const t=customElements.get(e);return n.qy`
        <div>
          ${t?n.qy`
            <ha-icon
              style="color: green;"
              .icon=${"mdi:check-bold"}
            ></ha-icon>`:n.qy`
            <ha-icon
              style="color: red;"
              .icon=${"mdi:close-thick"}
            ></ha-icon>
            `}
          ${e}
          ${t?n.qy`(${(0,o.A)(this.hass,"blueprint.installed")})`:n.qy`(${(0,o.A)(this.hass,"blueprint.not_installed")})`}
        </div>
      `}render(){if(null==this.blueprints||0===this.blueprints.length)return n.qy`Loading...`;if("pre-select"==this.mode)return n.qy`
          <ha-md-list>
            <ha-list-item twoline .mode=${"hui-card-picker"} @click=${this._switchMode}>
              ${(0,o.A)(this.hass,"editor.lovelace_card")}
              <span slot="secondary">
                ${(0,o.A)(this.hass,"editor.create_lovelace_card")}
              </span>
            </ha-list-item>
            <li divider role="separator"></li>
            <ha-list-item hasmeta twoline .mode=${"dwains-dashboard-blueprint-select"} @click=${this._switchMode}>
              ${(0,o.A)(this.hass,"editor.dwains_dashboard_blueprint")}
              <span slot="secondary">
                ${(0,o.A)(this.hass,"editor.use_dwains_dashboard_blueprint")}
              </span>
              <ha-icon-next slot="meta"></ha-icon-next
            ></ha-list-item>
          </ha-md-list>
        `;if("dwains-dashboard-blueprint-select"==this.mode){const e=Object.entries(this.blueprints.blueprints).sort((function(e,t){let i=e[1].blueprint.type,a=t[1].blueprint.type;return i==a?0:i>a?1:-1}));return n.qy`
        <div class="edit-element">

          <div style="margin-bottom: 20px;">
            <ha-button .mode=${"pre-select"} @click=${this._switchMode}>< ${this.hass.localize("ui.common.previous")}</ha-button>
          </div>

          <strong>${(0,o.A)(this.hass,"blueprint.installed_blueprints")}:</strong>
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.title")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"global.version")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.type")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.used_custom_cards")}</th>
                <th scope="col" class="relative px-6 py-3">
                </th>
              </tr>
            </thead>
            <tbody>
              ${0==Object.values(e).length?n.qy`
                <tr>
                  <td  class="px-6 py-4" colspan="5">${(0,o.A)(this.hass,"blueprint.no_blueprints_installed")}</td>
                </tr>`:n.qy`
                ${Object.entries(e).map((([e,t])=>n.qy`
                        <tr class="bg-white">
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <h3>${t[1].blueprint.name}</h3>
                            ${t[1].blueprint.description}
                          </td>
                          <td class="px-6 py-4">
                            ${t[1].blueprint.version}
                          </td>
                          <td class="px-6 py-4">
                            ${t[1].blueprint.type}
                          </td>
                          <td class="px-6 py-4">
                            ${t[1].blueprint.custom_cards&&0!==t[1].blueprint.custom_cards.length?n.qy`
                                ${t[1].blueprint.custom_cards.map((e=>this._checkCustomCard(e)))}
                              `:"None"}
                          </td>
                          <td>
                            ${"card"==t[1].blueprint.type?n.qy`
                              <ha-button .blueprint=${t[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                                ${(0,o.A)(this.hass,"blueprint.use")}
                              </ha-button>
                            `:""}
                            <ha-button .blueprint=${t[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                              <ha-icon
                                .icon=${"mdi:delete"}
                              ></ha-icon>
                            </ha-button>
                          </td>
                        </tr>
                      `))}
                `}
            </tbody>
          </table>
          <div class="seperator"></div>
          <strong>${(0,o.A)(this.hass,"blueprint.install")}</strong>
          <p>${(0,o.A)(this.hass,"blueprint.instruction")}</p>
          <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
          <ha-yaml-editor
           label=${(0,o.A)(this.hass,"blueprint.yaml_code")}
            name="description"
            @value-changed=${this._installBlueprintYamlChanged}
          ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
          <div style="margin-top: 15px; margin-bottom: 20px;">
            <ha-button @click=${this._handleInstallBlueprintClicked} unelevated>
              ${(0,o.A)(this.hass,"blueprint.install")}
            </ha-button>
          </div>
        </div>`}return"hui-card-picker"==this.mode?n.qy`
          <div class="edit-element">
            <h1 style="font-size: 17px; font-weight: bold;">Select the card you want to add to ${this.name}</h1>
            <hui-card-picker
              @config-changed=${this.magicStuff}
              .hass=${this.hass}
              .lovelace=${{views:[]}}
            ></hui-card-picker>
            <div class="card-footer">
              <ha-button slot="secondaryAction" @click=${e=>(0,s.f)()}>
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
            </div>
          </div>
        `:"editor-element"==this.mode?n.qy`
          <div class="edit-element">
            <div class="card-dd-settings">
              
            <h2>${(0,o.A)(this.hass,"editor.default_col_row")}</h2>
            <div class="grid-2">
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.row_span")}
                .value=${this.rowSpan}
                name="rowSpan"
                type="number"
                min="1"
                max="2"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.col_span")}
                .value=${this.colSpan}
                name="colSpan"
                type="number"
                min="1"
                max="2"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
            </div>

            <h2>${(0,o.A)(this.hass,"editor.large_col_row")}</h2>
            <div class="grid-2">
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.row_span")}
                .value=${this.rowSpanLg}
                name="rowSpanLg"
                type="number"
                min="1"
                max="3"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.col_span")}
                .value=${this.colSpanLg}
                name="colSpanLg"
                type="number"
                min="1"
                max="3"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
            </div>

            <h2>${(0,o.A)(this.hass,"editor.extra_large_col_row")}</h2>
            <div class="grid-2">
              <ha-select
               label=${(0,o.A)(this.hass,"editor.row_span")}
                .value=${this.rowSpanXl}
                .type=${"rowSpanXl"}
                name="rowSpanXl"
                @selected=${this._haSelectChanged} @change=${this._haSelectChanged} @value-changed=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <ha-list-item value="1">1 ${(0,o.A)(this.hass,"editor.row")}</ha-list-item>
                <ha-list-item value="2">2 ${(0,o.A)(this.hass,"editor.rows")}</ha-list-item>
                <ha-list-item value="4">3 ${(0,o.A)(this.hass,"editor.rows")}</ha-list-item>
                <ha-list-item value="4">4 ${(0,o.A)(this.hass,"editor.rows")}</ha-list-item>
              </ha-select>
              <ha-select
               label=${(0,o.A)(this.hass,"editor.col_span")}
                .value=${this.colSpanXl}
                .type=${"colSpanXl"}
                name="colSpanXl"
                @selected=${this._haSelectChanged} @change=${this._haSelectChanged} @value-changed=${this._haSelectChanged}
                @closed=${this._stopPropagation}
              >
                <ha-list-item value="1">1 ${(0,o.A)(this.hass,"editor.column")}</ha-list-item>
                <ha-list-item value="2">2 ${(0,o.A)(this.hass,"editor.columns")}</ha-list-item>
                <ha-list-item value="3">3 ${(0,o.A)(this.hass,"editor.columns")}</ha-list-item>
                <ha-list-item value="4">4 ${(0,o.A)(this.hass,"editor.columns")}</ha-list-item>
              </ha-select>
            </div>
            </div>
            <hui-card-element-editor
              @save-config=${this.magicStuffSecond}
              @config-changed=${this.magicStuff}
              .value=${this.cardConfig}
              .hass=${this.hass}
              .lovelace=${{views:[]}}
            ></hui-card-element-editor>
            <hui-card-preview
              .hass=${this.hass}
              .config=${this.cardConfig}
            ></hui-card-preview>
            <div class="card-footer">
              ${this.filename?n.qy`<ha-button @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</ha-button>`:""}
              <ha-button @click=${this._sendCard}>${this.hass.localize("ui.common.submit")}</ha-button>
            </div>
          </div>
        `:void 0}}customElements.define("dwains-create-custom-card-card",e)}))},142:(e,t,i)=>{"use strict";var a=i(381);class n extends a.WF{setConfig(e){}static get properties(){return{cards:{type:Array}}}static get styles(){return a.AH`
      #dwains_dashboard {
        margin: 0 auto;
        font-family: "Open Sans", sans-serif;
        padding-top: 10px;
        padding-bottom: 50px;
      }

      @media only screen and (max-width: 768px), 
             only screen and (max-width: 1800px) and (hover: none) {
        #dwains_dashboard {
          padding-top: 1px;
          margin-top: -55px;
        }
      }
    `}render(){return a.qy`
      <div id="dwains_dashboard">
        ${this.cards?this.cards.map((e=>a.qy`${e}`)):""}
      </div>
    `}}if(!customElements.get("dwains-dashboard-layout")){customElements.define("dwains-dashboard-layout",n);const e=i(330);console.info(`%c DWAINS-DASHBOARD-JS \n%c Version ${e.version}`,"color: #2fbae5; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray")}},919:(e,t,i)=>{"use strict";var a=i(79),n=i(991),o=i(924),s=i(153);function r(){let e=document.querySelector("home-assistant");if(e=e?.shadowRoot,e=e?.querySelector("home-assistant-main")?.shadowRoot,e=e?.querySelector("ha-drawer partial-panel-resolver")?.shadowRoot||e,e=e?.querySelector("ha-panel-lovelace")?.shadowRoot,e=e?.querySelector("hui-root"),e){const t=e.lovelace;return t.current_view=e._curView??e.___curView??e.curView,t}return null}class l{constructor(){this.startDwainsDashboard();const e=this.locationChanged.bind(this);window.addEventListener("location-changed",e),window.addEventListener("popstate",e),window.__dd_get_hass().connection.subscribeEvents((()=>this.reload()),"dwains_dashboard_reload")}async loadData(){this.configuration=await window.__dd_get_hass().callWS({type:"dwains_dashboard/configuration/get"})}locationChanged(){let e=window.location.pathname;"dwains-dashboard"===e.substring(1,e.lastIndexOf("/"))&&(this.applyDwainsTheme(),setTimeout(() => {this.buildDwainsNavigation();}, 500),document.querySelector("home-assistant").addEventListener("hass-more-info",this.popupCard.bind(this)))}popupCard(e){if(!e.detail||!e.detail.entityId||!this.configuration)return;const t=(0,s.mD)(e.detail.entityId);if(this.configuration.entities_popup&&this.configuration.entities_popup[e.detail.entityId])if(this.configuration.entities[e.detail.entityId]&&!this.configuration.entities[e.detail.entityId].custom_popup)console.log("Please enable custom popup for this entity");else{const t=this.configuration.entities[e.detail.entityId]&&this.configuration.entities[e.detail.entityId].friendly_name?this.configuration.entities[e.detail.entityId].friendly_name:void 0===window.__dd_get_hass().states[e.detail.entityId].attributes.friendly_name?e.detail.entityId.replace(/_/g," "):window.__dd_get_hass().states[e.detail.entityId].attributes.friendly_name;window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)(t,{input_entity:e.detail.entityId,...this.configuration.entities_popup[e.detail.entityId]},!1,"")}),10)}else if(this.configuration.devices_popup&&this.configuration.devices_popup[t]){const i=this.configuration.entities[e.detail.entityId]&&this.configuration.entities[e.detail.entityId].friendly_name?this.configuration.entities[e.detail.entityId].friendly_name:void 0===window.__dd_get_hass().states[e.detail.entityId].attributes.friendly_name?e.detail.entityId.replace(/_/g," "):window.__dd_get_hass().states[e.detail.entityId].attributes.friendly_name;window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)(i,{input_entity:e.detail.entityId,...this.configuration.devices_popup[t]},!1,"")}),10)}}async startDwainsDashboard(){console.log("Starting Dwains Dashboard"),(await this.getLovelace()).config.dwains_dashboard&&(await this.loadData(),document.querySelector("home-assistant").addEventListener("hass-more-info",this.popupCard.bind(this)),console.log("Dwains Dashboard Started"),setTimeout(() => {this.buildDwainsNavigation();}, 500),this.applyDwainsTheme())}applyDwainsTheme(){const e=this.getRoot();(0,s.QD)(e.shadowRoot.querySelector("#view"),{themes:{"dwains-theme":{"ha-card-border-radius":"0.75rem"}}},"dwains-theme",!0)}async buildDwainsNavigation(){const e=this.getRoot();if(!e||!e.shadowRoot){if((this.__ddNavRetries=(this.__ddNavRetries||0)+1)<=40)setTimeout((()=>this.buildDwainsNavigation()),150);return}this.__ddNavRetries=0,console.log("Building Dwains Dashboard Navigation");const t=e.shadowRoot.querySelector(".header");t&&(t.style.display="none"),await this._buildDwainsNavigation(e)}reload(){const e=(0,a._R)();e&&(0,o.r)("config-refresh",{},e);let t=window.location.pathname;"dwains-dashboard"===t.substring(1,t.lastIndexOf("/"))&&setTimeout((()=>document.location.reload()),1e3)}async getLovelace(){let e;for(;!e;)e=r(),e||await new Promise((e=>setTimeout(e,500)));return e}getRoot(){let e=document.querySelector("home-assistant");return e=e?.shadowRoot,e=e?.querySelector("home-assistant-main")?.shadowRoot,e=e?.querySelector("ha-drawer partial-panel-resolver")?.shadowRoot||e,e=e?.querySelector("ha-panel-lovelace")?.shadowRoot,e=e?.querySelector("hui-root"),e}async _buildDwainsNavigation(e){if(!e.shadowRoot.querySelector("dwainsboard-navigation-card")){const t=document.createElement("dwainsboard-navigation-card");t.hass=window.__dd_get_hass(),e.shadowRoot.appendChild(t)}}}const d=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(d).then((()=>{window.dwains_dashboard||(window.dwains_dashboard=new l)}))},462:(e,t,i)=>{"use strict";var a=i(79),n=i(991),o=i(924),s=i(987),r=i(969),l=i(153),d=i(165),c=i(845),h=i(331),p=i(177);class u extends c.WF{static get properties(){return{data:{},selectedDevice:{},deviceEditMode:{},deviceViewDisplayGrouped:{},deviceViewEditMode:{}}}async loadHelpers(){if("function"==typeof window.loadCardHelpers)return await window.loadCardHelpers();console.warn("loadCardHelpers is not available, ensure you are running a compatible version of Home Assistant")}set hass(e){this.startedUp&&this._update_hass(e)}_update_hass(e){this._hass=e;null!=this.data&&0!==this.data.length&&Object.values(this.data).map((t=>{t.domain==this.selectedDevice&&(t.cards.forEach((t=>{t.card&&(t.card.hass=e)})),t.customCardsTop.forEach((t=>{t.card&&(t.card.hass=e)})),t.customCardsBottom.forEach((t=>{t.card&&(t.card.hass=e)})))}));this.timeout||(this.timeout=!0,window.setTimeout((()=>{this.timeout=!1}),100),this.requestUpdate())}async setConfig(e){this.startedUp=!1,this.timeout=!1,this._hass=window.__dd_get_hass(),this.cardHelpers=await this.loadHelpers(),this.selectedDevice=window.location.hash.substring(1),this.deviceEditMode=!1,this.deviceViewEditMode=!1,this.deviceViewDisplayGrouped="false"!=s.A.get("dwains_dashboard_deviceViewDisplayGrouped")

,this._config=e,this.notificationCard,this.weatherCard,window.addEventListener("location-changed",(()=>this.updated(new Map)))}updated(e){if(!e.has("state")){let e;e=window.location.hash.substring(1),e?this.selectedDevice=e:null!=this.data&&0!=Object.keys(this.data).length&&(this.selectedDevice=Object.values(this.data)[0].domain)}}async connectedCallback(){super.connectedCallback(),await this._loadData(),await this._hass.connection.subscribeEvents((()=>this._reloadCard()),"dwains_dashboard_devicespage_card_reload")}async _reloadCard(){await this._loadData(),this.requestUpdate()}async _loadData(){this.selectedArea=this.selectedArea||"";if(this.startedUp=!1,this.areas=await this._hass.callWS({type:"config/area_registry/list"}),this.devices=await this._hass.callWS({type:"config/device_registry/list"}),this.entities=await this._hass.callWS({type:"config/entity_registry/list"}),this.configuration=await this._hass.callWS({type:"dwains_dashboard/configuration/get"}),null==this.areas||0===this.areas.length||null==this.devices||0===this.devices.length||null==this.entities||0===this.entities.length||null==this.configuration||0===this.configuration.length);else{const e=document.createElement("hui-masonry-view");e.lovelace={editMode:!0},e.willUpdate(new Map);const t=[],i=[],a=new Set;for(const e of this.areas)if(!this.configuration.areas[e.area_id]||!this.configuration.areas[e.area_id].disabled){const n=new Set;for(const t of this.devices)t.area_id===e.area_id&&n.add(t.id);for(const o of this.entities)if(o.area_id?o.area_id===e.area_id:n.has(o.device_id)||"person"==(0,l.mD)(o.entity_id)&&!a.has(o.entity_id)||"weather"==(0,l.mD)(o.entity_id)&&!a.has(o.entity_id)||"alarm_control_panel"==(0,l.mD)(o.entity_id)&&!a.has(o.entity_id)){if(o.hidden_by)continue;const n=(0,l.mD)(o.entity_id),s=this._hass.states[o.entity_id];if(this.configuration.devices[n]&&this.configuration.devices[n].hidden){i.includes(n)||i.push(n);continue}if(!(n in t)){const e=[],i=[];0!==this.configuration.device_cards.length&&this.configuration.device_cards[n]&&Object.entries(this.configuration.device_cards[n]).map((async([t,a])=>{const o=await this.createCardElement2(a),s=a.row_span?a.row_span:"1",r=a.col_span?a.col_span:"1",l=a.row_span_lg?a.row_span_lg:"1",d=a.col_span_lg?a.col_span_lg:"1",c=a.row_span_xl?a.row_span_xl:"1",h=a.col_span_xl?a.col_span_xl:"1";"bottom"==a.position?i.push({card:o,filename:t,domain:n,rowSpan:s,colSpan:r,rowSpanLg:l,colSpanLg:d,rowSpanXl:c,colSpanXl:h}):e.push({card:o,filename:t,domain:n,rowSpan:s,colSpan:r,rowSpanLg:l,colSpanLg:d,rowSpanXl:c,colSpanXl:h})})),t[n]={domain:n,cards:[],entitiesNoState:[],entitiesHidden:[],entitiesDisabled:[],customCardsTop:e,customCardsBottom:i,sort_order:this.configuration.devices[n]&&this.configuration.devices[n].sort_order?this.configuration.devices[n].sort_order:99}}if(this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].disabled){t[n].entitiesDisabled.push(o.entity_id),a.add(o.entity_id);continue}if(!s){t[n].entitiesNoState.push(o.entity_id),a.add(o.entity_id);continue}{const i=!!this.configuration.entities[o.entity_id]&&!!this.configuration.entities[o.entity_id].hidden,s=!!this.configuration.entities[o.entity_id]&&!!this.configuration.entities[o.entity_id].excluded,r=this.configuration.entities[o.entity_id]?this.configuration.entities[o.entity_id].friendly_name:"",l=!(!this.configuration.entities[o.entity_id]||!this.configuration.entities[o.entity_id].custom_card)&&this.configuration.entities[o.entity_id].custom_card,d=!(!this.configuration.entities[o.entity_id]||!this.configuration.entities[o.entity_id].custom_popup)&&this.configuration.entities[o.entity_id].custom_popup;if(i){t[n].entitiesHidden.includes(o.entity_id)||t[n].entitiesHidden.push(o.entity_id);continue}let c={},h="1",p="1",u="1",m="1",g="1",f="1";if(l&&this.configuration.entity_cards&&this.configuration.entity_cards[o.entity_id])c={input_name:r,input_entity:o.entity_id,...this.configuration.entity_cards[o.entity_id]};else if(this.configuration.devices_card[n])c={input_name:r,input_entity:o.entity_id,...this.configuration.devices_card[n]};else if("sensor"===n&&this._hass&&this._hass.states[o.entity_id].attributes.unit_of_measurement)c={graph:"line",type:"sensor",hours_to_show:24,detail:1,entity:o.entity_id,...(r?{name:r}:{})};else{switch(n){default:c=r?{type:"tile",name:r}:{type:"tile"};break;case"camera":c={type:"picture-entity",camera_view:"auto"},h="2",p="2",u="2",m="2",g="2",f="2";break;case"climate":c=r?{type:"thermostat",name:r,features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]}:{type:"thermostat",features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]};break;case"cover":c=r?{type:"tile",name:r,features:[{type:"cover-open-close"},{type:"cover-position"}]}:{type:"tile",features:[{type:"cover-open-close"},{type:"cover-position"}]};break;case"light":c=r?{type:"tile",name:r,features:[{type:"light-brightness"}]}:{type:"tile",features:[{type:"light-brightness"}]}}c={entity:o.entity_id,...c}}this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].row_span&&(h=this.configuration.entities[o.entity_id].row_span),this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].col_span&&(p=this.configuration.entities[o.entity_id].col_span),this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].row_span_lg&&(u=this.configuration.entities[o.entity_id].row_span_lg),this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].col_span_lg&&(m=this.configuration.entities[o.entity_id].col_span_lg),this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].row_span_xl&&(g=this.configuration.entities[o.entity_id].row_span_xl),this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].col_span_xl&&(f=this.configuration.entities[o.entity_id].col_span_xl),a.add(o.entity_id),t[n].cards.push({area:e,entity:o.entity_id,rowSpan:h,colSpan:p,rowSpanLg:u,colSpanLg:m,rowSpanXl:g,colSpanXl:f,friendlyName:r,hideEntity:i,excludeEntity:s,card:this.createCardElement2(c),customCard:l,customPopup:d,sort_order:this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].devices_sort_order?this.configuration.entities[o.entity_id].devices_sort_order:99,grouped_sort_order:this.configuration.entities[o.entity_id]&&this.configuration.entities[o.entity_id].devices_grouped_sort_order?this.configuration.entities[o.entity_id].devices_grouped_sort_order:99})}}}const n=Object.keys(t).sort((function(e,i){return t[e].sort_order-t[i].sort_order})).map((function(e){return t[e]}));await Promise.all(n.flatMap((g=>g&&g.cards||[])).map((async o=>{try{o&&(o.card=await o.card)}catch(_){o&&(o.card=null)}})));this.data=n,this.disabledDevices=i,this.startedUp=!0,0===this.selectedDevice.length&&(this.selectedDevice=Object.values(n)[0].domain)}}_average(e,t,i){const a=e[t].filter((e=>!i||e.attributes.device_class===i));if(!a)return;let n;const o=a.filter((e=>!(!e.attributes.unit_of_measurement||isNaN(Number(e.state))||(n?e.attributes.unit_of_measurement!==n:(n=e.attributes.unit_of_measurement,0)))));if(!o.length)return;const s=o.reduce(((e,t)=>e+Number(t.state)),0);return`${Math.round(s/o.length*10)/10}${n}`}_isOn(e,t,i){const a=e[t];if(a)return(i?a.filter((e=>e.attributes.device_class===i)):a).filter((e=>!UNAVAILABLE_STATES.includes(e.state)&&!STATES_OFF.includes(e.state))).length}_climateState(e,t){const i=e[t];if(!i)return;const a=[];for(const e of i)"idle"!=e.attributes.hvac_action&&a.push(e.attributes.hvac_action);return a.join(", ")}_handleDeviceClick(e){var t=e.currentTarget.dataset.device;window.location.hash=t,this.selectedDevice=t,window.scrollTo(0,0),this._update_hass(this._hass)}_backButtonClick(){window.location.hash="",this._update_hass(this._hass)}_entitiesByDomain(e){const t={};for(const i of e){const e=i.substr(0,i.indexOf("."));if(!(TOGGLE_DOMAINS.includes(e)||SENSOR_DOMAINS.includes(e)||ALERT_DOMAINS.includes(e)||COVER_DOMAINS.includes(e)||CLIMATE_DOMAINS.includes(e)||OTHER_DOMAINS.includes(e)))continue;const a=this._hass.states[i];a&&((SENSOR_DOMAINS.includes(e)||ALERT_DOMAINS.includes(e)||COVER_DOMAINS.includes(e))&&!DEVICE_CLASSES[e].includes(a.attributes.device_class||"")||(e in t||(t[e]=[]),t[e].push(a)))}return t}async createCardElement(e){const t={type:"grid",columns:6,cards:e},i=await cardHelpers,a=await i.createCardElement(t);return a.hass=this._hass,a}async createCardElement2(e){if(!this.cardHelpers)return void console.error("Card helpers zijn niet geladen.");const t=await this.cardHelpers.createCardElement(e);return t.hass=this._hass,t}shouldUpdate(e){return!e.has("_hass")}_iconPickerChange(e){console.log(e)}_toggle(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.domain;TOGGLE_DOMAINS.includes(t)&&this._hass.callService(t,e.currentTarget.state?"turn_off":"turn_on",void 0,{area_id:e.currentTarget.area_id})}_addLovelaceCard(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.domain,i=e.currentTarget.position;window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)((0,p.A)(this._hass,"device.add_card_to")+t,{type:"custom:dwains-create-custom-card-card",domain:t,position:i,page:"devices"},!0,"")}),50)}_handleEntityEditClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity,i=e.currentTarget.friendlyName,a=e.currentTarget.hideEntity,s=e.currentTarget.excludeEntity,r=e.currentTarget.disableEntity,l=e.currentTarget.colSpan,d=e.currentTarget.rowSpan,c=e.currentTarget.colSpanLg,h=e.currentTarget.rowSpanLg,u=e.currentTarget.colSpanXl,m=e.currentTarget.rowSpanXl,g=e.currentTarget.customCard,f=e.currentTarget.customPopup;window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)((0,p.A)(this._hass,"entity.edit_entity"),{type:"custom:dwains-edit-entity-card",entity:t,friendlyName:i,hideEntity:a,excludeEntity:s,disableEntity:r,colSpan:l,rowSpan:d,colSpanLg:c,rowSpanLg:h,colSpanXl:u,rowSpanXl:m,customCard:g,customPopup:f},!1,"")}),50)}_handleEntityEditCardClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity;let i,a;if(this.configuration.entity_cards&&this.configuration.entity_cards[t]){const e=this.configuration.entities[t]?this.configuration.entities[t].friendly_name:"";i={input_name:e,input_entity:t,...this.configuration.entity_cards[t]},a="editor-element"}window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)((0,p.A)(this._hass,"entity.edit_entity_card"),{type:"custom:dwains-edit-entity-card-card",entity_id:t,cardConfig:i,mode:a,existingCardEdit:!!i},!0,"")}),50)}_handleEntityEditPopupClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity;let i,a;if(this.configuration.entities_popup&&this.configuration.entities_popup[t]){const e=this.configuration.entities[t]?this.configuration.entities[t].friendly_name:"";i={input_name:e,input_entity:t,...this.configuration.entities_popup[t]},a="editor-element"}console.log(i),window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)((0,p.A)(this._hass,"entity.edit_entity_popup_card"),{type:"custom:dwains-edit-entity-popup-card",entity_id:t,cardConfig:i,mode:a,existingCardEdit:!!i},!0,"")}),50)}_handleDeviceEditClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.device,i=e.currentTarget.device_icon,a=e.currentTarget.showInNavbar;window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)((0,p.A)(this._hass,"device.edit_device_button"),{type:"custom:dwains-edit-device-button-card",device:t,icon:i,showInNavbar:a},!1,"")}),50)}_handleCustomCardEditClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.domain,i=e.currentTarget.filename,a=document.createElement("hui-masonry-view");a.lovelace={editMode:!0},a.willUpdate(new Map);const s=e.currentTarget.colSpan,r=e.currentTarget.rowSpan,l=e.currentTarget.colSpanLg,d=e.currentTarget.rowSpanLg,c=e.currentTarget.colSpanXl,h=e.currentTarget.rowSpanXl,p=this.configuration.device_cards[t][i];var u="top";p.position&&(u=p.position,delete p.position),delete p.col_span,delete p.row_span,delete p.col_span_lg,delete p.row_span_lg,delete p.col_span_xl,delete p.row_span_xl,window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)(this._hass.localize("ui.components.entity.entity-picker.edit"),{type:"custom:dwains-create-custom-card-card",domain:t,page:"devices",mode:"editor-element",cardConfig:p,position:u,filename:i,colSpan:s,rowSpan:r,colSpanLg:l,rowSpanLg:d,colSpanXl:c,rowSpanXl:h},!0,"")}),50)}_handleEntityEditBoolValueClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity,i=e.currentTarget.key,a=e.currentTarget.value;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entity_bool_value",entityId:t,key:i,value:a}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleDeviceEditBoolValueClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.device,i=e.currentTarget.key,a=e.currentTarget.value;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_device_bool_value",device:t,key:i,value:a}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleDeviceEditCardClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.domain;let i,a;this.configuration.devices_card&&this.configuration.devices_card[t]&&(i=this.configuration.devices_card[t],a="current-selected-blueprint");const s=document.createElement("hui-masonry-view");s.lovelace={editMode:!0},s.willUpdate(new Map),window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)((0,p.A)(this._hass,"device.edit_device_card")+(0,p.A)(this._hass,"device."+t),{type:"custom:dwains-edit-device-card-card",domain:t,cardConfig:i,existingCardEdit:!!i,mode:a},!0,"")}),50)}_handleDeviceEditPopupClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.domain;let i,a;this.configuration.devices_popup&&this.configuration.devices_popup[t]&&(i=this.configuration.devices_popup[t],a="current-selected-blueprint"),window.setTimeout((()=>{(0,o.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,n.d)((0,p.A)(this._hass,"device.edit_device_popup")+(0,p.A)(this._hass,"device."+t),{type:"custom:dwains-edit-device-popup-card",domain:t,cardConfig:i,existingCardEdit:!!i,mode:a},!0,"")}),50)}_deviceButtonMoved(e){this._hass.connection.sendMessagePromise({type:"dwains_dashboard/sort_device_button",sortData:JSON.stringify(this._sortable.toArray())}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleDeviceEditModeClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;t?this.shadowRoot.getElementById("sortable")&&(this._sortable=new h.A(this.shadowRoot.getElementById("sortable"),{forceFallback:!0,animation:150,dataIdAttr:"data-device",handle:".sortable-move",onEnd:async e=>this._deviceButtonMoved(e)})):(this._sortable.destroy(),this._sortable=void 0),this.deviceEditMode=t}_handleDeviceViewEditModeClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;if(t){this._sortable=[];const e=this.shadowRoot.querySelectorAll(".sortable");for(var i=0;i<e.length;i++){const t=this.deviceViewDisplayGrouped?"devices_grouped_sort_order":"devices_sort_order";this._sortable[i]=new h.A(e[i],{forceFallback:!0,animation:150,dataIdAttr:"data-entity",handle:".sortable-move",onEnd:function(e){window.__dd_get_hass().connection.sendMessagePromise({type:"dwains_dashboard/sort_entity",sortData:JSON.stringify(this.toArray()),sortType:t}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}})}}else this._sortable.forEach((e=>e.destroy())),this._sortable=void 0;this.deviceViewEditMode=t}_renderDeviceButtonCard(e,t){return c.qy`
            <div>
              <ha-card class="p-2">
                <span class="break-words">
                ${(0,p.A)(this._hass,"device."+e)}
                </span>
              </ha-card>
              <ha-card>
                <div class="card-actions">
                  <ha-button 
                    .device="${e}"
                    .key=${"hidden"}
                    .value=${!1}
                    @click=${this._handleDeviceEditBoolValueClick} 
                  >
                    ${(0,p.A)(this._hass,"device.unhide")}
                  </ha-button>
                </div>
              </ha-card>
            </div>
          `}_renderDeviceButton(e){return c.qy`
            <div class="relative" data-device='${e.domain}'>
              <div 
                class="flex justify-between h-44 p-3 device-button ${this.selectedDevice!=e.domain||this.configuration.homepage_header.v2_mode?"":"current"}" 
                data-device=${e.domain}
                @click=${this._handleDeviceClick}
              >
                <div class="h-full flex flex-wrap content-between">
                  <div class="w-full ha-icon">
                    ${this.configuration.devices[e.domain]&&this.configuration.devices[e.domain].icon?c.qy`
                      <ha-icon
                        class="h-14 w-14"
                        style="color: var(--primary-color);"
                        .icon=${this.configuration.devices[e.domain].icon}
                      ></ha-icon>`:c.qy`${r.Su[e.domain]?c.qy`<ha-icon
                          class="h-14 w-14"
                          style="color: var(--primary-color);"
                          .icon=${r.Su[e.domain]}></ha-icon>`:""}`}
                  </div>
                  <div class="w-full">
                    <h3 class="font-semibold text-lg capitalize">${(0,p.A)(this._hass,"device."+e.domain)}</h3>
                  </div>
                </div>
                <div class="row-span-2 text-right space-y-0.5 info">
                  
                </div>
              </div>
              ${this.deviceEditMode?c.qy`
                <ha-card>
                  <div class="card-actions-multiple">
                    <div class="sortable-move">
                      <ha-icon
                        .icon=${"mdi:cursor-move"}
                      >
                      </ha-icon>
                    </div>
                    <ha-dropdown
                      class="ha-icon-overflow-menu-overflow"
                      corner="BOTTOM_START"
                      absolute
                    >
                      <ha-icon-button
                       label=${this._hass.localize("ui.common.overflow_menu")}
                        .path=${d.TdJ}
                        slot="trigger"
                      ></ha-icon-button>
                        <ha-list-item
                          graphic="icon"
                          .device=${e.domain}
                          .device_icon=${this.configuration.devices[e.domain]&&this.configuration.devices[e.domain].icon?this.configuration.devices[e.domain].icon:r.Su[e.domain]?r.Su[e.domain]:""}
                          .showInNavbar=${this.configuration.devices[e.domain]&&this.configuration.devices[e.domain].show_in_navbar?this.configuration.devices[e.domain].show_in_navbar:""}
                          @click=${this._handleDeviceEditClick} 
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:cog"}></ha-icon>
                          </div>
                          ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                        </ha-list-item>
                    
                        <ha-list-item
                          graphic="icon"
                          .domain=${e.domain}
                          @click="${this._handleDeviceEditCardClick}"
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                          </div>
                          ${(0,p.A)(this._hass,"entity.entity_card")}
                        </ha-list-item>
                        <ha-list-item
                          graphic="icon"
                          .domain=${e.domain}
                          @click="${this._handleDeviceEditPopupClick}"
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                          </div>
                          ${(0,p.A)(this._hass,"entity.popup_card")}
                        </ha-list-item>
                        <ha-list-item
                          graphic="icon"
                          .device=${e.domain}
                          .key=${"hidden"}
                          .value=${!0}
                          @click=${this._handleDeviceEditBoolValueClick} 
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:eye-off"}></ha-icon>
                          </div>
                          ${(0,p.A)(this._hass,"device.hide")}
                        </ha-list-item>
                    </ha-dropdown>
                  </div>
                </ha-card>
                `:""}
            </div>
          `}_renderDeviceViewCards(e){if(this.deviceViewDisplayGrouped&&"person"!=e.domain&&"weather"!=e.domain&&"alarm_control_panel"!=e.domain){let t=e.cards.reduce(((e,t)=>(e[t.area.area_id]=[...e[t.area.area_id]||[],t],e)),{}),i=Object.keys(t).sort(((e,t)=>{let i=this.configuration.areas[e]&&this.configuration.areas[e].sort_order?this.configuration.areas[e]:1,a=this.configuration.areas[t]&&this.configuration.areas[t].sort_order?this.configuration.areas[t]:1;return i==a?0:i>a?1:-1}));return e.cards.sort((function(e,t){let i=e.grouped_sort_order,a=t.grouped_sort_order;return i==a?0:i>a?1:-1})),c.qy`
            <div>
            ${i.map((e=>c.qy`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${t[e][0].area.name}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
                  ${Object.entries(t[e]).map((([e,t])=>c.qy`${this._renderDeviceViewCard(t)}`))}
                  </div>
                </div>
              `))}
            </div>
            `}return e.cards.sort((function(e,t){let i=e.sort_order,a=t.sort_order;return i==a?0:i>a?1:-1})),c.qy`
            <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
              ${e.cards.map((e=>c.qy`${this._renderDeviceViewCard(e)}`))}
            </div>
            `}_renderDeviceViewCard(e){return c.qy`
          <div 
            data-entity='${e.entity}'
            class="col-span-${e.colSpan} row-span-${e.rowSpan} lg-col-span-${e.colSpanLg} lg-row-span-${e.rowSpanLg} xl-col-span-${e.colSpanXl} xl-row-span-${e.rowSpanXl} relative"
          >
            <div>
              <span class="hidden">${(0,p.A)(this._hass,"device."+e.domain)}<br></span>
              <dd-lazy-card .card=${e.card}></dd-lazy-card>
            </div>
            ${this.deviceViewEditMode?c.qy`
            <ha-card>
              <div class="card-actions-multiple">
                <div class="sortable-move">
                  <ha-icon
                    .icon=${"mdi:cursor-move"}
                  >
                  </ha-icon>
                </div>
                <ha-dropdown
                  class="ha-icon-overflow-menu-overflow"
                  corner="BOTTOM_START"
                  absolute
                >
                  <ha-icon-button
                   label=${this._hass.localize("ui.common.overflow_menu")}
                    .path=${d.TdJ}
                    slot="trigger"
                  ></ha-icon-button>
                    <ha-list-item
                      graphic="icon"
                      .entity="${e.entity}"
                      .friendlyName="${e.friendlyName}"
                      .disableEntity=${e.disableEntity}
                      .hideEntity=${e.hideEntity}
                      .excludeEntity=${e.excludeEntity}
                      .rowSpan=${e.rowSpan}
                      .colSpan=${e.colSpan}
                      .rowSpanLg=${e.rowSpanLg}
                      .colSpanLg=${e.colSpanLg}
                      .rowSpanXl=${e.rowSpanXl}
                      .colSpanXl=${e.colSpanXl}
                      .customCard=${e.customCard}
                      .customPopup=${e.customPopup}
                      @click=${this._handleEntityEditClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:cog"}></ha-icon>
                      </div>
                      ${(0,p.A)(this._hass,"entity.settings")}
                    </ha-list-item>
                    ${"t"!=e.entity?c.qy`
                      <ha-list-item
                        graphic="icon"
                        .entity="${e.entity}"
                        @click="${this._handleEntityEditCardClick}"
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                        </div>
                        ${(0,p.A)(this._hass,"entity.entity_card")}
                      </ha-list-item>`:""}
                    ${"t"!=e.entity?c.qy`
                      <ha-list-item
                        graphic="icon"
                        .entity="${e.entity}"
                        @click="${this._handleEntityEditPopupClick}"
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                        </div>
                        ${(0,p.A)(this._hass,"entity.popup_card")}
                      </ha-list-item>`:""}
                    <ha-list-item
                      graphic="icon"
                      .entity="${e.entity}"
                      .key=${"excluded"}
                      .value=${!0}
                      @click=${this._handleEntityEditBoolValueClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:table-eye-off"}></ha-icon>
                      </div>
                      ${(0,p.A)(this._hass,"entity.exclude")}
                    </ha-list-item>
                    <ha-list-item
                      graphic="icon"
                      .entity="${e.entity}"
                      .key=${"hidden"}
                      .value=${!0}
                      @click=${this._handleEntityEditBoolValueClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:eye-off"}></ha-icon>
                      </div>
                      ${(0,p.A)(this._hass,"entity.hide")}
                    </ha-list-item>
                    <ha-list-item
                      graphic="icon"
                      .entity="${e.entity}"
                      .key=${"disabled"}
                      .value=${!0}
                      @click=${this._handleEntityEditBoolValueClick} 
                    >
                      <div slot="graphic">
                        <ha-icon .icon=${"mdi:tray-remove"}></ha-icon>
                      </div>
                      ${(0,p.A)(this._hass,"entity.disable")}
                    </ha-list-item>
                </ha-dropdown>
              </div>
            </ha-card>`:""}
          </div>
          `}_renderDeviceViewCustomCards(e,t){return c.qy`
          <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 my-4">
            ${"bottom"==t?e.customCardsBottom.map((e=>c.qy`${this._renderDeviceViewCustomCard(e)}`)):e.customCardsTop.map((e=>c.qy`${this._renderDeviceViewCustomCard(e)}`))}
          </div>
          `}_renderDeviceViewCustomCard(e){return c.qy`
          <div class="col-span-${e.colSpan} row-span-${e.rowSpan} lg-col-span-${e.colSpanLg} lg-row-span-${e.rowSpanLg} xl-col-span-${e.colSpanXl} xl-row-span-${e.rowSpanXl} relative">
            <div>
              <dd-lazy-card .card=${e.card}></dd-lazy-card>
            </div>
            ${this.deviceViewEditMode?c.qy`
            <ha-card>
              <div class="card-actions">
                <ha-button 
                  @click=${this._handleCustomCardEditClick} 
                  .domain=${e.domain}
                  .filename=${e.filename}
                  .rowSpan=${e.rowSpan}
                  .colSpan=${e.colSpan}
                  .rowSpanLg=${e.rowSpanLg}
                  .colSpanLg=${e.colSpanLg}
                  .rowSpanXl=${e.rowSpanXl}
                  .colSpanXl=${e.colSpanXl}
                >
                  ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                </ha-button>
              </div>
            </ha-card>`:""}
          </div>
          `}_handleDeviceViewDisplayGroupedClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;this.deviceViewDisplayGrouped=t,s.A.set("dwains_dashboard_deviceViewDisplayGrouped",t,{expires:365})}_renderAreaViewEntityCard(e,t){return c.qy`
            <div>
              <ha-card class="p-2">
                ${(0,p.A)(this._hass,"entity.title")}:<br>
                <span class="break-words">
                ${e}
                </span>
              </ha-card>
              <ha-card>
                <div class="card-actions">
                  ${"hidden"==t?c.qy`
                  <ha-button 
                    .entity="${e}"
                    .key=${"hidden"}
                    .value=${!1}
                    @click=${this._handleEntityEditBoolValueClick} 
                  >
                    ${(0,p.A)(this._hass,"entity.unhide")}
                  </ha-button>`:""}
                  ${"disabled"==t?c.qy`
                  <ha-button 
                    .entity="${e}"
                    .key=${"disabled"}
                    .value=${!1}
                    @click=${this._handleEntityEditBoolValueClick} 
                  >
                    ${(0,p.A)(this._hass,"entity.enable")}
                  </ha-button>`:""}
                </div>
              </ha-card>
            </div>
          `}_renderDeviceView(e){if(this.selectedDevice!=e.domain)return c.qy``;const t=this.selectedDevice==e.domain?"block":"hidden";return c.qy`
              <div class="w-full mb-12 ${t}" id="${e.domain}">
                <div class="flex justify-between">
                  <div>
                    <h2 class="font-semibold text-lg capitalize">
                      ${(0,p.A)(this._hass,"device."+e.domain)}
                    </h2>
                    <span class="text-gray">
                      ${e.cards.length} ${(0,p.A)(this._hass,"entity.title_plural")}
                    </span>
                  </div>
                  <div>
                    <ha-dropdown
                      class="ha-icon-overflow-menu-overflow"
                      corner="BOTTOM_START"
                      absolute
                    >
                      <ha-icon-button
                       label=${this._hass.localize("ui.common.overflow_menu")}
                        .path=${d.TdJ}
                        slot="trigger"
                      ></ha-icon-button>
                        ${this.deviceViewDisplayGrouped?c.qy`
                          <ha-list-item
                            graphic="icon"
                            .value=${!1}
                            .key=${"deviceViewDisplayGrouped"}
                            @click="${this._handleDeviceViewDisplayGroupedClicked}"
                          >
                            <div slot="graphic">
                            <ha-icon .icon=${"mdi:grid"}></ha-icon>
                            </div>
                            ${(0,p.A)(this._hass,"device.ungroup")}
                          </ha-list-item>
                          `:c.qy`
                          <ha-list-item
                            graphic="icon"
                            .value=${!0}
                            .key=${"deviceViewDisplayGrouped"}
                            @click="${this._handleDeviceViewDisplayGroupedClicked}"
                          >
                            <div slot="graphic">
                              <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                            </div>
                            ${(0,p.A)(this._hass,"device.group")}
                          </ha-list-item>`}
                        ${this._hass.user.is_admin?c.qy`
                          ${this.deviceViewEditMode?c.qy`
                            <ha-list-item
                              graphic="icon"
                              .value=${!1}
                              @click=${this._handleDeviceViewEditModeClicked}
                            >
                              <div slot="graphic">
                                <ha-svg-icon .path=${d.CZ3}></ha-svg-icon>
                              </div>
                              ${(0,p.A)(this._hass,"global.disable_edit_mode")}
                            </ha-list-item>`:c.qy`
                            <ha-list-item
                              graphic="icon"
                              .value=${!0}
                              @click=${this._handleDeviceViewEditModeClicked}
                            >
                              <div slot="graphic">
                                <ha-svg-icon .path=${d.CZ3}></ha-svg-icon>
                              </div>
                              ${(0,p.A)(this._hass,"global.enable_edit_mode")}
                            </ha-list-item>
                            `}
                        `:""}
                    </ha-dropdown>
                  </div>
                </div>
                ${this.deviceViewEditMode?c.qy`
                <button type="button" 
                  @click=${this._addLovelaceCard}
                  .domain=${e.domain}
                  .position=${"top"}
                  class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                  </svg>
                  <span class="mt-2 block text-sm font-medium text-gray">
                    ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
                  </span>
                </button>`:""}

                ${this._renderDeviceViewCustomCards(e,"top")}

                ${this._renderDeviceViewCards(e)}

                ${this._renderDeviceViewCustomCards(e,"bottom")}

                ${this.deviceViewEditMode?c.qy`
                  ${e.entitiesNoState.length?c.qy`
                    <div class="mb-5">
                      <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"entity.unavailable")}</h3>
                      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                      ${e.entitiesNoState.map((e=>c.qy`${this._renderAreaViewEntityCard(e,"noState")}`))}
                      </div>
                    </div>`:""}
                  ${e.entitiesHidden.length?c.qy`
                    <div class="mb-5">
                      <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"entity.hidden")}</h3>
                      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                      ${e.entitiesHidden.map((e=>c.qy`${this._renderAreaViewEntityCard(e,"hidden")}`))}
                      </div>
                    </div>`:""}
                  ${e.entitiesDisabled.length?c.qy`
                    <div class="mb-5">
                      <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"entity.disabled")}</h3>
                      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                      ${e.entitiesDisabled.map((e=>c.qy`${this._renderAreaViewEntityCard(e,"disabled")}`))}
                      </div>
                    </div>`:""}
                `:""}

                ${this.deviceViewEditMode?c.qy`
                <button type="button" 
                  @click=${this._addLovelaceCard}
                  .domain=${e.domain}
                  .position=${"bottom"}
                  class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                  </svg>
                  <span class="mt-2 block text-sm font-medium text-gray">
                    ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
                  </span>
                </button>`:""}
              </div>`}render(){return null==this.data||0===Object.keys(this.data).length?c.qy``:c.qy`
                <div class="flex flex-wrap">
                  <div class="w-full ${this.configuration.homepage_header.v2_mode?"":"lg-w-1-2 xl-w-1-3"} ${window.location.hash?this.configuration.homepage_header.v2_mode?"hidden":"hidden lg-block":""} p-4">
                    <div id="devices">
                      <div class="flex justify-between mb-2">
                        <div>
                          <h2 class="font-semibold text-lg capitalize">
                            ${(0,p.A)(this._hass,"device.title_plural")}
                          </h2>
                          <span class="text-gray">
                            ${Object.keys(this.data).length} ${(0,p.A)(this._hass,"device.title_plural")}
                          </span>
                        </div>
                        <div>
                          ${this._hass.user.is_admin?c.qy`
                          <ha-dropdown
                            class="ha-icon-overflow-menu-overflow"
                            corner="BOTTOM_END"
                            absolute
                          >
                            <ha-icon-button
                             label=${this._hass.localize("ui.common.overflow_menu")}
                              .path=${d.TdJ}
                              slot="trigger"
                            ></ha-icon-button>
                              ${this.deviceEditMode?c.qy`
                                <ha-list-item
                                  graphic="icon"
                                  .value=${!1}
                                  @click=${this._handleDeviceEditModeClicked}
                                >
                                  <div slot="graphic">
                                    <ha-svg-icon .path=${d.CZ3}></ha-svg-icon>
                                  </div>
                                  ${(0,p.A)(this._hass,"global.disable_edit_mode")}
                                </ha-list-item>`:c.qy`
                                <ha-list-item
                                  graphic="icon"
                                  .value=${!0}
                                  @click=${this._handleDeviceEditModeClicked}
                                >
                                  <div slot="graphic">
                                    <ha-svg-icon .path=${d.CZ3}></ha-svg-icon>
                                  </div>
                                  ${(0,p.A)(this._hass,"global.enable_edit_mode")}
                                </ha-list-item>
                                `}
                          </ha-dropdown>
                          `:""}
                        </div>
                      </div>
    
                      <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration.homepage_header.v2_mode?"lg-grid-cols-4 xl-grid-cols-5":""} gap-4" id="sortable">
                        ${Object.values(this.data).map((e=>this._renderDeviceButton(e)))}
                      </div>

                      ${this.deviceEditMode?c.qy`
                        ${this.disabledDevices.length?c.qy`
                          <div class="mb-5">
                            <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"device.hidden")}</h3>
                            <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                            ${this.disabledDevices.map((e=>c.qy`${this._renderDeviceButtonCard(e,"disabled")}`))}
                            </div>
                          </div>`:""}
                      `:""}
                    </div>
                  </div>
                  <div class="w-full ${this.configuration.homepage_header.v2_mode?"":"lg-w-1-2 xl-w-2-3"} ${window.location.hash?"":this.configuration.homepage_header.v2_mode?"hidden":"hidden lg-block"} p-4">
                    ${Object.values(this.data).map((e=>this._renderDeviceView(e)))}
                  </div>
                </div>
                <div class="sticky z-30 bottom-0 ${window.location.hash?"":"hidden"} ${this.configuration.homepage_header.v2_mode?"":"lg-hidden"} text-right">
                <div @click=${this._backButtonClick} class="back-button">
                    <div class="button">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                </div>
                </div>
            `}static get styles(){return c.AH`
            .back-button {
              margin-right: 1rem;
              margin-bottom: 3.4rem;
              display: inline-block;
            }
            .back-button .button {
              background-color: var(--secondary-background-color);
              padding: 0.75rem;
              border-radius: 9999px;
              margin-bottom: env(safe-area-inset-bottom);
            }
            .card-actions {
              text-align: right;
            }
            .card-actions-multiple {
              display: flex;
              justify-content: space-between;
              padding: 0.25rem 0.5rem;
            }
            .sortable-move {
              cursor: -webkit-grabbing;
              cursor: grab;
              margin: auto 0;
            }
            .device-button .info ha-icon, .ha-icon ha-icon {
              display: inline-block;
              margin: auto;
              --mdc-icon-size: 100% !important;
              --iron-icon-width: 100% !important;
              --iron-icon-height: 100% !important;
            }
            #badges {
              cursor: pointer;
              background: var( --ha-card-background, var(--card-background-color, white) );
              box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
              color: var(--primary-text-color);
            } 
            .break-words {
              overflow-wrap: break-word;
            }
            .device-button {
              cursor: pointer;
              background: var( --ha-card-background, var(--card-background-color, white) );
              border-radius: var(--ha-card-border-radius, 4px);
              box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
              color: var(--primary-text-color);
            }
            @media (min-width: 1024px) {
              .device-button.current {
                background: transparent;
                z-index: 1;
                position: relative;
              }
              .device-button.current::before {
                content: "";
                position: absolute;
                top: 0; 
                left: 0;
                width: 100%; 
                height: 100%;  
                opacity: .12; 
                z-index: -1;
                background: var(--sidebar-selected-icon-color);
                border-radius: var(--ha-card-border-radius, 4px);
              }
            }
            /*styling tailwind dwains version*/
            *, ::after, ::before {
              box-sizing: border-box;
            }
            h1,h2,h3 {
              margin: 0;
            }
            h3 {
              font-size: 1em;
            }
            .absolute {
              position: absolute
            }
            .relative {
                position: relative
            }
            .sticky {
                position: -webkit-sticky;
                position: sticky
            }
            .top-0 {
                top: 0px
            }
            .bottom-0 {
                bottom: 0px
            }
            .z-30 {
                z-index: 7;
            }
            .col-span-1 {
                grid-column: span 1 / span 1
            }
            .col-span-2 {
                grid-column: span 2 / span 2
            }
            .row-span-1 {
                grid-row: span 1 / span 1
            }
            .row-span-2 {
                grid-row: span 2 / span 2
            }
            .my-4 {
                margin-top: 1rem;
                margin-bottom: 1rem
            }
            .mx-auto {
              margin-left: auto;
              margin-right: auto
            }
            .mb-2 {
                margin-bottom: 0.5rem
            }
            .mb-4 {
                margin-bottom: 1rem
            }
            .mt-4 {
                margin-top: 1rem
            }
            .mr-0\.5 {
                margin-right: 0.125rem
            }
            .mr-0 {
                margin-right: 0px
            }
            .mb-12 {
                margin-bottom: 3rem
            }
            .mb-5 {
                margin-bottom: 1.25rem
            }
            .mb-16 {
                margin-bottom: 4rem
            }
            .ml-4 {
                margin-left: 1rem
            }
            .block {
                display: block
            }
            .inline-block {
                display: inline-block
            }
            .flex {
                display: flex
            }
            .inline-flex {
                display: inline-flex
            }
            .grid {
                display: grid
            }
            .hidden {
                display: none
            }
            .h-6 {
                height: 1.5rem
            }
            .h-44 {
                height: 11rem
            }
            .h-full {
                height: 100%
            }
            .h-14 {
                height: 3.5rem
            }
            .h-8 {
                height: 2rem
            }
            .w-full {
                width: 100%
            }
            .w-6 {
                width: 1.5rem
            }
            .w-14 {
                width: 3.5rem
            }
            .w-8 {
                width: 2rem
            }
            .w-12 {
              width: 3rem
            }
            .cursor-pointer {
                cursor: pointer
            }
            .grid-flow-row-dense {
                grid-auto-flow: row dense
            }
            .grid-cols-1 {
                grid-template-columns: repeat(1, minmax(0, 1fr))
            }
            .grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr))
            }
            .flex-wrap {
                flex-wrap: wrap
            }
            .content-between {
                align-content: space-between
            }
            .items-center {
                align-items: center
            }
            .justify-between {
                justify-content: space-between
            }
            .gap-4 {
                gap: 1rem
            }
            .space-y-0.5 > :not([hidden]) ~ :not([hidden]) {
                --tw-space-y-reverse: 0;
                margin-top: calc(0.125rem * calc(1 - var(--tw-space-y-reverse)));
                margin-bottom: calc(0.125rem * var(--tw-space-y-reverse))
            }
            .space-y-0 > :not([hidden]) ~ :not([hidden]) {
                --tw-space-y-reverse: 0;
                margin-top: calc(0px * calc(1 - var(--tw-space-y-reverse)));
                margin-bottom: calc(0px * var(--tw-space-y-reverse))
            }
            .rounded {
                border-radius: 0.25rem
            }
            .rounded-md {
                border-radius: 0.375rem
            }
            .bg-gray-800 {
                --tw-bg-opacity: 1;
                background-color: rgb(31 41 55 / var(--tw-bg-opacity))
            }
            .rounded-lg {
              border-radius: 0.5rem
            }
            .border-2 {
                border-width: 2px
            }
            .border-dashed {
                border-style: dashed
            }
            .border-gray-300 {
                --tw-border-opacity: 1;
                border-color: rgb(209 213 219 / var(--tw-border-opacity))
            }
            .bg-gray-800 {
                --tw-bg-opacity: 1;
                background-color: rgb(31 41 55 / var(--tw-bg-opacity))
            }
            .bg-opacity-50 {
                --tw-bg-opacity: 0.5
            }
            .p-2 {
              padding: 0.5rem;
            }
            .p-4 {
                padding: 1rem
            }
            .p-1 {
                padding: 0.25rem
            }
            .p-3 {
                padding: 0.75rem
            }
            .px-1 {
                padding-left: 0.25rem;
                padding-right: 0.25rem
            }
            .p-12 {
              padding: 3rem
            }
            .py-0\.5 {
                padding-top: 0.125rem;
                padding-bottom: 0.125rem
            }
            .py-0 {
                padding-top: 0px;
                padding-bottom: 0px
            }
            .text-center {
              text-align: center
            }
            .text-right {
                text-align: right
            }
            .text-xl {
                font-size: 1.5rem;
                line-height: 2rem
            }
            .text-lg {
                font-size: 1.125rem;
                line-height: 1.75rem
            }
            .text-sm {
                font-size: 0.875rem;
                line-height: 1.25rem
            }
            .text-xs {
                font-size: 0.75rem;
                line-height: 1rem
            }
            .font-semibold {
                font-weight: 600
            }
            .font-medium {
                font-weight: 500
            }
            .capitalize {
                text-transform: capitalize
            }
            .text-gray {
                color: var(--secondary-text-color);
            }
            .text-white {
                --tw-text-opacity: 1;
                color: rgb(255 255 255 / var(--tw-text-opacity))
            }
            @media (min-width: 768px) {
                .md-grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr))
                }
            }
            @media (min-width: 1024px) {
                .lg-col-span-1 {
                    grid-column: span 1 / span 1
                }
                .lg-col-span-3 {
                    grid-column: span 3 / span 3
                }
                .lg-col-span-2 {
                    grid-column: span 2 / span 2
                }
                .lg-row-span-1 {
                    grid-row: span 1 / span 1
                }
                .lg-row-span-3 {
                    grid-row: span 3 / span 3
                }
                .lg-row-span-2 {
                    grid-row: span 2 / span 2
                }
                .lg-block {
                    display: block
                }
                .lg-hidden {
                    display: none
                }
                .lg-w-1-2 {
                    width: 50%
                }
                .lg-grid-cols-2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr))
                }
                .lg-grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr))
                }
                .lg-grid-cols-4 {
                  grid-template-columns: repeat(4, minmax(0, 1fr))
                }
            }
            @media (min-width: 1536px) {
              .xl-col-span-1 {
                  grid-column: span 1 / span 1
              }
              .xl-col-span-4 {
                  grid-column: span 4 / span 4
              }
              .xl-col-span-2 {
                  grid-column: span 2 / span 2
              }
              .xl-row-span-1 {
                  grid-row: span 1 / span 1
              }
              .xl-row-span-4 {
                  grid-row: span 4 / span 4
              }
              .xl-row-span-2 {
                  grid-row: span 2 / span 2
              }
              .xl-w-1-3 {
                  width: 33.333333%
              }
              .xl-w-2-3 {
                  width: 66.666667%
              }
              .xl-grid-cols-4 {
                  grid-template-columns: repeat(4, minmax(0, 1fr))
              }
              .xl-grid-cols-5 {
                grid-template-columns: repeat(5, minmax(0, 1fr))
              }
          }
          `}}customElements.define("devices-card",u)},973:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(177),s=i(89);const r=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(r).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
        .edit-element {
          padding: 20px;
        }
        .add-button {
          font-size: 16px;
          border: 2px solid #4591B8;
          padding: 5px;
          margin-bottom: 50px;
          background: #459CEE;
          border-radius: 20px;
          color: white;
        }
        .card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: .75rem;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        `]}setConfig(e){this.hass=window.__dd_get_hass(),this.areaId=e.areaId,this.icon=e.icon?e.icon:"",this.floor=e.floor?e.floor:"",this.disableArea=!!e.disableArea&&e.disableArea}async connectedCallback(){super.connectedCallback();const e=await window.loadCardHelpers(),t=await e.createCardElement({type:"button"});await t.constructor.getConfigElement()}_iconPickerChange(e){this.icon=e.detail.value}_floorChanged(e){this.floor=e.target.value}_disableValueChanged(e){this.disableArea=e.target.checked}_saveButton(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation(),this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_area_button",icon:this.icon,areaId:this.areaId,floor:this.floor,disableArea:this.disableArea}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}render(){return n.qy`
      <style>.edit-element{max-width:460px;margin-left:auto;margin-right:auto}.edit-element ha-icon-picker,.edit-element ha-textfield,.edit-element ha-select,.edit-element ha-entity-picker{display:block;margin:.8rem 0}.edit-element ha-formfield{display:flex;align-items:center;gap:.6rem;margin:.9rem 0;padding-inline-start:.25rem}.edit-element ha-formfield label{display:inline-block;color:var(--primary-text-color);font-size:.95rem;line-height:1.3;white-space:normal}</style>
      <div class="edit-element">
          <ha-formfield>
            <ha-checkbox
              @change=${this._disableValueChanged}
              .checked=${this.disableArea}>
            </ha-checkbox>
            <span slot="label">${(0,o.A)(this.hass,"area.disable")}</span>
          </ha-formfield>
          <div class="card-footer">
            <ha-button slot="secondaryAction" @click=${e=>(0,s.f)()}>
              ${this.hass.localize("ui.common.cancel")}
            </ha-button>
            <ha-button slot="primaryAction" @click=${this._saveButton}>
              ${this.hass.localize("ui.common.submit")}
            </ha-button>
          </div>
      </div>
      `}}customElements.define("dwains-edit-area-button-card",e)}))},166:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(177),s=i(89);const r=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(r).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
          .edit-element {
            padding: 20px;
          }
          .add-button {
            font-size: 16px;
            border: 2px solid #4591B8;
            padding: 5px;
            margin-bottom: 50px;
            background: #459CEE;
            border-radius: 20px;
            color: white;
          }
          .card-footer {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: .75rem;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          ha-formfield {
            padding: 16px 6px;
          }
          `]}setConfig(e){this.hass=window.__dd_get_hass(),this.device=e.device,this.icon=e.icon?e.icon:"",this.showInNavbar=!!e.showInNavbar&&e.showInNavbar}async connectedCallback(){if(super.connectedCallback(),customElements.get("ha-yaml-editor"))return;const e=document.createElement("partial-panel-resolver").getRoutes([{component_name:"developer-tools",url_path:"a"}]);await e.routes.a.load();const t=document.createElement("developer-tools-router");await t.routerOptions.routes.service.load()}_iconPickerChange(e){this.icon=e.detail.value}_showInMainNavbarValueChanged(e){this.showInNavbar=e.target.checked}_saveButton(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation(),!this.showInNavbar||this.icon?this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_device_button",icon:this.icon,device:this.device,showInNavbar:this.showInNavbar}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)})):alert((0,o.A)(this.hass,"device.icon_required"))}render(){return n.qy`
        <style>.edit-element{max-width:460px;margin-left:auto;margin-right:auto}.edit-element ha-icon-picker,.edit-element ha-textfield,.edit-element ha-select,.edit-element ha-entity-picker{display:block;margin:.8rem 0}.edit-element ha-formfield{display:flex;align-items:center;gap:.6rem;margin:.9rem 0;padding-inline-start:.25rem}.edit-element ha-formfield label{display:inline-block;color:var(--primary-text-color);font-size:.95rem;line-height:1.3;white-space:normal}</style>
      <div class="edit-element">
            <ha-icon-picker
             label=${(0,o.A)(this.hass,"device.icon")}
              .value=${this.icon}
              @value-changed=${this._iconPickerChange}
            ></ha-icon-picker>

            <ha-formfieldlabel=${(0,o.A)(this.hass,"device.show_in_navbar")}>
              <ha-switch
                @change=${this._showInMainNavbarValueChanged}
                .checked=${this.showInNavbar}
              ></ha-switch>
            </ha-formfield>

            <div class="card-footer">
              <ha-button slot="secondaryAction" @click=${e=>(0,s.f)()}>
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
              <ha-button slot="primaryAction" @click=${this._saveButton}>
                ${this.hass.localize("ui.common.submit")}
              </ha-button>
            </div>
        </div>
        `}}customElements.define("dwains-edit-device-button-card",e)}))},640:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(177),s=i(89);const r=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(r).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
          .edit-element {
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            font-size: inherit;
          }
          blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
            margin: 0;
          }
          .add-button {
            font-size: 16px;
            border: 2px solid #4591B8;
            padding: 5px;
            margin-bottom: 50px;
            background: #459CEE;
            border-radius: 20px;
            color: white;
          }
          .card-footer {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: .75rem;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          .grid {
            display: grid;
            gap: 2rem;
          }
          @media (min-width: 768px){
            .grid-cols-2 {
              grid-template-columns: repeat(2,minmax(0,1fr));
            }
          }
          .pre-select {
            padding: 2.5rem;
          }
          .pre-select-option {
            padding: 2.5rem;
            border: 1px solid #4591B8;
            text-align: center;
            cursor: pointer;
          }
          .pre-selected-option:hover {
            border: 2px solid #4591B8;
          }
          .more-page-settings {
            padding: 0.75rem;
            border: 2px solid grey;
          }
          .seperator {
            background-color: var(--secondary-background-color);
            width: 100%;
            height: 3px;
            margin-top: 15px;
            margin-bottom: 15px;
          }
          /*Start blueprint table*/
          .min-w-full {
            min-width: 100%;
          }
          table {
              text-indent: 0;
              border-color: inherit;
              border-collapse: collapse;
          }
          .bg-gray-50 {
            background-color: var(--secondary-background-color);
          }
          .tracking-wider {
              letter-spacing: .05em;
          }
          .text-sm {
            font-size: .875rem;
            line-height: 1.25rem;
          }
          .py-4 {
              padding-top: 1rem;
              padding-bottom: 1rem;
          }
          .uppercase {
              text-transform: uppercase;
          }
          .font-medium {
              font-weight: 500;
          }
          .text-xs {
              font-size: .75rem;
              line-height: 1rem;
          }
          .text-left {
              text-align: left;
          }
          .px-6 {
              padding-left: 1.5rem;
              padding-right: 1.5rem;
          }
          .py-3 {
              padding-top: 0.75rem;
              padding-bottom: 0.75rem;
          }
          .card-footer-multiple {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          `]}static get properties(){return{mode:{},blueprints:{}}}setConfig(e){if(this.hass=window.__dd_get_hass(),this.mode=e.mode?e.mode:"dwains-dashboard-blueprint-select",this.domain=e.domain,e.cardConfig){const t=e.cardConfig;delete t.input_entity,delete t.input_name,this.cardConfig=t}else this.cardConfig="";this.existingCardEdit=!!e.existingCardEdit&&e.existingCardEdit;const t=document.createElement("hui-masonry-view");t.lovelace={editMode:!0},t.willUpdate(new Map)}async connectedCallback(){super.connectedCallback(),await this._loadBlueprints();const e=await window.loadCardHelpers(),t=await e.createCardElement({type:"button"});await t.constructor.getConfigElement()}async _loadBlueprints(){this.blueprints=await this.hass.callWS({type:"dwains_dashboard/get_blueprints"})}_switchMode(e){const t=e.currentTarget.mode;this.mode=t,this.requestUpdate()}_removeCard(){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_device_card",domain:this.domain}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_handleDeleteBlueprintClicked(e){const t=e.currentTarget.blueprint;this.hass.connection.sendMessagePromise({type:"dwains_dashboard/delete_blueprint",blueprint:t}).then((e=>{console.log(e),this._loadBlueprints(),this.requestUpdate()}),(e=>{console.error("Message failed!",e)}))}_handleUseBlueprintClicked(e){const t=e.currentTarget.blueprint,i=JSON.stringify({type:"custom:dwains-blueprint-card",blueprint:t,card:this.blueprints.blueprints[t].card});this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_device_card",cardData:i,domain:this.domain}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_installBlueprintYamlChanged(e){this.installBlueprintYaml=e.target.value}_handleInstallBlueprintClicked(e){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/install_blueprint",yamlCode:JSON.stringify(this.installBlueprintYaml)}).then((e=>{console.log(e),e.succesfull?(alert(this.hass.localize("ui.common.successfully_saved")),this._loadBlueprints(),this.requestUpdate()):alert(e.error)}),(e=>{console.error("Message failed!",e)}))}_checkCustomCard(e){const t=customElements.get(e);return n.qy`
          <div>
            ${t?n.qy`
              <ha-icon
                style="color: green;"
                .icon=${"mdi:check-bold"}
              ></ha-icon>`:n.qy`
              <ha-icon
                style="color: red;"
                .icon=${"mdi:close-thick"}
              ></ha-icon>
              `}
            ${e}
            ${t?n.qy`(${(0,o.A)(this.hass,"blueprint.installed")})`:n.qy`(${(0,o.A)(this.hass,"blueprint.not_installed")})`}
          </div>
        `}render(){if(null==this.blueprints||0===this.blueprints.length)return n.qy`Loading...`;if("dwains-dashboard-blueprint-select"==this.mode){const e=Object.entries(this.blueprints.blueprints).sort((function(e,t){let i=e[1].blueprint.type,a=t[1].blueprint.type;return i==a?0:i>a?1:-1}));return n.qy`
          <div class="edit-element">  
            <strong>${(0,o.A)(this.hass,"blueprint.installed_blueprints")}:</strong>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.title")}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"global.version")}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.type")}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.used_custom_cards")}</th>
                  <th scope="col" class="relative px-6 py-3">
                  </th>
                </tr>
              </thead>
              <tbody>
                ${0==Object.values(this.blueprints.blueprints).length?n.qy`
                  <tr>
                    <td  class="px-6 py-4" colspan="5">${(0,o.A)(this.hass,"blueprint.no_blueprints_installed")}</td>
                  </tr>`:n.qy`
                  ${Object.entries(e).map((([e,t])=>n.qy`
                          <tr class="bg-white">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <h3>${t[1].blueprint.name}</h3>
                              ${t[1].blueprint.description}
                            </td>
                            <td class="px-6 py-4">
                              ${t[1].blueprint.version}
                            </td>
                            <td class="px-6 py-4">
                              ${t[1].blueprint.type}
                            </td>
                            <td class="px-6 py-4">
                              ${t[1].blueprint.custom_cards&&0!==t[1].blueprint.custom_cards.length?n.qy`
                                  ${t[1].blueprint.custom_cards.map((e=>this._checkCustomCard(e)))}
                                `:"None"}
                            </td>
                            <td>
                              ${"replace-card"==t[1].blueprint.type?n.qy`
                                <ha-button .blueprint=${t[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                                  ${(0,o.A)(this.hass,"blueprint.use")}
                                </ha-button>
                              `:""}
                              <ha-button .blueprint=${t[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                                <ha-icon
                                  .icon=${"mdi:delete"}
                                ></ha-icon>
                              </ha-button>
                            </td>
                          </tr>
                        `))}
                  `}
              </tbody>
            </table>
            <div class="seperator"></div>
            <strong>${(0,o.A)(this.hass,"blueprint.install")}</strong>
            <p>${(0,o.A)(this.hass,"blueprint.instruction")}</p>
            <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
            <ha-yaml-editor
             label=${(0,o.A)(this.hass,"blueprint.yaml_code")}
              name="description"
              @value-changed=${this._installBlueprintYamlChanged}
            ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <ha-button @click=${this._handleInstallBlueprintClicked} unelevated>
                ${(0,o.A)(this.hass,"blueprint.install")}
              </ha-button>
            </div>
          </div>`}return"current-selected-blueprint"==this.mode?n.qy`
            <div class="edit-element">
              <p>
              ${(0,o.A)(this.hass,"device.current_blueprint_card")} ${(0,o.A)(this.hass,"device."+this.domain)}:<br>
                <strong>${this.blueprints.blueprints[this.cardConfig.blueprint].blueprint.name}</strong><br>
                ${this.blueprints.blueprints[this.cardConfig.blueprint].blueprint.description}
              </p>

              <div class="card-footer-multiple">
                ${this.existingCardEdit?n.qy`
                    <div>
                      <ha-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</ha-button>
                      <ha-button class="warning" @click=${e=>this.mode="dwains-dashboard-blueprint-select"}}>${this.hass.localize("ui.common.previous")}</ha-button>
                    </div>
                  `:n.qy`<div></div>`}
                <div>
                  <ha-button slot="secondaryAction" @click=${e=>(0,s.f)()}>
                    ${this.hass.localize("ui.common.cancel")}
                  </ha-button>
                  <ha-button slot="primaryAction" .blueprint=${this.cardConfig.blueprint} @click=${this._handleUseBlueprintClicked}>
                    ${this.hass.localize("ui.common.submit")}
                  </ha-button>
                </div>
              </div>
            </div>
          `:void 0}}customElements.define("dwains-edit-device-card-card",e)}))},468:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(177),s=i(89);const r=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(r).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
          .edit-element {
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            font-size: inherit;
          }
          blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
            margin: 0;
          }
          .add-button {
            font-size: 16px;
            border: 2px solid #4591B8;
            padding: 5px;
            margin-bottom: 50px;
            background: #459CEE;
            border-radius: 20px;
            color: white;
          }
          .card-footer {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: .75rem;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          .grid {
            display: grid;
            gap: 2rem;
          }
          @media (min-width: 768px){
            .grid-cols-2 {
              grid-template-columns: repeat(2,minmax(0,1fr));
            }
          }
          .pre-select {
            padding: 2.5rem;
          }
          .pre-select-option {
            padding: 2.5rem;
            border: 1px solid #4591B8;
            text-align: center;
            cursor: pointer;
          }
          .pre-selected-option:hover {
            border: 2px solid #4591B8;
          }
          .more-page-settings {
            padding: 0.75rem;
            border: 2px solid grey;
          }
          .seperator {
            background-color: var(--secondary-background-color);
            width: 100%;
            height: 3px;
            margin-top: 15px;
            margin-bottom: 15px;
          }
          /*Start blueprint table*/
          .min-w-full {
            min-width: 100%;
          }
          table {
              text-indent: 0;
              border-color: inherit;
              border-collapse: collapse;
          }
          .bg-gray-50 {
            background-color: var(--secondary-background-color);
          }
          .tracking-wider {
              letter-spacing: .05em;
          }
          .text-sm {
            font-size: .875rem;
            line-height: 1.25rem;
          }
          .py-4 {
              padding-top: 1rem;
              padding-bottom: 1rem;
          }
          .uppercase {
              text-transform: uppercase;
          }
          .font-medium {
              font-weight: 500;
          }
          .text-xs {
              font-size: .75rem;
              line-height: 1rem;
          }
          .text-left {
              text-align: left;
          }
          .px-6 {
              padding-left: 1.5rem;
              padding-right: 1.5rem;
          }
          .py-3 {
              padding-top: 0.75rem;
              padding-bottom: 0.75rem;
          }
          .card-footer-multiple {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-top: 1px solid var(--divider-color);
          }
          `]}static get properties(){return{mode:{},blueprints:{}}}setConfig(e){if(this.hass=window.__dd_get_hass(),this.mode=e.mode?e.mode:"dwains-dashboard-blueprint-select",this.domain=e.domain,e.cardConfig){const t=e.cardConfig;delete t.input_entity,delete t.input_name,this.cardConfig=t}else this.cardConfig="";this.existingCardEdit=!!e.existingCardEdit&&e.existingCardEdit}async connectedCallback(){super.connectedCallback(),await this._loadBlueprints()}async _loadBlueprints(){this.blueprints=await this.hass.callWS({type:"dwains_dashboard/get_blueprints"});const e=await window.loadCardHelpers(),t=await e.createCardElement({type:"button"});await t.constructor.getConfigElement()}_switchMode(e){const t=e.currentTarget.mode;this.mode=t,this.requestUpdate()}_removeCard(){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_device_popup",domain:this.domain}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_handleDeleteBlueprintClicked(e){const t=e.currentTarget.blueprint;this.hass.connection.sendMessagePromise({type:"dwains_dashboard/delete_blueprint",blueprint:t}).then((e=>{console.log(e),this._loadBlueprints(),this.requestUpdate()}),(e=>{console.error("Message failed!",e)}))}_handleUseBlueprintClicked(e){const t=e.currentTarget.blueprint,i=JSON.stringify({type:"custom:dwains-blueprint-card",blueprint:t,card:this.blueprints.blueprints[t].card});this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_device_popup",cardData:i,domain:this.domain}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_installBlueprintYamlChanged(e){this.installBlueprintYaml=e.target.value}_handleInstallBlueprintClicked(e){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/install_blueprint",yamlCode:JSON.stringify(this.installBlueprintYaml)}).then((e=>{console.log(e),e.succesfull?(alert(this.hass.localize("ui.common.successfully_saved")),this._loadBlueprints(),this.requestUpdate()):alert(e.error)}),(e=>{console.error("Message failed!",e)}))}_checkCustomCard(e){const t=customElements.get(e);return n.qy`
          <div>
            ${t?n.qy`
              <ha-icon
                style="color: green;"
                .icon=${"mdi:check-bold"}
              ></ha-icon>`:n.qy`
              <ha-icon
                style="color: red;"
                .icon=${"mdi:close-thick"}
              ></ha-icon>
              `}
            ${e}
            ${t?n.qy`(${(0,o.A)(this.hass,"blueprint.installed")})`:n.qy`(${(0,o.A)(this.hass,"blueprint.not_installed")})`}
          </div>
        `}render(){if("dwains-dashboard-blueprint-select"==this.mode){const e=Object.entries(this.blueprints.blueprints).sort((function(e,t){let i=e[1].blueprint.type,a=t[1].blueprint.type;return i==a?0:i>a?1:-1}));return n.qy`
          <div class="edit-element">  
            <strong>${(0,o.A)(this.hass,"blueprint.installed_blueprints")}:</strong>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.title")}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"global.version")}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.type")}</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,o.A)(this.hass,"blueprint.used_custom_cards")}</th>
                  <th scope="col" class="relative px-6 py-3">
                  </th>
                </tr>
              </thead>
              <tbody>
              ${Object.entries(e).map((([e,t])=>n.qy`
                      <tr class="bg-white">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <h3>${t[1].blueprint.name}</h3>
                          ${t[1].blueprint.description}
                        </td>
                        <td class="px-6 py-4">
                          ${t[1].blueprint.version}
                        </td>
                        <td class="px-6 py-4">
                          ${t[1].blueprint.type}
                        </td>
                        <td class="px-6 py-4">
                          ${t[1].blueprint.custom_cards&&0!==t[1].blueprint.custom_cards.length?n.qy`
                              ${t[1].blueprint.custom_cards.map((e=>this._checkCustomCard(e)))}
                            `:"None"}
                        </td>
                        <td>
                          ${"replace-card"==t[1].blueprint.type?n.qy`
                            <ha-button .blueprint=${t[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                              ${(0,o.A)(this.hass,"blueprint.use")}
                            </ha-button>
                          `:""}
                          <ha-button .blueprint=${t[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                            <ha-icon
                              .icon=${"mdi:delete"}
                            ></ha-icon>
                          </ha-button>
                        </td>
                      </tr>
                    `))}
              </tbody>
            </table>
            <div class="seperator"></div>
            <strong>${(0,o.A)(this.hass,"blueprint.install")}</strong>
            <p>${(0,o.A)(this.hass,"blueprint.instruction")}</p>
            <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
            <ha-yaml-editor
             label=${(0,o.A)(this.hass,"blueprint.yaml_code")}
              name="description"
              @value-changed=${this._installBlueprintYamlChanged}
            ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
            <div style="margin-top: 15px; margin-bottom: 20px;">
              <ha-button @click=${this._handleInstallBlueprintClicked} unelevated>
                ${(0,o.A)(this.hass,"blueprint.install")}
              </ha-button>
            </div>
          </div>`}if("current-selected-blueprint"==this.mode)return n.qy`
            <div class="edit-element">
              <p>
                ${(0,o.A)(this.hass,"device.current_blueprint_popup")} ${(0,o.A)(this.hass,"device."+this.domain)}:<br>
                <strong>${this.blueprints.blueprints[this.cardConfig.blueprint].blueprint.name}</strong><br>
                ${this.blueprints.blueprints[this.cardConfig.blueprint].blueprint.description}
              </p>
              <div class="card-footer-multiple">
                ${this.existingCardEdit?n.qy`
                    <div>
                      <ha-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</ha-button>
                      <ha-button class="warning" @click=${e=>this.mode="dwains-dashboard-blueprint-select"}}>${this.hass.localize("ui.common.previous")}</ha-button>
                    </div>
                  `:n.qy`<div></div>`}
                <div>
                  <ha-button slot="secondaryAction" @click=${e=>(0,s.f)()}>
                    ${this.hass.localize("ui.common.cancel")}
                  </ha-button>
                  <ha-button slot="primaryAction" .blueprint=${this.cardConfig.blueprint} @click=${this._handleUseBlueprintClicked}>
                    ${this.hass.localize("ui.common.submit")}
                  </ha-button>
                </div>
              </div>
            </div>
          `}}customElements.define("dwains-edit-device-popup-card",e)}))},237:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(969),s=i(177),r=i(89);const l=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(l).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
        .edit-element {
          padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
          font-size: inherit;
        }
        blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
          margin: 0;
        }
        .add-button {
          font-size: 16px;
          border: 2px solid #4591B8;
          padding: 5px;
          margin-bottom: 50px;
          background: #459CEE;
          border-radius: 20px;
          color: white;
        }
        .card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: .75rem;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        .grid {
          display: grid;
          gap: 2rem;
        }
        @media (min-width: 768px){
          .grid-cols-2 {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }
        .pre-select {
          padding: 2.5rem;
        }
        .pre-select-option {
          padding: 2.5rem;
          border: 1px solid #4591B8;
          text-align: center;
          cursor: pointer;
        }
        .pre-selected-option:hover {
          border: 2px solid #4591B8;
        }
        .more-page-settings {
          padding: 0.75rem;
          border: 2px solid grey;
        }
        .seperator {
          background-color: var(--secondary-background-color);
          width: 100%;
          height: 3px;
          margin-top: 15px;
          margin-bottom: 15px;
        }
        /*Start blueprint table*/
        .min-w-full {
          min-width: 100%;
        }
        table {
            text-indent: 0;
            border-color: inherit;
            border-collapse: collapse;
        }
        .bg-gray-50 {
          background-color: var(--secondary-background-color);
        }
        .tracking-wider {
            letter-spacing: .05em;
        }
        .text-sm {
          font-size: .875rem;
          line-height: 1.25rem;
        }
        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }
        .uppercase {
            text-transform: uppercase;
        }
        .font-medium {
            font-weight: 500;
        }
        .text-xs {
            font-size: .75rem;
            line-height: 1rem;
        }
        .text-left {
            text-align: left;
        }
        .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
        }
        .py-3 {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
        }
        .card-footer-multiple {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        `]}static get properties(){return{mode:{},blueprints:{}}}setConfig(e){if(this.hass=window.__dd_get_hass(),this.mode=e.mode?e.mode:"pre-select",this.entity_id=e.entity_id,e.cardConfig){const t=e.cardConfig;delete t.input_entity,delete t.input_name,this.cardConfig=t}else this.cardConfig="";this.existingCardEdit=!!e.existingCardEdit&&e.existingCardEdit;const t=document.createElement("hui-masonry-view");t.lovelace={editMode:!0},t.willUpdate(new Map)}async connectedCallback(){super.connectedCallback(),await this._loadBlueprints();const e=await window.loadCardHelpers(),t=await e.createCardElement({type:"button"});await t.constructor.getConfigElement()}async _loadBlueprints(){this.blueprints=await this.hass.callWS({type:"dwains_dashboard/get_blueprints"})}magicStuff(e){const t=e.detail.config.type;o.SG.includes(t)?this.cardConfig={...e.detail.config,entity:this.entity_id}:this.cardConfig=e.detail.config,this.mode="editor-element",this.requestUpdate()}magicStuffSecond(e){}_sendCard(){const e=JSON.stringify(this.cardConfig);this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entity_card",cardData:e,entityId:this.entity_id}).then((e=>{console.log(e),(0,r.f)()}),(e=>{console.error("Message failed!",e)}))}_switchMode(e){const t=e.currentTarget.mode;this.mode=t,this.requestUpdate()}_removeCard(){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_entity_card",entityId:this.entity_id}).then((e=>{console.log(e),(0,r.f)()}),(e=>{console.error("Message failed!",e)}))}_handleDeleteBlueprintClicked(e){const t=e.currentTarget.blueprint;this.hass.connection.sendMessagePromise({type:"dwains_dashboard/delete_blueprint",blueprint:t}).then((e=>{console.log(e),this._loadBlueprints(),this.requestUpdate()}),(e=>{console.error("Message failed!",e)}))}_handleUseBlueprintClicked(e){const t=e.currentTarget.blueprint;this.mode="editor-element",this.name=this.blueprints.blueprints[t].blueprint.name,this.cardConfig={type:"custom:dwains-blueprint-card",blueprint:t,input_entity:this.entity_id,card:this.blueprints.blueprints[t].card}}_installBlueprintYamlChanged(e){this.installBlueprintYaml=e.target.value}_handleInstallBlueprintClicked(e){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/install_blueprint",yamlCode:JSON.stringify(this.installBlueprintYaml)}).then((e=>{console.log(e),e.succesfull?(alert(this.hass.localize("ui.common.successfully_saved")),this._loadBlueprints(),this.requestUpdate()):alert(e.error)}),(e=>{console.error("Message failed!",e)}))}_checkCustomCard(e){const t=customElements.get(e);return n.qy`
        <div>
          ${t?n.qy`
            <ha-icon
              style="color: green;"
              .icon=${"mdi:check-bold"}
            ></ha-icon>`:n.qy`
            <ha-icon
              style="color: red;"
              .icon=${"mdi:close-thick"}
            ></ha-icon>
            `}
          ${e}
          ${t?n.qy`(${(0,s.A)(this.hass,"blueprint.installed")})`:n.qy`(${(0,s.A)(this.hass,"blueprint.not_installed")})`}
        </div>
      `}render(){if(null==this.blueprints||0===this.blueprints.length)return n.qy`Loading...`;if("pre-select"==this.mode)return n.qy`
          <ha-md-list>
            <ha-list-item twoline .mode=${"hui-card-picker"} @click=${this._switchMode}>
              ${(0,s.A)(this.hass,"editor.lovelace_card")}
              <span slot="secondary">
                ${(0,s.A)(this.hass,"editor.create_lovelace_card")}
              </span>
            </ha-list-item>
            <li divider role="separator"></li>
            <ha-list-item hasmeta twoline .mode=${"dwains-dashboard-blueprint-select"} @click=${this._switchMode}>
              ${(0,s.A)(this.hass,"editor.dwains_dashboard_blueprint")}
              <span slot="secondary">
                ${(0,s.A)(this.hass,"editor.use_dwains_dashboard_blueprint")}
              </span>
              <ha-icon-next slot="meta"></ha-icon-next
            ></ha-list-item>
          </ha-md-list>
        `;if("dwains-dashboard-blueprint-select"==this.mode){const e=Object.entries(this.blueprints.blueprints).sort((function(e,t){let i=e[1].blueprint.type,a=t[1].blueprint.type;return i==a?0:i>a?1:-1}));return n.qy`
        <div class="edit-element">

          <div style="margin-bottom: 20px;">
            <ha-button .mode=${"pre-select"} @click=${this._switchMode}>< ${this.hass.localize("ui.common.previous")}</ha-button>
          </div>

          <strong>${(0,s.A)(this.hass,"blueprint.installed_blueprints")}:</strong>
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"blueprint.title")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"global.version")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"blueprint.type")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"blueprint.used_custom_cards")}</th>
                <th scope="col" class="relative px-6 py-3">
                </th>
              </tr>
            </thead>
            <tbody>
              ${0==Object.values(this.blueprints.blueprints).length?n.qy`
                <tr>
                  <td  class="px-6 py-4" colspan="5">${(0,s.A)(this.hass,"blueprint.no_blueprints_installed")}</td>
                </tr>`:n.qy`
                  ${Object.entries(e).map((([e,t])=>n.qy`
                          <tr class="bg-white">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <h3>${t[1].blueprint.name}</h3>
                              ${t[1].blueprint.description}
                            </td>
                            <td class="px-6 py-4">
                              ${t[1].blueprint.version}
                            </td>
                            <td class="px-6 py-4">
                              ${t[1].blueprint.type}
                            </td>
                            <td class="px-6 py-4">
                              ${t[1].blueprint.custom_cards&&0!==t[1].blueprint.custom_cards.length?n.qy`
                                  ${t[1].blueprint.custom_cards.map((e=>this._checkCustomCard(e)))}
                                `:"None"}
                            </td>
                            <td>
                              ${"card"==t[1].blueprint.type||"replace-card"==t[1].blueprint.type?n.qy`
                                <ha-button .blueprint=${t[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                                  ${(0,s.A)(this.hass,"blueprint.use")}
                                </ha-button>
                              `:""}
                              <ha-button .blueprint=${t[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                                <ha-icon
                                  .icon=${"mdi:delete"}
                                ></ha-icon>
                              </ha-button>
                            </td>
                          </tr>
                        `))}
                `}
            </tbody>
          </table>
          <div class="seperator"></div>
          <strong>${(0,s.A)(this.hass,"blueprint.install")}</strong>
          <p>${(0,s.A)(this.hass,"blueprint.instruction")}</p>
          <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
          <ha-yaml-editor
           label=${(0,s.A)(this.hass,"blueprint.yaml_code")}
            name="description"
            @value-changed=${this._installBlueprintYamlChanged}
          ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
          <div style="margin-top: 15px; margin-bottom: 20px;">
            <ha-button @click=${this._handleInstallBlueprintClicked} unelevated>
              ${(0,s.A)(this.hass,"blueprint.install")}
            </ha-button>
          </div>
        </div>`}return"hui-card-picker"==this.mode?n.qy`
          <div class="edit-element">
            <h1 style="font-size: 17px; font-weight: bold;">Select the card you want to use for ${this.entity_id}</h1>
            <hui-card-picker
              @config-changed=${this.magicStuff}
              .hass=${this.hass}
              .lovelace=${{views:[]}}
            ></hui-card-picker>
            <div class="card-footer">
              <ha-button slot="secondaryAction" @click=${e=>(0,r.f)()}>
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
            </div>
          </div>
        `:n.qy`
          <div class="edit-element">
            <hui-card-element-editor
              @save-config=${this.magicStuffSecond}
              @config-changed=${this.magicStuff}
              .value=${this.cardConfig}
              .hass=${this.hass}
              lovelace=${{views:[]}}
            ></hui-card-element-editor>
            <hui-card-preview
              .hass=${this.hass}
              .config=${this.cardConfig}
            ></hui-card-preview>
            <div class="card-footer-multiple">
              ${this.existingCardEdit?n.qy`
                  <div>
                    <ha-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</ha-button>
                    <ha-button class="warning" @click=${e=>this.mode="hui-card-picker"}}>${this.hass.localize("ui.common.previous")}</ha-button>
                  </div>
                `:n.qy`<div></div>`}
              <div>
                <ha-button slot="secondaryAction" @click=${e=>(0,r.f)()}>
                  ${this.hass.localize("ui.common.cancel")}
                </ha-button>
                <ha-button slot="primaryAction" @click=${this._sendCard}>
                  ${this.hass.localize("ui.common.submit")}
                </ha-button>
              </div>
            </div>
          </div>
        `}}customElements.define("dwains-edit-entity-card-card",e)}))},826:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(177),s=i(89);const r=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(r).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
        h2 {
          margin: 0;
          font-size: 1rem;
        }
        .edit-element {
          padding: 20px;
        }
        .add-button {
          font-size: 16px;
          border: 2px solid #4591B8;
          padding: 5px;
          margin-bottom: 50px;
          background: #459CEE;
          border-radius: 20px;
          color: white;
        }
        .card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: .75rem;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        .grid-2 {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 1rem;
        }
        ha-select, ha-textfield, ha-formfield {
          width: 100%;
        }
        `]}setConfig(e){this.hass=window.__dd_get_hass(),this.entity=e.entity,this.friendlyName=e.friendlyName?e.friendlyName:"",this.hideEntity=!!e.hideEntity&&e.hideEntity,this.disableEntity=!!e.disableEntity&&e.disableEntity,this.excludeEntity=!!e.excludeEntity&&e.excludeEntity,this.rowSpan=e.rowSpan?e.rowSpan:"1",this.colSpan=e.colSpan?e.colSpan:"1",this.rowSpanLg=e.rowSpanLg?e.rowSpanLg:"1",this.colSpanLg=e.colSpanLg?e.colSpanLg:"1",this.rowSpanXl=e.rowSpanXl?e.rowSpanXl:"1",this.colSpanXl=e.colSpanXl?e.colSpanXl:"1",this.customCard=!!e.customCard&&e.customCard,this.customPopup=!!e.customPopup&&e.customPopup}_saveButton(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation(),this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entity",entity:this.entity,friendlyName:this.friendlyName,disableEntity:this.disableEntity,hideEntity:this.hideEntity,excludeEntity:this.excludeEntity,rowSpan:this.rowSpan,colSpan:this.colSpan,rowSpanLg:this.rowSpanLg,colSpanLg:this.colSpanLg,rowSpanXl:this.rowSpanXl,colSpanXl:this.colSpanXl,customCard:this.customCard,customPopup:this.customPopup}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_friendlyNameChanged(e){this.friendlyName=e.target.value}_disableValueChanged(e){this.disableEntity=e.target.checked}_hideValueChanged(e){this.hideEntity=e.target.checked}_excludeValueChanged(e){this.excludeEntity=e.target.checked}_customCardValueChanged(e){this.customCard=e.target.checked}_customPopupValueChanged(e){this.customPopup=e.target.checked}_haSelectChanged(e){e.stopPropagation();const t=e.currentTarget||e.target,i=t&&t.name?t.name:t&&t.dataset&&t.dataset.field?t.dataset.field:t&&t.type?t.type:void 0;let a=void 0!==e.detail&&void 0!==e.detail.value?e.detail.value:e.target&&e.target!==t&&void 0!==e.target.value?e.target.value:t&&void 0!==t.value?t.value:void 0;i&&void 0!==a&&(this[i]=`${a}`,this.requestUpdate())}_stopPropagation(e){e.stopPropagation()}render(){return n.qy`
        <div class="edit-element">
            <h1 style="font-size: 15px; font-weight: bold;">${(0,o.A)(this.hass,"entity.edit_entity")} "${this.entity}"</h1>

            <ha-textfield 
             label=${(0,o.A)(this.hass,"entity.friendly_name")}
              .value=${this.friendlyName}
              @input=${this._friendlyNameChanged}
            ></ha-textfield>

            <h2>${(0,o.A)(this.hass,"editor.default_col_row")}</h2>
            <div class="grid-2">
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.row_span")}
                .value=${this.rowSpan}
                name="rowSpan"
                type="number"
                min="1"
                max="2"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.col_span")}
                .value=${this.colSpan}
                name="colSpan"
                type="number"
                min="1"
                max="2"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
            </div>

            <h2>${(0,o.A)(this.hass,"editor.large_col_row")}</h2>
            <div class="grid-2">
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.row_span")}
                .value=${this.rowSpanLg}
                name="rowSpanLg"
                type="number"
                min="1"
                max="3"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.col_span")}
                .value=${this.colSpanLg}
                name="colSpanLg"
                type="number"
                min="1"
                max="3"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
            </div>

            <h2>${(0,o.A)(this.hass,"editor.extra_large_col_row")}</h2>
            <div class="grid-2">
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.row_span")}
                .value=${this.rowSpanXl}
                name="rowSpanXl"
                type="number"
                min="1"
                max="4"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
              <ha-textfield
               label=${(0,o.A)(this.hass,"editor.col_span")}
                .value=${this.colSpanXl}
                name="colSpanXl"
                type="number"
                min="1"
                max="4"
                step="1"
                inputmode="numeric"
                @input=${this._haSelectChanged}
              ></ha-textfield>
            </div>

            <ha-formfield .label=${(0,o.A)(this.hass,"entity.disable")}>
              <ha-checkbox
                @change=${this._disableValueChanged}
                .checked=${this.disableEntity}
              ></ha-checkbox>
            </ha-formfield>
            <ha-formfield .label=${(0,o.A)(this.hass,"entity.hide")}>
              <ha-checkbox
                @change=${this._hideValueChanged}
                .checked=${this.hideEntity}
              ></ha-checkbox>
            </ha-formfield>
            <ha-formfield .label=${(0,o.A)(this.hass,"entity.exclude")}>
              <ha-checkbox
                @change=${this._excludeValueChanged}
                .checked=${this.excludeEntity}
              ></ha-checkbox>
            </ha-formfield>
            <ha-formfield .label=${(0,o.A)(this.hass,"entity.use_entity_card")}>
              <ha-checkbox
                @change=${this._customCardValueChanged}
                .checked=${this.customCard}
              ></ha-checkbox>
            </ha-formfield>
            <ha-formfield .label=${(0,o.A)(this.hass,"entity.use_popup_card")}>
              <ha-checkbox
                @change=${this._customPopupValueChanged}
                .checked=${this.customPopup}
              ></ha-checkbox>
            </ha-formfield>

            <div class="card-footer">
              <ha-button slot="secondaryAction" @click=${e=>(0,s.f)()}>
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
              <ha-button slot="primaryAction" @click=${this._saveButton}>
                ${this.hass.localize("ui.common.submit")}
              </ha-button>
            </div>
        </div>
      `}}customElements.define("dwains-edit-entity-card",e)}))},3:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(969),s=i(177),r=i(89);const l=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(l).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
        .edit-element {
          padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
          font-size: inherit;
        }
        blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
          margin: 0;
        }
        .add-button {
          font-size: 16px;
          border: 2px solid #4591B8;
          padding: 5px;
          margin-bottom: 50px;
          background: #459CEE;
          border-radius: 20px;
          color: white;
        }
        .card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: .75rem;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        .grid {
          display: grid;
          gap: 2rem;
        }
        @media (min-width: 768px){
          .grid-cols-2 {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }
        .pre-select {
          padding: 2.5rem;
        }
        .pre-select-option {
          padding: 2.5rem;
          border: 1px solid #4591B8;
          text-align: center;
          cursor: pointer;
        }
        .pre-selected-option:hover {
          border: 2px solid #4591B8;
        }
        .more-page-settings {
          padding: 0.75rem;
          border: 2px solid grey;
        }
        .seperator {
          background-color: var(--secondary-background-color);
          width: 100%;
          height: 3px;
          margin-top: 15px;
          margin-bottom: 15px;
        }
        /*Start blueprint table*/
        .min-w-full {
          min-width: 100%;
        }
        table {
            text-indent: 0;
            border-color: inherit;
            border-collapse: collapse;
        }
        .bg-gray-50 {
          background-color: var(--secondary-background-color);
        }
        .tracking-wider {
            letter-spacing: .05em;
        }
        .text-sm {
          font-size: .875rem;
          line-height: 1.25rem;
        }
        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }
        .uppercase {
            text-transform: uppercase;
        }
        .font-medium {
            font-weight: 500;
        }
        .text-xs {
            font-size: .75rem;
            line-height: 1rem;
        }
        .text-left {
            text-align: left;
        }
        .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
        }
        .py-3 {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
        }
        .card-footer-multiple {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        `]}static get properties(){return{mode:{},blueprints:{}}}setConfig(e){if(this.hass=window.__dd_get_hass(),this.mode=e.mode?e.mode:"pre-select",this.entity_id=e.entity_id,e.cardConfig){const t=e.cardConfig;delete t.input_entity,delete t.input_name,this.cardConfig=t}else this.cardConfig="";this.existingCardEdit=!!e.existingCardEdit&&e.existingCardEdit;const t=document.createElement("hui-masonry-view");t.lovelace={editMode:!0},t.willUpdate(new Map)}async connectedCallback(){super.connectedCallback(),await this._loadBlueprints();const e=await window.loadCardHelpers(),t=await e.createCardElement({type:"button"});await t.constructor.getConfigElement()}async _loadBlueprints(){this.blueprints=await this.hass.callWS({type:"dwains_dashboard/get_blueprints"})}magicStuff(e){const t=e.detail.config.type;o.SG.includes(t)?this.cardConfig={...e.detail.config,entity:this.entity_id}:this.cardConfig=e.detail.config,this.mode="editor-element",this.requestUpdate()}magicStuffSecond(e){}_sendCard(){const e=JSON.stringify(this.cardConfig);this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entity_popup",cardData:e,entityId:this.entity_id}).then((e=>{console.log(e),(0,r.f)()}),(e=>{console.error("Message failed!",e)}))}_switchMode(e){const t=e.currentTarget.mode;this.mode=t,this.requestUpdate()}_removeCard(){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_entity_popup",entityId:this.entity_id}).then((e=>{console.log(e),(0,r.f)()}),(e=>{console.error("Message failed!",e)}))}_handleDeleteBlueprintClicked(e){const t=e.currentTarget.blueprint;this.hass.connection.sendMessagePromise({type:"dwains_dashboard/delete_blueprint",blueprint:t}).then((e=>{console.log(e),this._loadBlueprints(),this.requestUpdate()}),(e=>{console.error("Message failed!",e)}))}_handleUseBlueprintClicked(e){const t=e.currentTarget.blueprint;this.mode="editor-element",this.name=this.blueprints.blueprints[t].blueprint.name,this.cardConfig={type:"custom:dwains-blueprint-card",blueprint:t,input_entity:this.entity_id,card:this.blueprints.blueprints[t].card}}_installBlueprintYamlChanged(e){this.installBlueprintYaml=e.target.value}_handleInstallBlueprintClicked(e){this.hass.connection.sendMessagePromise({type:"dwains_dashboard/install_blueprint",yamlCode:JSON.stringify(this.installBlueprintYaml)}).then((e=>{console.log(e),e.succesfull?(alert(this.hass.localize("ui.common.successfully_saved")),this._loadBlueprints(),this.requestUpdate()):alert(e.error)}),(e=>{console.error("Message failed!",e)}))}_checkCustomCard(e){const t=customElements.get(e);return n.qy`
        <div>
          ${t?n.qy`
            <ha-icon
              style="color: green;"
              .icon=${"mdi:check-bold"}
            ></ha-icon>`:n.qy`
            <ha-icon
              style="color: red;"
              .icon=${"mdi:close-thick"}
            ></ha-icon>
            `}
          ${e}
          ${t?n.qy`(${(0,s.A)(this.hass,"blueprint.installed")})`:n.qy`(${(0,s.A)(this.hass,"blueprint.not_installed")})`}
        </div>
      `}render(){if(null==this.blueprints||0===this.blueprints.length)return n.qy`Loading...`;if("pre-select"==this.mode)return n.qy`
          <ha-md-list>
            <ha-list-item twoline .mode=${"hui-card-picker"} @click=${this._switchMode}>
              ${(0,s.A)(this.hass,"editor.lovelace_card")}
              <span slot="secondary">
                ${(0,s.A)(this.hass,"editor.create_lovelace_card")}
              </span>
            </ha-list-item>
            <li divider role="separator"></li>
            <ha-list-item hasmeta twoline .mode=${"dwains-dashboard-blueprint-select"} @click=${this._switchMode}>
              ${(0,s.A)(this.hass,"editor.dwains_dashboard_blueprint")}
              <span slot="secondary">
                ${(0,s.A)(this.hass,"editor.use_dwains_dashboard_blueprint")}
              </span>
              <ha-icon-next slot="meta"></ha-icon-next
            ></ha-list-item>
          </ha-md-list>
        `;if("dwains-dashboard-blueprint-select"==this.mode){const e=Object.entries(this.blueprints.blueprints).sort((function(e,t){let i=e[1].blueprint.type,a=t[1].blueprint.type;return i==a?0:i>a?1:-1}));return n.qy`
        <div class="edit-element">

          <div style="margin-bottom: 20px;">
            <ha-button .mode=${"pre-select"} @click=${this._switchMode}>< ${this.hass.localize("ui.common.previous")}</ha-button>
          </div>

          <strong>${(0,s.A)(this.hass,"blueprint.installed_blueprints")}:</strong>
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"blueprint.title")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"global.version")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"blueprint.type")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this.hass,"blueprint.used_custom_cards")}</th>
                <th scope="col" class="relative px-6 py-3">
                </th>
              </tr>
            </thead>
            <tbody>
              ${0==Object.values(this.blueprints.blueprints).length?n.qy`
                <tr>
                  <td  class="px-6 py-4" colspan="5">${(0,s.A)(this.hass,"blueprint.no_blueprints_installed")}</td>
                </tr>`:n.qy`
                ${Object.entries(e).map((([e,t])=>n.qy`
                        <tr class="bg-white">
                          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <h3>${t[1].blueprint.name}</h3>
                            ${t[1].blueprint.description}
                          </td>
                          <td class="px-6 py-4">
                            ${t[1].blueprint.version}
                          </td>
                          <td class="px-6 py-4">
                            ${t[1].blueprint.type}
                          </td>
                          <td class="px-6 py-4">
                            ${t[1].blueprint.custom_cards&&0!==t[1].blueprint.custom_cards.length?n.qy`
                                ${t[1].blueprint.custom_cards.map((e=>this._checkCustomCard(e)))}
                              `:"None"}
                          </td>
                          <td>
                            ${"card"==t[1].blueprint.type||"replace-card"==t[1].blueprint.type?n.qy`
                              <ha-button .blueprint=${t[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                                ${(0,s.A)(this.hass,"blueprint.use")}
                              </ha-button>
                            `:""}
                            <ha-button .blueprint=${t[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                              <ha-icon
                                .icon=${"mdi:delete"}
                              ></ha-icon>
                            </ha-button>
                          </td>
                        </tr>
                      `))}
                `}
            </tbody>
          </table>
          <div class="seperator"></div>
          <strong>${(0,s.A)(this.hass,"blueprint.install")}</strong>
          <p>${(0,s.A)(this.hass,"blueprint.instruction")}</p>
          <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
          <ha-yaml-editor
           label=${(0,s.A)(this.hass,"blueprint.yaml_code")}
            name="description"
            @value-changed=${this._installBlueprintYamlChanged}
          ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
          <div style="margin-top: 15px; margin-bottom: 20px;">
            <ha-button @click=${this._handleInstallBlueprintClicked} unelevated>
              ${(0,s.A)(this.hass,"blueprint.install")}
            </ha-button>
          </div>
        </div>`}return"hui-card-picker"==this.mode?n.qy`
          <div class="edit-element">
            <h1 style="font-size: 17px; font-weight: bold;">Select the popup card you want to use for ${this.entity_id}</h1>
            <hui-card-picker
              @config-changed=${this.magicStuff}
              .hass=${this.hass}
              .lovelace=${{views:[]}}
            ></hui-card-picker>
            <div class="card-footer">
              <ha-button slot="secondaryAction" @click=${e=>(0,r.f)()}>
                ${this.hass.localize("ui.common.cancel")}
              </ha-button>
            </div>
          </div>
        `:n.qy`
          <div class="edit-element">
            <hui-card-element-editor
              @save-config=${this.magicStuffSecond}
              @config-changed=${this.magicStuff}
              .value=${this.cardConfig}
              .hass=${this.hass}
              lovelace=${{views:[]}}
            ></hui-card-element-editor>
            <hui-card-preview
              .hass=${this.hass}
              .config=${this.cardConfig}
            ></hui-card-preview>
            <div class="card-footer-multiple">
              ${this.existingCardEdit?n.qy`
                  <div>
                    <ha-button class="warning" @click=${this._removeCard}>${this.hass.localize("ui.common.remove")}</ha-button>
                    <ha-button class="warning" @click=${e=>this.mode="hui-card-picker"}}>${this.hass.localize("ui.common.previous")}</ha-button>
                  </div>
                `:n.qy`<div></div>`}
              <div>
                <ha-button slot="secondaryAction" @click=${e=>(0,r.f)()}>
                  ${this.hass.localize("ui.common.cancel")}
                </ha-button>
                <ha-button slot="primaryAction" @click=${this._sendCard}>
                  ${this.hass.localize("ui.common.submit")}
                </ha-button>
              </div>
            </div>
          </div>
        `}}customElements.define("dwains-edit-entity-popup-card",e)}))},971:(e,t,i)=>{"use strict";var a=i(79),n=i(845),o=i(177),s=i(89);const r=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(r).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends n.WF{static get styles(){return[n.AH`
        .w-full {
          width: 100%;
        }
        .edit-element {
          padding: 20px;
        }
        .add-button {
          font-size: 16px;
          border: 2px solid #4591B8;
          padding: 5px;
          margin-bottom: 50px;
          background: #459CEE;
          border-radius: 20px;
          color: white;
        }
        .card-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: .75rem;
          padding: 8px;
          border-top: 1px solid var(--divider-color);
        }
        .block {
          display: block;
        }
        .hidden {
          display: none;
        }
        `]}static get properties(){return{configuration:{}}}setConfig(e){this.hass=window.__dd_get_hass(),this.disableClock=!!e.disableClock&&e.disableClock,this.amPmClock=!!e.amPmClock&&e.amPmClock,this.disableWelcomeMessage=!!e.disableWelcomeMessage&&e.disableWelcomeMessage,this.v2Mode=!!e.v2Mode&&e.v2Mode,this.weatherEntity=e.weatherEntity?e.weatherEntity:"",this.alarmEntity=e.alarmEntity?e.alarmEntity:"",this.disableSensorGraph=!!e.disableSensorGraph&&e.disableSensorGraph,this.selectedTab=1,this.invertCover=!!e.invertCover&&e.invertCover}async connectedCallback(){super.connectedCallback();const e=await window.loadCardHelpers();(await e.createCardElement({type:"entities",entities:[]})).constructor.getConfigElement(),await this._loadConfiguration()}async _loadConfiguration(){this.configuration=await this.hass.callWS({type:"dwains_dashboard/configuration/get"})}_disableClockValueChanged(e){this.disableClock=e.target.checked}_amPmClockValueChanged(e){this.amPmClock=e.target.checked}_disableWelcomeMessageValueChanged(e){this.disableWelcomeMessage=e.target.checked}_v2ModeValueChanged(e){this.v2Mode=e.target.checked}_weatherEntityPicked(e){this.weatherEntity=e.detail.value}_alarmEntityPicked(e){this.alarmEntity=e.detail.value}_disableSensorGraphValueChanged(e){this.disableSensorGraph=e.target.checked}_invertCoverValueChanged(e){this.invertCover=e.target.checked}_saveButton(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation(),this.hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_homepage_header",disableClock:this.disableClock,amPmClock:this.amPmClock,disableWelcomeMessage:this.disableWelcomeMessage,v2Mode:this.v2Mode,disableSensorGraph:this.disableSensorGraph,weatherEntity:this.weatherEntity?this.weatherEntity:"",alarmEntity:this.alarmEntity?this.alarmEntity:"",invertCover:this.invertCover}).then((e=>{console.log(e),(0,s.f)()}),(e=>{console.error("Message failed!",e)}))}_handleTabClick(e){const t=e.currentTarget.page;this.selectedTab=t,this.requestUpdate()}render(){return this.configuration&&0!==this.configuration.length?n.qy`
      <style>.edit-element{max-width:440px;margin-left:auto;margin-right:auto}.edit-element ha-formfield{display:flex;align-items:flex-start;gap:.75rem;margin:.7rem 0;padding-inline-start:.25rem}.edit-element ha-formfield label{display:inline-block !important;margin-top:.2rem;color:var(--primary-text-color);font-size:.92rem;line-height:1.3;white-space:normal}.edit-element ha-formfield ha-checkbox{margin-top:-.15rem;flex:0 0 auto}.edit-element ha-entity-picker{display:block;margin-top:1rem}.edit-element ha-entity-picker:first-of-type{margin-top:1.5rem;padding-top:1.2rem;border-top:1px solid var(--divider-color)}.edit-element .dd-tabs{display:flex;gap:1.5rem;border-bottom:1px solid var(--divider-color);margin:0 0 1rem}.edit-element .dd-tab{padding:.5rem .15rem;margin-bottom:-1px;cursor:pointer;color:var(--secondary-text-color);font-size:.95rem;font-weight:500;border-bottom:2px solid transparent;transition:color .15s}.edit-element .dd-tab:hover{color:var(--primary-text-color)}.edit-element .dd-tab.active{color:var(--primary-color);border-bottom-color:var(--primary-color)}.edit-element .card-footer{display:flex;justify-content:flex-end;align-items:center;gap:.75rem;padding-top:.6rem}</style>
        <div class="edit-element">
        <div class="dd-tabs">
            <div class="dd-tab ${1==this.selectedTab?"active":""}" .page=${"1"} @click=${this._handleTabClick}>${(0,o.A)(this.hass,"global.settings")}</div>
            <div class="dd-tab ${2==this.selectedTab?"active":""}" .page=${"2"} @click=${this._handleTabClick}>${(0,o.A)(this.hass,"global.dashboard_information")}</div>
        </div>
        <div class=${1==this.selectedTab?"block":"hidden"}>
          <div class="w-full">
          <ha-formfield>
            <ha-checkbox
              @change=${this._disableClockValueChanged}
              .checked=${this.disableClock}>
            </ha-checkbox>
            <span slot="label">${(0,o.A)(this.hass,"global.disable_clock")}</span>
          </ha-formfield>
          </div>
          <div class="w-full">
          <ha-formfield>
            <ha-checkbox
              @change=${this._amPmClockValueChanged}
              .checked=${this.amPmClock}>
            </ha-checkbox>
            <span slot="label">${(0,o.A)(this.hass,"global.am_pm_clock")}</span>
          </ha-formfield>
          </div>
          <div class="w-full">
          <ha-formfield>
            <ha-checkbox
              @change=${this._disableWelcomeMessageValueChanged}
              .checked=${this.disableWelcomeMessage}>
            </ha-checkbox>
            <span slot="label">${(0,o.A)(this.hass,"global.disable_welcome_message")}</span>
          </ha-formfield>
          </div>
          <div class="w-full">
          <ha-formfield>
            <ha-checkbox
              @change=${this._v2ModeValueChanged}
              .checked=${this.v2Mode}>
            </ha-checkbox>
            <span slot="label">${(0,o.A)(this.hass,"global.v2_mode")}</span>
          </ha-formfield>
          </div>
          <div class="w-full">
          <ha-formfield>
            <ha-checkbox
              @change=${this._disableSensorGraphValueChanged}
              .checked=${this.disableSensorGraph}>
            </ha-checkbox>
            <span slot="label">${(0,o.A)(this.hass,"global.disable_sensor_graph")}</span>
          </ha-formfield>
          </div>
          <div class="w-full">
          <ha-formfield>
            <ha-checkbox
              @change=${this._invertCoverValueChanged}
              .checked=${this.invertCover}>
            </ha-checkbox>
            <span slot="label">${(0,o.A)(this.hass,"global.invert_cover")}</span>
          </ha-formfield>
          </div>      
          <ha-entity-picker 
            .hass=${this.hass}
           label=${(0,o.A)(this.hass,"global.weather_entity")}
            .value=${this.weatherEntity}
            .includeDomains=${["weather"]}
            @value-changed=${this._weatherEntityPicked}
          ></ha-entity-picker>
          <ha-entity-picker 
            .hass=${this.hass}
           label=${(0,o.A)(this.hass,"global.alarm_entity")}
            .includeDomains=${["alarm_control_panel"]}
            .value=${this.alarmEntity}
            @value-changed=${this._alarmEntityPicked}
          ></ha-entity-picker>
        </div>
        <div class=${2==this.selectedTab?"block":"hidden"}>
          <strong>Dwains Dashboard</strong><br>
          Created by Dwain Scheeren<br>
          Version ${this.configuration.installed_version}
        </div>
        <div class="card-footer">
          <ha-button slot="secondaryAction" @click=${e=>(0,s.f)()}>
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._saveButton}>
            ${this.hass.localize("ui.common.submit")}
          </ha-button>
        </div>
      </div>
      `:n.qy``}}customElements.define("dwains-edit-homepage-header-card",e)}))},848:(e,t,i)=>{"use strict";var a=i(79),n=i(924),o=i(845),s=i(177),r=i(89);class l extends o.WF{static get styles(){return[o.AH`
        .edit-element {
        padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
        font-size: inherit;
        }
        blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
        margin: 0;
        }
        .add-button {
        font-size: 16px;
        border: 2px solid #4591B8;
        padding: 5px;
        margin-bottom: 50px;
        background: #459CEE;
        border-radius: 20px;
        color: white;
        }
        .card-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: .75rem;
        padding: 8px;
        border-top: 1px solid var(--divider-color);
        }
        .grid {
        display: grid;
        gap: 2rem;
        }
        @media (min-width: 768px){
        .grid-cols-2 {
            grid-template-columns: repeat(2,minmax(0,1fr));
        }
        }
        .pre-select {
        padding: 2.5rem;
        }
        .pre-select-option {
        padding: 2.5rem;
        border: 1px solid #4591B8;
        text-align: center;
        cursor: pointer;
        }
        .pre-selected-option:hover {
        border: 2px solid #4591B8;
        }
        .more-page-settings {
        padding: 0.75rem;
        border: 2px solid grey;
        }
        .seperator {
        background-color: var(--secondary-background-color);
        width: 100%;
        height: 3px;
        margin-top: 15px;
        margin-bottom: 15px;
        }
        /*Start blueprint table*/
        .min-w-full {
        min-width: 100%;
        }
        table {
            text-indent: 0;
            border-color: inherit;
            border-collapse: collapse;
        }
        .bg-gray-50 {
        background-color: var(--secondary-background-color);
        }
        .tracking-wider {
            letter-spacing: .05em;
        }
        .text-sm {
        font-size: .875rem;
        line-height: 1.25rem;
        }
        .py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
        }
        .uppercase {
            text-transform: uppercase;
        }
        .font-medium {
            font-weight: 500;
        }
        .text-xs {
            font-size: .75rem;
            line-height: 1rem;
        }
        .text-left {
            text-align: left;
        }
        .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
        }
        .py-3 {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
        }
        `]}static get properties(){return{mode:{},blueprints:{},_hass:{}}}set hass(e){this._hass=e}setConfig(e){if(console.log("DwainsEditMorePageCard..."),this.mode=e.mode?e.mode:"pre-select",this.foldername=e.foldername?e.foldername:"",e.cardConfig){const t=e.cardConfig;delete t.input_entity,delete t.input_name,this.cardConfig=t}else this.cardConfig="";this.name=e.name?e.name:"",this.icon=e.icon?e.icon:"",this.showInNavbar=!!e.showInNavbar&&e.showInNavbar;const t=document.createElement("hui-masonry-view");t.lovelace={editMode:!0},t.willUpdate(new Map)}async connectedCallback(){super.connectedCallback(),await this._loadBlueprints();const e=await window.loadCardHelpers(),t=await e.createCardElement({type:"button"});await t.constructor.getConfigElement()}async _loadBlueprints(){this.blueprints=await this._hass.callWS({type:"dwains_dashboard/get_blueprints"})}magicStuff(e){this.cardConfig=e.detail.config,this.mode="editor-element",this.requestUpdate()}magicStuffSecond(e){}_sendCard(){const e=JSON.stringify(this.cardConfig);this.name?!this.showInNavbar||this.icon?this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_more_page",card_data:e,foldername:this.foldername,name:this.name,icon:this.icon,showInNavbar:this.showInNavbar}).then((e=>{console.log(e);const t=(0,a._R)();t&&(0,n.r)("config-refresh",{},t);let i=window.location.pathname;"dwains-dashboard"==i.substring(1,i.lastIndexOf("/"))&&setTimeout((function(){document.location.reload()}),1e3),(0,r.f)()}),(e=>{console.error("Message failed!",e)})):alert((0,s.A)(this._hass,"more.icon_required")):alert((0,s.A)(this._hass,"more.name_required"))}_switchMode(e){const t=e.currentTarget.mode;this.mode=t,this.requestUpdate()}_iconPickerChange(e){this.icon=e.detail.value}_showInMainNavbarValueChanged(e){this.showInNavbar=e.target.checked}_nameChanged(e){this.name=e.target.value}_removeMorePage(e){this._hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_more_page",foldername:this.foldername}).then((e=>{console.log(e),(0,r.f)(),document.location="more_page"}),(e=>{console.error("Message failed!",e)}))}_handleDeleteBlueprintClicked(e){const t=e.currentTarget.blueprint;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/delete_blueprint",blueprint:t}).then((e=>{console.log(e),this._loadBlueprints(),this.requestUpdate()}),(e=>{console.error("Message failed!",e)}))}_handleUseBlueprintClicked(e){const t=e.currentTarget.blueprint;this.mode="editor-element",this.name=this.blueprints.blueprints[t].blueprint.name,this.cardConfig={type:"custom:dwains-blueprint-card",blueprint:t,card:this.blueprints.blueprints[t].card}}_installBlueprintYamlChanged(e){this.installBlueprintYaml=e.target.value}_handleInstallBlueprintClicked(e){this.installBlueprintYaml||alert((0,s.A)(this._hass,"blueprint.yaml_required")),this._hass.connection.sendMessagePromise({type:"dwains_dashboard/install_blueprint",yamlCode:JSON.stringify(this.installBlueprintYaml)}).then((e=>{console.log(e),e.succesfull?(alert(this._hass.localize("ui.common.successfully_saved")),this._loadBlueprints(),this.requestUpdate()):alert(e.error)}),(e=>{console.error("Message failed!",e)}))}_checkCustomCard(e){const t=customElements.get(e);return o.qy`
        <div>
        ${t?o.qy`
            <ha-icon
            style="color: green;"
            .icon=${"mdi:check-bold"}
            ></ha-icon>`:o.qy`
            <ha-icon
            style="color: red;"
            .icon=${"mdi:close-thick"}
            ></ha-icon>
            `}
        ${e}
        ${t?o.qy`(${(0,s.A)(this._hass,"blueprint.installed")})`:o.qy`(${(0,s.A)(this._hass,"blueprint.not_installed")})`}
        </div>
    `}render(){if(null==this.blueprints||0===this.blueprints.length)return o.qy``;if("pre-select"==this.mode)return o.qy`
        <ha-md-list>
            <ha-list-item twoline .mode=${"hui-card-picker"} @click=${this._switchMode}>
            ${(0,s.A)(this._hass,"editor.lovelace_card")}
            <span slot="secondary">
                ${(0,s.A)(this._hass,"editor.create_lovelace_card")}
            </span>
            </ha-list-item>
            <li divider role="separator"></li>
            <ha-list-item hasmeta twoline .mode=${"dwains-dashboard-blueprint-select"} @click=${this._switchMode}>
            ${(0,s.A)(this._hass,"editor.dwains_dashboard_blueprint")}
            <span slot="secondary">
                ${(0,s.A)(this._hass,"editor.use_dwains_dashboard_blueprint")}
            </span>
            <ha-icon-next slot="meta"></ha-icon-next
            ></ha-list-item>
        </ha-md-list>
        `;if("dwains-dashboard-blueprint-select"==this.mode){const e=Object.entries(this.blueprints.blueprints).sort((function(e,t){let i=e[1].blueprint.type,a=t[1].blueprint.type;return i==a?0:i>a?1:-1}));return o.qy`
        <div class="edit-element">

        <div style="margin-bottom: 20px;">
            <ha-button .mode=${"pre-select"} @click=${this._switchMode}>< ${this._hass.localize("ui.common.previous")}</ha-button>
        </div>

        <strong>${(0,s.A)(this._hass,"blueprint.installed_blueprints")}:</strong>
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
            <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this._hass,"blueprint.title")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this._hass,"global.version")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this._hass,"blueprint.type")}</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${(0,s.A)(this._hass,"blueprint.used_custom_cards")}</th>
                <th scope="col" class="relative px-6 py-3">
                </th>
            </tr>
            </thead>
            <tbody>
            ${0==Object.values(this.blueprints.blueprints).length?o.qy`
                <tr>
                <td  class="px-6 py-4" colspan="5">${(0,s.A)(this._hass,"blueprint.no_blueprints_installed")}</td>
                </tr>`:o.qy`
                ${Object.entries(e).map((([e,t])=>o.qy`
                        <tr class="bg-white">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <h3>${t[1].blueprint.name}</h3>
                            ${t[1].blueprint.description}
                        </td>
                        <td class="px-6 py-4">
                            ${t[1].blueprint.version}
                        </td>
                        <td class="px-6 py-4">
                            ${t[1].blueprint.type}
                        </td>
                        <td class="px-6 py-4">
                            ${t[1].blueprint.custom_cards&&0!==t[1].blueprint.custom_cards.length?o.qy`
                                ${t[1].blueprint.custom_cards.map((e=>this._checkCustomCard(e)))}
                            `:"None"}
                        </td>
                        <td>
                            ${"page"==t[1].blueprint.type?o.qy`
                            <ha-button .blueprint=${t[0]} @click=${this._handleUseBlueprintClicked} unelevated>
                                ${(0,s.A)(this._hass,"blueprint.use")}
                            </ha-button>
                            `:""}
                            <ha-button .blueprint=${t[0]} @click=${this._handleDeleteBlueprintClicked} unelevated>
                            <ha-icon
                                .icon=${"mdi:delete"}
                            ></ha-icon>
                            </ha-button>
                        </td>
                        </tr>
                    `))}
                `}
            </tbody>
        </table>
        <div class="seperator"></div>
        <strong>${(0,s.A)(this._hass,"blueprint.install")}</strong>
        <p>${(0,s.A)(this._hass,"blueprint.instruction")}</p>
        <a href="https://github.com/dwainscheeren/dwains-dashboard-blueprints" target="_blank">Dwains Dashboard Blueprints Github</a>
        <ha-yaml-editor
           label=${(0,s.A)(this._hass,"blueprint.yaml_code")}
            name="description"
            @value-changed=${this._installBlueprintYamlChanged}
        ><ha-code-editor mode="yaml" autocomplete-entities="" autocomplete-icons="" dir="ltr"></ha-code-editor></ha-yaml-editor>
        <div style="margin-top: 15px; margin-bottom: 20px;">
            <ha-button @click=${this._handleInstallBlueprintClicked} unelevated>
            ${(0,s.A)(this._hass,"blueprint.install")}
            </ha-button>
        </div>
        </div>`}return"hui-card-picker"==this.mode?o.qy`
        <div class="edit-element">
            <h1 style="font-size: 17px; font-weight: bold;"></h1>
            <hui-card-picker
            @config-changed=${this.magicStuff}
            .hass=${this._hass}
            .lovelace=${{views:[]}}
            ></hui-card-picker>
        </div>
        `:"editor-element"==this.mode?o.qy`
        <style>.edit-element{max-width:460px;margin-left:auto;margin-right:auto}.edit-element ha-icon-picker,.edit-element ha-textfield,.edit-element ha-select,.edit-element ha-entity-picker{display:block;margin:.8rem 0}.edit-element ha-formfield{display:flex;align-items:center;gap:.6rem;margin:.9rem 0;padding-inline-start:.25rem}.edit-element ha-formfield label{display:inline-block;color:var(--primary-text-color);font-size:.95rem;line-height:1.3;white-space:normal}</style>
      <div class="edit-element">
            <div class="more-page-settings">
            <ha-textfield
               label=${(0,s.A)(this._hass,"more.name")}
                .name=${(0,s.A)(this._hass,"more.name")}
                .value=${this.name}
                .style=${"width: 100%"}
                @input=${this._nameChanged}
            ></ha-textfield>     
            <ha-icon-picker
               label=${(0,s.A)(this._hass,"more.icon")}
                .value=${this.icon}
                @value-changed=${this._iconPickerChange}
            ></ha-icon-picker>
            <ha-formfield .label=${(0,s.A)(this._hass,"more.add_navbar")}>
                <ha-checkbox
                @change=${this._showInMainNavbarValueChanged}
                .checked=${this.showInNavbar}
                ></ha-checkbox>
            </ha-formfield>
            </div>
            
            <hui-card-element-editor
            @save-config=${this.magicStuffSecond}
            @config-changed=${this.magicStuff}
            .value=${this.cardConfig}
            .hass=${this._hass}
            .lovelace=${{views:[]}}
            ></hui-card-element-editor>
            <hui-card-preview
            .hass=${this._hass}
            .config=${this.cardConfig}
            ></hui-card-preview>
            <div class="card-footer">
            ${this.foldername?o.qy`<ha-button @click=${this._removeMorePage}>${this._hass.localize("ui.common.remove")}</ha-button>`:""}
            <ha-button @click=${this._sendCard}>${this._hass.localize("ui.common.submit")}</ha-button>
            </div>
        </div>
        `:void 0}}customElements.define("dwains-edit-more-page-card",l)},54:()=>{const e=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(e).then((async()=>{await new Promise((e=>setTimeout(e,2e3)));const e=customElements.get("hui-masonry-view")?Object.getPrototypeOf(customElements.get("hui-masonry-view")):Object.getPrototypeOf(customElements.get("hc-lovelace")),t=e.prototype.html,i=e.prototype.css,a=await window.loadCardHelpers(),n=async(e,t)=>{if(a)return a.createCardElement(t);const i=document.createElement(e);try{i.setConfig(t)}catch(i){return console.error(e,i),((e,t)=>n("hui-error-card",{type:"error",error:e,config:t}))(i.message,t)}return i};customElements.get("dwains-flexbox-card")||customElements.define("dwains-flexbox-card",class extends e{constructor(){super()}static get properties(){return{_config:{},_refCards:{}}}set hass(e){this._hass=e,!this._refCards&&this._config&&this.renderCard(),this._refCards&&this._refCards.forEach((t=>{t.hass=e}))}setConfig(e){if(!(e||(e.cards||Array.isArray(e.cards))&&e.entities&&Array.isArray(e.entities)))throw new Error("Card config incorrect");this._config=e,this._hass&&this.renderCard()}renderCard(){const e=(this._config.entities||this._config.cards).map((e=>this.createCardElement(e)));Promise.all(e).then((e=>{this._refCards=e}))}async createCardElement(e){let t=e.type;t=t.startsWith("divider")?"hui-divider-row":t.startsWith("custom:")?t.substr(7):`hui-${t}-card`;const i=await n(t,e);return e.item_classes?i.className="item "+e.item_classes:this._config.items_classes?i.className="item "+this._config.items_classes:i.className="item",i.hass=this._hass,i.addEventListener("ll-rebuild",(t=>{t.stopPropagation(),this.createCardElement(e).then((()=>{this.renderCard()}))}),{once:!0}),i}render(){return this._config&&this._hass&&this._refCards?(this._config.padding&&(e="padding"),t`
      <div style="${this._config.css}">
        <div class="wrapper ${e}">
          <div class="row">
            ${this._refCards}
          </div>
        </div>
      </div>
      `):t``;var e}static get styles(){return[i`
          /* I used flexbox grid (http://flexboxgrid.com/) for now, not sure if it's good for all browsers */
          .container,
          .container-fluid {
            margin-right: auto;
            margin-left: auto;
          }
          .container-fluid {
            padding-right: 2rem;
            padding-left: 2rem;
          }
          .row {
            box-sizing: border-box;
            display: -webkit-box;
            display: -ms-flexbox;
            display: flex;
            -webkit-box-flex: 0;
            -ms-flex: 0 1 auto;
            flex: 0 1 auto;
            -webkit-box-orient: horizontal;
            -webkit-box-direction: normal;
            -ms-flex-direction: row;
            flex-direction: row;
            -ms-flex-wrap: wrap;
            flex-wrap: wrap;
            margin-right: -0.25rem;
            margin-left: -0.25rem;
          }
          .row.reverse {
            -webkit-box-orient: horizontal;
            -webkit-box-direction: reverse;
            -ms-flex-direction: row-reverse;
            flex-direction: row-reverse;
          }
          .col.reverse {
            -webkit-box-orient: vertical;
            -webkit-box-direction: reverse;
            -ms-flex-direction: column-reverse;
            flex-direction: column-reverse;
          }
          .col-xs,
          .col-xs-1,
          .col-xs-10,
          .col-xs-11,
          .col-xs-12,
          .col-xs-2,
          .col-xs-3,
          .col-xs-4,
          .col-xs-5,
          .col-xs-6,
          .col-xs-7,
          .col-xs-8,
          .col-xs-9,
          .col-xs-offset-0,
          .col-xs-offset-1,
          .col-xs-offset-10,
          .col-xs-offset-11,
          .col-xs-offset-12,
          .col-xs-offset-2,
          .col-xs-offset-3,
          .col-xs-offset-4,
          .col-xs-offset-5,
          .col-xs-offset-6,
          .col-xs-offset-7,
          .col-xs-offset-8,
          .col-xs-offset-9 {
            box-sizing: border-box;
            -webkit-box-flex: 0;
            -ms-flex: 0 0 auto;
            flex: 0 0 auto;
            padding-right: 0.25rem;
            padding-left: 0.25rem;
          }
          .col-xs {
            -webkit-box-flex: 1;
            -ms-flex-positive: 1;
            flex-grow: 1;
            -ms-flex-preferred-size: 0;
            flex-basis: 0;
            max-width: 100%;
          }
          .col-xs-1 {
            -ms-flex-preferred-size: 8.33333333%;
            flex-basis: 8.33333333%;
            max-width: 8.33333333%;
          }
          .col-xs-2 {
            -ms-flex-preferred-size: 16.66666667%;
            flex-basis: 16.66666667%;
            max-width: 16.66666667%;
          }
          .col-xs-3 {
            -ms-flex-preferred-size: 25%;
            flex-basis: 25%;
            max-width: 25%;
          }
          .col-xs-4 {
            -ms-flex-preferred-size: 33.33333333%;
            flex-basis: 33.33333333%;
            max-width: 33.33333333%;
          }
          .col-xs-5 {
            -ms-flex-preferred-size: 41.66666667%;
            flex-basis: 41.66666667%;
            max-width: 41.66666667%;
          }
          .col-xs-6 {
            -ms-flex-preferred-size: 50%;
            flex-basis: 50%;
            max-width: 50%;
          }
          .col-xs-7 {
            -ms-flex-preferred-size: 58.33333333%;
            flex-basis: 58.33333333%;
            max-width: 58.33333333%;
          }
          .col-xs-8 {
            -ms-flex-preferred-size: 66.66666667%;
            flex-basis: 66.66666667%;
            max-width: 66.66666667%;
          }
          .col-xs-9 {
            -ms-flex-preferred-size: 75%;
            flex-basis: 75%;
            max-width: 75%;
          }
          .col-xs-10 {
            -ms-flex-preferred-size: 83.33333333%;
            flex-basis: 83.33333333%;
            max-width: 83.33333333%;
          }
          .col-xs-11 {
            -ms-flex-preferred-size: 91.66666667%;
            flex-basis: 91.66666667%;
            max-width: 91.66666667%;
          }
          .col-xs-12 {
            -ms-flex-preferred-size: 100%;
            flex-basis: 100%;
            max-width: 100%;
          }
          .col-xs-offset-0 {
            margin-left: 0;
          }
          .col-xs-offset-1 {
            margin-left: 8.33333333%;
          }
          .col-xs-offset-2 {
            margin-left: 16.66666667%;
          }
          .col-xs-offset-3 {
            margin-left: 25%;
          }
          .col-xs-offset-4 {
            margin-left: 33.33333333%;
          }
          .col-xs-offset-5 {
            margin-left: 41.66666667%;
          }
          .col-xs-offset-6 {
            margin-left: 50%;
          }
          .col-xs-offset-7 {
            margin-left: 58.33333333%;
          }
          .col-xs-offset-8 {
            margin-left: 66.66666667%;
          }
          .col-xs-offset-9 {
            margin-left: 75%;
          }
          .col-xs-offset-10 {
            margin-left: 83.33333333%;
          }
          .col-xs-offset-11 {
            margin-left: 91.66666667%;
          }
          .start-xs {
            -webkit-box-pack: start;
            -ms-flex-pack: start;
            justify-content: flex-start;
            text-align: start;
          }
          .center-xs {
            -webkit-box-pack: center;
            -ms-flex-pack: center;
            justify-content: center;
            text-align: center;
          }
          .end-xs {
            -webkit-box-pack: end;
            -ms-flex-pack: end;
            justify-content: flex-end;
            text-align: end;
          }
          .top-xs {
            -webkit-box-align: start;
            -ms-flex-align: start;
            align-items: flex-start;
          }
          .middle-xs {
            -webkit-box-align: center;
            -ms-flex-align: center;
            align-items: center;
          }
          .bottom-xs {
            -webkit-box-align: end;
            -ms-flex-align: end;
            align-items: flex-end;
          }
          .around-xs {
            -ms-flex-pack: distribute;
            justify-content: space-around;
          }
          .between-xs {
            -webkit-box-pack: justify;
            -ms-flex-pack: justify;
            justify-content: space-between;
          }
          .first-xs {
            -webkit-box-ordinal-group: 0;
            -ms-flex-order: -1;
            order: -1;
          }
          .last-xs {
            -webkit-box-ordinal-group: 2;
            -ms-flex-order: 1;
            order: 1;
          }
          @media only screen and (min-width: 48em) {
            .container {
              width: 49rem;
            }
            .col-sm,
            .col-sm-1,
            .col-sm-10,
            .col-sm-11,
            .col-sm-12,
            .col-sm-2,
            .col-sm-3,
            .col-sm-4,
            .col-sm-5,
            .col-sm-6,
            .col-sm-7,
            .col-sm-8,
            .col-sm-9,
            .col-sm-offset-0,
            .col-sm-offset-1,
            .col-sm-offset-10,
            .col-sm-offset-11,
            .col-sm-offset-12,
            .col-sm-offset-2,
            .col-sm-offset-3,
            .col-sm-offset-4,
            .col-sm-offset-5,
            .col-sm-offset-6,
            .col-sm-offset-7,
            .col-sm-offset-8,
            .col-sm-offset-9 {
              box-sizing: border-box;
              -webkit-box-flex: 0;
              -ms-flex: 0 0 auto;
              flex: 0 0 auto;
              padding-right: 0.25rem;
              padding-left: 0.25rem;
            }
            .col-sm {
              -webkit-box-flex: 1;
              -ms-flex-positive: 1;
              flex-grow: 1;
              -ms-flex-preferred-size: 0;
              flex-basis: 0;
              max-width: 100%;
            }
            .col-sm-1 {
              -ms-flex-preferred-size: 8.33333333%;
              flex-basis: 8.33333333%;
              max-width: 8.33333333%;
            }
            .col-sm-2 {
              -ms-flex-preferred-size: 16.66666667%;
              flex-basis: 16.66666667%;
              max-width: 16.66666667%;
            }
            .col-sm-3 {
              -ms-flex-preferred-size: 25%;
              flex-basis: 25%;
              max-width: 25%;
            }
            .col-sm-4 {
              -ms-flex-preferred-size: 33.33333333%;
              flex-basis: 33.33333333%;
              max-width: 33.33333333%;
            }
            .col-sm-5 {
              -ms-flex-preferred-size: 41.66666667%;
              flex-basis: 41.66666667%;
              max-width: 41.66666667%;
            }
            .col-sm-6 {
              -ms-flex-preferred-size: 50%;
              flex-basis: 50%;
              max-width: 50%;
            }
            .col-sm-7 {
              -ms-flex-preferred-size: 58.33333333%;
              flex-basis: 58.33333333%;
              max-width: 58.33333333%;
            }
            .col-sm-8 {
              -ms-flex-preferred-size: 66.66666667%;
              flex-basis: 66.66666667%;
              max-width: 66.66666667%;
            }
            .col-sm-9 {
              -ms-flex-preferred-size: 75%;
              flex-basis: 75%;
              max-width: 75%;
            }
            .col-sm-10 {
              -ms-flex-preferred-size: 83.33333333%;
              flex-basis: 83.33333333%;
              max-width: 83.33333333%;
            }
            .col-sm-11 {
              -ms-flex-preferred-size: 91.66666667%;
              flex-basis: 91.66666667%;
              max-width: 91.66666667%;
            }
            .col-sm-12 {
              -ms-flex-preferred-size: 100%;
              flex-basis: 100%;
              max-width: 100%;
            }
            .col-sm-offset-0 {
              margin-left: 0;
            }
            .col-sm-offset-1 {
              margin-left: 8.33333333%;
            }
            .col-sm-offset-2 {
              margin-left: 16.66666667%;
            }
            .col-sm-offset-3 {
              margin-left: 25%;
            }
            .col-sm-offset-4 {
              margin-left: 33.33333333%;
            }
            .col-sm-offset-5 {
              margin-left: 41.66666667%;
            }
            .col-sm-offset-6 {
              margin-left: 50%;
            }
            .col-sm-offset-7 {
              margin-left: 58.33333333%;
            }
            .col-sm-offset-8 {
              margin-left: 66.66666667%;
            }
            .col-sm-offset-9 {
              margin-left: 75%;
            }
            .col-sm-offset-10 {
              margin-left: 83.33333333%;
            }
            .col-sm-offset-11 {
              margin-left: 91.66666667%;
            }
            .start-sm {
              -webkit-box-pack: start;
              -ms-flex-pack: start;
              justify-content: flex-start;
              text-align: start;
            }
            .center-sm {
              -webkit-box-pack: center;
              -ms-flex-pack: center;
              justify-content: center;
              text-align: center;
            }
            .end-sm {
              -webkit-box-pack: end;
              -ms-flex-pack: end;
              justify-content: flex-end;
              text-align: end;
            }
            .top-sm {
              -webkit-box-align: start;
              -ms-flex-align: start;
              align-items: flex-start;
            }
            .middle-sm {
              -webkit-box-align: center;
              -ms-flex-align: center;
              align-items: center;
            }
            .bottom-sm {
              -webkit-box-align: end;
              -ms-flex-align: end;
              align-items: flex-end;
            }
            .around-sm {
              -ms-flex-pack: distribute;
              justify-content: space-around;
            }
            .between-sm {
              -webkit-box-pack: justify;
              -ms-flex-pack: justify;
              justify-content: space-between;
            }
            .first-sm {
              -webkit-box-ordinal-group: 0;
              -ms-flex-order: -1;
              order: -1;
            }
            .last-sm {
              -webkit-box-ordinal-group: 2;
              -ms-flex-order: 1;
              order: 1;
            }
          }
          @media only screen and (min-width: 64em) {
            .container {
              width: 65rem;
            }
            .col-md,
            .col-md-1,
            .col-md-10,
            .col-md-11,
            .col-md-12,
            .col-md-2,
            .col-md-3,
            .col-md-4,
            .col-md-5,
            .col-md-6,
            .col-md-7,
            .col-md-8,
            .col-md-9,
            .col-md-offset-0,
            .col-md-offset-1,
            .col-md-offset-10,
            .col-md-offset-11,
            .col-md-offset-12,
            .col-md-offset-2,
            .col-md-offset-3,
            .col-md-offset-4,
            .col-md-offset-5,
            .col-md-offset-6,
            .col-md-offset-7,
            .col-md-offset-8,
            .col-md-offset-9 {
              box-sizing: border-box;
              -webkit-box-flex: 0;
              -ms-flex: 0 0 auto;
              flex: 0 0 auto;
              padding-right: 0.25rem;
              padding-left: 0.25rem;
            }
            .col-md {
              -webkit-box-flex: 1;
              -ms-flex-positive: 1;
              flex-grow: 1;
              -ms-flex-preferred-size: 0;
              flex-basis: 0;
              max-width: 100%;
            }
            .col-md-1 {
              -ms-flex-preferred-size: 8.33333333%;
              flex-basis: 8.33333333%;
              max-width: 8.33333333%;
            }
            .col-md-2 {
              -ms-flex-preferred-size: 16.66666667%;
              flex-basis: 16.66666667%;
              max-width: 16.66666667%;
            }
            .col-md-3 {
              -ms-flex-preferred-size: 25%;
              flex-basis: 25%;
              max-width: 25%;
            }
            .col-md-4 {
              -ms-flex-preferred-size: 33.33333333%;
              flex-basis: 33.33333333%;
              max-width: 33.33333333%;
            }
            .col-md-5 {
              -ms-flex-preferred-size: 41.66666667%;
              flex-basis: 41.66666667%;
              max-width: 41.66666667%;
            }
            .col-md-6 {
              -ms-flex-preferred-size: 50%;
              flex-basis: 50%;
              max-width: 50%;
            }
            .col-md-7 {
              -ms-flex-preferred-size: 58.33333333%;
              flex-basis: 58.33333333%;
              max-width: 58.33333333%;
            }
            .col-md-8 {
              -ms-flex-preferred-size: 66.66666667%;
              flex-basis: 66.66666667%;
              max-width: 66.66666667%;
            }
            .col-md-9 {
              -ms-flex-preferred-size: 75%;
              flex-basis: 75%;
              max-width: 75%;
            }
            .col-md-10 {
              -ms-flex-preferred-size: 83.33333333%;
              flex-basis: 83.33333333%;
              max-width: 83.33333333%;
            }
            .col-md-11 {
              -ms-flex-preferred-size: 91.66666667%;
              flex-basis: 91.66666667%;
              max-width: 91.66666667%;
            }
            .col-md-12 {
              -ms-flex-preferred-size: 100%;
              flex-basis: 100%;
              max-width: 100%;
            }
            .col-md-offset-0 {
              margin-left: 0;
            }
            .col-md-offset-1 {
              margin-left: 8.33333333%;
            }
            .col-md-offset-2 {
              margin-left: 16.66666667%;
            }
            .col-md-offset-3 {
              margin-left: 25%;
            }
            .col-md-offset-4 {
              margin-left: 33.33333333%;
            }
            .col-md-offset-5 {
              margin-left: 41.66666667%;
            }
            .col-md-offset-6 {
              margin-left: 50%;
            }
            .col-md-offset-7 {
              margin-left: 58.33333333%;
            }
            .col-md-offset-8 {
              margin-left: 66.66666667%;
            }
            .col-md-offset-9 {
              margin-left: 75%;
            }
            .col-md-offset-10 {
              margin-left: 83.33333333%;
            }
            .col-md-offset-11 {
              margin-left: 91.66666667%;
            }
            .start-md {
              -webkit-box-pack: start;
              -ms-flex-pack: start;
              justify-content: flex-start;
              text-align: start;
            }
            .center-md {
              -webkit-box-pack: center;
              -ms-flex-pack: center;
              justify-content: center;
              text-align: center;
            }
            .end-md {
              -webkit-box-pack: end;
              -ms-flex-pack: end;
              justify-content: flex-end;
              text-align: end;
            }
            .top-md {
              -webkit-box-align: start;
              -ms-flex-align: start;
              align-items: flex-start;
            }
            .middle-md {
              -webkit-box-align: center;
              -ms-flex-align: center;
              align-items: center;
            }
            .bottom-md {
              -webkit-box-align: end;
              -ms-flex-align: end;
              align-items: flex-end;
            }
            .around-md {
              -ms-flex-pack: distribute;
              justify-content: space-around;
            }
            .between-md {
              -webkit-box-pack: justify;
              -ms-flex-pack: justify;
              justify-content: space-between;
            }
            .first-md {
              -webkit-box-ordinal-group: 0;
              -ms-flex-order: -1;
              order: -1;
            }
            .last-md {
              -webkit-box-ordinal-group: 2;
              -ms-flex-order: 1;
              order: 1;
            }
          }
          @media only screen and (min-width: 75em) {
            .container {
              width: 76rem;
            }
            .col-lg,
            .col-lg-1,
            .col-lg-10,
            .col-lg-11,
            .col-lg-12,
            .col-lg-2,
            .col-lg-3,
            .col-lg-4,
            .col-lg-5,
            .col-lg-6,
            .col-lg-7,
            .col-lg-8,
            .col-lg-9,
            .col-lg-offset-0,
            .col-lg-offset-1,
            .col-lg-offset-10,
            .col-lg-offset-11,
            .col-lg-offset-12,
            .col-lg-offset-2,
            .col-lg-offset-3,
            .col-lg-offset-4,
            .col-lg-offset-5,
            .col-lg-offset-6,
            .col-lg-offset-7,
            .col-lg-offset-8,
            .col-lg-offset-9 {
              box-sizing: border-box;
              -webkit-box-flex: 0;
              -ms-flex: 0 0 auto;
              flex: 0 0 auto;
              padding-right: 0.25rem;
              padding-left: 0.25rem;
            }
            .col-lg {
              -webkit-box-flex: 1;
              -ms-flex-positive: 1;
              flex-grow: 1;
              -ms-flex-preferred-size: 0;
              flex-basis: 0;
              max-width: 100%;
            }
            .col-lg-1 {
              -ms-flex-preferred-size: 8.33333333%;
              flex-basis: 8.33333333%;
              max-width: 8.33333333%;
            }
            .col-lg-2 {
              -ms-flex-preferred-size: 16.66666667%;
              flex-basis: 16.66666667%;
              max-width: 16.66666667%;
            }
            .col-lg-3 {
              -ms-flex-preferred-size: 25%;
              flex-basis: 25%;
              max-width: 25%;
            }
            .col-lg-4 {
              -ms-flex-preferred-size: 33.33333333%;
              flex-basis: 33.33333333%;
              max-width: 33.33333333%;
            }
            .col-lg-5 {
              -ms-flex-preferred-size: 41.66666667%;
              flex-basis: 41.66666667%;
              max-width: 41.66666667%;
            }
            .col-lg-6 {
              -ms-flex-preferred-size: 50%;
              flex-basis: 50%;
              max-width: 50%;
            }
            .col-lg-7 {
              -ms-flex-preferred-size: 58.33333333%;
              flex-basis: 58.33333333%;
              max-width: 58.33333333%;
            }
            .col-lg-8 {
              -ms-flex-preferred-size: 66.66666667%;
              flex-basis: 66.66666667%;
              max-width: 66.66666667%;
            }
            .col-lg-9 {
              -ms-flex-preferred-size: 75%;
              flex-basis: 75%;
              max-width: 75%;
            }
            .col-lg-10 {
              -ms-flex-preferred-size: 83.33333333%;
              flex-basis: 83.33333333%;
              max-width: 83.33333333%;
            }
            .col-lg-11 {
              -ms-flex-preferred-size: 91.66666667%;
              flex-basis: 91.66666667%;
              max-width: 91.66666667%;
            }
            .col-lg-12 {
              -ms-flex-preferred-size: 100%;
              flex-basis: 100%;
              max-width: 100%;
            }
            .col-lg-offset-0 {
              margin-left: 0;
            }
            .col-lg-offset-1 {
              margin-left: 8.33333333%;
            }
            .col-lg-offset-2 {
              margin-left: 16.66666667%;
            }
            .col-lg-offset-3 {
              margin-left: 25%;
            }
            .col-lg-offset-4 {
              margin-left: 33.33333333%;
            }
            .col-lg-offset-5 {
              margin-left: 41.66666667%;
            }
            .col-lg-offset-6 {
              margin-left: 50%;
            }
            .col-lg-offset-7 {
              margin-left: 58.33333333%;
            }
            .col-lg-offset-8 {
              margin-left: 66.66666667%;
            }
            .col-lg-offset-9 {
              margin-left: 75%;
            }
            .col-lg-offset-10 {
              margin-left: 83.33333333%;
            }
            .col-lg-offset-11 {
              margin-left: 91.66666667%;
            }
            .start-lg {
              -webkit-box-pack: start;
              -ms-flex-pack: start;
              justify-content: flex-start;
              text-align: start;
            }
            .center-lg {
              -webkit-box-pack: center;
              -ms-flex-pack: center;
              justify-content: center;
              text-align: center;
            }
            .end-lg {
              -webkit-box-pack: end;
              -ms-flex-pack: end;
              justify-content: flex-end;
              text-align: end;
            }
            .top-lg {
              -webkit-box-align: start;
              -ms-flex-align: start;
              align-items: flex-start;
            }
            .middle-lg {
              -webkit-box-align: center;
              -ms-flex-align: center;
              align-items: center;
            }
            .bottom-lg {
              -webkit-box-align: end;
              -ms-flex-align: end;
              align-items: flex-end;
            }
            .around-lg {
              -ms-flex-pack: distribute;
              justify-content: space-around;
            }
            .between-lg {
              -webkit-box-pack: justify;
              -ms-flex-pack: justify;
              justify-content: space-between;
            }
            .first-lg {
              -webkit-box-ordinal-group: 0;
              -ms-flex-order: -1;
              order: -1;
            }
            .last-lg {
              -webkit-box-ordinal-group: 2;
              -ms-flex-order: 1;
              order: 1;
            }
          }

          .item {
            margin-bottom: 0.5rem;
          }

          .wrapper {
            overflow: hidden;
            padding: 0px;
          }
          .wrapper.padding {
            padding: 11px;
          }
          .row {
            overflow: hidden;
            width: auto;
          }

          .d-none {
            display: none !important;
          }
          .d-inline {
            display: inline !important;
          }
          .d-inline-block {
            display: inline-block !important;
          }
          .d-block {
            display: block !important;
          }
          .d-table {
            display: table !important;
          }
          .d-table-row {
            display: table-row !important;
          }
          .d-table-cell {
            display: table-cell !important;
          }
          .d-flex {
            display: -webkit-box !important;
            display: -ms-flexbox !important;
            display: flex !important;
          }
          .d-inline-flex {
            display: -webkit-inline-box !important;
            display: -ms-inline-flexbox !important;
            display: inline-flex !important;
          }

          @media (min-width: 576px) {
            .d-sm-none {
              display: none !important;
            }
            .d-sm-inline {
              display: inline !important;
            }
            .d-sm-inline-block {
              display: inline-block !important;
            }
            .d-sm-block {
              display: block !important;
            }
            .d-sm-table {
              display: table !important;
            }
            .d-sm-table-row {
              display: table-row !important;
            }
            .d-sm-table-cell {
              display: table-cell !important;
            }
            .d-sm-flex {
              display: -webkit-box !important;
              display: -ms-flexbox !important;
              display: flex !important;
            }
            .d-sm-inline-flex {
              display: -webkit-inline-box !important;
              display: -ms-inline-flexbox !important;
              display: inline-flex !important;
            }
          }

          @media (min-width: 768px) {
            .d-md-none {
              display: none !important;
            }
            .d-md-inline {
              display: inline !important;
            }
            .d-md-inline-block {
              display: inline-block !important;
            }
            .d-md-block {
              display: block !important;
            }
            .d-md-table {
              display: table !important;
            }
            .d-md-table-row {
              display: table-row !important;
            }
            .d-md-table-cell {
              display: table-cell !important;
            }
            .d-md-flex {
              display: -webkit-box !important;
              display: -ms-flexbox !important;
              display: flex !important;
            }
            .d-md-inline-flex {
              display: -webkit-inline-box !important;
              display: -ms-inline-flexbox !important;
              display: inline-flex !important;
            }
          }

          @media (min-width: 992px) {
            .d-lg-none {
              display: none !important;
            }
            .d-lg-inline {
              display: inline !important;
            }
            .d-lg-inline-block {
              display: inline-block !important;
            }
            .d-lg-block {
              display: block !important;
            }
            .d-lg-table {
              display: table !important;
            }
            .d-lg-table-row {
              display: table-row !important;
            }
            .d-lg-table-cell {
              display: table-cell !important;
            }
            .d-lg-flex {
              display: -webkit-box !important;
              display: -ms-flexbox !important;
              display: flex !important;
            }
            .d-lg-inline-flex {
              display: -webkit-inline-box !important;
              display: -ms-inline-flexbox !important;
              display: inline-flex !important;
            }
          }

          @media (min-width: 1200px) {
            .d-xl-none {
              display: none !important;
            }
            .d-xl-inline {
              display: inline !important;
            }
            .d-xl-inline-block {
              display: inline-block !important;
            }
            .d-xl-block {
              display: block !important;
            }
            .d-xl-table {
              display: table !important;
            }
            .d-xl-table-row {
              display: table-row !important;
            }
            .d-xl-table-cell {
              display: table-cell !important;
            }
            .d-xl-flex {
              display: -webkit-box !important;
              display: -ms-flexbox !important;
              display: flex !important;
            }
            .d-xl-inline-flex {
              display: -webkit-inline-box !important;
              display: -ms-inline-flexbox !important;
              display: inline-flex !important;
            }
          }
        `]}})}))},100:(e,t,i)=>{"use strict";var a=i(381);class n extends a.WF{static get properties(){return{_config:{}}}static styles=a.AH`
    ha-card {
      box-shadow: none;
      background: none;
      padding: 0 16px 0 0;
      font-weight: bold;
      font-size: 14px;
    }
  `;setConfig(e){if(!e||!e.title)throw new Error("Title configuration required");this._config={...e}}render(){return a.qy`
      <ha-card>
        ${this._config.title}
      </ha-card>
    `}getCardSize(){return 1}}customElements.whenDefined("hui-masonry-view").then((()=>{customElements.get("dwains-heading-card")||customElements.define("dwains-heading-card",n)}))},506:(e,t,i)=>{"use strict";var a=i(79),n=i(752),o=i(991),s=i(165),r=i(845),l=i(987),d=i(969),c=i(153),h=i(331),p=i(177);class u extends r.WF{static get properties(){return{data:{},favorites:{},favoriteEditMode:{},selectedArea:{},areaEditMode:{},areaViewEditMode:{},areaViewDisplayGrouped:{},areaDisplayGrouped:{}}}async loadHelpers(){if("function"==typeof window.loadCardHelpers)return await window.loadCardHelpers();console.warn("loadCardHelpers is not available, ensure you are running a compatible version of Home Assistant")}set hass(e){this.startedUp&&this._update_hass(e)}_update_hass(e){this._hass=e;null!=this.data&&0!==this.data.length&&(this.data.forEach((t=>{t.area.area_id==this.selectedArea&&(t.cards.forEach((t=>{t.card&&(t.card.hass=e)})),t.customCardsTop.forEach((t=>{t.card&&(t.card.hass=e)})),t.customCardsBottom.forEach((t=>{t.card&&(t.card.hass=e)})))})),0!=this.favorites.length&&this.favorites.forEach((t=>{t.card&&(t.card.hass=e)})));this.badgesCard&&(this.badgesCard.hass=e);this.timeout||(this.timeout=!0,this.areaEditMode||this.favoriteEditMode||this.areaViewEditMode?window.setTimeout((()=>{this.timeout=!1}),1e3):window.setTimeout((()=>{this.timeout=!1}),100),this.requestUpdate())}async setConfig(e){this.startedUp=!1,this.timeout=!1,this._hass=window.__dd_get_hass(),this.cardHelpers=await this.loadHelpers(),console.log("[DD-DEBUG] homepage-card.setConfig ran; hass=",!!this._hass,"cardHelpers=",!!this.cardHelpers,"DD-BUILD-dd9"),this.selectedArea=window.location.hash.substring(1),this.areaEditMode=!1,this.favoriteEditMode=!1,this.areaViewEditMode=!1,this.areaViewDisplayGrouped="false"!=l.A.get("dwains_dashboard_areaViewDisplayGrouped"),this.areaDisplayGrouped="false"!=l.A.get("dwains_dashboard_areaDisplayGrouped"),this._config=e}async connectedCallback(){super.connectedCallback(),await this._loadData(),await this._hass.connection.subscribeEvents((()=>this._reloadCard()),"dwains_dashboard_homepage_card_reload"),[800,2000,4000,7000,12000].forEach((d=>setTimeout((()=>{try{this.shadowRoot&&this.shadowRoot.querySelectorAll(".area-button ha-icon").forEach((ic=>{const v=ic.icon;if(!v||v.indexOf(":")<1||0===v.indexOf("mdi:"))return;const sr=ic.shadowRoot,sv=sr&&sr.querySelector("ha-svg-icon");if(sv&&sv.path)return;const pa=sr&&sr.querySelector("svg path");if(pa&&(pa.getAttribute("d")||"").length)return;ic.icon="",ic.icon=v}))}catch(e){}}),d)))}async _reloadCard(){await this._loadData(),this.requestUpdate()}async _loadData(){this.startedUp=!1,this.areas=await this._hass.callWS({type:"config/area_registry/list"}),this.devices=await this._hass.callWS({type:"config/device_registry/list"}),this.entities=await this._hass.callWS({type:"config/entity_registry/list"}),this.configuration=await this._hass.callWS({type:"dwains_dashboard/configuration/get"}),this.floors=await this._hass.callWS({type:"config/floor_registry/list"}).catch((()=>[]));const e=[],t=[];if(null==this.areas||0===this.areas.length||null==this.devices||0===this.devices.length||null==this.entities||0===this.entities.length||null==this.configuration||0===this.configuration.length);else{const i=document.createElement("hui-masonry-view");if(i.lovelace={editMode:!0},i.willUpdate(new Map),this.notificationCard=await this.createCardElement2({type:"custom:dwains-notification-card",hass:this._hass}),this.badgesCard=await this.createCardElement2({type:"custom:dwains-house-information-card",hass:this._hass}),this.configuration.entities){const e=[];Object.entries(this.configuration.entities).map((async([t,i])=>{if(i.favorite){const i=(0,c.mD)(t),a=!!this.configuration.entities[t]&&!!this.configuration.entities[t].hidden,n=!!this.configuration.entities[t]&&!!this.configuration.entities[t].excluded,o=this.configuration.entities[t]?this.configuration.entities[t].friendly_name:"",s=!(!this.configuration.entities[t]||!this.configuration.entities[t].custom_card)&&this.configuration.entities[t].custom_card,r=!(!this.configuration.entities[t]||!this.configuration.entities[t].custom_popup)&&this.configuration.entities[t].custom_popup,l=!(!this.configuration.entities[t]||!this.configuration.entities[t].favorite)&&this.configuration.entities[t].favorite;let d={},h="1",p="1",u="1",m="1",g="1",f="1";if(s&&this.configuration.entity_cards&&this.configuration.entity_cards[t])d={input_name:o,input_entity:t,...this.configuration.entity_cards[t]};else if(this.configuration.devices_card[i])d={input_name:o,input_entity:t,...this.configuration.devices_card[i]};else if("sensor"===i&&this._hass&&this._hass.states[t].attributes.unit_of_measurement&&!this.configuration.homepage_header.disable_sensor_graph)d={graph:"line",type:"sensor",hours_to_show:24,detail:1,entity:t,...(o?{name:o}:{})};else{switch(i){default:d=o?{type:"tile",name:o}:{type:"tile"};break;case"camera":d={type:"picture-entity",camera_view:"auto"},h="2",p="2",u="2",m="2",g="2",f="2";break;case"climate":d=o?{type:"thermostat",name:o,features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]}:{type:"thermostat",features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]};break;case"cover":d=o?{type:"tile",name:o,features:[{type:"cover-open-close"},{type:"cover-position"}]}:{type:"tile",features:[{type:"cover-open-close"},{type:"cover-position"}]};break;case"light":d=o?{type:"tile",name:o,features:[{type:"light-brightness"}]}:{type:"tile",features:[{type:"light-brightness"}]}}d={entity:t,...d}}this.configuration.entities[t]&&this.configuration.entities[t].row_span&&(h=this.configuration.entities[t].row_span),this.configuration.entities[t]&&this.configuration.entities[t].col_span&&(p=this.configuration.entities[t].col_span),this.configuration.entities[t]&&this.configuration.entities[t].row_span_lg&&(u=this.configuration.entities[t].row_span_lg),this.configuration.entities[t]&&this.configuration.entities[t].col_span_lg&&(m=this.configuration.entities[t].col_span_lg),this.configuration.entities[t]&&this.configuration.entities[t].row_span_xl&&(g=this.configuration.entities[t].row_span_xl),this.configuration.entities[t]&&this.configuration.entities[t].col_span_xl&&(f=this.configuration.entities[t].col_span_xl),e.push({domain:i,entity:t,rowSpan:h,colSpan:p,rowSpanLg:u,colSpanLg:m,rowSpanXl:g,colSpanXl:f,friendlyName:o,hideEntity:a,excludeEntity:n,card:await this.createCardElement2(d),customCard:s,customPopup:r,isFavorite:l,favorite_sort_order:this.configuration.entities[t]&&this.configuration.entities[t].favorite_sort_order?this.configuration.entities[t].favorite_sort_order:99})}})),this.favorites=e}for(const i of this.areas)if(this.configuration.areas[i.area_id]&&this.configuration.areas[i.area_id].disabled)t.push(i);else{const t=new Set,a=new Set,n=[],o=[],s=[],r=[],l=[],d=[];for(const e of this.devices)e.area_id===i.area_id&&t.add(e.id);for(const e of this.entities)if(e.area_id?e.area_id===i.area_id:t.has(e.device_id)){if(e.hidden_by)continue;if(this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].disabled){r.push(e.entity_id);continue}const t=e.entity_id.substr(0,e.entity_id.indexOf("."));if(this._hass.states[e.entity_id]){const i=!!this.configuration.entities[e.entity_id]&&!!this.configuration.entities[e.entity_id].hidden,o=!!this.configuration.entities[e.entity_id]&&!!this.configuration.entities[e.entity_id].excluded,r=this.configuration.entities[e.entity_id]?this.configuration.entities[e.entity_id].friendly_name:"",l=!(!this.configuration.entities[e.entity_id]||!this.configuration.entities[e.entity_id].custom_card)&&this.configuration.entities[e.entity_id].custom_card,d=!(!this.configuration.entities[e.entity_id]||!this.configuration.entities[e.entity_id].custom_popup)&&this.configuration.entities[e.entity_id].custom_popup,c=!(!this.configuration.entities[e.entity_id]||!this.configuration.entities[e.entity_id].favorite)&&this.configuration.entities[e.entity_id].favorite;if(i)s.push(e.entity_id),a.add(e.entity_id);else{let s={},h="1",p="1",u="1",m="1",g="1",f="1";if(l&&this.configuration.entity_cards&&this.configuration.entity_cards[e.entity_id])s={input_name:r,input_entity:e.entity_id,...this.configuration.entity_cards[e.entity_id]};else if(this.configuration.devices_card[t])s={input_name:r,input_entity:e.entity_id,...this.configuration.devices_card[t]};else if("sensor"===t&&this._hass&&this._hass.states[e.entity_id].attributes.unit_of_measurement&&!this.configuration.homepage_header.disable_sensor_graph)s={graph:"line",type:"sensor",hours_to_show:24,detail:1,entity:e.entity_id,...(r?{name:r}:{})};else{switch(t){default:s=r?{type:"tile",name:r}:{type:"tile"};break;case"camera":s={type:"picture-entity",camera_view:"auto"},h="2",p="2",u="2",m="2",g="2",f="2";break;case"climate":s=r?{type:"thermostat",name:r,features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]}:{type:"thermostat",features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]};break;case"cover":s=r?{type:"tile",name:r,features:[{type:"cover-open-close"},{type:"cover-position"}]}:{type:"tile",features:[{type:"cover-open-close"},{type:"cover-position"}]};break;case"light":s=r?{type:"tile",name:r,features:[{type:"light-brightness"}]}:{type:"tile",features:[{type:"light-brightness"}]}}s={entity:e.entity_id,...s}}this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].row_span&&(h=this.configuration.entities[e.entity_id].row_span),this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].col_span&&(p=this.configuration.entities[e.entity_id].col_span),this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].row_span_lg&&(u=this.configuration.entities[e.entity_id].row_span_lg),this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].col_span_lg&&(m=this.configuration.entities[e.entity_id].col_span_lg),this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].row_span_xl&&(g=this.configuration.entities[e.entity_id].row_span_xl),this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].col_span_xl&&(f=this.configuration.entities[e.entity_id].col_span_xl),n.push({domain:t,entity:e.entity_id,rowSpan:h,colSpan:p,rowSpanLg:u,colSpanLg:m,rowSpanXl:g,colSpanXl:f,friendlyName:r,hideEntity:i,excludeEntity:o,card:this.createCardElement2(s),customCard:l,customPopup:d,isFavorite:c,sort_order:this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].sort_order?this.configuration.entities[e.entity_id].sort_order:99,grouped_sort_order:this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].grouped_sort_order?this.configuration.entities[e.entity_id].grouped_sort_order:99}),a.add(e.entity_id)}}else o.push(e.entity_id)}0!==this.configuration.area_cards.length&&this.configuration.area_cards[i.area_id]&&Object.entries(this.configuration.area_cards[i.area_id]).map((async([e,t])=>{const a=await this.createCardElement2(t),n=t.row_span?t.row_span:"1",o=t.col_span?t.col_span:"1",s=t.row_span_lg?t.row_span_lg:"1",r=t.col_span_lg?t.col_span_lg:"1",c=t.row_span_xl?t.row_span_xl:"1",h=t.col_span_xl?t.col_span_xl:"1";"bottom"==t.position?d.push({card:a,filename:e,area_id:i.area_id,rowSpan:n,colSpan:o,rowSpanLg:s,colSpanLg:r,rowSpanXl:c,colSpanXl:h}):l.push({card:a,filename:e,area_id:i.area_id,rowSpan:n,colSpan:o,rowSpanLg:s,colSpanLg:r,rowSpanXl:c,colSpanXl:h})})),e.push({entitiesNoState:o,entitiesHidden:s,entitiesDisabled:r,entities:a,area:i,cards:n,customCardsTop:l,customCardsBottom:d,floor:((this.floors||[]).find((f=>f.floor_id===i.floor_id))||{}).name||(0,p.A)(this._hass,"area.no_floor"),floorLevel:((this.floors||[]).find((f=>f.floor_id===i.floor_id))||{}).level??9999,sort_order:this.configuration.areas[i.area_id]&&this.configuration.areas[i.area_id].sort_order?this.configuration.areas[i.area_id].sort_order:99,grouped_sort_order:this.configuration.areas[i.area_id]&&this.configuration.areas[i.area_id].grouped_sort_order?this.configuration.areas[i.area_id].grouped_sort_order:99})}e.sort((function(e,t){let i=e.sort_order,a=t.sort_order;return i==a?0:i>a?1:-1})),0===this.selectedArea.length&&(this.selectedArea=e[0].area.area_id),await Promise.all(e.flatMap((g=>g&&g.cards||[])).map((async o=>{try{o&&(o.card=await o.card)}catch(_){o&&(o.card=null)}}))),this.data=e,this.disabledAreas=t,this.startedUp=!0}}_average(e,t,i){const a=e[t].filter((e=>!i||e.attributes.device_class===i));if(!a)return;let n;const o=a.filter((e=>!(!e.attributes.unit_of_measurement||isNaN(Number(e.state))||(n?e.attributes.unit_of_measurement!==n:(n=e.attributes.unit_of_measurement,0)))));if(!o.length)return;const s=o.reduce(((e,t)=>e+Number(t.state)),0);return`${Math.round(s/o.length*10)/10}${n}`}_isOn(e,t,i){const a=e[t];if(a)return(i?a.filter((e=>e.attributes.device_class===i)):a).filter((e=>!d.s7.includes(e.state)&&!d.jj.includes(e.state))).length}_climateState(e,t){const i=e[t];if(!i)return;const a=[];for(const e of i)if(e.attributes.hvac_action&&"idle"!=e.attributes.hvac_action){const t=e.attributes.temperature?" ("+e.attributes.temperature+this._hass.config.unit_system.temperature+")":"";a.push(this._hass.localize(`state_attributes.climate.hvac_action.${e.attributes.hvac_action}`)+t)}else if(!e.attributes.hvac_action&&!d.s7.includes(e.state)&&!d.jj.includes(e.state)){const t=e.attributes.temperature?" ("+e.attributes.temperature+this._hass.config.unit_system.temperature+")":"";a.push(this._hass.localize(`component.climate.state._.${e.state}`)+t)}return 0==a.length?"":a.join(", ")}_handleAreaDisableAllEntitiesClicked(e){const t=e.currentTarget.area,i=this.data.find((e=>e.area.area_id==t)),a=e.currentTarget.key,n=e.currentTarget.value;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entities_bool_value",entities:JSON.stringify([...i.entities]),key:a,value:n}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleAreaClick(e){var t=e.currentTarget.dataset.areaId;window.location.hash=t,this.selectedArea=t,window.scrollTo(0,0),this._update_hass(this._hass)}_handleAreaDoubleClick(e){const t=e.currentTarget.dataset.areaId,i=e.currentTarget.lightState;this._hass.callService("light",i?"turn_off":"turn_on",void 0,{area_id:t})}_backButtonClick(){window.location.hash="",this._update_hass(this._hass)}_handleMoreInfo(e){(0,n.Q)(e.currentTarget.entity)}_entitiesByDomain(e){const t={};for(const i of e){if(this.configuration.entities[i]&&this.configuration.entities[i].excluded)continue;const e=i.substr(0,i.indexOf("."));if(!(d.Zz.includes(e)||d.Xt.includes(e)||d.Ti.includes(e)||d.K5.includes(e)||d.ge.includes(e)||d.R9.includes(e)))continue;const a=this._hass.states[i];a&&(!d.Xt.includes(e)&&!d.Ti.includes(e)&&!d.K5.includes(e)||d.gJ[e].includes(a.attributes.device_class||""))&&(e in t||(t[e]=[]),t[e].push(a))}return t}async createCardElement2(e){if(!this.cardHelpers)return void console.error("Card helpers zijn niet geladen.");const t=await this.cardHelpers.createCardElement(e);return t.hass=this._hass,t}_toggle(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.domain;d.Zz.includes(t)&&this._hass.callService(t,e.currentTarget.state?"turn_off":"turn_on",void 0,{area_id:e.currentTarget.area_id})}_addLovelaceCard(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.area,i=e.currentTarget.areaName,a=e.currentTarget.position;window.setTimeout((()=>{(0,o.d)((0,p.A)(this._hass,"entity.add_card_to")+i,{type:"custom:dwains-create-custom-card-card",area:t,position:a,page:"areas",name:i},!0,"")}),50)}_handleAreaEditClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.area_id,i=e.currentTarget.area_icon,a=e.currentTarget.floor,n=e.currentTarget.disable_area;window.setTimeout((()=>{(0,o.d)((0,p.A)(this._hass,"area.edit_area_button"),{type:"custom:dwains-edit-area-button-card",areaId:t,icon:i,floor:a,disableArea:n},!1,"")}),50)}_handleEntityEditClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity,i=e.currentTarget.friendlyName,a=e.currentTarget.hideEntity,n=e.currentTarget.disableEntity,s=e.currentTarget.excludeEntity,r=e.currentTarget.colSpan,l=e.currentTarget.rowSpan,d=e.currentTarget.colSpanLg,c=e.currentTarget.rowSpanLg,h=e.currentTarget.colSpanXl,u=e.currentTarget.rowSpanXl,m=e.currentTarget.customCard,g=e.currentTarget.customPopup;window.setTimeout((()=>{(0,o.d)((0,p.A)(this._hass,"entity.edit_entity"),{type:"custom:dwains-edit-entity-card",entity:t,friendlyName:i,hideEntity:a,disableEntity:n,excludeEntity:s,colSpan:r,rowSpan:l,colSpanLg:d,rowSpanLg:c,colSpanXl:h,rowSpanXl:u,customCard:m,customPopup:g},!1,"")}),50)}_handleEntityEditBoolValueClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity,i=e.currentTarget.key,a=e.currentTarget.value;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entity_bool_value",entityId:t,key:i,value:a}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleAreaEditBoolValueClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.areaId,i=e.currentTarget.key,a=e.currentTarget.value;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_area_bool_value",areaId:t,key:i,value:a}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleEntityEditCardClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity;let i,a;if(this.configuration.entity_cards&&this.configuration.entity_cards[t]){const e=this.configuration.entities[t]?this.configuration.entities[t].friendly_name:"";i={input_name:e,input_entity:t,...this.configuration.entity_cards[t]},a="editor-element"}window.setTimeout((()=>{(0,o.d)((0,p.A)(this._hass,"entity.edit_entity_card"),{type:"custom:dwains-edit-entity-card-card",entity_id:t,cardConfig:i,mode:a,existingCardEdit:!!i},!0,"")}),50)}_handleEntityEditPopupClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity;let i,a;if(this.configuration.entities_popup&&this.configuration.entities_popup[t]){const e=this.configuration.entities[t]?this.configuration.entities[t].friendly_name:"";i={input_name:e,input_entity:t,...this.configuration.entities_popup[t]},a="editor-element"}window.setTimeout((()=>{(0,o.d)((0,p.A)(this._hass,"entity.edit_entity_popup_card"),{type:"custom:dwains-edit-entity-popup-card",entity_id:t,cardConfig:i,mode:a,existingCardEdit:!!i},!0,"")}),50)}_handleEntityAddToFavoritesClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entity_favorite",entityId:t,favorite:!0}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleEntityRemoveFromFavoritesClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.entity;this._hass.connection.sendMessagePromise({type:"dwains_dashboard/edit_entity_favorite",entityId:t,favorite:!1}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleDwainsDashboardSettingsClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.disableClock,i=e.currentTarget.amPmClock,a=e.currentTarget.disableWelcomeMessage,n=e.currentTarget.v2Mode,s=e.currentTarget.disableSensorGraph,r=e.currentTarget.invertCover,l=e.currentTarget.weatherEntity,d=e.currentTarget.alarmEntity;window.setTimeout((()=>{(0,o.d)((0,p.A)(this._hass,"global.dwains_dashboard_settings"),{type:"custom:dwains-edit-homepage-header-card",disableClock:t,amPmClock:i,disableWelcomeMessage:a,v2Mode:n,disableSensorGraph:s,invertCover:r,weatherEntity:l,alarmEntity:d},!1,"")}),50)}_handleAreaViewDisplayGroupedClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;this.areaViewDisplayGrouped=t,l.A.set("dwains_dashboard_areaViewDisplayGrouped",t,{expires:365})}_handleAreaDisplayGroupedClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;this.areaDisplayGrouped=t,l.A.set("dwains_dashboard_areaDisplayGrouped",t,{expires:365})}_handleFavoriteEditModeClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;if(t){this._sortable=[];const e=this.shadowRoot.querySelectorAll(".sortable");for(var i=0;i<e.length;i++)this._sortable[i]=new h.A(e[i],{forceFallback:!0,animation:150,dataIdAttr:"data-entity",handle:".sortable-move",onEnd:function(e){console.log(e),window.__dd_get_hass().connection.sendMessagePromise({type:"dwains_dashboard/sort_entity",sortData:JSON.stringify(this.toArray()),sortType:"favorite_sort_order"}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}})}else this._sortable.forEach((e=>e.destroy())),this._sortable=void 0;this.favoriteEditMode=t}_handleAreaEditModeClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;if(t){this._sortable=[];const e=this.shadowRoot.querySelectorAll(".sortable");for(var i=0;i<e.length;i++){const t=this.areaDisplayGrouped?"grouped_sort_order":"sort_order";this._sortable[i]=new h.A(e[i],{forceFallback:!0,animation:150,dataIdAttr:"data-area-id",handle:".sortable-move",onEnd:function(e){console.log(e),window.__dd_get_hass().connection.sendMessagePromise({type:"dwains_dashboard/sort_area_button",sortData:JSON.stringify(this.toArray()),sortType:t}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}})}}else this._sortable.forEach((e=>e.destroy())),this._sortable=void 0;this.areaEditMode=t}_handleAreaViewEditModeClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;if(t){this._sortable=[];const e=this.shadowRoot.querySelectorAll(".sortable");for(var i=0;i<e.length;i++){const t=this.areaViewDisplayGrouped?"grouped_sort_order":"sort_order";this._sortable[i]=new h.A(e[i],{forceFallback:!0,animation:150,dataIdAttr:"data-entity",handle:".sortable-move",onEnd:function(e){window.__dd_get_hass().connection.sendMessagePromise({type:"dwains_dashboard/sort_entity",sortData:JSON.stringify(this.toArray()),sortType:t}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}})}}else this._sortable.forEach((e=>e.destroy())),this._sortable=void 0;this.areaViewEditMode=t}_handleCustomCardEditClick(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.area_id,i=e.currentTarget.filename,a=document.createElement("hui-masonry-view");a.lovelace={editMode:!0},a.willUpdate(new Map);const n=e.currentTarget.colSpan,s=e.currentTarget.rowSpan,r=e.currentTarget.colSpanLg,l=e.currentTarget.rowSpanLg,d=e.currentTarget.colSpanXl,c=e.currentTarget.rowSpanXl,h=this.configuration.area_cards[t][i];var p="top";h.position&&(p=h.position,delete h.position),delete h.col_span,delete h.row_span,delete h.col_span_lg,delete h.row_span_lg,delete h.col_span_xl,delete h.row_span_xl,window.setTimeout((()=>{(0,o.d)(this._hass.localize("ui.components.entity.entity-picker.edit"),{type:"custom:dwains-create-custom-card-card",area:t,mode:"editor-element",page:"areas",cardConfig:h,position:p,filename:i,colSpan:n,rowSpan:s,colSpanLg:r,rowSpanLg:l,colSpanXl:d,rowSpanXl:c},!0,"")}),50)}_renderAreaButtons(e){if(this.areaDisplayGrouped){e.sort((function(e,t){let i=e.floorLevel,a=t.floorLevel;return i==a?0:i>a?1:-1})),e.sort((function(e,t){let i=e.grouped_sort_order,a=t.grouped_sort_order;return i==a?0:i>a?1:-1}));let t=e.reduce(((e,t)=>(e[t.floor]=[...e[t.floor]||[],t],e)),{});return r.qy`
        <div>
        ${Object.keys(t).map((e=>r.qy`
            <div class="mb-5">
              <h3 class="font-semibold capitalize text-gray">${e.replace(/_/g," ")}</h3>
              <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration.homepage_header.v2_mode?"lg-grid-cols-4 xl-grid-cols-5":""} gap-4 sortable">
              ${Object.entries(t[e]).map((([e,t])=>r.qy`${this._renderAreaButton(t)}`))}
              </div>
            </div>
          `))}
        </div>
        `}return r.qy`
          <div class="grid grid-cols-2 md-grid-cols-3 ${this.configuration.homepage_header.v2_mode?"lg-grid-cols-4 xl-grid-cols-5":""} gap-4 sortable">
            ${e.map((e=>this._renderAreaButton(e)))}
          </div>`}_renderAreaButtonCard(e,t){return r.qy`
        <div>
          <ha-card class="p-2">
            ${(0,p.A)(this._hass,"area.title")}:<br>
            <span class="break-words">
            ${e.name}
            </span>
          </ha-card>
          <ha-card>
            <div class="card-actions">
              <ha-button 
                .areaId="${e.area_id}"
                .key=${"disabled"}
                .value=${!1}
                @click=${this._handleAreaEditBoolValueClick} 
              >
                ${(0,p.A)(this._hass,"area.enable")}
              </ha-button>
            </div>
          </ha-card>
        </div>
      `}_renderAreaButton(e){const t=this._entitiesByDomain(e.entities),i=[];return d.Xt.forEach((e=>{e in t&&d.gJ[e].forEach((a=>{t[e].some((e=>e.attributes.device_class===a))&&i.push(this._average(t,e,a))}))})),r.qy`
        <div class="relative" data-area-id='${e.area.area_id}'>
          <div 
            class="flex justify-between h-44 p-3 area-button ${this.selectedArea!=e.area.area_id||this.configuration.homepage_header.v2_mode?"":"current"}"
            data-area-id='${e.area.area_id}'
            @click=${this._handleAreaClick} 
            .lightState=${this._isOn(t,"light")} 
            @dblclick="${this._handleAreaDoubleClick}"
          >
            <div class="h-full flex flex-wrap content-between">
              <div class="w-full ha-icon">
                <ha-icon
                    class="h-14 w-14"
                    style="color: var(--primary-color);"
                    .hass=${this._hass}
                    .icon=${e.area.icon||"mdi:texture-box"}
                  ></ha-icon>
              </div>
              <div class="w-full">
                <h3 class="font-semibold text-lg">${e.area.name}</h3>
                ${i.length?r.qy`
                    <div class="sensors text-gray">
                      ${i.join(" - ")}
                    </div>`:""}
                <span class="text-gray text-sm capitalize">${this._climateState(t,"climate")}</span>
              </div>
            </div>
            <div class="row-span-2 text-right space-y-0.5 info">
              ${d.Zz.map((i=>{if(!(i in t))return"";const a=this._isOn(t,i);return"light"==i||"light"!=i&&a?d.Zz.includes(i)?r.qy`
                      <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                        <ha-icon
                          class="${a?"on":"off"} w-6 h-6 mr-0.5"
                          .icon=${d.qJ[i][a?"on":"off"]}
                          .domain=${i}
                          .area_id=${e.area.area_id}
                          .state=${a}
                          @click=${this._toggle}
                        >
                        </ha-icon>
                        ${a}
                      </span><br>
                      `:"":void 0}))}
              ${d.Ti.map((e=>e in t?d.gJ[e].map((i=>{const a=this._isOn(t,e,i);if(a)return r.qy`
                      ${d.qJ[e][i]?r.qy`
                          <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                            <ha-icon
                              class="w-6 h-6 mr-0.5"
                              .icon=${d.qJ[e][i]}
                            ></ha-icon> ${a}
                          </span><br>`:""}
                    `})):""))}
              ${d.K5.map((e=>e in t?d.gJ[e].map((i=>{const a=this._isOn(t,e,i);if(a)return r.qy`
                      ${d.qJ[e][i]?r.qy`
                          <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                            <ha-icon
                              class="w-6 h-6 mr-0.5"
                              .icon=${d.qJ[e][i]}
                            ></ha-icon> ${a}
                          </span><br>`:""}
                    `})):""))}              
              ${d.R9.map((e=>{if(!(e in t))return"";const i=this._isOn(t,e);return i?d.R9.includes(e)?r.qy`
                      <span class="info-badge inline-flex items-center px-1 py-0.5 rounded text-xs font-medium">
                        <ha-icon
                          class="${i?"on":"off"} w-6 h-6 mr-0.5"
                          .icon=${d.qJ[e][i?"on":"off"]}
                        >
                        </ha-icon>
                        ${i}
                      </span><br>
                      `:"":void 0}))}
            </div>
          </div>
          ${this.areaEditMode?r.qy`
            <ha-card>
              <div class="card-actions-multiple">
                <div class="sortable-move">
                  <ha-icon
                    .icon=${"mdi:cursor-move"}
                  >
                  </ha-icon>
                </div>
                <ha-button 
                  .area_id=${e.area.area_id}
                  .area_icon=${this.configuration.areas[e.area.area_id]&&this.configuration.areas[e.area.area_id].icon?this.configuration.areas[e.area.area_id].icon:""}
                  .floor=${this.configuration.areas[e.area.area_id]&&this.configuration.areas[e.area.area_id].floor?this.configuration.areas[e.area.area_id].floor:""}
                  .disable_area=${!(!this.configuration.areas[e.area.area_id]||!this.configuration.areas[e.area.area_id].disable_area)&&this.configuration.areas[e.area.area_id].disable_area}

                  @click=${this._handleAreaEditClick} 
                >
                  ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                </ha-button>
              </div>
            </ha-card>
            `:""}
        </div>
      `}_renderAreaViewCustomCards(e,t){return r.qy`
      <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 my-4">
        ${"bottom"==t?e.customCardsBottom.map((e=>r.qy`${this._renderAreaViewCustomCard(e)}`)):e.customCardsTop.map((e=>r.qy`${this._renderAreaViewCustomCard(e)}`))}
      </div>
      `}_renderAreaViewCustomCard(e){return r.qy`
      <div class="col-span-${e.colSpan} row-span-${e.rowSpan} lg-col-span-${e.colSpanLg} lg-row-span-${e.rowSpanLg} xl-col-span-${e.colSpanXl} xl-row-span-${e.rowSpanXl} relative">
        <div>
          <dd-lazy-card .card=${e.card}></dd-lazy-card>
        </div>
        ${this.areaViewEditMode?r.qy`
        <ha-card>
          <div class="card-actions">
            <ha-button 
              @click=${this._handleCustomCardEditClick} 
              .area_id=${e.area_id}
              .filename=${e.filename}
              .rowSpan=${e.rowSpan}
              .colSpan=${e.colSpan}
              .rowSpanLg=${e.rowSpanLg}
              .colSpanLg=${e.colSpanLg}
              .rowSpanXl=${e.rowSpanXl}
              .colSpanXl=${e.colSpanXl}
            >
            ${this._hass.localize("ui.components.entity.entity-picker.edit")}
            </ha-button>
          </div>
        </ha-card>`:""}
      </div>
      `}_renderAreaViewCards(e){if(this.areaViewDisplayGrouped){let t=e.cards.reduce(((e,t)=>(e[t.domain]=[...e[t.domain]||[],t],e)),{}),i=Object.keys(t).sort(((e,t)=>{let i=this.configuration.devices[e]&&this.configuration.devices[e].sort_order?this.configuration.devices[e].sort_order:99,a=this.configuration.devices[t]&&this.configuration.devices[t].sort_order?this.configuration.devices[t].sort_order:99;return i==a?0:i>a?1:-1}));return e.cards.sort((function(e,t){let i=e.grouped_sort_order,a=t.grouped_sort_order;return i==a?0:i>a?1:-1})),r.qy`
        <div>
        ${i.map((e=>r.qy`
            <div class="mb-5">
              <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"device."+e)}</h3>
              <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
                ${Object.entries(t[e]).map((([e,t])=>r.qy`${this._renderAreaViewCard(t)}`))}
              </div>
            </div>
          `))}
        </div>
        `}return e.cards.sort((function(e,t){let i=e.sort_order,a=t.sort_order;return i==a?0:i>a?1:-1})),r.qy`
        <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
          ${e.cards.map((e=>r.qy`${this._renderAreaViewCard(e)}`))}
        </div>
        `}_renderAreaViewCard(e){return r.qy`
      <div 
        data-entity='${e.entity}'
        class="col-span-${e.colSpan} row-span-${e.rowSpan} lg-col-span-${e.colSpanLg} lg-row-span-${e.rowSpanLg} xl-col-span-${e.colSpanXl} xl-row-span-${e.rowSpanXl} relative"
      >
        <div>
          <dd-lazy-card .card=${e.card}></dd-lazy-card>
        </div>
        ${this.areaViewEditMode?r.qy`
        <ha-card>
          <div class="card-actions-multiple">
            <div class="sortable-move">
              <ha-icon
                .icon=${"mdi:cursor-move"}
              >
              </ha-icon>
            </div>
            <ha-dropdown
              class="ha-icon-overflow-menu-overflow"
              corner="BOTTOM_START"
              absolute
            >
              <ha-icon-button
               label=${this._hass.localize("ui.common.overflow_menu")}
                .path=${s.TdJ}
                slot="trigger"
              ></ha-icon-button>
                <ha-list-item
                  graphic="icon"
                  .entity="${e.entity}"
                  .friendlyName="${e.friendlyName}"
                  .disableEntity=${e.disableEntity}
                  .hideEntity=${e.hideEntity}
                  .excludeEntity=${e.excludeEntity}
                  .rowSpan=${e.rowSpan}
                  .colSpan=${e.colSpan}
                  .rowSpanLg=${e.rowSpanLg}
                  .colSpanLg=${e.colSpanLg}
                  .rowSpanXl=${e.rowSpanXl}
                  .colSpanXl=${e.colSpanXl}
                  .customCard=${e.customCard}
                  .customPopup=${e.customPopup}
                  @click=${this._handleEntityEditClick} 
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:cog"}></ha-icon>
                  </div>
                  ${(0,p.A)(this._hass,"entity.settings")}
                </ha-list-item>
                ${"t"!=e.entity?r.qy`
                  <ha-list-item
                    graphic="icon"
                    .entity="${e.entity}"
                    @click="${this._handleEntityEditCardClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                    </div>
                    ${(0,p.A)(this._hass,"entity.entity_card")}
                  </ha-list-item>`:""}
                ${"t"!=e.entity?r.qy`
                  <ha-list-item
                    graphic="icon"
                    .entity="${e.entity}"
                    @click="${this._handleEntityEditPopupClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                    </div>
                    ${(0,p.A)(this._hass,"entity.popup_card")}
                  </ha-list-item>`:""}
                ${e.isFavorite?"":r.qy`
                  <ha-list-item
                    graphic="icon"
                    .entity="${e.entity}"
                    @click="${this._handleEntityAddToFavoritesClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:tag-heart"}></ha-icon>
                    </div>
                    ${(0,p.A)(this._hass,"entity.add_to_favorites")}
                  </ha-list-item>`}
                <ha-list-item
                  graphic="icon"
                  .entity="${e.entity}"
                  .key=${"excluded"}
                  .value=${!0}
                  @click=${this._handleEntityEditBoolValueClick} 
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:table-eye-off"}></ha-icon>
                  </div>
                  ${(0,p.A)(this._hass,"entity.exclude")}
                </ha-list-item>
                <ha-list-item
                  graphic="icon"
                  .entity="${e.entity}"
                  .key=${"hidden"}
                  .value=${!0}
                  @click=${this._handleEntityEditBoolValueClick} 
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:eye-off"}></ha-icon>
                  </div>
                  ${(0,p.A)(this._hass,"entity.hide")}
                </ha-list-item>
                <ha-list-item
                  graphic="icon"
                  .entity="${e.entity}"
                  .key=${"disabled"}
                  .value=${!0}
                  @click=${this._handleEntityEditBoolValueClick} 
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:tray-remove"}></ha-icon>
                  </div>
                  ${(0,p.A)(this._hass,"entity.disable")}
                </ha-list-item>
            </ha-dropdown>
          </div>
        </ha-card>`:""}
      </div>
      `}_renderAreaViewEntityCard(e,t){return r.qy`
        <div>
          <ha-card class="p-2">
            ${(0,p.A)(this._hass,"entity.title")}:<br>
            <span class="break-words">
            ${e}
            </span>
          </ha-card>
          <ha-card>
            <div class="card-actions">
              ${"hidden"==t?r.qy`
              <ha-button 
                .entity="${e}"
                .key=${"hidden"}
                .value=${!1}
                @click=${this._handleEntityEditBoolValueClick} 
              >
                ${(0,p.A)(this._hass,"entity.unhide")}
              </ha-button>`:""}
              ${"disabled"==t?r.qy`
              <ha-button 
                .entity="${e}"
                .key=${"disabled"}
                .value=${!1}
                @click=${this._handleEntityEditBoolValueClick} 
              >
                ${(0,p.A)(this._hass,"entity.enable")}
              </ha-button>`:""}
            </div>
          </ha-card>
        </div>
      `}_renderAreaView(e){this.__ddVisited||(this.__ddVisited={});if(this.selectedArea==e.area.area_id)this.__ddVisited[e.area.area_id]=!0;if(!this.__ddVisited[e.area.area_id])return r.qy``;const t=this.selectedArea==e.area.area_id?"block":"hidden";return e.cards.sort((function(e,t){let i=e.domain,a=t.domain;return i==a?0:i>a?1:-1})),r.qy`
          <div class="w-full mb-12 ${t}" id="${e.area.area_id}">
            <div class="flex justify-between">
              <div class="sticky top-0">
                <h2 class="font-semibold text-lg">
                  ${e.area.name}
                </h2>
                <span class="text-gray">
                  ${e.cards.length} ${(0,p.A)(this._hass,"entity.title_plural")}
                </span>
              </div>
              <div>
                <ha-dropdown
                  class="ha-icon-overflow-menu-overflow"
                  corner="BOTTOM_START"
                  absolute
                >
                  <ha-icon-button
                   label=${this._hass.localize("ui.common.overflow_menu")}
                    .path=${s.TdJ}
                    slot="trigger"
                  ></ha-icon-button>
                    ${this.areaViewDisplayGrouped?r.qy`
                      <ha-list-item
                        graphic="icon"
                        .value=${!1}
                        @click=${this._handleAreaViewDisplayGroupedClicked}
                      >
                        <div slot="graphic">
                        <ha-icon .icon=${"mdi:grid"}></ha-icon>
                        </div>
                        ${(0,p.A)(this._hass,"entity.ungroup")}
                      </ha-list-item>
                      `:r.qy`
                      <ha-list-item
                        graphic="icon"
                        .value=${!0}
                        @click=${this._handleAreaViewDisplayGroupedClicked}
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                        </div>
                        ${(0,p.A)(this._hass,"entity.group")}
                      </ha-list-item>`}
                    ${this._hass.user.is_admin?r.qy`
                      ${this.areaViewEditMode?r.qy`
                        <ha-list-item
                          graphic="icon"
                          .value=${!1}
                          @click=${this._handleAreaViewEditModeClicked}
                        >
                          <div slot="graphic">
                            <ha-svg-icon .path=${s.CZ3}></ha-svg-icon>
                          </div>
                          ${(0,p.A)(this._hass,"global.disable_edit_mode")}
                        </ha-list-item>`:r.qy`
                        <ha-list-item
                          graphic="icon"
                          .value=${!0}
                          @click=${this._handleAreaViewEditModeClicked}
                        >
                          <div slot="graphic">
                            <ha-svg-icon .path=${s.CZ3}></ha-svg-icon>
                          </div>
                          ${(0,p.A)(this._hass,"global.enable_edit_mode")}
                        </ha-list-item>
                        `}
                    `:""}
                </ha-dropdown>
              </div>
            </div>

            ${this.areaViewEditMode?r.qy`
            <ha-card class="card-actions-centered">
              <ha-button 
                .area=${e.area.area_id} 
                .key=${"disabled"} 
                .value=${!0} 
                @click=${this._handleAreaDisableAllEntitiesClicked}
              >
                ${(0,p.A)(this._hass,"entity.disable_all")}
              </ha-button>
              <ha-button 
                .area=${e.area.area_id} 
                .key=${"hidden"} 
                .value=${!0} 
                @click=${this._handleAreaDisableAllEntitiesClicked}
              >
                ${(0,p.A)(this._hass,"entity.hide_all")}
              </ha-button>
            </ha-card>

            <button type="button" 
              @click=${this._addLovelaceCard}
              .area=${e.area.area_id}
              .areaName=${e.area.name}
              .position=${"top"}
              class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span class="mt-2 block text-sm font-medium text-gray">
                ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
              </span>
            </button>`:""}

            ${this._renderAreaViewCustomCards(e,"top")}

            ${this._renderAreaViewCards(e)}

            ${this._renderAreaViewCustomCards(e,"bottom")}

            ${this.areaViewEditMode?r.qy`
              ${e.entitiesNoState.length?r.qy`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"entity.unavailable")}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                  ${e.entitiesNoState.map((e=>r.qy`${this._renderAreaViewEntityCard(e,"noState")}`))}
                  </div>
                </div>`:""}
              ${e.entitiesHidden.length?r.qy`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"entity.hidden")}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                  ${e.entitiesHidden.map((e=>r.qy`${this._renderAreaViewEntityCard(e,"hidden")}`))}
                  </div>
                </div>`:""}
              ${e.entitiesDisabled.length?r.qy`
                <div class="mb-5">
                  <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"entity.disabled")}</h3>
                  <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                  ${e.entitiesDisabled.map((e=>r.qy`${this._renderAreaViewEntityCard(e,"disabled")}`))}
                  </div>
                </div>`:""}
            `:""}

            ${this.areaViewEditMode?r.qy`
            <button type="button" 
              @click=${this._addLovelaceCard}
              .area=${e.area.area_id}
              .areaName=${e.area.name}
              .position=${"bottom"}
              class="cursor-pointer my-4 relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg class="mx-auto h-12 w-12 text-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              <span class="mt-2 block text-sm font-medium text-gray">
                ${this._hass.localize("ui.panel.lovelace.editor.edit_card.add")}
              </span>
            </button>`:""}
          </div>`}_renderFavoriteViewCard(e){return r.qy`
      <div data-entity='${e.entity}' class="col-span-${e.colSpan} row-span-${e.rowSpan} lg-col-span-${e.colSpanLg} lg-row-span-${e.rowSpanLg}  relative">
        <div>
          <dd-lazy-card .card=${e.card}></dd-lazy-card>
        </div>
        ${this.favoriteEditMode?r.qy`
        <ha-card>
          <div class="card-actions-multiple">
            <div class="sortable-move">
              <ha-icon
                .icon=${"mdi:cursor-move"}
              >
              </ha-icon>
            </div>
            <ha-dropdown
              class="ha-icon-overflow-menu-overflow"
              corner="BOTTOM_START"
              absolute
            >
              <ha-icon-button
               label=${this._hass.localize("ui.common.overflow_menu")}
                .path=${s.TdJ}
                slot="trigger"
              ></ha-icon-button>
                <ha-list-item
                  graphic="icon"
                  .entity="${e.entity}"
                  .friendlyName="${e.friendlyName}"
                  .disableEntity=${e.disableEntity}
                  .hideEntity=${e.hideEntity}
                  .excludeEntity=${e.excludeEntity}
                  .rowSpan=${e.rowSpan}
                  .colSpan=${e.colSpan}
                  .rowSpanLg=${e.rowSpanLg}
                  .colSpanLg=${e.colSpanLg}
                  .rowSpanXl=${e.rowSpanXl}
                  .colSpanXl=${e.colSpanXl}
                  .customCard=${e.customCard}
                  .customPopup=${e.customPopup}
                  @click=${this._handleEntityEditClick} 
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:cog"}></ha-icon>
                  </div>
                  ${(0,p.A)(this._hass,"entity.settings")}
                </ha-list-item>
                ${"t"!=e.entity?r.qy`
                  <ha-list-item
                    graphic="icon"
                    .entity="${e.entity}"
                    @click="${this._handleEntityEditCardClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil"}></ha-icon>
                    </div>
                    ${(0,p.A)(this._hass,"entity.entity_card")}
                  </ha-list-item>`:""}
                ${"t"!=e.entity?r.qy`
                  <ha-list-item
                    graphic="icon"
                    .entity="${e.entity}"
                    @click="${this._handleEntityEditPopupClick}"
                  >
                    <div slot="graphic">
                      <ha-icon .icon=${"mdi:pencil-box-multiple"}></ha-icon>
                    </div>
                    ${(0,p.A)(this._hass,"entity.popup_card")}
                  </ha-list-item>`:""}
                <ha-list-item
                  graphic="icon"
                  .entity="${e.entity}"
                  @click="${this._handleEntityRemoveFromFavoritesClick}"
                >
                  <div slot="graphic">
                    <ha-icon .icon=${"mdi:tag-heart"}></ha-icon>
                  </div>
                  ${(0,p.A)(this._hass,"entity.remove_from_favorites")}
                </ha-list-item>
            </ha-dropdown>
          </div>
        </ha-card>`:""}
      </div>
      `}_renderFavorites(){return 0==this.favorites.length?r.qy``:(this.favorites.sort((function(e,t){let i=e.favorite_sort_order,a=t.favorite_sort_order;return i==a?0:i>a?1:-1})),r.qy`
        <div id="favorites" class="mt-4">
          <div class="flex justify-between mb-2">
            <div>
              <h2 class="font-semibold text-lg">
                ${(0,p.A)(this._hass,"favorite.title_plural")}
              </h2>
              <span class="text-gray">
                ${(0,p.A)(this._hass,"favorite.all_favorites")}
              </span>
            </div>
            <div>
              ${this._hass.user.is_admin?r.qy`
              <ha-dropdown
                class="ha-icon-overflow-menu-overflow"
                corner="BOTTOM_END"
                absolute
              >
                <ha-icon-button
                 label=${this._hass.localize("ui.common.overflow_menu")}
                  .path=${s.TdJ}
                  slot="trigger"
                ></ha-icon-button>
                  ${this.favoriteEditMode?r.qy`
                    <ha-list-item
                      graphic="icon"
                      .value=${!1}
                      @click=${this._handleFavoriteEditModeClicked}
                    >
                      <div slot="graphic">
                        <ha-svg-icon .path=${s.CZ3}></ha-svg-icon>
                      </div>
                      ${(0,p.A)(this._hass,"global.disable_edit_mode")}
                    </ha-list-item>`:r.qy`
                    <ha-list-item
                      graphic="icon"
                      .value=${!0}
                      @click=${this._handleFavoriteEditModeClicked}
                    >
                      <div slot="graphic">
                        <ha-svg-icon .path=${s.CZ3}></ha-svg-icon>
                      </div>
                      ${(0,p.A)(this._hass,"global.enable_edit_mode")}
                    </ha-list-item>
                    `}
              </ha-dropdown>
              `:""}
            </div>
          </div>
          <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4 sortable">
            ${this.favorites.map((e=>r.qy`${this._renderFavoriteViewCard(e)}`))}
          </div>
        </div>
        `)}render(){if(null==this.data||0===this.data.length)return r.qy``;{var e,t=new Date,i=(t.getHours()<10?"0":"")+t.getHours(),a=(t.getMinutes()<10?"0":"")+t.getMinutes(),n=t.toLocaleDateString(this._hass.locale.language,{weekday:"long",month:"short",day:"numeric"}),o=i>=12?`${i-12}:${a} pm`:`${i}:${a} am`;let l,c,h,u,m,g,f,_,b;if(e=t.getHours()<12?(0,p.A)(this._hass,"global.greeting_morning"):t.getHours()<18?(0,p.A)(this._hass,"global.greeting_afternoon"):(0,p.A)(this._hass,"global.greeting_evening"),this.configuration.homepage_header.weather_entity&&(l=this.configuration.homepage_header.weather_entity,c=this._hass.states[l],c)){h=d.My[c.state];const e=this._hass.selectedLanguage||this._hass.language||this._hass.locale&&this._hass.locale.language||"en";u=(this._hass.localize&&this._hass.localize("component.weather.entity_component._.state."+c.state))||(this._hass.resources&&this._hass.resources[e]&&this._hass.resources[e]["component.weather.entity_component._.state."+c.state])||c.state,m=c.attributes.temperature+this._hass.config.unit_system.temperature}return this.configuration.homepage_header.alarm_entity&&(g=this.configuration.homepage_header.alarm_entity,f=this._hass.states[g].state,f&&(b=d.TC[f],_=this._hass.localize(`component.alarm_control_panel.state._.${f}`))),r.qy`
            <div class="flex flex-wrap">
              <div class="w-full ${this.configuration.homepage_header.v2_mode?"":"lg-w-1-2 xl-w-1-3"} ${window.location.hash?this.configuration.homepage_header.v2_mode?"hidden":"hidden lg-block":""} p-4">
                <div class="flex justify-between mb-2">
                  <div>
                    ${this.configuration.homepage_header.alarm_entity?r.qy`
                      <div class="area-button py-1 px-2" .entity=${this.configuration.homepage_header.alarm_entity} @click=${this._handleMoreInfo}>
                        <ha-icon icon="${b}"></ha-icon> ${_}
                      </div>`:""}
                  </div>
                  
                  <div id="weather">
                    ${this.configuration.homepage_header.weather_entity?r.qy`
                      <div class="area-button py-1 px-2" .entity=${this.configuration.homepage_header.weather_entity} @click=${this._handleMoreInfo}>
                        <ha-icon icon="${h}"></ha-icon> ${u}, ${m}
                      </div>`:""}
                  </div>

                  <div>
                    ${this._hass.user.is_admin?r.qy`
                      <div 
                        class="p-1 ha-icon cursor-pointer" 
                        .disableClock=${!!this.configuration.homepage_header.disable_clock}
                        .amPmClock=${!!this.configuration.homepage_header.am_pm_clock}
                        .disableWelcomeMessage=${!!this.configuration.homepage_header.disable_welcome_message}
                        .v2Mode=${!!this.configuration.homepage_header.v2_mode}
                        .disableSensorGraph=${!!this.configuration.homepage_header.disable_sensor_graph}
                        .invertCover=${!!this.configuration.homepage_header.invert_cover}
                        .weatherEntity=${this.configuration.homepage_header.weather_entity?this.configuration.homepage_header.weather_entity:""}
                        .alarmEntity=${this.configuration.homepage_header.alarm_entity?this.configuration.homepage_header.alarm_entity:""}
                        @click=${this._handleDwainsDashboardSettingsClick}
                      >
                        <ha-icon class="w-6 h-6" .icon=${"mdi:cog"}></ha-icon>
                      </div>
                    `:""}
                  </div>
                </div>
                <div class="mb-4 grid grid-cols-1 lg-grid-cols-2">
                  <div>
                    ${this.configuration.homepage_header.disable_welcome_message?"":r.qy`<h1 class="font-semibold text-xl">${e}, ${this._hass.user.name}</h1>`}
                    ${this.notificationCard}
                  </div>
                  ${this.configuration.homepage_header.disable_clock?"":r.qy`
                    <div class="text-right">
                      <div id="clock" class="mb-2 hidden lg-block">
                        <h2 class="font-semibold text-xl">${this.configuration.homepage_header.am_pm_clock?r.qy`${o}`:r.qy`${i}:${a}`}</h2>
                        <span class="text-gray capitalize">${n}</span>
                      </div>
                    </div>`}
                </div>

                ${this.badgesCard}

                ${this._renderFavorites()}

                <div id="areas" class="mt-4">
                  <div class="flex justify-between mb-2">
                    <div>
                      <h2 class="font-semibold text-lg capitalize">
                        ${(0,p.A)(this._hass,"area.title_plural")}
                      </h2>
                      <span class="text-gray">
                        ${this.data.length} ${(0,p.A)(this._hass,"area.title_plural")}
                      </span>
                    </div>
                    <div>
                      <ha-dropdown
                        class="ha-icon-overflow-menu-overflow"
                        corner="BOTTOM_END"
                        absolute
                      >
                        <ha-icon-button
                         label=${this._hass.localize("ui.common.overflow_menu")}
                          .path=${s.TdJ}
                          slot="trigger"
                        ></ha-icon-button>
                          ${this.areaDisplayGrouped?r.qy`
                            <ha-list-item
                              graphic="icon"
                              .value=${!1}
                              @click=${this._handleAreaDisplayGroupedClicked}
                            >
                              <div slot="graphic">
                              <ha-icon .icon=${"mdi:grid"}></ha-icon>
                              </div>
                              ${(0,p.A)(this._hass,"area.ungroup_by_floor")}
                            </ha-list-item>
                            `:r.qy`
                            <ha-list-item
                              graphic="icon"
                              .value=${!0}
                              @click=${this._handleAreaDisplayGroupedClicked}
                            >
                              <div slot="graphic">
                                <ha-icon .icon=${"mdi:format-list-group"}></ha-icon>
                              </div>
                              ${(0,p.A)(this._hass,"area.group_by_floor")}
                            </ha-list-item>`}
                          ${this._hass.user.is_admin?r.qy`
                            ${this.areaEditMode?r.qy`
                              <ha-list-item
                                graphic="icon"
                                .value=${!1}
                                @click=${this._handleAreaEditModeClicked}
                              >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${s.CZ3}></ha-svg-icon>
                                </div>
                                ${(0,p.A)(this._hass,"global.disable_edit_mode")}
                              </ha-list-item>
                              `:r.qy`
                              <ha-list-item
                                graphic="icon"
                                .value=${!0}
                                @click=${this._handleAreaEditModeClicked}
                              >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${s.CZ3}></ha-svg-icon>
                                </div>
                                ${(0,p.A)(this._hass,"global.enable_edit_mode")}
                              </ha-list-item>`}
                          `:""}
                      </ha-dropdown>
                    </div>
                  </div>

                  ${this._renderAreaButtons(this.data)}

                  ${this.areaEditMode?r.qy`
                    ${this.disabledAreas.length?r.qy`
                      <div class="mb-5">
                        <h3 class="font-semibold capitalize text-gray">${(0,p.A)(this._hass,"area.disabled")}</h3>
                        <div class="grid grid-flow-row-dense grid-cols-2 lg-grid-cols-3 gap-4">
                        ${this.disabledAreas.map((e=>r.qy`${this._renderAreaButtonCard(e,"disabled")}`))}
                        </div>
                      </div>`:""}
                  `:""}
                </div>
              </div>
              <div class="w-full ${this.configuration.homepage_header.v2_mode?"":"lg-w-1-2 xl-w-2-3"} ${window.location.hash?"":this.configuration.homepage_header.v2_mode?"hidden":"hidden lg-block"} p-4">
                ${this.data.map((e=>this._renderAreaView(e)))}
              </div>
            </div>
            <div class="sticky z-30 bottom-0 ${window.location.hash?"":"hidden"} ${this.configuration.homepage_header.v2_mode?"":"lg-hidden"} text-right">
              <div @click=${this._backButtonClick} class="back-button">
                  <div class="button">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  </div>
              </div>
            </div>
        `}}static get styles(){return r.AH`
        .back-button {
          margin-right: 1rem;
          margin-bottom: 3.4rem;
          display: inline-block;
        }
        .back-button .button {
          background-color: var(--secondary-background-color);
          padding: 0.75rem;
          border-radius: 9999px;
          margin-bottom: env(safe-area-inset-bottom);
        }
        .card-actions {
          text-align: right;
        }
        .card-actions-centered {
          display: flex;
          justify-content: space-around;
          padding: 0.25rem 0.5rem;
        }
        .card-actions-multiple {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0.5rem;
        }
        .sortable-move {
          cursor: -webkit-grabbing;
          cursor: grab;
          margin: auto 0;
        }
        .area-button .info ha-icon, .ha-icon ha-icon {
          display: inline-block;
          margin: auto;
          --mdc-icon-size: 100% !important;
          --iron-icon-width: 100% !important;
          --iron-icon-height: 100% !important;
        }
        #badges {
          cursor: pointer;
          background: var( --ha-card-background, var(--card-background-color, white) );
          box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
          color: var(--primary-text-color);
        } 
        .area-button {
          cursor: pointer;
          background: var( --ha-card-background, var(--card-background-color, white) );
          border-radius: var(--ha-card-border-radius, 4px);
          box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
          color: var(--test-primary-text-color, var(--primary-text-color));
        }
        .info-badge {
          /*background-color: var(--sidebar-icon-color); */
          color: var( --dwains-info-badge-color, var(--primary-text-color) );
          background-color: var(--dwains-info-badge-background, var(--secondary-background-color));
        }
        @media (min-width: 1024px) {
          .area-button.current {
            background: transparent;
            z-index: 1;
            position: relative;
          }
          .area-button.current::before {
            content: "";
            position: absolute;
            top: 0; 
            left: 0;
            width: 100%; 
            height: 100%;  
            opacity: .12; 
            z-index: -1;
            background: var(--sidebar-selected-icon-color);
            border-radius: var(--ha-card-border-radius, 4px);
          }
        }
        /*styling tailwind dwains version*/
        *, ::after, ::before {
          box-sizing: border-box;
        }
        h1,h2,h3 {
          margin: 0;
        }
        h3 {
          font-size: 1em;
        }
        .absolute {
          position: absolute
        }
        .break-words {
          overflow-wrap: break-word;
        }
        .relative {
            position: relative
        }
        .sticky {
            position: -webkit-sticky;
            position: sticky
        }
        .top-0 {
            top: 0px
        }
        .bottom-0 {
            bottom: 0px
        }
        .z-30 {
            z-index: 7;
        }
        .col-span-1 {
            grid-column: span 1 / span 1
        }
        .col-span-2 {
            grid-column: span 2 / span 2
        }
        .row-span-1 {
            grid-row: span 1 / span 1
        }
        .row-span-2 {
            grid-row: span 2 / span 2
        }
        .my-4 {
            margin-top: 1rem;
            margin-bottom: 1rem
        }
        .mx-auto {
          margin-left: auto;
          margin-right: auto
        }
        .mb-2 {
            margin-bottom: 0.5rem
        }
        .mb-4 {
            margin-bottom: 1rem
        }
        .mt-4 {
            margin-top: 1rem
        }
        .mr-0\.5 {
            margin-right: 0.125rem
        }
        .mr-0 {
            margin-right: 0px
        }
        .mb-12 {
            margin-bottom: 3rem
        }
        .mb-5 {
            margin-bottom: 1.25rem
        }
        .mb-16 {
            margin-bottom: 4rem
        }
        .ml-4 {
            margin-left: 1rem
        }
        .block {
            display: block
        }
        .inline-block {
            display: inline-block
        }
        .flex {
            display: flex
        }
        .inline-flex {
            display: inline-flex
        }
        .grid {
            display: grid
        }
        .hidden {
            display: none
        }
        .h-6 {
            height: 1.5rem
        }
        .h-44 {
            height: 11rem
        }
        .h-full {
            height: 100%
        }
        .h-14 {
            height: 3.5rem
        }
        .h-8 {
            height: 2rem
        }
        .w-full {
            width: 100%
        }
        .w-6 {
            width: 1.5rem
        }
        .w-14 {
            width: 3.5rem
        }
        .w-8 {
            width: 2rem
        }
        .w-12 {
          width: 3rem
        }
        .cursor-pointer {
            cursor: pointer
        }
        .grid-flow-row-dense {
            grid-auto-flow: row dense
        }
        .grid-cols-1 {
            grid-template-columns: repeat(1, minmax(0, 1fr))
        }
        .grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr))
        }
        .flex-wrap {
            flex-wrap: wrap
        }
        .content-between {
            align-content: space-between
        }
        .items-center {
            align-items: center
        }
        .justify-between {
            justify-content: space-between
        }
        .gap-4 {
            gap: 1rem
        }
        .space-y-0.5 > :not([hidden]) ~ :not([hidden]) {
            --tw-space-y-reverse: 0;
            margin-top: calc(0.125rem * calc(1 - var(--tw-space-y-reverse)));
            margin-bottom: calc(0.125rem * var(--tw-space-y-reverse))
        }
        .space-y-0 > :not([hidden]) ~ :not([hidden]) {
            --tw-space-y-reverse: 0;
            margin-top: calc(0px * calc(1 - var(--tw-space-y-reverse)));
            margin-bottom: calc(0px * var(--tw-space-y-reverse))
        }
        .rounded {
            border-radius: 0.25rem
        }
        .rounded-md {
            border-radius: 0.375rem
        }
        .bg-gray-800 {
            --tw-bg-opacity: 1;
            background-color: rgb(31 41 55 / var(--tw-bg-opacity))
        }
        .rounded-lg {
          border-radius: 0.5rem
        }
        .border-2 {
            border-width: 2px
        }
        .border-dashed {
            border-style: dashed
        }
        .border-gray-300 {
            --tw-border-opacity: 1;
            border-color: rgb(209 213 219 / var(--tw-border-opacity))
        }
        .bg-gray-800 {
            --tw-bg-opacity: 1;
            background-color: rgb(31 41 55 / var(--tw-bg-opacity))
        }
        .bg-opacity-50 {
            --tw-bg-opacity: 0.5
        }
        .p-2 {
          padding: 0.5rem;
        }
        .p-4 {
            padding: 1rem
        }
        .p-1 {
            padding: 0.25rem
        }
        .p-3 {
            padding: 0.75rem
        }
        .px-1 {
            padding-left: 0.25rem;
            padding-right: 0.25rem
        }
        .p-12 {
          padding: 3rem
        }
        .py-0\.5 {
            padding-top: 0.125rem;
            padding-bottom: 0.125rem
        }
        .py-0 {
            padding-top: 0px;
            padding-bottom: 0px
        }
        .py-1 {
          padding-top: 0.25rem;
          padding-bottom: 0.25rem
        }
        .px-2 {
          padding-left: 0.5rem;
          padding-right: 0.5rem
        }
        .text-center {
          text-align: center
        }
        .text-right {
            text-align: right
        }
        .text-xl {
            font-size: 1.5rem;
            line-height: 2rem
        }
        .text-lg {
            font-size: 1.125rem;
            line-height: 1.75rem
        }
        .text-sm {
            font-size: 0.875rem;
            line-height: 1.25rem
        }
        .text-xs {
            font-size: 0.75rem;
            line-height: 1rem
        }
        .font-semibold {
            font-weight: 600
        }
        .font-medium {
            font-weight: 500
        }
        .capitalize {
            text-transform: capitalize
        }
        .text-gray {
            color: var(--secondary-text-color);
        }
        .text-white {
            --tw-text-opacity: 1;
            color: rgb(255 255 255 / var(--tw-text-opacity))
        }
        @media (min-width: 768px) {
            .md-grid-cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr))
            }
        }
        @media (min-width: 1024px) {
            .lg-col-span-1 {
                grid-column: span 1 / span 1
            }
            .lg-col-span-3 {
                grid-column: span 3 / span 3
            }
            .lg-col-span-2 {
                grid-column: span 2 / span 2
            }
            .lg-row-span-1 {
                grid-row: span 1 / span 1
            }
            .lg-row-span-3 {
                grid-row: span 3 / span 3
            }
            .lg-row-span-2 {
                grid-row: span 2 / span 2
            }
            .lg-block {
                display: block
            }
            .lg-hidden {
                display: none
            }
            .lg-w-1-2 {
                width: 50%
            }
            .lg-grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr))
            }
            .lg-grid-cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr))
            }
            .lg-grid-cols-4 {
              grid-template-columns: repeat(4, minmax(0, 1fr))
            }
        }
        @media (min-width: 1536px) {
          .xl-col-span-1 {
              grid-column: span 1 / span 1
          }
          .xl-col-span-4 {
              grid-column: span 4 / span 4
          }
          .xl-col-span-2 {
              grid-column: span 2 / span 2
          }
          .xl-row-span-1 {
              grid-row: span 1 / span 1
          }
          .xl-row-span-4 {
              grid-row: span 4 / span 4
          }
          .xl-row-span-2 {
              grid-row: span 2 / span 2
          }
          .xl-w-1-3 {
              width: 33.333333%
          }
          .xl-w-2-3 {
              width: 66.666667%
          }
          .xl-grid-cols-4 {
              grid-template-columns: repeat(4, minmax(0, 1fr))
          }
          .xl-grid-cols-5 {
            grid-template-columns: repeat(5, minmax(0, 1fr))
          }
      }
      `}}customElements.define("homepage-card",u)},831:(e,t,i)=>{"use strict";var a=i(845),n=i(752),o=i(991),s=i(924),r=i(153),l=i(969),d=i(177),c=i(89);class h extends a.WF{static get styles(){return a.AH`
      ha-card {
        overflow: hidden;
      }
      .flex {
        display: flex;
      }
      .justify-center {
        justify-content: center;
      }
      .items-center {
        align-items: center;
      }
      .font-semibold {
        font-weight: 600;
      }
      h1, h2, h3, h4, h5, h6 {
        font-size: inherit;
      }
      blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
        margin: 0;
      }
      .p-2 {
        padding: 0.5rem;
      }
      .cursor-pointer {
        cursor: pointer;
      }
      .w-8 {
        width: 1.5rem;
      }
      .h-8 {
        height: 1.5rem;
      }
      .space-x-2>:not([hidden])~:not([hidden]) {
        --tw-space-x-reverse: 0;
        margin-right: calc(0.5rem * var(--tw-space-x-reverse));
        margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
      }
      .text-gray-500 {
        --tw-text-opacity: 1;
        color: rgba(107,114,128,var(--tw-text-opacity));
      }
      .capitalize {
          text-transform: capitalize;
      }
      .ha-icon ha-icon {
        display: inline-block;
        margin: auto;
        --mdc-icon-size: 100% !important;
        --iron-icon-width: 100% !important;
        --iron-icon-height: 100% !important;
      }
      .text-center {
        text-align: center;
      }
      .rounded-full {
        border-radius: 9999px;
      }
      .not_home {
        filter: grayscale(100%);
      }
      .domain-badge-card h3 {
        margin-top: 0.4rem;
      }
      .m-auto {
        margin: 0 auto;
      }
      .round-badge {
        background-color: var(--dwains-house-information-badge-background, var(--sidebar-icon-color));
      }
      .badge-icon {
        color: var(--dwains-house-information-badge-color, var(--ha-card-background, var(--card-background-color, white) ) );
      }

      .dd-header-tabs{
        display:flex;
        overflow-x:auto;
        overscroll-behavior-x:contain;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;
        display:flex;
        flex-direction:row;
        align-items:center;
        gap:8px;
        padding:4px 8px;
        height:110px;
        margin:0 .25rem !important;
        background:rgba(var(--rgb-card-background-color),.08);
        border:0 !important;
        border-radius:12px;
        --ha-tabs-selection-bar-height:0;
        --mdc-ripple-color:transparent;
      }

      .dd-header-tabs::-webkit-scrollbar{display:none}

      @media (max-width:600px){
        .dd-header-tabs .dd-header-tab{
          flex:0 0 auto;
          min-width:68px;
        }
        .dd-header-tabs{
        padding-inline:6px;
        gap:6px;
        }
      }

      dwains-house-information-card ha-card{
        border:0 !important;
        box-shadow:none !important;
        --ha-card-border-width:0;
      }

      .dd-header-tabs .dd-header-tab{
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        flex:1 1 0;
        min-width:60px;
        max-width:88px;
        padding:0 4px;
        --mdc-tab-text-label-color-default:var(--secondary-text-color);
        --mdc-tab-color-default:var(--secondary-text-color);
        --mdc-tab-text-transform:capitalize;
        --mdc-typography-button-text-transform:none;
      }

      .dd-header-tabs h3{
        font-size:1rem;
        line-height:1.3;
        font-weight:500;
        margin:10px 0 2px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .dd-header-tabs span{
      font-size:.92rem;
      line-height:1.25;
      }

      .edit-element ha-formfield{
        display:flex;
        align-items:flex-start;
        gap:.75rem;
        margin:.35rem 0;
        padding-inline-start:.25rem;
      }

      .edit-element ha-formfield label{
        display:inline-block !important;
        margin-top:.2rem;
        color:var(--primary-text-color);
        font-size:.92rem;
        line-height:1.3;
        white-space:normal;
      }

      .loading-component {
        height: 110px;
      }
      `}static get properties(){return{_hass:{type:Object},configuration:{type:Object},domains:{type:Object},persons:{type:Array}}}setConfig(e){this.configuration=e}set hass(e){this._hass=e,this.requestUpdate()}async connectedCallback(){super.connectedCallback(),await this._loadData()}async _reloadCard(){await this._loadData(),this.requestUpdate()}async _loadData(){if(this.areas=await this._hass.callWS({type:"config/area_registry/list"}),this.devices=await this._hass.callWS({type:"config/device_registry/list"}),this.entities=await this._hass.callWS({type:"config/entity_registry/list"}),this.configuration=await this._hass.callWS({type:"dwains_dashboard/configuration/get"}),null==this.areas||0===this.areas.length||null==this.devices||0===this.devices.length||null==this.entities||0===this.entities.length||null==this.configuration||0===this.configuration.length);else{const e=[],t=[];for(const e of this.entities)"person"==(0,r.mD)(e.entity_id)&&(this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].disabled||this.configuration.entities[e.entity_id]&&this.configuration.entities[e.entity_id].excluded||t.push(e.entity_id));for(const t of this.areas)if(!this.configuration.areas[t.area_id]||!this.configuration.areas[t.area_id].disabled){const i=new Set;new Set;for(const e of this.devices)e.area_id===t.area_id&&i.add(e.id);for(const a of this.entities)if(a.area_id?a.area_id===t.area_id:i.has(a.device_id)){const i=!!this.configuration.entities[a.entity_id]&&!!this.configuration.entities[a.entity_id].disabled,n=!!this.configuration.entities[a.entity_id]&&!!this.configuration.entities[a.entity_id].excluded;if(!i&&!n){const i=this.configuration.entities[a.entity_id]?this.configuration.entities[a.entity_id].friendly_name:"",n=(0,r.mD)(a.entity_id);if(!(l.Zz.includes(n)||l.Ti.includes(n)||l.K5.includes(n)||l.ge.includes(n)||l.R9.includes(n)))continue;n in e||(e[n]={domain:n,entities:[]}),e[n].entities.push({entity_id:a.entity_id,area:t,friendlyName:i})}}}this.domains=e,this.persons=t}}_handleMoreInfo(e){if(e.currentTarget.entity)(0,n.Q)(e.currentTarget.entity);else{const t=e.currentTarget.domain,i=e.currentTarget.deviceClass;window.setTimeout((()=>{(0,s.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,o.d)((0,d.A)(this._hass,"device."+t),{type:"custom:dwains-house-information-more-info-card",domain:t,entities:t==="climate"?Object.keys(this._hass.states).filter((e)=>e.startsWith("climate.")).map((e)=>({entity_id:e,area:"",friendlyName:(this._hass.states[e]&&this._hass.states[e].attributes&&this._hass.states[e].attributes.friendly_name)||e})):this.domains[t].entities,deviceClass:t==="climate"?"":i},!0,"")}),50)}}_isOn(e,t,i){if(e)return(i?e.filter((e=>e.attributes.device_class===i)):e).filter((e=>!l.s7.includes(e.state)&&!l.jj.includes(e.state))).length}_isOnCover(e,t,i){if(e)return(i?e.filter((e=>e.attributes.device_class===i)):e).filter((e=>!l.s7.includes(e.state)&&!l.jj.includes(e.state)&&!this.configuration.homepage_header.invert_cover)).length}_isOffCover(e,t,i){if(e)return(i?e.filter((e=>e.attributes.device_class===i)):e).filter((e=>!l.s7.includes(e.state)&&l.jj.includes(e.state)&&this.configuration.homepage_header.invert_cover)).length}_isOnClimate(e,t){if(!e)return;const i=[];for(const t of e)t.attributes.hvac_action&&"idle"!=t.attributes.hvac_action?l.s7.includes(t.attributes.hvac_action)||l.jj.includes(t.attributes.hvac_action)||i.push(t.entity_id):t.attributes.hvac_action||l.s7.includes(t.state)||l.jj.includes(t.state)||i.push(t.entity_id);return i.length}_renderDomain(e){const t=[];for(const i of e.entities){const e=this._hass.states[i.entity_id];e&&t.push(e)}if(l.Zz.includes(e.domain)){const i=this._isOn(t,e);if(i)return this._renderDomainBadgeCard(e.domain,(0,d.A)(this._hass,"device."+e.domain),l.qJ[e.domain][i?"on":"off"],i,"")}else{if(l.Ti.includes(e.domain))return l.gJ[e.domain].map((i=>{const a=this._isOn(t,e.domain,i);if(a)return this._renderDomainBadgeCard(e.domain,(0,d.A)(this._hass,"device."+i),l.qJ[e.domain][i],a,i)}));if(l.K5.includes(e.domain))return l.gJ[e.domain].map((i=>{const a=this._isOnCover(t,e.domain,i),n=this._isOffCover(t,e.domain,i);return a?this._renderDomainBadgeCard(e.domain,(0,d.A)(this._hass,"device."+i),l.qJ[e.domain][i],a,i):n?this._renderDomainBadgeCard(e.domain,(0,d.A)(this._hass,"device."+i),l.qJ[e.domain][i],n,i):void 0}));if(l.ge.includes(e.domain)){const i=this._isOnClimate(t,e.domain);if(i)return this._renderDomainBadgeCard(e.domain,(0,d.A)(this._hass,"device."+e.domain),l.qJ[e.domain][i?"on":"off"],i,"")}else if(l.R9.includes(e.domain)){const i=this._isOn(t,e);if(i)return this._renderDomainBadgeCard(e.domain,(0,d.A)(this._hass,"device."+e.domain),l.qJ[e.domain][i?"on":"off"],i,"")}}}_renderDomainBadgeCard(e,t,i,n,o){let s;return s="window"!=o&&"door"!=o&&"cover"!=e&&"lock"!=e||this.configuration.homepage_header.invert_cover?this.configuration.homepage_header.invert_cover&&"cover"==e?(0,d.A)(this._hass,"device.closed"):(0,d.A)(this._hass,"device.on"):(0,d.A)(this._hass,"device.open"),a.qy`
      <div class="dd-header-tab">
        <div slot="icon" class="text-center cursor-pointer domain-badge-card" .domain=${e} .deviceClass=${o} @click=${this._handleMoreInfo}>
          <div class="rounded-full flex items-center justify-center m-auto round-badge" style="width: 54px; height: 54px;">
            <div class="flex items-center justify-center">
              <ha-icon
                class="w-8 h-8 badge-icon"
                .icon=${this.configuration.devices[e]&&this.configuration.devices[e].icon?this.configuration.devices[e].icon:i}
              ></ha-icon>
            </div>
          </div>
          <h3 class="capitalize mt-2 mb-1 text-sm font-medium">${t}</h3>
          <span class="text-gray-500 text-xs">
            ${n} ${s}
          </span>
        </div>
      </div>
      `}_renderPersonCard(e){const t=this._hass.states[e];if(t&&t.attributes){let i=t.attributes.entity_picture_local||t.attributes.entity_picture;i&&this._hass&&(i=this._hass.hassUrl(i));const n=void 0===t.attributes.friendly_name?t.entity_id.replace(/_/g," "):t.attributes.friendly_name;return a.qy`
                <div class="dd-header-tab">
                <div slot="icon" class="text-center cursor-pointer" .entity=${e} @click=${this._handleMoreInfo}>
                    ${i?a.qy`
                    <img src="${i}" width="50" class="rounded-full m-auto ${t.state}">
                    `:a.qy`
                    <div class="rounded-full flex items-center justify-center m-auto round-badge" style="width: 50px; height: 50px; margin-bottom: 6px;">
                    <div class="">
                        <ha-icon
                        class="w-8 h-8 badge-icon"
                        .icon=${"mdi:account"}
                        ></ha-icon>
                    </div>
                    </div>
                    `}
                    <h3 class="capitalize">${n.split(" ")[0]}</h3>
                    <span class="text-gray-500">
                    ${(0,c.F)(this._hass.localize,t,this._hass.locale)}
                    </span>
                </div>
                </div>`}}render(){return this._hass?null==this.domains||0===Object.keys(this.domains).length?a.qy``:a.qy`
                <ha-card>
                <div class="dd-header-tabs">
                    ${this.persons.map((e=>this._renderPersonCard(e)))}
                    ${Object.values(this.domains).map((e=>this._renderDomain(e)))}
                </div>
                </ha-card>
            `:a.qy``}}customElements.define("dwains-house-information-card",h)},780:(e,t,i)=>{"use strict";var a=i(845),n=i(89),o=i(177),s=i(969),r=i(153);class l extends a.WF{static get styles(){return a.AH`
        .p-20px {
            padding: 20px;
        }
        .flex {
            display: flex;
        }
        .grid-flow-row-dense {
            grid-auto-flow: row dense
        
        }
        .grid-cols-1 {
            grid-template-columns: repeat(1, minmax(0, 1fr))
        }
        .grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr))
        }
        .grid {
            display: grid;
            gap: 1rem;
        }
        .cards > * {
            display: block;
            width: 100%;
            min-width: 0;
        }
        @media (min-width: 1024px) {
            .lg-grid-cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr))
            }
        }
        @media (min-width: 1536px) {
            .xl-col-span-4 {
                grid-column: span 4 / span 4
            }
        }
        .font-semibold {
            font-weight: 600;
        }
        h1, h2, h3, h4, h5, h6 {
            font-size: inherit;
        }
        h3 {
            font-size: 1.5rem;
            padding-bottom: 0.5rem;
        }
        blockquote, dd, dl, figure, h1, h2, h3, h4, h5, h6, hr, p, pre {
            margin: 0;
        }
        .p-2 {
            padding: 0.5rem;
        }
        .cursor-pointer {
            cursor: pointer;
        }
        .space-x-2>:not([hidden])~:not([hidden]) {
            --tw-space-x-reverse: 0;
            margin-right: calc(0.5rem * var(--tw-space-x-reverse));
            margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
        }
        .capitalize {
            text-transform: capitalize;
        }
        .icon ha-state-icon {
            display: inline-block;
            margin: auto;
            --mdc-icon-size: 100% !important;
            --iron-icon-width: 100% !important;
            --iron-icon-height: 100% !important;

            width: 1.5rem;
            height: 1.5rem;
        }
        .icon {
            padding: 0.75rem;
            background-color: var(--secondary-background-color);
            border-radius: 999px;
        }
        .information {
            line-height: 1.10;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .information .state {
            font-size: 0.9rem;
            line-height: 1.25rem;
            color: var(--secondary-text-color);
        }
        .handle-button {
            background-color: var(--secondary-background-color);
            border-radius: var(--ha-card-border-radius, 4px);
            color: var(--primary-text-color);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
            width: 100%;
            min-width: 0;
            min-height: 3rem;
            box-sizing: border-box;
            text-align: center;
            line-height: 1.25rem;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
            padding: 0.75rem 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0;
        }
        .single-button {
            display: grid;
            grid-template-columns: minmax(0,1fr);
            margin-top: 1rem;
        }
        .two-buttons {
            display: grid;
            align-items: stretch;
            gap: 1rem;
            grid-template-columns: repeat(2,minmax(0,1fr));
            margin-top: 1rem;
        }
        .handle-button ha-icon {
            flex: 0 0 auto;
        }
        .cards.single-card-section > * {
            grid-column: 1 / -1;
        }
        @media only screen and (max-width: 768px) {
            .two-buttons {
                grid-template-columns: repeat(1, minmax(0, 1fr));
            }
        }
        .mb-5 {
            margin-bottom: 1.5rem;
        }
        `}static get properties(){return{_hass:{},configuration:{},areas:{type:Object}}}constructor(){super(),this.areas={},this._debounceTimer=null}set hass(e){this._hass=e,this._debounceLoadCards()}async _debounceLoadCards(){this._debounceTimer&&clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout((async()=>{await this.loadCards(),this.requestUpdate()}),100)}async setConfig(e){if(!e.entities)throw new Error("Specify entities list");this._config=e,this.entities=e.entities,this.domain=e.domain,this.deviceClass=e.deviceClass,this.cardHelpers=await window.loadCardHelpers()}async loadCards(){this.configuration=await this._hass.callWS({type:"dwains_dashboard/configuration/get"}),this.areas={};for(const e of this.entities){const t=this._hass.states[e.entity_id];let i=!1;if(t){if(t.entity_id.startsWith("cover.")&&(s.s7.includes(t.state)||s.jj.includes(t.state)||this.configuration.homepage_header.invert_cover?!s.s7.includes(t.state)&&s.jj.includes(t.state)&&this.configuration.homepage_header.invert_cover&&(i=!0):i=!0),s.s7.includes(t.state)||s.jj.includes(t.state)||t.entity_id.startsWith("cover.")||(i=!0),t.entity_id.startsWith("climate.")){const e=t.attributes.hvac_action;i=e&&"off"!==e&&"idle"!==e}const a=!this.deviceClass||t.attributes.device_class===this.deviceClass;if(i&&a){const t=await this.createEntityCard(e.entity_id,e.friendlyName);if(t){const i=e.area.area_id||"default",a=e.area.name||"Default";this.areas[i]||(this.areas[i]={cards:[],name:a}),this.areas[i].cards.push(t)}}}}}async createEntityCard(e,t){const i=this._hass.states[e],a=e.substr(0,e.indexOf("."));if(!i)return null;let n={};switch(a){default:n=t?{type:"tile",name:t}:{type:"tile"};break;case"camera":n={type:"picture-entity",camera_view:"auto"},rowSpan="2",colSpan="2",rowSpanLg="2",colSpanLg="2",rowSpanXl="2",colSpanXl="2";break;case"climate":n=t?{type:"thermostat",name:t,features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]}:{type:"thermostat",features:[{type:"climate-fan-modes",fan_modes:["quiet","low","medium","high"]},{type:"climate-hvac-modes",hvac_modes:["heat_cool","heat","dry","fan_only","cool","off"]}]};break;case"cover":n=t?{type:"tile",name:t,features:[{type:"cover-open-close"},{type:"cover-position"}]}:{type:"tile",features:[{type:"cover-open-close"},{type:"cover-position"}]};break;case"light":n=t?{type:"tile",name:t,features:[{type:"light-brightness"}]}:{type:"tile",features:[{type:"light-brightness"}]}}n={entity:e,...n};const o=await this.cardHelpers.createCardElement(n);return o.hass=this._hass,o}_navigateToDevices(e){const t=e.currentTarget.domain;let i;(0,n.f)();let a=window.location.pathname,o=a.substring(0,a.lastIndexOf("/"))+"/devices#"+t;window.history.pushState(null,"",o),i=new Event("location-changed",{composed:!0}),i.detail={replace:!1},window.dispatchEvent(i)}_currentOn(){const e=[],t=this.deviceClass;for(const t of this.entities){const i=this._hass.states[t.entity_id];i&&e.push({area:t.area,stateObj:i})}if(e){if("climate"==this.domain){const t=[];for(const i of e)i.stateObj.attributes.hvac_action&&"idle"!=i.stateObj.attributes.hvac_action?s.s7.includes(i.stateObj.attributes.hvac_action)||s.jj.includes(i.stateObj.attributes.hvac_action)||t.push({area:i.area,stateObj:i.stateObj}):i.stateObj.attributes.hvac_action||s.s7.includes(i.stateObj.state)||s.jj.includes(i.stateObj.state)||t.push({area:i.area,stateObj:i.stateObj});return t}return(t?e.filter((e=>e.stateObj.attributes.device_class===t)):e).filter((e=>!s.s7.includes(e.stateObj.state)&&!s.jj.includes(e.stateObj.state)))}}_handleTurnAllOffClicked(e){const t=this._currentOn();0==t.length&&(0,n.f)(),t.map((e=>{const t=e.stateObj.entity_id,i=(0,r.mD)(t),a="group"===i?"homeassistant":i;let n;switch(i){case"lock":n="lock";break;case"cover":n="close_cover";break;default:n="turn_off"}this._hass.callService(a,n,{entity_id:t})}))}render(){if(!this._hass||!this._config||0===Object.keys(this.areas).length)return a.qy``;let e=!1;return"light"!=this.domain&&"switch"!=this.domain&&"cover"!=this.domain||(e=!0),a.qy`
            <div class="p-20px">
                ${Object.entries(this.areas).map((([e,t])=>a.qy`
                    <div class="area mb-5" id="area-${e}">
                        <h3 class="font-semibold capitalize text-gray">${t.name}</h3>
                        <div class="cards grid grid-flow-row-dense grid-cols-2 ${1===t.cards.length?"single-card-section":""} gap-4">
                            ${t.cards.map((e=>a.qy`${e}`))}
                        </div>
                    </div>
                `))}
                <div class="${e?"two-buttons":"single-button"}">
                    ${e?a.qy`
                    <div class="handle-button" @click=${this._handleTurnAllOffClicked}>
                        ${(0,o.A)(this._hass,"device.turn_all_off")}
                    </div>
                    `:""}
                    <div class="handle-button" @click=${this._navigateToDevices} .domain=${this.domain}>
                        ${(0,o.A)(this._hass,"device.see_all")} 
                        <ha-icon
                        .icon=${"mdi:chevron-right"}
                        ></ha-icon>
                    </div>
                </div>
            </div>
        `}}customElements.define("dwains-house-information-more-info-card",l)},87:(e,t,i)=>{"use strict";var a=i(991),n=i(924),o=i(165),s=i(845);class r extends s.WF{static get styles(){return s.AH`
        #more-page {
          padding: 1rem;
        }
        .justify-between {
          justify-content: space-between;
        }
        .flex {
            display: flex;
        }
        .mb-2 {
            margin-bottom: 0.5rem;
        }
        .font-semibold {
          font-weight: 600;
        }
        .text-lg {
            font-size: 1.125rem;
            line-height: 1.75rem;
        }
        .capitalize {
          text-transform: capitalize;
        }
      `}static get properties(){return{card:{},_hass:{},configuration:{}}}async loadHelpers(){if("function"==typeof window.loadCardHelpers)return this.cardHelpers=await window.loadCardHelpers(),this.cardHelpers;console.warn("loadCardHelpers is not available, ensure you are running a compatible version of Home Assistant")}set hass(e){this._hass=e,null!=this.card&&0!==this.card.length&&(this.card.hass=e)}async setConfig(e){this.name=e.name,this.foldername=e.foldername,this.icon=e.icon,this.showInNavbar=e.showInNavbar,this.cardConfig=e.card,this.cardHelpers=await this.loadHelpers(),this.cardHelpers&&(Array.isArray(e.card)?this.card=await this.createCardElement2({type:"vertical-stack",cards:e.card}):this.card=await this.createCardElement2(e.card))}async connectedCallback(){super.connectedCallback(),await this._loadData(),await this._hass.connection.subscribeEvents((()=>this._reloadCard()),"dwains_dashboard_more_pages_reload")}async _reloadCard(){await this._loadData(),this.requestUpdate()}async _loadData(){if(this.configuration=await this._hass.callWS({type:"dwains_dashboard/configuration/get"}),null==this.configuration||0===this.configuration.length);else{const e=document.createElement("hui-masonry-view");e.lovelace={editMode:!0},e.willUpdate(new Map)}}async createCardElement2(e){const t=await this.cardHelpers.createCardElement(e);return t.hass=this._hass,t}_handleEditMorePageClicked(e){const t=this.foldername,i=this.configuration.more_pages[t]&&this.configuration.more_pages[t].name?this.configuration.more_pages[t].name:"",o=this.configuration.more_pages[t]&&this.configuration.more_pages[t].icon?this.configuration.more_pages[t].icon:"",s=!(!this.configuration.more_pages[t]||!this.configuration.more_pages[t].show_in_navbar)&&this.configuration.more_pages[t].show_in_navbar;window.setTimeout((()=>{(0,n.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,a.d)(this._hass.localize("ui.components.entity.entity-picker.edit"),{type:"custom:dwains-edit-more-page-card",more_page:t,name:i,icon:o,showInNavbar:s,foldername:t,mode:"editor-element",cardConfig:this.cardConfig},!0,"")}),50)}render(){return null==this.configuration||0===this.configuration.length?s.qy``:s.qy`
          <div id="more-page">
            <div class="flex justify-between mb-2">
              <div>
                <h2 class="font-semibold text-lg capitalize">
                  ${this.name}
                </h2>
              </div>
              <div>
                ${this._hass.user.is_admin?s.qy`
                <ha-dropdown
                  class="ha-icon-overflow-menu-overflow"
                  corner="BOTTOM_END"
                  absolute
                >
                  <ha-icon-button
                   label=${this._hass.localize("ui.common.overflow_menu")}
                    .path=${o.TdJ}
                    slot="trigger"
                  ></ha-icon-button>
                      <ha-list-item
                        graphic="icon"
                        @click="${this._handleEditMorePageClicked}"
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:cog"}></ha-icon>
                        </div>
                        ${this._hass.localize("ui.components.entity.entity-picker.edit")}
                      </ha-list-item>
                </ha-dropdown>
                `:""}
              </div>
            </div>

            ${this.card}
          </div>
        `}}customElements.define("more-page-card",r)},2:(e,t,i)=>{"use strict";var a=i(79),n=i(153),o=i(991),s=i(924),r=i(165),l=i(845),d=i(177),c=i(331);const h=[customElements.whenDefined("hui-masonry-view"),customElements.whenDefined("hc-lovelace")];Promise.race(h).then((async()=>{await new Promise((e=>setTimeout(e,2e3))),await window.loadCardHelpers();class e extends l.WF{static get properties(){return{configuration:{},editMode:{}}}set hass(e){null!=this.data&&0!==this.data.length&&(Object.values(this.data).map((t=>{t.cards.forEach((t=>{t.card.hass=e})),t.customCardsTop.forEach((t=>{t.card.hass=e})),t.customCardsBottom.forEach((t=>{t.card.hass=e}))})),this._hass=e,this.requestUpdate())}setConfig(e){this._hass=window.__dd_get_hass(),this.editMode=!1}async connectedCallback(){super.connectedCallback(),await this._loadData(),await this._hass.connection.subscribeEvents((()=>this._reloadCard()),"dwains_dashboard_more_pages_reload")}async _reloadCard(){await this._loadData(),this.requestUpdate()}async _loadData(){if(this.configuration=await this._hass.callWS({type:"dwains_dashboard/configuration/get"}),null==this.configuration||0===this.configuration.length);else{const e=document.createElement("hui-masonry-view");e.lovelace={editMode:!0},e.willUpdate(new Map)}}_handleMorePageClick(e){const t=e.currentTarget.path;(0,n.oo)(window,"/dwains-dashboard/more_page_"+t),this.requestUpdate()}_handleCreateMorePageClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation(),window.setTimeout((()=>{(0,s.r)("hass-more-info",{entityId:""},document.querySelector("home-assistant")),(0,o.d)((0,d.A)(this._hass,"more.create"),{type:"custom:dwains-edit-more-page-card"},!0,"")}),50)}_handleRemoveMorePageClicked(e){this._hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_more_page",foldername:e.currentTarget.more_page}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleAddToNavbarClick(e){e.currentTarget.more_page,this._hass.connection.sendMessagePromise({type:"dwains_dashboard/remove_more_page",foldername:e.currentTarget.more_page}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}_handleEditModeClicked(e){window.__dd_close_parent_dropdown&&window.__dd_close_parent_dropdown(e),e.stopPropagation();const t=e.currentTarget.value;if(t){this._sortable=[];const e=this.shadowRoot.querySelectorAll(".sortable");for(var i=0;i<e.length;i++)this._sortable[i]=new c.A(e[i],{forceFallback:!0,animation:150,dataIdAttr:"data-more_page",handle:".sortable-move",onEnd:function(e){console.log(e),window.__dd_get_hass().connection.sendMessagePromise({type:"dwains_dashboard/sort_more_page",sortData:JSON.stringify(this.toArray())}).then((e=>{console.log(e)}),(e=>{console.error("Message failed!",e)}))}})}else this._sortable.forEach((e=>e.destroy())),this._sortable=void 0;this.editMode=t}_renderPageButton(e,t){return t.name?l.qy`
            <div class="relative" data-more_page="${e}">
              <div class="flex justify-between h-44 p-3 more-page-button" .path=${e} @click=${this._handleMorePageClick}>
                <div class="h-full flex flex-wrap content-between">
                  <div class="w-full ha-icon">
                    ${this.configuration.more_pages[e]&&this.configuration.more_pages[e].icon?l.qy`
                      <ha-icon
                        class="h-14 w-14"
                        style="color: var(--primary-color);"
                        .icon=${this.configuration.more_pages[e].icon}
                      ></ha-icon>`:""}
                  </div>
                  <div class="w-full">
                    <h3 class="font-semibold text-lg capitalize">${t.name.replace(/_/g," ")}</h3>
                  </div>
                </div>
              </div>
            ${this.editMode?l.qy`
              <ha-card>
                <div class="card-actions-multiple">
                  <div class="sortable-move">
                    <ha-icon
                      .icon=${"mdi:cursor-move"}
                    >
                    </ha-icon>
                  </div>
                  <ha-dropdown
                    class="ha-icon-overflow-menu-overflow"
                    corner="BOTTOM_START"
                    absolute
                  >
                    <ha-icon-button
                     label=${this._hass.localize("ui.common.overflow_menu")}
                      .path=${r.TdJ}
                      slot="trigger"
                    ></ha-icon-button>
                      <ha-list-item
                        graphic="icon"
                        .more_page=${e}
                        @click=${this._handleRemoveMorePageClicked}
                      >
                        <div slot="graphic">
                          <ha-icon .icon=${"mdi:trash-can"}></ha-icon>
                        </div>
                        ${this._hass.localize("ui.common.remove")}
                      </ha-list-item>
                      ${9==!t.show_in_navbar?l.qy`
                        <ha-list-item
                          graphic="icon"
                          .more_page="${e}"
                          @click="${this._handleAddToNavbarClick}"
                        >
                          <div slot="graphic">
                            <ha-icon .icon=${"mdi:tag-plus"}></ha-icon>
                          </div>
                          ${(0,d.A)(this._hass,"more.add_navbar")}
                        </ha-list-item>`:""}
                  </ha-dropdown>
                </div>
              </ha-card>`:""}
            </div>
          `:l.qy``}render(){if(null==this.configuration||0===this.configuration.length)return l.qy``;{const e=Object.entries(this.configuration.more_pages).sort((function(e,t){let i=e[1].sort_order,a=t[1].sort_order;return i==a?0:i>a?1:-1}));return l.qy`
                <div id="more_pages" class="p-4">
                    <div class="flex justify-between mb-2">
                    <div>
                        <h2 class="font-semibold text-lg capitalize">
                        ${(0,d.A)(this._hass,"more.title_plural")}
                        </h2>
                        <span class="text-gray-700">
                        ${Object.keys(this.configuration.more_pages).length} ${(0,d.A)(this._hass,"more.pages")}
                        </span>
                    </div>
                    <div>
                      ${this._hass.user.is_admin?l.qy`
                        <ha-dropdown
                        class="ha-icon-overflow-menu-overflow"
                        corner="BOTTOM_END"
                        absolute
                        >
                          <ha-icon-button
                             label=${this._hass.localize("ui.common.overflow_menu")}
                              .path=${r.TdJ}
                              slot="trigger"
                          ></ha-icon-button>
                            <ha-list-item
                                graphic="icon"
                                @click="${this._handleCreateMorePageClicked}"
                            >
                                <div slot="graphic">
                                  <ha-svg-icon .path=${r.noC}></ha-svg-icon>
                                </div>
                                ${(0,d.A)(this._hass,"more.create")}
                            </ha-list-item>
                            ${this.editMode?l.qy`
                            <ha-list-item
                              graphic="icon"
                              .value=${!1}
                              @click=${this._handleEditModeClicked}
                            >
                              <div slot="graphic">
                                <ha-svg-icon .path=${r.CZ3}></ha-svg-icon>
                              </div>
                              ${(0,d.A)(this._hass,"global.disable_edit_mode")}
                            </ha-list-item>`:l.qy`
                            <ha-list-item
                              graphic="icon"
                              .value=${!0}
                              @click=${this._handleEditModeClicked}
                            >
                              <div slot="graphic">
                                <ha-svg-icon .path=${r.CZ3}></ha-svg-icon>
                              </div>
                              ${(0,d.A)(this._hass,"global.enable_edit_mode")}
                            </ha-list-item>
                            `}
                        </ha-dropdown>
                        `:""}
                    </div>
                    </div>

                    <div class="grid grid-cols-2 md-grid-cols-3 xl-grid-cols-4 gap-4 sortable">
                      ${Object.entries(e).map((([e,t])=>this._renderPageButton(t[0],t[1])))}
                    </div>
                </div>
            `}}static get styles(){return l.AH`
            .sortable-move {
              cursor: -webkit-grabbing;
              cursor: grab;
              margin: auto 0;
            }
            .card-actions-multiple {
              display: flex;
              justify-content: space-between;
              padding: 0.25rem 0.5rem;
            }
            .more-page-button .info ha-icon, .ha-icon ha-icon {
              display: inline-block;
              margin: auto;
              --mdc-icon-size: 100% !important;
              --iron-icon-width: 100% !important;
              --iron-icon-height: 100% !important;
            }
            #badges {
              cursor: pointer;
              background: var( --ha-card-background, var(--card-background-color, white) );
              box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
              color: var(--primary-text-color);
            } 
            .more-page-button {
              cursor: pointer;
              background: var( --ha-card-background, var(--card-background-color, white) );
              border-radius: var(--ha-card-border-radius, 4px);
              box-shadow: var( --ha-card-box-shadow, 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12) );
              color: var(--test-primary-text-color, var(--primary-text-color));
            }
            .info-badge {
              /*background-color: var(--sidebar-icon-color);
              color: var( --ha-card-background, var(--card-background-color, white) );*/
              background-color: var(--secondary-background-color);
            }
            /*styling tailwind dwains version*/
            *, ::after, ::before {
              box-sizing: border-box;
            }
            h1,h2,h3 {
              margin: 0;
            }
            h3 {
              font-size: 1em;
            }
            .absolute {
              position: absolute
            }
            .break-words {
              overflow-wrap: break-word;
            }
            .relative {
                position: relative
            }
            .sticky {
                position: -webkit-sticky;
                position: sticky
            }
            .top-0 {
                top: 0px
            }
            .bottom-0 {
                bottom: 0px
            }
            .z-30 {
                z-index: 30
            }
            .col-span-1 {
                grid-column: span 1 / span 1
            }
            .col-span-2 {
                grid-column: span 2 / span 2
            }
            .row-span-1 {
                grid-row: span 1 / span 1
            }
            .row-span-2 {
                grid-row: span 2 / span 2
            }
            .my-4 {
                margin-top: 1rem;
                margin-bottom: 1rem
            }
            .mx-auto {
              margin-left: auto;
              margin-right: auto
            }
            .mb-2 {
                margin-bottom: 0.5rem
            }
            .mb-4 {
                margin-bottom: 1rem
            }
            .mt-4 {
                margin-top: 1rem
            }
            .mr-0\.5 {
                margin-right: 0.125rem
            }
            .mr-0 {
                margin-right: 0px
            }
            .mb-12 {
                margin-bottom: 3rem
            }
            .mb-5 {
                margin-bottom: 1.25rem
            }
            .mb-16 {
                margin-bottom: 4rem
            }
            .ml-4 {
                margin-left: 1rem
            }
            .block {
                display: block
            }
            .inline-block {
                display: inline-block
            }
            .flex {
                display: flex
            }
            .inline-flex {
                display: inline-flex
            }
            .grid {
                display: grid
            }
            .hidden {
                display: none
            }
            .h-6 {
                height: 1.5rem
            }
            .h-44 {
                height: 11rem
            }
            .h-full {
                height: 100%
            }
            .h-14 {
                height: 3.5rem
            }
            .h-8 {
                height: 2rem
            }
            .w-full {
                width: 100%
            }
            .w-6 {
                width: 1.5rem
            }
            .w-14 {
                width: 3.5rem
            }
            .w-8 {
                width: 2rem
            }
            .w-12 {
              width: 3rem
            }
            .cursor-pointer {
                cursor: pointer
            }
            .grid-flow-row-dense {
                grid-auto-flow: row dense
            }
            .grid-cols-1 {
                grid-template-columns: repeat(1, minmax(0, 1fr))
            }
            .grid-cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr))
            }
            .flex-wrap {
                flex-wrap: wrap
            }
            .content-between {
                align-content: space-between
            }
            .items-center {
                align-items: center
            }
            .justify-between {
                justify-content: space-between
            }
            .gap-4 {
                gap: 1rem
            }
            .space-y-0.5 > :not([hidden]) ~ :not([hidden]) {
                --tw-space-y-reverse: 0;
                margin-top: calc(0.125rem * calc(1 - var(--tw-space-y-reverse)));
                margin-bottom: calc(0.125rem * var(--tw-space-y-reverse))
            }
            .space-y-0 > :not([hidden]) ~ :not([hidden]) {
                --tw-space-y-reverse: 0;
                margin-top: calc(0px * calc(1 - var(--tw-space-y-reverse)));
                margin-bottom: calc(0px * var(--tw-space-y-reverse))
            }
            .rounded {
                border-radius: 0.25rem
            }
            .rounded-md {
                border-radius: 0.375rem
            }
            .bg-gray-800 {
                --tw-bg-opacity: 1;
                background-color: rgb(31 41 55 / var(--tw-bg-opacity))
            }
            .rounded-lg {
              border-radius: 0.5rem
            }
            .border-2 {
                border-width: 2px
            }
            .border-dashed {
                border-style: dashed
            }
            .border-gray-300 {
                --tw-border-opacity: 1;
                border-color: rgb(209 213 219 / var(--tw-border-opacity))
            }
            .bg-gray-800 {
                --tw-bg-opacity: 1;
                background-color: rgb(31 41 55 / var(--tw-bg-opacity))
            }
            .bg-opacity-50 {
                --tw-bg-opacity: 0.5
            }
            .p-2 {
              padding: 0.5rem;
            }
            .p-4 {
                padding: 1rem
            }
            .p-1 {
                padding: 0.25rem
            }
            .p-3 {
                padding: 0.75rem
            }
            .px-1 {
                padding-left: 0.25rem;
                padding-right: 0.25rem
            }
            .p-12 {
              padding: 3rem
            }
            .py-0\.5 {
                padding-top: 0.125rem;
                padding-bottom: 0.125rem
            }
            .py-0 {
                padding-top: 0px;
                padding-bottom: 0px
            }
            .py-1 {
              padding-top: 0.25rem;
              padding-bottom: 0.25rem
            }
            .px-2 {
              padding-left: 0.5rem;
              padding-right: 0.5rem
            }
            .text-center {
              text-align: center
            }
            .text-right {
                text-align: right
            }
            .text-xl {
                font-size: 1.5rem;
                line-height: 2rem
            }
            .text-lg {
                font-size: 1.125rem;
                line-height: 1.75rem
            }
            .text-sm {
                font-size: 0.875rem;
                line-height: 1.25rem
            }
            .text-xs {
                font-size: 0.75rem;
                line-height: 1rem
            }
            .font-semibold {
                font-weight: 600
            }
            .font-medium {
                font-weight: 500
            }
            .capitalize {
                text-transform: capitalize
            }
            .text-gray {
                color: var(--secondary-text-color);
            }
            .text-white {
                --tw-text-opacity: 1;
                color: rgb(255 255 255 / var(--tw-text-opacity))
            }
            @media (min-width: 768px) {
                .md-grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr))
                }
            }
            @media (min-width: 1024px) {
                .lg-col-span-1 {
                    grid-column: span 1 / span 1
                }
                .lg-col-span-3 {
                    grid-column: span 3 / span 3
                }
                .lg-col-span-2 {
                    grid-column: span 2 / span 2
                }
                .lg-row-span-1 {
                    grid-row: span 1 / span 1
                }
                .lg-row-span-3 {
                    grid-row: span 3 / span 3
                }
                .lg-row-span-2 {
                    grid-row: span 2 / span 2
                }
                .lg-block {
                    display: block
                }
                .lg-hidden {
                    display: none
                }
                .lg-w-1-2 {
                    width: 50%
                }
                .lg-grid-cols-2 {
                    grid-template-columns: repeat(2, minmax(0, 1fr))
                }
                .lg-grid-cols-3 {
                    grid-template-columns: repeat(3, minmax(0, 1fr))
                }
            }
            @media (min-width: 1536px) {
              .xl-col-span-1 {
                  grid-column: span 1 / span 1
              }
              .xl-col-span-4 {
                  grid-column: span 4 / span 4
              }
              .xl-col-span-2 {
                  grid-column: span 2 / span 2
              }
              .xl-row-span-1 {
                  grid-row: span 1 / span 1
              }
              .xl-row-span-4 {
                  grid-row: span 4 / span 4
              }
              .xl-row-span-2 {
                  grid-row: span 2 / span 2
              }
              .xl-w-1-3 {
                  width: 33.333333%
              }
              .xl-w-2-3 {
                  width: 66.666667%
              }
              .xl-grid-cols-4 {
                  grid-template-columns: repeat(4, minmax(0, 1fr))
              }
          }
          `}}customElements.define("more-pages-card",e)}))},216:(e,t,i)=>{"use strict";var a=i(381),n=i(153),o=i(177);class s extends a.WF{static get styles(){return a.AH`
        :host {
            width: -webkit-fill-available;
            display: flex;
            flex-direction: column;
            background-color: var( --ha-card-background, var(--card-background-color, white) );
            height: auto;
            top: 0;
            z-index: 8;
            position: fixed;
        }
        .mainNavItems {
            flex-grow: 1;
            display: flex;
            align-items: stretch;
            padding: 0.25rem;
            justify-content: space-between;
            overflow-x: scroll;
            scrollbar-width: none;
        }
        .mainNavItems::-webkit-scrollbar {
            height: 0px;
        }
        .mainNavItems::before, .mainNavItems::after {
            content: ''; /* Insert space before the first item and after the last one */
        }
        .mainNavItems div {
            padding: 0.5rem;
            color: var(--primary-text-color);
            position: relative;
            text-align: center;
            display: grid;
            cursor: pointer;
        }
        .mainNavItems div span {
            text-transform: capitalize;
        }
        .mainNavItems div.active {
            color: var(--sidebar-selected-icon-color);
        }

        .dwains-dashboard-nav {
            display: flex;
        }
        .toggle-sidebar {
            padding: 1.35rem;
            background: var(--secondary-background-color);
            display: none;
            cursor: pointer;
        }
        .sidebar-always_hidden {
            /* User has the sidebar hidden so always show the button */
            display: block !important;
        }
        /* bottom: 0; */
        /* padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); */
        @media only screen and (max-width: 768px) {
            :host {
                position: sticky;
                bottom: 0;
                top: auto;
                padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            }
        }
        @media only screen and (max-width: 1800px) and (hover: none) {
            :host {
                position: sticky;
                bottom: 0;
                top: auto;
                padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            }
        }            
        @media (max-width: 871px) {
            .mainNavItems div span {
                display: none;
            }
            .toggle-sidebar {
                display: block;
                padding: 0.75rem;
            }
        }
        `}static get properties(){return{_hass:{type:Object},config:{type:Object},currentPath:{type:String},configuration:{type:Object},isLoading:{type:Boolean}}}set hass(e){this._hass=e,this.isLoading&&this.loadConfig()}constructor(){super(),this.currentPath=document.location.pathname,this.isLoading=!0}async loadConfig(){if(this._hass)try{this.configuration=await this._hass.callWS({type:"dwains_dashboard/configuration/get"}),this.isLoading=!1,this.requestUpdate(),await this._hass.connection.subscribeEvents((()=>this._reloadCard()),"dwains_dashboard_navigation_card_reload")}catch(e){console.error("Error loading configuration:",e),this.isLoading=!1}}async _reloadCard(){console.log("Reloading navigation card"),await this.loadConfig(),this.requestUpdate()}_menuClick(e){const t=e.currentTarget.path;(0,n.oo)(window,t),this.currentPath=t}_toggleSidebarClick(){document.querySelector("body > home-assistant").shadowRoot.querySelector("home-assistant-main").dispatchEvent(new CustomEvent("hass-toggle-menu",{detail:{open:!0}}))}render(){if(this.isLoading||!this.configuration)return a.qy``;const e=Object.entries(this.configuration.more_pages).sort((function(e,t){let i=e[1]&&e[1].sort_order?e[1].sort_order:99,a=t[1]&&t[1].sort_order?t[1].sort_order:99;return i==a?0:i>a?1:-1}));return a.qy`
            <div class="dwains-dashboard-nav">
                <div
                    @click=${this._toggleSidebarClick}
                    class="toggle-sidebar sidebar-${this._hass.dockedSidebar}"
                >
                    <ha-icon icon="${"mdi:menu"}"></ha-icon>
                </div>
                <div class="mainNavItems">
                    <div
                        class="${"/dwains-dashboard/home"==document.location.pathname?"active":""}" 
                        @click=${this._menuClick}
                        .path=${"/dwains-dashboard/home"}
                    >
                        <ha-icon icon="${"mdi:home"}"></ha-icon>
                        <span>${(0,o.A)(this._hass,"home.title")}</span>
                    </div>
                    <div
                        class="${"/dwains-dashboard/devices"!=document.location.pathname||window.location.hash?"":"active"}" 
                        @click=${this._menuClick}
                        .path=${"/dwains-dashboard/devices"}
                    >
                        <ha-icon icon="${"mdi:format-list-bulleted-type"}"></ha-icon>
                        <span>${(0,o.A)(this._hass,"device.title_plural")}</span>
                    </div>
                    ${Object.entries(this.configuration.devices).map((([e,t])=>a.qy`
                            ${t.show_in_navbar?a.qy`
                                <div
                                    class="${"/dwains-dashboard/devices"==document.location.pathname&&window.location.hash=="#"+e?"active":""}" 
                                    @click=${this._menuClick}
                                    .path=${"/dwains-dashboard/devices#"+e}
                                >
                                    <ha-icon icon="${t.icon}"></ha-icon>
                                    <span>${(0,o.A)(this._hass,"device."+e)}</span>
                                </div>`:""}
                        `))}
                    ${Object.entries(e).map((([e,t])=>a.qy`
                            ${t[1].show_in_navbar?a.qy`
                                <div
                                    class="${document.location.pathname=="/dwains-dashboard/more_page_"+t[0].toLowerCase().replace("'","_").replace(" ","_")?"active":""}" 
                                    @click=${this._menuClick}
                                    .path=${"/dwains-dashboard/more_page_"+t[0].toLowerCase().replace("'","_").replace(" ","_")}
                                >
                                    <ha-icon icon="${t[1].icon}"></ha-icon>
                                    <span>${t[1].name}</span>
                                </div>`:""}
                        `))}
                    <div
                        class="${"/dwains-dashboard/more_page"==document.location.pathname?"active":""}" 
                        @click=${this._menuClick}
                        .path=${"/dwains-dashboard/more_page"}
                    >
                        <ha-icon icon="${"mdi:view-grid-outline"}"></ha-icon>
                        <span>${(0,o.A)(this._hass,"more.title")}</span>
                    </div>
                </div>
            </div>
        `}}customElements.define("dwainsboard-navigation-card",s)},863:(e,t,i)=>{"use strict";var a=i(381);class n extends a.WF{static styles=a.AH`
    ha-card {
      box-shadow: none;
      background: transparent;
      color: var(--primary-text-color);
    }
    .notification-button ha-icon {
      display: inline-block;
      margin: auto;
      --mdc-icon-size: 100% !important;
      --iron-icon-width: 100% !important;
      --iron-icon-height: 100% !important;
      cursor: pointer;
      opacity: 0.8;
    }
    .notification-button ha-icon:hover {
      opacity: 1.0;
    }
    .w-6 {
      width: 1.5rem;
    }
    .h-6 {
      height: 1.5rem;
    }
    .notification-button {
      background: var(--ha-card-background, var(--card-background-color, white));
      border-radius: var(--ha-card-border-radius, 4px);
      box-shadow: var(--ha-card-box-shadow, 0 2px 1px -1px rgba(0,0,0,0.2), 0 1px 1px 0 rgba(0,0,0,0.14), 0 1px 3px 0 rgba(0,0,0,0.12));
      color: var(--primary-text-color);
      padding: 1rem;
      line-height: 1.25rem;
      margin: 0.25rem 0;
    }
    .sub {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .text {
      font-size: 0.875rem;
      line-height: 1.25rem;
      flex: 1 1 0%;
      width: 0px;
      font-weight: 500;
      text-transform: capitalize;
    }
    .close {
      flex-shrink: 0;
    }
  `;static get properties(){return{_hass:{},_config:{},notifications:{type:Array}}}setConfig(e){this.config=e}set hass(e){this._hass=e,this.requestUpdate()}constructor(){super(),this.notifications=[]}connectedCallback(){super.connectedCallback(),this._unsub||(this._subscribeNotifications(),this._notificationsUpdated())}async _subscribeNotifications(){this._unsub||(this._unsub=await this._hass.connection.subscribeEvents((()=>this._notificationsUpdated()),"dwains_dashboard_notifications_updated"))}disconnectedCallback(){super.disconnectedCallback(),this._unsub&&(this._unsub(),this._unsub=void 0)}async _notificationsUpdated(){this.notifications=await this._hass.callWS({type:"dwains_dashboard_notification/get"})||[],this.requestUpdate()}_handleDismiss(e){this._hass.callService("dwains_dashboard","notification_dismiss",{notification_id:e}),this._notificationsUpdated()}_renderNotification(e){return a.qy`
      <div class="notification-button">
        <div class="sub">
          <div class="text">${e.message}</div>
          <ha-icon 
            class="h-6 w-6 close" 
            icon="mdi:close" 
            @click=${()=>this._handleDismiss(e.notification_id)}>
          </ha-icon>
        </div>
      </div>
    `}render(){return this.notifications.length?a.qy`
      <ha-card>
        <div id="notifications">
          ${this.notifications.map((e=>this._renderNotification(e)))}
        </div>
      </ha-card>
    `:a.qy``}}customElements.define("dwains-notification-card",n)},991:(e,t,i)=>{"use strict";i.d(t,{d:()=>s});var a=i(79),n=i(437);let o=window.cardHelpers;async function s(e,t,i=!1,o={},r=!1){if(!customElements.get("card-tools-popup")){const e=customElements.get("home-assistant-main")?Object.getPrototypeOf(customElements.get("home-assistant-main")):Object.getPrototypeOf(customElements.get("hui-view")),t=e.prototype.html,i=e.prototype.css;class a extends e{static get properties(){return{open:{},large:{reflect:!0,type:Boolean},hass:{}}}updated(e){e.has("hass")&&this.card&&(this.card.hass=this.hass)}closeDialog(){this.open=!1;try{history.state&&history.state.cardToolsPopup&&history.replaceState({cardToolsPopup:!1},"")}catch(e){}}async _makeCard(){const e=await window.loadCardHelpers();this.card=await e.createCardElement(this._card),this.card.hass=this.hass,this.requestUpdate()}async _applyStyles(){let e=await(0,n.V)(this,"$ ha-dialog");customElements.whenDefined("card-mod").then((async()=>{e&&(window.cardMod&&window.cardMod.applyToElement&&window.cardMod.applyToElement.length<=3?window.cardMod.applyToElement(e,this._style,{config:this._card,tag:"more-info"}):(window.cardMod&&window.cardMod.applyToElement?window.cardMod.applyToElement(e,"more-info",this._style,{config:this._card},[],!1):void 0))}))}async showDialog(e,t,i=!1,a={},n=!1){this.title=e,this._card=t,this.large=i,this._style=a,this.fullscreen=!!n,this._makeCard(),await this.updateComplete,this.open=!0,await this._applyStyles()}_enlarge(){this.large=!this.large}render(){return this.open?t`
            <ha-dialog
              open
              @closed=${this.closeDialog}
              .heading=${!0}
              hideActions
              @ll-rebuild=${this._makeCard}
            >
            ${this.fullscreen?t`<div slot="heading"></div>`:t`
                <app-toolbar slot="heading">
                  <ha-icon-button
                   label=${"dismiss"}
                    dialogAction="cancel"
                  >
                    <ha-icon
                      .icon=${"mdi:close"}
                    ></ha-icon>
                  </ha-icon-button>
                  <div class="main-title" @click=${this._enlarge}>
                    ${this.title}
                  </div>
                </app-toolbar>
              `}
              <div class="content">
                ${this.card}
              </div>
            </ha-dialog>
          `:t``}static get styles(){return i`
          ha-dialog {
            --mdc-dialog-min-width: 400px;
            --mdc-dialog-max-width: min(95vw, 960px);
            --mdc-dialog-heading-ink-color: var(--primary-text-color);
            --mdc-dialog-content-ink-color: var(--primary-text-color);
            --justify-action-buttons: space-between;
          }
          @media all and (max-width: 450px), all and (max-height: 500px) {
            ha-dialog {
              --mdc-dialog-min-width: 100vw;
              --mdc-dialog-max-width: 100vw;
              --mdc-dialog-min-height: 100%;
              --mdc-dialog-max-height: 100%;
              --mdc-shape-medium: 0px;
              --vertial-align-dialog: flex-end;
            }
          }

          app-toolbar {
            flex-shrink: 0;
            color: var(--primary-text-color);
            // background-color: var(--secondary-background-color);
            display: flex;
            flex-direction: row;
            align-items: flex-start;
          }

          .main-title {
            flex: 1;
            font-size: 22px;
            line-height: 28px;
            font-weight: 400;
            padding: 14px 4px 10px 4px;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .content {
            margin: -20px -24px;
            max-width: 100%;
            overflow-x: hidden;
            box-sizing: border-box;
          }

          @media all and (max-width: 450px), all and (max-height: 500px) {
            app-toolbar {
              background-color: var(--app-header-background-color);
              color: var(--app-header-text-color, white);
            }
          }

          @media all and (min-width: 451px) and (min-height: 501px) {
            ha-dialog {
              --mdc-dialog-min-width: min(720px, 95vw);
              --mdc-dialog-max-width: min(95vw, 960px);
            }

            .content {
              width: min(720px, calc(95vw - 48px));
            }
            :host([large]) .content {
              width: min(960px, calc(95vw - 48px));
            }

            :host([large]) app-toolbar {
              max-width: min(976px, calc(95vw - 32px));
            }
          }
          `}}customElements.define("card-tools-popup",a)}const l=document.querySelector("home-assistant")||document.querySelector("hc-root");if(!l)return;let d=await(0,n.V)(l,"$ card-tools-popup");if(!d){d=document.createElement("card-tools-popup");const e=l.shadowRoot.querySelector("ha-more-info-dialog");e?l.shadowRoot.insertBefore(d,e):l.shadowRoot.appendChild(d),(0,a.zo)(d)}if(!window._moreInfoDialogListener){const e=async e=>{if(e.state&&"cardToolsPopup"in e.state)if(e.state.cardToolsPopup){const{title:t,card:i,large:a,style:n,fullscreen:o}=e.state.params;s(t,i,a,n,o)}else d.closeDialog()};window.addEventListener("popstate",e),window._moreInfoDialogListener=!0}history.replaceState({cardToolsPopup:!1},""),history.pushState({cardToolsPopup:!0,params:{title:e,card:t,large:i,style:o,fullscreen:r}},""),d.showDialog(e,t,i,o,r)}new Promise((async(e,t)=>{o&&e();const i=async()=>{o=await window.loadCardHelpers(),window.cardHelpers=o,e()};window.loadCardHelpers?i():window.addEventListener("load",(async()=>{(0,a.N6)(),window.loadCardHelpers&&i()}))}))},89:(e,t,i)=>{"use strict";i.d(t,{F:()=>s,f:()=>o});var a=i(437),n=i(153);async function o(){const e=document.querySelector("home-assistant")||document.querySelector("hc-root"),t=await(0,a.V)(e,"$ card-tools-popup");t&&t.closeDialog()}const s=(e,t,i)=>{if("unknown"===t.state||"unavailable"===t.state)return e(`state.default.${t.state}`);if(t.attributes.unit_of_measurement)return`${t.state} ${t.attributes.unit_of_measurement}`;const a=(0,n.mD)(t.entity_id);if("input_datetime"===a){let e;if(!t.attributes.has_time)return e=new Date(t.attributes.year,t.attributes.month-1,t.attributes.day),formatDate(e,i);if(!t.attributes.has_date){const a=new Date;return e=new Date(a.getFullYear(),a.getMonth(),a.getDay(),t.attributes.hour,t.attributes.minute),formatTime(e,i)}return e=new Date(t.attributes.year,t.attributes.month-1,t.attributes.day,t.attributes.hour,t.attributes.minute),formatDateTime(e,i)}return t?.translation_key&&e(`component.${t.platform}.entity.${a}.${t.translation_key}.state.${t.state}`)||t.attributes.device_class&&e(`component.${a}.entity_component.${t.attributes.device_class}.state.${t.state}`)||e(`component.${a}.entity_component._.state.${t.state}`)||t.state}},177:(e,t,i)=>{"use strict";i.d(t,{A:()=>o});const a={en:{global:{dwains_dashboard_settings:"Dwains Dashboard Settings",enable_edit_mode:"Enable edit mode",disable_edit_mode:"Disable edit mode",version:"Version",disable_clock:"Disable clock",am_pm_clock:"AM/PM clock",disable_welcome_message:"Disable Welcome message",settings:"Global settings",dashboard_information:"Dashboard information",alarm_entity:"Alarm entity",weather_entity:"Weather entity",greeting_morning:"Good morning",greeting_afternoon:"Good afternoon",greeting_evening:"Good evening",v2_mode:"Enable Dwains Dashboard v2 mode (layout)",disable_sensor_graph:"Disable show sensor as graph",invert_cover:"Invert Cover"},editor:{lovelace_card:"Lovelace Card",create_lovelace_card:"Create a new lovelace card from scratch",dwains_dashboard_blueprint:"Dwains Dashboard Blueprint",use_dwains_dashboard_blueprint:"Use a Dwain Dashboard Blueprint to create a card",row_span:"Row span",row:"Row",rows:"Rows",col_span:"Col span",column:"Column",columns:"Columns",default_col_row:"Default col and row size",large_col_row:"Large screen col and row size",extra_large_col_row:"Extra large screen col and row size"},entity:{title:"Entity",title_plural:"entities",add_card_to:"Add card to ",edit_entity:"Edit entity",edit_entity_card:"Edit entity card",edit_entity_popup_card:"Edit entity popup card",add_to_favorites:"Add to favorites",remove_from_favorites:"Remove from favorites",popup_card:"Popup card",entity_card:"Entity card",settings:"Entity settings",group:"Group by devices",ungroup:"Ungroup by devices",enable:"Enable entity",disable:"Disable entity in DD",disable_all:"Disable all entities",hide_all:"Hide all entities",exclude:"Exclude entity in DD",hide:"Hide entity in DD",unhide:"Unhide entity",use_popup_card:"Use own popup card",use_entity_card:"Use own entity card",friendly_name:"Rename for DD",hidden:"The following entities are hidden:",disabled:"The following entities are disabled:",unavailable:"The following entities are unavailable:"},favorite:{title:"Favorite",title_plural:"Favorites",all_favorites:"All favorites"},home:{title:"Home"},area:{title:"Area",title_plural:"Areas",edit_area_button:"Edit area button",group_by_floor:"Group by floor",ungroup_by_floor:"Ungroup by floor",icon:"Area icon",floor:"Area floor",no_floor:"No floor",disable:"Disable area in DD",disabled:"The following areas are disabled:",enable:"Enable area"},device:{title:"Device",title_plural:"devices",edit_device_button:"Edit device button",edit_device_card:"Set custom entities card for domain ",edit_device_popup:"Set custom entities popup for domain ",current_blueprint_card:"You are currently using the following blueprint for all entities cards in the domain ",current_blueprint_popup:"You are currently using the following blueprint for all entities popups in the domain ",icon_required:"If you want to add it to navbar you must select an icon!",icon:"Device icon",show_in_navbar:"Add device page in main navbar",hide:"Hide device overview",unhide:"Unhide device overview",hidden:"The following device overviews are hidden",see_all:"See all",turn_all_off:"Turn all off",on:"on",open:"open",closed:"closed",cover:"Cover",light:"Light",climate:"Climate",sensor:"Sensor",binary_sensor:"Binary Sensor",media_player:"Media player",garage:"Garage",shutter:"Shutter",running:"Running",remote:"Remote",scene:"Scene",number:"Number",switch:"Switch",button:"Button",water_heater:"Water heater",camera:"Camera",select:"Select",vacuum:"Vacuum",fan:"Fan",door:"Door",window:"Window",vibration:"Vibration",motion:"Motion",device_tracker:"Device tracker",lock:"Lock",input_boolean:"Input boolean",weather:"Weather",moisture:"Moisture",input_select:"Input select",carbon_monoxide:"Carbon monoxide",gas:"Gas",problem:"Problem",safety:"Safety",smoke:"Smoke",tamper:"Tamper",update:"Update",person:"Person",alarm_control_panel:"Alarm control panel",automation:"Automation",group:"Group by areas",ungroup:"Ungroup by areas",update:"Update",script:"Script",time:"Time",event:"Event",text:"Text"},more:{title:"More",title_plural:"More pages",pages:"pages",create:"Create new more page",edit:"Edit more page",name_required:"You must specify a name for the page",icon_required:"If you want to add it to navbar you must select an icon!",add_navbar:"Add this more page in main navbar",name:"More page name",icon:"More page icon"},blueprint:{title:"Blueprint",title_plural:"Blueprints",yaml_required:"No YAML code entered!",installed:"Installed",no_blueprints_installed:"No blueprints installed",not_installed:"Not installed",installed_blueprints:"Installed blueprints",type:"Type blueprint",used_custom_cards:"Used custom cards",use:"Use this blueprint",install:"Install blueprint",yaml_code:"Blueprint YAML code",instruction:"Look for the blueprint you want to install in the Dwains Dashboard Community Blueprints Github and paste the blueprint yaml code below. After succesfull installation lovelace and this page will reload. Then you can use the installed blueprint."}},nl:{global:{dwains_dashboard_settings:"Dwains Dashboard Instellingen",enable_edit_mode:"Bewerkingsmodus inschakelen",disable_edit_mode:"Bewerkingsmodus uitschakelen",version:"Versie",disable_clock:"Klok uitzetten",am_pm_clock:"AM/PM klok",disable_welcome_message:"Welkom bericht uitzetten",settings:"Globale instellingen",dashboard_information:"Dashboard informatie",alarm_entity:"Alarm entiteit",weather_entity:"Weer entiteit",greeting_morning:"Goedemorgen",greeting_afternoon:"Goedemiddag",greeting_evening:"Goedenavond",v2_mode:"Dwains Dashboard v2-modus inschakelen (lay-out)",disable_sensor_graph:"Toon sensor als grafiek uitschakelen"},editor:{lovelace_card:"Lovelace Kaart",create_lovelace_card:"Maak een nieuwe lovelace-kaart vanaf het begin",dwains_dashboard_blueprint:"Dwains Dashboard Blueprint",use_dwains_dashboard_blueprint:"Een Dwain Dashboard Blueprint gebruiken om een kaart te maken",row_span:"Rij span",row:"Rij",rows:"Rijen",col_span:"Kolom span",column:"Kolom",columns:"Kolommen",default_col_row:"Standaard col en rijgrootte",large_col_row:"Groot scherm kleur en rijgrootte",extra_large_col_row:"Extra grote schermkleur en rijgrootte"},entity:{title:"Entiteit",title_plural:"entiteiten",add_card_to:"Kaart toevoegen aan ",edit_entity:"Bewerk entiteit",edit_entity_card:"Bewerk entiteit kaart",edit_entity_popup_card:"Bewerk entiteit popup kaart",add_to_favorites:"Toevoegen aan favorieten",remove_from_favorites:"Verwijderen van favorieten",popup_card:"Popup kaart",entity_card:"Entiteit kaart",settings:"Entiteit instellingen",group:"Groep entiteiten",ungroup:"Groep entiteiten opheffen",enable:"Entiteit aanzetten",disable:"Entiteit uitschakelen in DD",disable_all:"Alle entiteiten uitschakelen",hide_all:"Alle entiteiten verbergen",exclude:"Entiteit uitsluiten in DD",hide:"Verberg entiteit in DD",unhide:"Entiteit zichtbaar maken",use_popup_card:"Eigen pop-upkaart gebruiken",use_entity_card:"Eigen entiteitskaart gebruiken",friendly_name:"Naam wijzigen voor DD",hidden:"De volgende entiteiten zijn verborgen:",disabled:"De volgende entiteiten zijn uitgeschakeld:",unavailable:"De volgende entiteiten zijn niet beschikbaar:"},favorite:{title:"Favoriet",title_plural:"Favorieten",all_favorites:"Alle favorieten"},home:{title:"Home"},area:{title:"Gebied",title_plural:"Gebieden",edit_area_button:"Bewerk gebied knop",group_by_floor:"Groeperen op verdieping",ungroup_by_floor:"Groepering opheffen op verdieping",icon:"Gebied icoon",floor:"Gebied verdieping",no_floor:"Geen verdieping",disable:"Schakel gebied uit in DD",disabled:"De volgende gebieden zijn uitgeschakeld:",enable:"Gebied inschakelen"},device:{title:"Apparaat",title_plural:"apparaten",edit_device_button:"Apparaatknop bewerken",edit_device_card:"Stel een custom entititeit kaart in voor domein ",edit_device_popup:"Stel een custom popup entiteiten in voor domein ",current_blueprint_card:"U gebruikt momenteel de volgende blueprint voor alle entiteitskaarten in het domein: ",current_blueprint_popup:"U gebruikt momenteel de volgende blueprint voor alle pop-ups van entiteiten in het domein: ",icon_required:"Als u het aan de navigatiebalk wilt toevoegen, moet u een icon selecteren!",icon:"Apparaat icon",show_in_navbar:"Apparaatpagina toevoegen in hoofdnavigatiebalk",hide:"Apparaatoverzicht verbergen",unhide:"Apparaatoverzicht zichtbaar maken",hidden:"De volgende apparaatoverzichten zijn verborgen",see_all:"Bekijk alle",turn_all_off:"Zet alle uit",on:"aan",open:"open",cover:"Rolluik",light:"Lamp",climate:"Thermostaat",sensor:"Sensor",binary_sensor:"Binaire sensor",media_player:"Media player",remote:"Afstandsbediening",scene:"Scène",number:"Nummer",switch:"Schakelaar",button:"Knop",water_heater:"Water verwarmer",camera:"Camera",select:"Selecteer",vacuum:"Stofzuiger",fan:"Ventilator",door:"Deur",window:"Raam",vibration:"Vibratie",motion:"Beweging",device_tracker:"Device tracker",lock:"Slot",input_boolean:"Input boolean",weather:"Weer",moisture:"Vochtigheid",input_select:"Input select",carbon_monoxide:"Koolmonoxide",gas:"Gas",problem:"Probleem",safety:"Veiligheid",smoke:"Rook",tamper:"Geknoeid",update:"Update",person:"Persoon",alarm_control_panel:"Alarm bedieningspaneel",automation:"Automatisering",group:"Groeperen op gebied",ungroup:"Groepering opheffen op gebied"},more:{title:"Meer",title_plural:"Meer pagina's",pages:"pagina's",create:"Nieuwe meer pagina maken",edit:"Meer pagina bewerken",name_required:"U moet een naam voor de pagina opgeven",icon_required:"Als u het aan de navigatiebalk wilt toevoegen, moet u een icoon selecteren!",add_navbar:"Voeg deze meer pagina toe in de hoofdnavigatiebalk",name:"Meer pagina naam",icon:"Meer pagina icoon"},blueprint:{title:"Blueprint",title_plural:"Blueprints",yaml_required:"Geen YAML-code ingevoerd!",installed:"Geïnstalleerd",no_blueprints_installed:"Geen blueprints geïnstalleerd",not_installed:"Niet geïnstalleerd",installed_blueprints:"Installeer blueprints",type:"Type blueprint",used_custom_cards:"Gebruikte custom cards",use:"Gebruik deze blueprint",install:"Installeer blueprint",yaml_code:"Blueprint YAML-code",instruction:"Zoek de blueprint die u wilt installeren in de Dwains Dashboard Community Blueprints Github en plak de blueprint yaml-code hieronder. Na succesvolle installatie worden lovelace en deze pagina opnieuw geladen. Dan kunt u de geïnstalleerde blueprint gebruiken."}},fr:{global:{dwains_dashboard_settings:"Paramètres Dwains Dashboard",enable_edit_mode:"Activer le mode d'édition",disable_edit_mode:"Désactiver le mode d'édition",version:"Version",disable_clock:"Masquer l'horloge",am_pm_clock:"AM/PM l'horloge",disable_welcome_message:"Masquer le message de bienvenue",settings:"Paramètres globaux",dashboard_information:"Informations",alarm_entity:"Entité pour l'Alarme",weather_entity:"Entité pour la Météo",greeting_morning:"Bonjour",greeting_afternoon:"Bonne après-midi",greeting_evening:"Bonsoir",v2_mode:"Activer le mode Dwains Dashboard v2 (mise en page)",disable_sensor_graph:"Désactiver l'affichage du capteur sous forme de graphique"},editor:{lovelace_card:"Carte Lovelace",create_lovelace_card:"Créer une nouvelle carte Lovelace",dwains_dashboard_blueprint:"Dwains Dashboard Blueprint",use_dwains_dashboard_blueprint:"Utiliser un Blueprint pour créer une carte",row_span:"Nombre de rangée",row:"Rangée",rows:"Rangées",col_span:"Nombre de colonne",column:"Colonne",columns:"Colonnes",default_col_row:"Default : nombre de colonne et rangée",large_col_row:"Grand écran : nombre de colonne et rangée",extra_large_col_row:"Très grande écran : nombre de colonne et rangée"},entity:{title:"Entité",title_plural:"Entités",add_card_to:"Ajouter la carte à ",edit_entity:"Éditer l'entité",edit_entity_card:"Éditer une carte d'entité",edit_entity_popup_card:"Éditer une carte Pop-up",add_to_favorites:"Ajouter aux favoris",remove_from_favorites:"Retirer des favoris",popup_card:"Carte Pop-up",entity_card:"Carte de l'entité",settings:"Paramètres de l'entité",group:"Regrouper par entités",ungroup:"Dégrouper par entités",enable:"Activer l'entité",disable:"Désactiver l'entité dans DD",disable_all:"Désactiver toutes les entités",hide_all:"Masquer toutes les entités",exclude:"Exclure l'entité dans DD",hide:"Masquer l'entité dans DD",unhide:"Afficher l'entité",use_popup_card:"Utiliser une carte Pop-up",use_entity_card:"Utiliser une carte d'entité",friendly_name:"Renommer dans DD",hidden:"Les entités suivantes sont masqués:",disabled:"Les entités suivantes sont désactivés:",unavailable:"Les entités suivantes sont indisponibles:"},favorite:{title:"Favori",title_plural:"Favoris",all_favorites:"Tous les Favoris"},home:{title:"Accueil"},area:{title:"Pièce",title_plural:"Pièces",edit_area_button:"Édition d'une Pièce",group_by_floor:"Regrouper par étage",ungroup_by_floor:"Dégrouper par étage",icon:"Icône",floor:"Étage",no_floor:"Aucun n'étage",disable:"Désactiver l'aréa dans DD",disabled:"Les aréas suivantes sont désactivées:",enable:"Activer l'aréa"},device:{title:"Appareil",title_plural:"Appareils",edit_device_button:"Édition d'un appareil",edit_device_card:"Définir une carte d'entités personnalisées pour le domaine ",edit_device_popup:"Définir une carte Pop-up d'entités personnalisées pour le domaine ",current_blueprint_card:"Vous utilisez actuellement le Blueprint suivant pour toutes les cartes d'entités du domaine ",current_blueprint_popup:"Vous utilisez actuellement le Blueprint suivant pour tout les Pop-up d'entités du domaine ",icon_required:"Si vous voulez l'ajouter à la barre de navigation, vous devez choisir une icône!",icon:"icône de l'appareil",show_in_navbar:"Ajouter la page d'appareils à la barre de navigation",hide:"Masquer l'aperçu de l'appareil",unhide:"Afficher l'aperçu de l'appareil",see_all:"Voir tout",turn_all_off:"Tout désactiver",on:"Allumé",open:"Ouvert",cover:"Rideau",light:"Lumière",climate:"Thermostat",sensor:"Capteur",binary_sensor:"Binaire",media_player:"Multimédia",remote:"Télécommande",scene:"Scène",number:"Nombre",switch:"Interrupteur",button:"Bouton",water_heater:"Chauffe-eau",camera:"Caméra",select:"Sélection",vacuum:"Aspirateur",fan:"Ventilateur",door:"Porte",window:"Fenêtre",vibration:"Vibration",motion:"Mouvement",device_tracker:"Traqueur",lock:"Serrure",input_boolean:"Booléen",weather:"Temps",moisture:"Humidité",input_select:"Sélection",carbon_monoxide:"Monoxyde de carbone",gas:"Gaz",problem:"Problème",safety:"Sécurité",smoke:"Fumée",tamper:"Altérer",update:"Mise à jour",person:"Personne",alarm_control_panel:"Alarme",automation:"Automatisation",group:"Regrouper par aréas",ungroup:"Dégrouper par aréas"},more:{title:"Ajouter",title_plural:"Ajouter une page",pages:"Pages",create:"Créer une nouvelle page",edit:"Éditer une page",name_required:"Vous devez indiquer le nom de la page",icon_required:"Si vous voulez l'ajouter à la barre de navigation, vous devez choisir une icône!",add_navbar:"Ajouter à la barre de navigation",name:"Nom de la page",icon:"icône de la page"},blueprint:{title:"Blueprint",title_plural:"Blueprints",yaml_required:"Pas de code YAML entré!",installed:"Installé",no_blueprints_installed:"Pas de Blueprints installés",not_installed:"N'est pas installé",installed_blueprints:"Blueprints installés",type:"Type de Blueprint",used_custom_cards:"Cartes personnalisées installées",use:"Ajouter",install:"Installer un Blueprint",yaml_code:"Code YAML du Blueprint",instruction:"Trouver le code du Blueprint que vous voulez installer dans le GitHub de la communauté de Dwains et collé le dans la section Code YAML du Blueprint plus basse. Après l’installation réussie, le tableau de bord va se recharger. Alors, vous pourrez utiliser le Blueprint."}},de:{global:{dwains_dashboard_settings:"Dwains Dashboard Einstellungen",enable_edit_mode:"Aktiviere Bearbeitungsmodus",disable_edit_mode:"Deaktiviere Bearbeitungsmodus",version:"Version",disable_clock:"Deaktiviere Uhr",am_pm_clock:"AM/PM Uhr",disable_welcome_message:"Deaktiviere Willkommensnachricht",settings:"Globale Einstellungen",dashboard_information:"Dashboard Informationen",alarm_entity:"Alarm Entität",weather_entity:"Wetter Entität",greeting_morning:"Guten Morgen",greeting_afternoon:"Guten Tag",greeting_evening:"Guten Abend",v2_mode:"Aktiviere Dwains Dashboard v2 Layout",disable_sensor_graph:"Sensordarstellung als Grafik deaktivieren"},editor:{lovelace_card:"Lovelace Karte",create_lovelace_card:"Erstelle eine neue Lovelace Karte",dwains_dashboard_blueprint:"Dwains Dashboard Blueprint",use_dwains_dashboard_blueprint:"Nutze Dwains Dashboard Blueprint um eine Karte zu erstellen",row_span:"Anzahl Zeilen",row:"Zeile",rows:"Zeilen",col_span:"Anzahl Spalten",column:"Spalte",columns:"Spalten",default_col_row:"Standardgröße von Zeilen und Spalten",large_col_row:"Zeilen und Spaltengröße für große Bildschirme",extra_large_col_row:"Zeilen und Spaltengröße für extra große Bildschirme"},entity:{title:"Entität",title_plural:"Entitäten",add_card_to:"Füge Karte hinzu ",edit_entity:"Bearbeite Entität",edit_entity_card:"Bearbeite Entität-Karte",edit_entity_popup_card:"Bearbeite Pop-up-Karte",add_to_favorites:"Zu Favoriten hinzufügen",remove_from_favorites:"Entferne von Favoriten",popup_card:"Pop-up Karte",entity_card:"Enität-Karte",settings:"Entität Einstellungen",group:"Gruppierung nach Entitäten",ungroup:"Gruppierung nach Entitäten aufheben",enable:"Aktiviere Entität",disable:"Deaktiviere Entität in DD",disable_all:"Deaktiviere alle Entitäten",hide_all:"Blende alle Entitäten aus",exclude:"Schließe Entität in DD aus",hide:"Blende Entität in DD aus",unhide:"Blende Entität in DD ein",use_popup_card:"Nutze eigene Pop-up Karte",use_entity_card:"Nutze eigene Entität-Karte",friendly_name:"Nenne in DD um",hidden:"Folgende Entitäten sind ausgeblendet:",disabled:"Folgende Entitäten sind deaktiviert:",unavailable:"Folgende Entitäten sind nicht verfügbar:"},favorite:{title:"Favorit",title_plural:"Favoriten",all_favorites:"Alle Favoriten"},home:{title:"Home"},area:{title:"Bereich",title_plural:"Bereiche",edit_area_button:"Schaltfläche Bearbeite Bereiche",group_by_floor:"Gruppierung nach Etage",ungroup_by_floor:"Gruppierung nach Etage aufheben",icon:"Icon des Bereichs",floor:"Etage",no_floor:"Keine Etagen",disable:"Deaktiviere Bereich in DD",disabled:"Folgende Bereiche sind deaktiviert:",enable:"Aktiviere Bereich"},device:{title:"Gerät",title_plural:"Geräte",edit_device_button:"Schaltfläche Geräte bearbeiten",edit_device_card:"Nutze benutzerdefinierte Entität-Karte für Domäne ",edit_device_popup:"Nutze benutzerdefinierte Pop-Up-Karte der Domäne ",current_blueprint_card:"Derzeitige Nutzung des Blueprints für alle Entität-Karten der Domäne ",current_blueprint_popup:"Derzeitige Nutzung des Blueprints für alle Entität-Pop-Up-Karten der Domäne ",icon_required:"Es muss ein Icon gewählt werden, um dies der Navigationsleiste hinzuzufügen!",icon:"Icon des Geräts",show_in_navbar:"Füge Geräte Seite der Navigationsleiste hinzu.",hide:"Blende Geräteübersicht aus",unhide:"Blende Geräteübersicht ein",hidden:"Folgende Geräteübersichten sind ausgeblendet",see_all:"Zeige Alle",turn_all_off:"Schalte alle aus",on:"an",open:"offen",cover:"Beschattung",light:"Licht",climate:"Klima",sensor:"Sensor",binary_sensor:"Binärer Sensor",media_player:"Medien",remote:"Fernbedienung",scene:"Szene",number:"Nummer",switch:"Schalter",button:"Schaltfläche",water_heater:"Warmwassererzeuger",camera:"Kamera",select:"Auswahl",vacuum:"Staubsauger",fan:"Lüfter",door:"Tür",window:"Fenster",vibration:"Vibration",motion:"Bewegung",device_tracker:"Geräte-Tracker",lock:"Schloss",input_boolean:"Input Boolean",weather:"Wetter",moisture:"Feuchtigkeit",input_select:"Input Select",carbon_monoxide:"Kohlenstoffmonoxid",gas:"Gas",problem:"Problem",safety:"Sicherheit",smoke:"Rauch",tamper:"Manipulation",update:"Update",person:"Person",alarm_control_panel:"Alarmanlage",automation:"Automation",group:"Gruppierung nach Bereichen",ungroup:"Gruppierung nach Bereichen aufheben"},more:{title:"Weitere",title_plural:"Weitere Seiten",pages:"Seiten",create:"Erstelle neue Weitere Seite",edit:"Bearbeite Weitere Seite",name_required:"Wähle einen Namen für die Seite",icon_required:"Es muss ein Icon gewählt werden, um dies der Navigationsleiste hinzuzufügen!",add_navbar:"Füge die Weitere Seite zu Navigationsleiste hinzu",name:"Name der Weiteren Seite",icon:"Icon der Weiteren Seite"},blueprint:{title:"Blueprint",title_plural:"Blueprints",yaml_required:"Kein YAML Code eingegeben!",installed:"Installiert",no_blueprints_installed:"Keine Blueprints installiert",not_installed:"Nicht installiert",installed_blueprints:"Installierte Blueprints",type:"Typ des Blueprints",used_custom_cards:"Verwendete benutzerdefinierte Karten",use:"Verwende diesen Blueprint",install:"Installiere Blueprint",yaml_code:"Blueprint YAML Code",instruction:"Suche im Dwains Dashboard Community Blueprints Github nach dem Blueprint die installiert werden soll und füge den   YAML Code unten ein. Nach erfolgreicher Installation wird die Seite neugeladen. Danach kann der Blueprint genutzt werden."}},pt:{global:{dwains_dashboard_settings:"Configurações do painel Dwains",enable_edit_mode:"Ativar o modo de edição",disable_edit_mode:"Desabilitar o modo de edição",version:"Versão",disable_clock:"Desativar relógio",am_pm_clock:"AM/PM clock",disable_welcome_message:"Desativar mensagem de boas vindas",settings:"Configurações globais",dashboard_information:"Informações do painel",alarm_entity:"Entidade de alarme",weather_entity:"Entidade meteorológica",greeting_morning:"Bom dia",greeting_afternoon:"Boa tarde",greeting_evening:"Boa noite",v2_mode:"Enable Dwains Dashboard v2 mode (layout)",disable_sensor_graph:"Desativar a exibição do sensor como gráfico"},editor:{lovelace_card:"Cartão Lovelace",create_lovelace_card:"Crie um novo cartão lovelace do zero",dwains_dashboard_blueprint:"Planta do painel Dwains ",use_dwains_dashboard_blueprint:"Use uma planta do painel Dwains para criar um cartão",row_span:"Expansão de linha",row:"Linha",rows:"Linhas",col_span:"Extensão da coluna",column:"Coluna",columns:"Colunas",default_col_row:"Tamanho padrão de coluna e linha",large_col_row:"Tamanho de coluna e linha de tela grande",extra_large_col_row:"Tamanho de coluna e linha de tela extra grande"},entity:{title:"Entidade",title_plural:"Entidades",add_card_to:"Adicionar cartão a ",edit_entity:"Editar entidade",edit_entity_card:"Editar cartão de entidade",edit_entity_popup_card:"Editar cartão pop-up de entidade",add_to_favorites:"Adicionar aos favoritos",remove_from_favorites:"Remover dos favoritos",popup_card:"Cartão pop-up",entity_card:"Cartão de entidade",settings:"Configurações da entidade",group:"Agrupar por dispositivos",ungroup:"Desagrupar por dispositivos",enable:"Ativar entidade",disable:"Desativar entidade no DD",disable_all:"Disable all entities",hide_all:"Hide all entities",exclude:"Exclude entity in DD",hide:"Ocultar entidade no DD",unhide:"Reexibir entidade",use_popup_card:"Use o próprio cartão pop-up",use_entity_card:"Use o próprio cartão de entidade",friendly_name:"Renomear para DD",hidden:"As seguintes entidades estão ocultas:",disabled:"As seguintes entidades estão desabilitadas:",unavailable:"As seguintes entidades estão indisponíveis:"},favorite:{title:"Favorito",title_plural:"Favoritos",all_favorites:"Todos os favoritos"},home:{title:"Inicio"},area:{title:"Divisão",title_plural:"Divisões",edit_area_button:"Botão Editar divisão",group_by_floor:"Agrupar por andar",ungroup_by_floor:"Desagrupar por andar",icon:"Ícone da divisão",floor:"Piso da divisão",no_floor:"Sem piso",disable:"Disable area in DD",disabled:"The following areas are disabled:",enable:"Enable area"},device:{title:"Dispositivo",title_plural:"Dispositivos",edit_device_button:"Botão Editar dispositivo",edit_device_card:"Definir cartão de entidades personalizadas para domínio ",edit_device_popup:"Definir pop-up de entidades personalizadas para o domínio",current_blueprint_card:"Você está usando o seguinte esquema para todos os cartões de entidades no domínio",current_blueprint_popup:"Você está usando o seguinte esquema para todos os pop-ups de entidades no domínio",icon_required:"Se você quiser adicioná-lo à barra de navegação, você deve selecionar um ícone!",icon:"Ícone do dispositivo",show_in_navbar:"Adicionar página do dispositivo na barra de navegação principal",hide:"Hide device overview",unhide:"Unhide device overview",hidden:"The following device overviews are hidden",see_all:"Ver tudo",turn_all_off:"Turn all off",on:"ligado",open:"aberto",cover:"Persiana",light:"Luz",climate:"Clima",sensor:"Sensor",binary_sensor:"Sensor binário",media_player:"Reprodutor de mídia",remote:"Controlo remoto",scene:"Cena",number:"Número",switch:"Interruptor",button:"Botão",water_heater:"Aquecedor de água",camera:"Camera",select:"Select",vacuum:"Aspirador",fan:"Ventoinha",door:"Porta",window:"Janela",vibration:"Vibração",motion:"Movimento",device_tracker:"Rastreador de dispositivo",lock:"Fechadura",input_boolean:"Booleano de entrada",weather:"Clima",moisture:"Umidade",input_select:"Seleção de entrada",carbon_monoxide:"Monóxido de carbono",gas:"Gás",problem:"Problema",safety:"Segurança",smoke:"Fumo",tamper:"Adulterar",update:"Update"},more:{title:"Mais",title_plural:"Páginas adicionais",pages:"Páginas",create:"Criar mais uma página",edit:"Editar página adicional",name_required:"Você deve especificar um nome para a página",icon_required:"Se você quiser adicioná-lo à barra de navegação, você deve selecionar um ícone!",add_navbar:"Adicione mais esta página na barra de navegação principal",name:"Nome da página adicional",icon:"Ícone da página adicional"},blueprint:{title:"Esquema",title_plural:"Esquemas",yaml_required:"Nenhum código YAML inserido!",installed:"Instalado",no_blueprints_installed:"Nenhum esquema instalada",not_installed:"Não instalado",installed_blueprints:"Esquemas instalados",type:"Tipo de esquema",used_custom_cards:"Cartões personalizados usados",use:"Use este esquema",install:"Instalar esquema",yaml_code:"Código YAML do esquema",instruction:"Procure o esquema que deseja instalar em Dwains Dashboard Community Blueprints Github e cole o código yaml do mesmo abaixo. Após a instalação bem sucedida, o lovelace e esta página serão recarregadas. Então você pode usar o esquema instalado."}},sv:{global:{dwains_dashboard_settings:"Dwains Dashboardinställningar",enable_edit_mode:"Aktivera redigeringsläge",disable_edit_mode:"Inaktivera redigeringsläge",version:"Version",disable_clock:"Inaktivera klocka",am_pm_clock:"AM/PM clock",disable_welcome_message:"Inaktivera välkomstmeddelande",settings:"Globala inställningar",dashboard_information:"Dashboardinformation",alarm_entity:"Larmentitet",weather_entity:"Väderentitet",greeting_morning:"God morgon",greeting_afternoon:"God middag",greeting_evening:"God kväll",v2_mode:"Aktivera Dwains Dashboard v2-läge (layout)",disable_sensor_graph:"Inaktivera visning av sensor som graf"},editor:{lovelace_card:"Lovelacekort",create_lovelace_card:"Skapa ett nytt lovelacekort från början",dwains_dashboard_blueprint:"Dwains Dashboard-blueprint",use_dwains_dashboard_blueprint:"Använd en Dwains Dashboard-blueprint för att skapa ett kort",row_span:"Radspann",row:"Rad",rows:"Rader",col_span:"Kolumnspann",column:"Kolumn",columns:"Kolumner",default_col_row:"Standardkolumn- och radstorlek",large_col_row:"Kolumn- och radstorlek för stora skärmar",extra_large_col_row:"Kolumn- och radstorlek för extra stora skärmar"},entity:{title:"Entitet",title_plural:"entiteter",add_card_to:"Lägg till kort till ",edit_entity:"Redigera entitet",edit_entity_card:"Redigera entitetskort",edit_entity_popup_card:"Redigera entitets-pop up-kort",add_to_favorites:"Lägg till i favoriter",remove_from_favorites:"Ta bort från favoriter",popup_card:"Pop up-kort",entity_card:"Entitetskort",settings:"Entitetsinställningar",group:"Gruppera efter enheter",ungroup:"Avgruppera efter enheter",enable:"Aktivera entitet",disable:"Inaktivera entitet i DD",disable_all:"Inaktivera alla entiteter",hide_all:"Göm alla entiteter",exclude:"Exkludera entitet i DD",hide:"Dölj entitet i DD",unhide:"Ta fram entitet",use_popup_card:"Använd eget pop up-kort",use_entity_card:"Använd eget entitetskort",friendly_name:"Byt namn för DD",hidden:"Följande entiteter är dolda:",disabled:"Följande entiteter är inaktiverade:",unavailable:"Följande entiteter är otillgängliga:"},favorite:{title:"Favorit",title_plural:"Favoriter",all_favorites:"Alla favoriter"},home:{title:"Hem"},area:{title:"Område",title_plural:"Områden",edit_area_button:"Redigera områdesknapp",group_by_floor:"Gruppera efter våningsplan",ungroup_by_floor:"Avgruppera efter våningsplan",icon:"Områdesikon",floor:"Våningsplan",no_floor:"Inget våningsplan",disable:"Inaktivera område i DD",disabled:"Följande områden är inaktiverade:",enable:"Aktivera område"},device:{title:"Enhet",title_plural:"enheter",edit_device_button:"Redigera enhetsknapp",edit_device_card:"Ställ in anpassade entitetskort för domän ",edit_device_popup:"Ställ in anpassade entitetspopups för domän ",current_blueprint_card:"Du använder för närvarande följande blueprint för alla entitetskort i domänen ",current_blueprint_popup:"Du använder för närvarande följande blueprint för alla entitetspopups i domänen ",icon_required:"Om du vill lägga till den till navigationslisten måste du välja en ikon!",icon:"Enhetsikon",show_in_navbar:"Lägg till enhetssida till huvudnavigationslisten",hide:"Dölj enhetsöversikt",unhide:"Ta fram enhetsöversikt",hidden:"Följande enhetsöversikter är dolda",see_all:"Se alla",turn_all_off:"Stäng av alla",on:"på",open:"öppen",cover:"Skydd",light:"Belysning",climate:"Klimat",sensor:"Sensorer",binary_sensor:"Binära sensorer",media_player:"Mediaspelare",remote:"Fjärrkontroll",scene:"Scener",number:"Nivåer",switch:"Kontakter",button:"Knappar",water_heater:"Varmvattenberedare",camera:"Kameror",select:"Flervalslistor",vacuum:"Dammsugare",fan:"Fläktar",door:"Dörr",window:"Fönster",vibration:"Vibration",motion:"Rörelse",device_tracker:"Enhetsspårare",lock:"Lås",input_boolean:"Växlare",weather:"Väder",moisture:"Fuktighet",input_select:"Inmatningsval",carbon_monoxide:"Kolmonoxid",gas:"Gas",problem:"Problem",safety:"Säkerhet",smoke:"Rök",tamper:"Manipulation",update:"Uppdatera",person:"Person",alarm_control_panel:"Larmkontrollpanel",automation:"Automation",group:"Gruppera efter områden",ungroup:"Avgruppera efter områden"},more:{title:"Mer",title_plural:"Mersidor",pages:"sidor",create:"Skapa ny mersida",edit:"Redigera mersida",name_required:"Du måste ange ett namn för sidan",icon_required:"Om du vill lägga till den till navigationslisten måste du välja en ikon!",add_navbar:"Lägg till denna mersida till huvudnavigationslisten",name:"Namn på mersida",icon:"Ikon för mersida"},blueprint:{title:"Blueprint",title_plural:"Blueprints",yaml_required:"Ingen YAML-kod inmatad!",installed:"Installerad",no_blueprints_installed:"Inga blueprints installerade",not_installed:"Inte installerad",installed_blueprints:"Installerade blueprints",type:"Typ av blueprint",used_custom_cards:"Använda skräddarsydda kort",use:"Använd denna blueprint",install:"Installera blueprint",yaml_code:"Blueprint YAML-kod",instruction:"Leta upp den blueprint du vill installera på Dwains Dashboard Community Blueprints Github och klistra in blueprintens YAML-kod nedanför. Efter en lyckad installation kommer lovelace och denna sida att laddas om. Du kan sedan använda den installerade blueprinten."}},it:{global:{dwains_dashboard_settings:"Dwains Dashboard Impostazioni",enable_edit_mode:"Abilita la modalità di modifica",disable_edit_mode:"Disabilita la modalità di modifica",version:"Versione",disable_clock:"Disattiva orologio",am_pm_clock:"AM/PM clock",disable_welcome_message:"Disabilita il messaggio di Benvenuto",settings:"Impostazioni Globali",dashboard_information:"Inpostazioni Dashboard",alarm_entity:"Entità di allarme",weather_entity:"Entità meteorologica",greeting_morning:"Buon giorno",greeting_afternoon:"Buon pomeriggio",greeting_evening:"Buona serata",v2_mode:"Enable Dwains Dashboard v2 mode (layout)",disable_sensor_graph:"Disattiva la visualizzazione del sensore come grafico"},editor:{lovelace_card:"Lovelace Card",create_lovelace_card:"Crea una nuova card lovelace da zero",dwains_dashboard_blueprint:"Dwains Dashboard Blueprint",use_dwains_dashboard_blueprint:"Usa Dwain Dashboard Blueprint per creare una carta",row_span:"Intervallo di riga",row:"Riga",rows:"Righe",col_span:"Col span",column:"Colonna",columns:"Colonne",default_col_row:"Colore predefinito e dimensione della riga",large_col_row:"Dimensione colonna e riga a schermo grande",extra_large_col_row:"Dimensione colonna e riga a schermo intero"},entity:{title:"Entità",title_plural:"entità",add_card_to:"Aggiungi carta a",edit_entity:"Modifica entità",edit_entity_card:"Modifica scheda entità",edit_entity_popup_card:"Modifica scheda popup entità",add_to_favorites:"Aggiungi ai preferiti",remove_from_favorites:"Rimuovi dai preferiti",popup_card:"Scheda popup",entity_card:"Entità card",settings:"Entità Impostazioni",group:"Raggruppa per dispositivi",ungroup:"Separa per dispositivi",enable:"Abilita entità",disable:"Disabilita entità in DD",disable_all:"Disable all entities",hide_all:"Hide all entities",exclude:"Exclude entity in DD",hide:"Nascondi entità in DD",unhide:"Mostra entità",use_popup_card:"Usa la tua scheda popup",use_entity_card:"Usa la entity card",friendly_name:"Rinomina per DD",hidden:"Le seguenti entità sono nascoste:",disabled:"Le seguenti entità sono disabilitate:",unavailable:"Le seguenti entità non sono disponibili:"},favorite:{title:"Preferito",title_plural:"Preferiti",all_favorites:"Tutti i preferiti"},home:{title:"Home"},area:{title:"Zona",title_plural:"Zone",edit_area_button:"Modifica pulsante area",group_by_floor:"Raggruppa per piano",ungroup_by_floor:"Separa per piano",icon:"Icona della zona",floor:"Piano della zona",no_floor:"Nessun pavimento",disable:"Disable area in DD",disabled:"The following areas are disabled:",enable:"Enable area"},device:{title:"Dispositivo",title_plural:"Dispositivi",edit_device_button:"Pulsante Modifica dispositivo",edit_device_card:"Imposta la scheda entità personalizzate per il dominio ",edit_device_popup:"Imposta il popup di entità personalizzate per il dominio ",current_blueprint_card:"Attualmente stai utilizzando il seguente progetto per tutte le schede entità nel dominio ",current_blueprint_popup:"Attualmente stai utilizzando il seguente blueprint per tutti i popup di entità nel dominio ",icon_required:"Se vuoi aggiungerlo alla barra di navigazione devi selezionare una icona!",icon:"Icona del dispositivo",show_in_navbar:"Aggiungi la pagina del dispositivo nella barra di navigazione principale",hide:"Hide device overview",unhide:"Unhide device overview",hidden:"The following device overviews are hidden",see_all:"Vedi tutto",turn_all_off:"Turn all off",on:"su",open:"aprire",cover:"Coperchio",light:"Luce",climate:"Clima",sensor:"Sensore",binary_sensor:"Sensore binario",media_player:"Media player",remote:"A Distanza",scene:"Scena",number:"Numero",switch:"Interruttore",button:"Bottone",water_heater:"Scaldabagno",camera:"Camera",select:"Selezionato",vacuum:"Aspirapolvere",fan:"Ventilatore",door:"Porta",window:"Finestra",vibration:"Vibrazione",motion:"Movimento",device_tracker:"Localizzatore di dispositivi",lock:"Serratura",input_boolean:"Input booleano",weather:"Condizioni meteo",moisture:"Umidità",input_select:"Seleziona input",carbon_monoxide:"Monossido di carbonio",gas:"Gas",problem:"Problema",safety:"Sicurezza",smoke:"Fumo",tamper:"Manomettere",update:"Aggiornare",person:"Persona",alarm_control_panel:"Pannello di controllo allarme",automation:"Automation",group:"Group by areas",ungroup:"Ungroup by areas"},more:{title:"Di più",title_plural:"Più pagine",pages:"pagine",create:"Crea una nuova pagina",edit:"Modifica più pagina",name_required:"È necessario specificare un nome per la pagina",icon_required:"Se vuoi aggiungerlo alla barra di navigazione devi selezionare una icona!",add_navbar:"Aggiungi questa pagina in più nella barra di navigazione principale",name:"Altro nome di pagina",icon:"Icona della pagina più"},blueprint:{title:"Blueprint",title_plural:"Blueprints",yaml_required:"Nessun codice YAML inserito!",installed:"Installato",no_blueprints_installed:"Nessun blueprints installato",not_installed:"Non installato",installed_blueprints:"Blueprints Installati",type:"Tipo blueprint",used_custom_cards:"Carte personalizzate usate",use:"Usa questo blueprint",install:"installa blueprint",yaml_code:"Blueprint YAML code",instruction:"Cerca il progetto che desideri installare in Dwains Dashboard Community Blueprints Github e incolla il codice yaml del progetto di seguito. Dopo una corretta installazione, lovelace e questa pagina si ricaricherà. Quindi puoi utilizzare il progetto installato."}},es:{global:{dwains_dashboard_settings:"Opciones de Dwains Dashboard",enable_edit_mode:"Habilitar modo edición",disable_edit_mode:"Deshabilitar modo edición",version:"Version",disable_clock:"Desactivar reloj",am_pm_clock:"AM/PM clock",disable_welcome_message:"Desabilitar mensaje de bienvenida",settings:"Configuración global",dashboard_information:"información del Dashboard",alarm_entity:"Entidad alarma",weather_entity:"Entidad tiempo",greeting_morning:"Buenos días",greeting_afternoon:"Buenas tardes",greeting_evening:"Buenas noches",v2_mode:"Enable Dwains Dashboard v2 mode (layout)",disable_sensor_graph:"Desactivar la visualización del sensor como gráfico"},editor:{lovelace_card:"Lovelace Card",create_lovelace_card:"Crea una nueva lovelace card desde cero",dwains_dashboard_blueprint:"Dwains Dashboard Blueprint",use_dwains_dashboard_blueprint:"Usar un Blueprint de Dwain Dashboard para crear una tarjeta",row_span:"Intervalo de filas",row:"Fila",rows:"Filas",col_span:"Intervalo de Columnas",column:"Columna",columns:"Columnas",default_col_row:"Tamaño predeterminado de columna y fila",large_col_row:"Tamaño de columna y fila grande",extra_large_col_row:"Tamaño de columna y fila extra grande"},entity:{title:"Entidad",title_plural:"Entidades",add_card_to:"Agregar tarjeta a ",edit_entity:"Editar entidad",edit_entity_card:"Editar tarjeta de entidad",edit_entity_popup_card:"Editar tarjeta emergente de entidad",add_to_favorites:"Agregar a favoritos",remove_from_favorites:"Quitar de favoritos",popup_card:"Tarjeta emergente",entity_card:"Tarjeta de entidad",settings:"Configuración de entidad",group:"Agrupar por dispositivos",ungroup:"Desagrupar por dispositivos",enable:"Habilitar entidad",disable:"Deshabilitar entidad en DD",disable_all:"Disable all entities",hide_all:"Hide all entities",exclude:"Exclude entity in DD",hide:"Ocultar entidad en DD",unhide:"Mostrar entidad",use_popup_card:"Utilizar su propia tarjeta emergente",use_entity_card:"Utilice su propia tarjeta de entidad",friendly_name:"Renombrar en DD",hidden:"Las siguientes entidades están ocultas:",disabled:"Las siguientes entidades estan deshabilitadas:",unavailable:"Las siguientes entidades no están disponibles:"},favorite:{title:"Favorito",title_plural:"Favoritos",all_favorites:"Todos los favoritos"},home:{title:"Home"},area:{title:"Habitación",title_plural:"Habitaciónes",edit_area_button:"Editar Habitación",group_by_floor:"Agrupar por piso",ungroup_by_floor:"Desagrupar por piso",icon:"Icono de Habitación",floor:"Piso de Habitación",no_floor:"Sin piso",disable:"Disable area in DD",disabled:"The following areas are disabled:",enable:"Enable area"},device:{title:"Dispositivo",title_plural:"Dispositivos",edit_device_button:"Editar dispositivo",edit_device_card:"Establecer tarjeta de entidades personalizadas para el dominio ",edit_device_popup:"Establecer una ventana emergente de entidades personalizadas para el dominio",current_blueprint_card:"Actualmente está utilizando el siguiente modelo para todas las tarjetas de entidades en el dominio",current_blueprint_popup:"Actualmente está utilizando el siguiente modelo para todas las ventanas emergentes de entidades en el dominio",icon_required:"Si desea agregarlo a la barra de navegación, debe seleccionar un icono.",icon:"Icono de dispositivo",show_in_navbar:"Agregar página de dispositivo en la barra de navegación principal",hide:"Hide device overview",unhide:"Unhide device overview",hidden:"The following device overviews are hidden",see_all:"Ver todos",turn_all_off:"Turn all off",on:"on",open:"Abierto",cover:"Cover",light:"Luz",climate:"Clima",sensor:"Sensor",binary_sensor:"Sensor binario",media_player:"Reproductor multimedia",remote:"Control remoto",scene:"Escena",number:"Número",switch:"Interruptor",button:"Botón",water_heater:"Calentador de agua",camera:"Cámara",select:"seleccione",vacuum:"Aspiradora",fan:"Ventilador",door:"Puerta",window:"Ventana",vibration:"Vibración",motion:"Movimiento",device_tracker:"Rastreador de dispositivo",lock:"Bloquear",input_boolean:"Entrada booleana",weather:"Clima",moisture:"Humedad",input_select:"Selección de entrada",carbon_monoxide:"Monoxido de carbono",gas:"Gas",problem:"Problema",safety:"Seguridad",smoke:"Humo",tamper:"Manipular",update:"Actualizar",person:"Persona",alarm_control_panel:"Panel de control de Alarma",automation:"Automation",group:"Group by areas",ungroup:"Ungroup by areas"},more:{title:"Más",title_plural:"Páginas extra ",pages:"páginas",create:"Crear nueva página extra",edit:"Editar página extra",name_required:"Debe especificar un nombre para la página.",icon_required:"Si desea agregarla a la barra de navegación, debe seleccionar un icono.",add_navbar:"Agregar esta página extra en la barra de navegación principal",name:"Nombre de la página extra",icon:"Icono de la página extra"},blueprint:{title:"Blueprint",title_plural:"Blueprints",yaml_required:"¡No se ingresó ningún código YAML!",installed:"Instalado",no_blueprints_installed:"No hay blueprints instalados",not_installed:"No instalado",installed_blueprints:"Blueprints instalados",type:"Tipo de blueprint",used_custom_cards:"Tarjetas personalizadas usadas",use:"Usar este blueprint",install:"Instalar blueprint",yaml_code:"Blueprint código YAML",instruction:"Busque el blueprint que desea instalar en Dwains Dashboard Community Blueprints Github y pegue el código yaml del blueprint a continuación. Después de una instalación exitosa, lovelace y esta página se volverá a cargar. Entonces podrás usar el plano instalado."}},pl:{global:{dwains_dashboard_settings:"Ustawenia Dwains Dashboard",enable_edit_mode:"Edytuj",disable_edit_mode:"Wyłącz edycję",version:"Wersja",disable_clock:"Wyłącz zegar",am_pm_clock:"AM/PM clock",disable_welcome_message:"Wyłącz wiadomość powitalną",settings:"Ustawienia ogólne",dashboard_information:"Informacje o Dashboard",alarm_entity:"Encja alarmu",weather_entity:"Encja pogody",greeting_morning:"Dzień Dobry",greeting_afternoon:"Miłego popołudnia",greeting_evening:"Dobry wieczór",v2_mode:"Włącz tryb Dwains Dashboard v2 (wygląd)",disable_sensor_graph:"Wyłącz wyświetlanie czujnika jako wykresu"},editor:{lovelace_card:"Karta Lovelace",create_lovelace_card:"Utwórz nową kartę Lovelace",dwains_dashboard_blueprint:"Schemat Dwains Dashboard",use_dwains_dashboard_blueprint:"Użyj schematu Dwains Dashboard do stworzenia karty",row_span:"Szerokość wierszy",row:"Wiersz",rows:"Wiersze",col_span:"Szerokość kolumn",column:"Kolumna",columns:"Kolumny",default_col_row:"Domyślna szerokość kolumn i wierszy",large_col_row:"Duży ekran - szerokość kolumn i wierszy",extra_large_col_row:"Wielki ekran - szerokość kolumn i wierszy"},entity:{title:"Encja",title_plural:"Encje",add_card_to:"Dodaj kartę do: ",edit_entity:"Edytuj encję",edit_entity_card:"Edytuj kartę encji",edit_entity_popup_card:"Edytuj wyskakującą kartę",add_to_favorites:"Dodaj do Ulubionych",remove_from_favorites:"Usuń z Ulubionych",popup_card:"Wyskakująca karta",entity_card:"Karta encji",settings:"Ustawienia encji",group:"Grupuj według urządzeń",ungroup:"Rozgrupuj według urządzeń",enable:"Włącz encję",disable:"Wyłącz encję w DD",disable_all:"Wyłącz wszystkie encje",hide_all:"Ukryj wszystkie encje",exclude:"Wyłącz encje w DD",hide:"Ukryj encje w DD",unhide:"Odkryj encje",use_popup_card:"Użyj własnej wyskakującej karty",use_entity_card:"Użyj własnej karty encji",friendly_name:"Przyjazna nazwa DD:",hidden:"Ukryte encje:",disabled:"Wyłączone encje:",unavailable:"Niedostępne encje:"},favorite:{title:"Ulubione",title_plural:"Ulubione",all_favorites:"Wszystkie Ulubione"},home:{title:"Strona główna"},area:{title:"Obszar",title_plural:"Obszary",edit_area_button:"Edytuj przycisk obszaru",group_by_floor:"Grupuj według pięter",ungroup_by_floor:"Rozgrupuj według pięter",icon:"Ikony obszarów",floor:"Obszar pięter",no_floor:"Brak pięter",disable:"Wyłącz obszar",disabled:"Obszary wyłączone:",enable:"Włącz obszar"},device:{title:"Urządzenie",title_plural:"Urządzenia",edit_device_button:"Edytuj przycisk urządzenia",edit_device_card:"Edytuj własną encję karty dla domeny",edit_device_popup:"Edytuj własną wyskakującą encję dla domeny",current_blueprint_card:"Obecnie używany schemat dla wszystkich encji w domenie: ",current_blueprint_popup:"Obecnie używany schemat dla wszystkich wyskakujących encji w domenie: ",icon_required:"Jeśli chcesz dodać urządzenie do paska nawigacyjnego, wybierz jego ikonę!",icon:"Ikony urządzeń:",show_in_navbar:"Pokaż urządzenie w pasku nawigacyjnym",hide:"Ukryj przegląd urządzeń",unhide:"Pokaż przegląd urządzeń",hidden:"Urządzenia ukryte:",see_all:"Zobacz wszystkie",turn_all_off:"Wyłącz wszystkie",on:"Włączony",open:"Otwarty",cover:"Roleta",light:"Światło",climate:"Termostat",sensor:"Sensor",binary_sensor:"Sensor binarny",media_player:"Odtwarzacz multimediów",remote:"Zdalny",scene:"Scena",number:"Liczba",switch:"Przełącznik",button:"Przycisk",water_heater:"Podgrzewacz wody",camera:"Kamera",select:"Wybierz",vacuum:"Odkurzacz",fan:"Wentylator",door:"Drzwi",window:"Okno",vibration:"Wibracja",motion:"Ruch",device_tracker:"Śledzenie urządzeń",lock:"Zamek",input_boolean:"Wybór przełącznika",weather:"Pogoda",moisture:"Wilgoć",input_select:"Wybór wejścia",carbon_monoxide:"Tlenek węgla",gas:"Gaz",problem:"Problem",safety:"Bezpieczeństwo",smoke:"Dym",tamper:"Sabotaż",update:"Aktualizacja",person:"Osoba",alarm_control_panel:"Panel alarmu",automation:"Automatyka",group:"Grupuj wg obszarów",ungroup:"Rozgrupuj wg obszarów"},more:{title:"Więcej",title_plural:"Więcej stron",pages:"Strony",create:"Utwórz więcej nowych stron",edit:"Edytuj więcej stron",name_required:"Podaj nazwę strony:",icon_required:"Jeśli chcesz dodać stronę do paska nawigacyjnego, wybierz jej ikonę!",add_navbar:"Dodaj tę stronę do paska nawigacyjnego",name:"Więcej nazw stron",icon:"Więcej ikon strony"},blueprint:{title:"Schemat",title_plural:"Schematy",yaml_required:"Nie wprowadzono kodu YAML!",installed:"Zainstalowane",no_blueprints_installed:"Brak zainstalowanego schematu",not_installed:"Nie zainstalowano",installed_blueprints:"Zainstalowane schematy:",type:"Typ schematu",used_custom_cards:"Używane karty niestandardowe:",use:"Użyj tego schematu",install:"Zainstaluj schemat",yaml_code:"Kod YAML schematu",instruction:"Odszukaj żądany schemat na Dwains Dashboard Community Blueprints Github i wklej kod YAML. Po instalacji lovelace strona zostanie ponownie załadowana abyś mógł użyć zainstalowanego schematu. "}}},n=(e,t)=>t.split(".").reduce(((e,t)=>e&&e[t]||null),e),o=(e,t,i=void 0,o="unknown")=>{const s=e.selectedLanguage||e.language||e.locale&&e.locale.language||"en",r=s.split("-")[0];return a[s]&&n(a[s],t)||e.resources&&e.resources[s]&&e.resources[s][i]||a[r]&&n(a[r],t)||n(a.en,t)||o}},969:(e,t,i)=>{"use strict";i.d(t,{K5:()=>d,My:()=>a,R9:()=>p,SG:()=>f,Su:()=>g,TC:()=>n,Ti:()=>l,Xt:()=>r,Zz:()=>c,gJ:()=>u,ge:()=>h,jj:()=>o,qJ:()=>m,s7:()=>s});const a={"clear-night":"mdi:weather-night",cloudy:"mdi:weather-cloudy",overcast:"mdi:weather-cloudy-arrow-right",fog:"mdi:weather-fog",hail:"mdi:weather-hail",lightning:"mdi:weather-lightning","lightning-rainy":"mdi:weather-lightning-rainy",partlycloudy:"mdi:weather-partly-cloudy",pouring:"mdi:weather-pouring",rainy:"mdi:weather-rainy",snowy:"mdi:weather-snowy","snowy-rainy":"mdi:weather-snowy-rainy",sunny:"mdi:weather-sunny",windy:"mdi:weather-windy","windy-variant":"mdi:weather-windy-variant"},n={armed_away:"mdi:shield-lock",armed_vacation:"mdi:shield-airplane",armed_home:"mdi:shield-home",armed_night:"mdi:shield-moon",armed_custom_bypass:"mdi:security",pending:"mdi:shield-outline",triggered:"mdi:bell-ring",disarmed:"mdi:shield-off"},o=["closed","locked","off","docked","idle","standby","paused","auto"],s=["unavailable","unknown"],r=["sensor"],l=["binary_sensor"],d=["cover"],c=["light","switch","fan"],h=["climate"],p=["vacuum","media_player","lock"],u={sensor:["temperature","humidity"],binary_sensor:["motion","door","window","vibration","moisture","smoke","running"],cover:["garage","shutter"]},m={light:{on:"mdi:lightbulb",off:"mdi:lightbulb-outline"},switch:{on:"mdi:power-plug",off:"mdi:power-plug"},fan:{on:"mdi:fan",off:"mdi:fan-off"},sensor:{humidity:"mdi:water-percent",temperature:"mdi:thermometer"},binary_sensor:{motion:"mdi:motion-sensor",door:"mdi:door-open",window:"mdi:window-open-variant",vibration:"mdi:vibrate",moisture:"mdi:water-alert",smoke:"mdi:smoke-detector-variant-alert",running:"mdi:smoke-detector-outline"},cover:{garage:"mdi:garage",shutter:"mdi:window-shutter"},vacuum:{on:"mdi:robot-vacuum"},media_player:{on:"mdi:cast-connected"},lock:{on:"mdi:lock-open"},climate:{on:"mdi:thermostat"}},g={light:"mdi:lightbulb",climate:"mdi:thermostat",switch:"mdi:power-plug",fan:"mdi:fan",sensor:"mdi:eye",humidity:"mdi:water-percent",temperature:"mdi:thermometer",binary_sensor:"mdi:radiobox-blank",motion:"mdi:motion-sensor",door:"mdi:door-open",window:"mdi:window-open-variant",vibration:"mdi:vibrate",moisture:"mdi:water-alert",vacuum:"mdi:robot-vacuum",media_player:"mdi:cast-connected",camera:"mdi:video",cover:"mdi:window-shutter",remote:"mdi:remote",scene:"mdi:palette",number:"mdi:ray-vertex",button:"mdi:gesture-tap-button",water_heater:"mdi:thermometer",select:"mdi:format-list-bulleted",lock:"mdi:lock",device_tracker:"mdi:radar",person:"mdi:account-multiple",weather:"mdi:weather-cloudy",automation:"mdi:robot-outline",alarm_control_panel:"mdi:shield-home",text:"mdi:format-text",event:"mdi:calendar-clock",update:"mdi:cloud-upload",script:"mdi:file-document-outline",time:"mdi:clock-outline",input_boolean:"mdi:toggle-switch",group:"mdi:account-group",input_datetime:"mdi:calendar-clock",tts:"mdi:volume-high",zone:"mdi:map-marker-radius"},f=["button","calendar","entity","gauge","history-graph","light","media-control","picture-entity","sensor","thermostat","weather-forecast","custom:button-card","custom:mushroom-fan-card","custom:mushroom-cover-card","custom:mushroom-entity-card","custom:mushroom-light-card"]},987:(e,t,i)=>{"use strict";function a(e){for(var t=1;t<arguments.length;t++){var i=arguments[t];for(var a in i)e[a]=i[a]}return e}i.d(t,{A:()=>n});var n=function e(t,i){function n(e,n,o){if("undefined"!=typeof document){"number"==typeof(o=a({},i,o)).expires&&(o.expires=new Date(Date.now()+864e5*o.expires)),o.expires&&(o.expires=o.expires.toUTCString()),e=encodeURIComponent(e).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape);var s="";for(var r in o)o[r]&&(s+="; "+r,!0!==o[r]&&(s+="="+o[r].split(";")[0]));return document.cookie=e+"="+t.write(n,e)+s}}return Object.create({set:n,get:function(e){if("undefined"!=typeof document&&(!arguments.length||e)){for(var i=document.cookie?document.cookie.split("; "):[],a={},n=0;n<i.length;n++){var o=i[n].split("="),s=o.slice(1).join("=");try{var r=decodeURIComponent(o[0]);if(a[r]=t.read(s,r),e===r)break}catch(e){}}return e?a[e]:a}},remove:function(e,t){n(e,"",a({},t,{expires:-1}))},withAttributes:function(t){return e(this.converter,a({},this.attributes,t))},withConverter:function(t){return e(a({},this.converter,t),this.attributes)}},{attributes:{value:Object.freeze(i)},converter:{value:Object.freeze(t)}})}({read:function(e){return'"'===e[0]&&(e=e.slice(1,-1)),e.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent)},write:function(e){return encodeURIComponent(e).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,decodeURIComponent)}},{path:"/"})},845:(e,t,i)=>{"use strict";i.d(t,{WF:()=>ae,AH:()=>te,qy:()=>L});const a="undefined"!=typeof window&&null!=window.customElements&&void 0!==window.customElements.polyfillWrapFlushCallback,n=(e,t,i=null)=>{for(;t!==i;){const i=t.nextSibling;e.removeChild(t),t=i}},o=`{{lit-${String(Math.random()).slice(2)}}}`,s=`\x3c!--${o}--\x3e`,r=new RegExp(`${o}|${s}`),l="$lit$";class d{constructor(e,t){this.parts=[],this.element=t;const i=[],a=[],n=document.createTreeWalker(t.content,133,null,!1);let s=0,d=-1,h=0;const{strings:m,values:{length:g}}=e;for(;h<g;){const e=n.nextNode();if(null!==e){if(d++,1===e.nodeType){if(e.hasAttributes()){const t=e.attributes,{length:i}=t;let a=0;for(let e=0;e<i;e++)c(t[e].name,l)&&a++;for(;a-- >0;){const t=m[h],i=u.exec(t)[2],a=i.toLowerCase()+l,n=e.getAttribute(a);e.removeAttribute(a);const o=n.split(r);this.parts.push({type:"attribute",index:d,name:i,strings:o}),h+=o.length-1}}"TEMPLATE"===e.tagName&&(a.push(e),n.currentNode=e.content)}else if(3===e.nodeType){const t=e.data;if(t.indexOf(o)>=0){const a=e.parentNode,n=t.split(r),o=n.length-1;for(let t=0;t<o;t++){let i,o=n[t];if(""===o)i=p();else{const e=u.exec(o);null!==e&&c(e[2],l)&&(o=o.slice(0,e.index)+e[1]+e[2].slice(0,-5)+e[3]),i=document.createTextNode(o)}a.insertBefore(i,e),this.parts.push({type:"node",index:++d})}""===n[o]?(a.insertBefore(p(),e),i.push(e)):e.data=n[o],h+=o}}else if(8===e.nodeType)if(e.data===o){const t=e.parentNode;null!==e.previousSibling&&d!==s||(d++,t.insertBefore(p(),e)),s=d,this.parts.push({type:"node",index:d}),null===e.nextSibling?e.data="":(i.push(e),d--),h++}else{let t=-1;for(;-1!==(t=e.data.indexOf(o,t+1));)this.parts.push({type:"node",index:-1}),h++}}else n.currentNode=a.pop()}for(const e of i)e.parentNode.removeChild(e)}}const c=(e,t)=>{const i=e.length-t.length;return i>=0&&e.slice(i)===t},h=e=>-1!==e.index,p=()=>document.createComment(""),u=/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;function m(e,t){const{element:{content:i},parts:a}=e,n=document.createTreeWalker(i,133,null,!1);let o=f(a),s=a[o],r=-1,l=0;const d=[];let c=null;for(;n.nextNode();){r++;const e=n.currentNode;for(e.previousSibling===c&&(c=null),t.has(e)&&(d.push(e),null===c&&(c=e)),null!==c&&l++;void 0!==s&&s.index===r;)s.index=null!==c?-1:s.index-l,o=f(a,o),s=a[o]}d.forEach((e=>e.parentNode.removeChild(e)))}const g=e=>{let t=11===e.nodeType?0:1;const i=document.createTreeWalker(e,133,null,!1);for(;i.nextNode();)t++;return t},f=(e,t=-1)=>{for(let i=t+1;i<e.length;i++){const t=e[i];if(h(t))return i}return-1},_=new WeakMap,b=e=>"function"==typeof e&&_.has(e),v={},y={};class w{constructor(e,t,i){this.__parts=[],this.template=e,this.processor=t,this.options=i}update(e){let t=0;for(const i of this.__parts)void 0!==i&&i.setValue(e[t]),t++;for(const e of this.__parts)void 0!==e&&e.commit()}_clone(){const e=a?this.template.element.content.cloneNode(!0):document.importNode(this.template.element.content,!0),t=[],i=this.template.parts,n=document.createTreeWalker(e,133,null,!1);let o,s=0,r=0,l=n.nextNode();for(;s<i.length;)if(o=i[s],h(o)){for(;r<o.index;)r++,"TEMPLATE"===l.nodeName&&(t.push(l),n.currentNode=l.content),null===(l=n.nextNode())&&(n.currentNode=t.pop(),l=n.nextNode());if("node"===o.type){const e=this.processor.handleTextExpression(this.options);e.insertAfterNode(l.previousSibling),this.__parts.push(e)}else this.__parts.push(...this.processor.handleAttributeExpressions(l,o.name,o.strings,this.options));s++}else this.__parts.push(void 0),s++;return a&&(document.adoptNode(e),customElements.upgrade(e)),e}}const x=window.trustedTypes&&trustedTypes.createPolicy("lit-html",{createHTML:e=>e}),$=` ${o} `;class k{constructor(e,t,i,a){this.strings=e,this.values=t,this.type=i,this.processor=a}getHTML(){const e=this.strings.length-1;let t="",i=!1;for(let a=0;a<e;a++){const e=this.strings[a],n=e.lastIndexOf("\x3c!--");i=(n>-1||i)&&-1===e.indexOf("--\x3e",n+1);const r=u.exec(e);t+=null===r?e+(i?$:s):e.substr(0,r.index)+r[1]+r[2]+l+r[3]+o}return t+=this.strings[e],t}getTemplateElement(){const e=document.createElement("template");let t=this.getHTML();return void 0!==x&&(t=x.createHTML(t)),e.innerHTML=t,e}}const C=e=>null===e||!("object"==typeof e||"function"==typeof e),S=e=>Array.isArray(e)||!(!e||!e[Symbol.iterator]);class E{constructor(e,t,i){this.dirty=!0,this.element=e,this.name=t,this.strings=i,this.parts=[];for(let e=0;e<i.length-1;e++)this.parts[e]=this._createPart()}_createPart(){return new A(this)}_getValue(){const e=this.strings,t=e.length-1,i=this.parts;if(1===t&&""===e[0]&&""===e[1]){const e=i[0].value;if("symbol"==typeof e)return String(e);if("string"==typeof e||!S(e))return e}let a="";for(let n=0;n<t;n++){a+=e[n];const t=i[n];if(void 0!==t){const e=t.value;if(C(e)||!S(e))a+="string"==typeof e?e:String(e);else for(const t of e)a+="string"==typeof t?t:String(t)}}return a+=e[t],a}commit(){this.dirty&&(this.dirty=!1,this.element.setAttribute(this.name,this._getValue()))}}class A{constructor(e){this.value=void 0,this.committer=e}setValue(e){e===v||C(e)&&e===this.value||(this.value=e,b(e)||(this.committer.dirty=!0))}commit(){for(;b(this.value);){const e=this.value;this.value=v,e(this)}this.value!==v&&this.committer.commit()}}class D{constructor(e){this.value=void 0,this.__pendingValue=void 0,this.options=e}appendInto(e){this.startNode=e.appendChild(p()),this.endNode=e.appendChild(p())}insertAfterNode(e){this.startNode=e,this.endNode=e.nextSibling}appendIntoPart(e){e.__insert(this.startNode=p()),e.__insert(this.endNode=p())}insertAfterPart(e){e.__insert(this.startNode=p()),this.endNode=e.endNode,e.endNode=this.startNode}setValue(e){this.__pendingValue=e}commit(){if(null===this.startNode.parentNode)return;for(;b(this.__pendingValue);){const e=this.__pendingValue;this.__pendingValue=v,e(this)}const e=this.__pendingValue;e!==v&&(C(e)?e!==this.value&&this.__commitText(e):e instanceof k?this.__commitTemplateResult(e):e instanceof Node?this.__commitNode(e):S(e)?this.__commitIterable(e):e===y?(this.value=y,this.clear()):this.__commitText(e))}__insert(e){this.endNode.parentNode.insertBefore(e,this.endNode)}__commitNode(e){this.value!==e&&(this.clear(),this.__insert(e),this.value=e)}__commitText(e){const t=this.startNode.nextSibling,i="string"==typeof(e=null==e?"":e)?e:String(e);t===this.endNode.previousSibling&&3===t.nodeType?t.data=i:this.__commitNode(document.createTextNode(i)),this.value=e}__commitTemplateResult(e){const t=this.options.templateFactory(e);if(this.value instanceof w&&this.value.template===t)this.value.update(e.values);else{const i=new w(t,e.processor,this.options),a=i._clone();i.update(e.values),this.__commitNode(a),this.value=i}}__commitIterable(e){Array.isArray(this.value)||(this.value=[],this.clear());const t=this.value;let i,a=0;for(const n of e)i=t[a],void 0===i&&(i=new D(this.options),t.push(i),0===a?i.appendIntoPart(this):i.insertAfterPart(t[a-1])),i.setValue(n),i.commit(),a++;a<t.length&&(t.length=a,this.clear(i&&i.endNode))}clear(e=this.startNode){n(this.startNode.parentNode,e.nextSibling,this.endNode)}}class T{constructor(e,t,i){if(this.value=void 0,this.__pendingValue=void 0,2!==i.length||""!==i[0]||""!==i[1])throw new Error("Boolean attributes can only contain a single expression");this.element=e,this.name=t,this.strings=i}setValue(e){this.__pendingValue=e}commit(){for(;b(this.__pendingValue);){const e=this.__pendingValue;this.__pendingValue=v,e(this)}if(this.__pendingValue===v)return;const e=!!this.__pendingValue;this.value!==e&&(e?this.element.setAttribute(this.name,""):this.element.removeAttribute(this.name),this.value=e),this.__pendingValue=v}}class z extends E{constructor(e,t,i){super(e,t,i),this.single=2===i.length&&""===i[0]&&""===i[1]}_createPart(){return new M(this)}_getValue(){return this.single?this.parts[0].value:super._getValue()}commit(){this.dirty&&(this.dirty=!1,this.element[this.name]=this._getValue())}}class M extends A{}let q=!1;(()=>{try{const e={get capture(){return q=!0,!1}};window.addEventListener("test",e,e),window.removeEventListener("test",e,e)}catch(e){}})();class P{constructor(e,t,i){this.value=void 0,this.__pendingValue=void 0,this.element=e,this.eventName=t,this.eventContext=i,this.__boundHandleEvent=e=>this.handleEvent(e)}setValue(e){this.__pendingValue=e}commit(){for(;b(this.__pendingValue);){const e=this.__pendingValue;this.__pendingValue=v,e(this)}if(this.__pendingValue===v)return;const e=this.__pendingValue,t=this.value,i=null==e||null!=t&&(e.capture!==t.capture||e.once!==t.once||e.passive!==t.passive),a=null!=e&&(null==t||i);i&&this.element.removeEventListener(this.eventName,this.__boundHandleEvent,this.__options),a&&(this.__options=B(e),this.element.addEventListener(this.eventName,this.__boundHandleEvent,this.__options)),this.value=e,this.__pendingValue=v}handleEvent(e){"function"==typeof this.value?this.value.call(this.eventContext||this.element,e):this.value.handleEvent(e)}}const B=e=>e&&(q?{capture:e.capture,passive:e.passive,once:e.once}:e.capture);function j(e){let t=N.get(e.type);void 0===t&&(t={stringsArray:new WeakMap,keyString:new Map},N.set(e.type,t));let i=t.stringsArray.get(e.strings);if(void 0!==i)return i;const a=e.strings.join(o);return i=t.keyString.get(a),void 0===i&&(i=new d(e,e.getTemplateElement()),t.keyString.set(a,i)),t.stringsArray.set(e.strings,i),i}const N=new Map,O=new WeakMap,I=new class{handleAttributeExpressions(e,t,i,a){const n=t[0];return"."===n?new z(e,t.slice(1),i).parts:"@"===n?[new P(e,t.slice(1),a.eventContext)]:"?"===n?[new T(e,t.slice(1),i)]:new E(e,t,i).parts}handleTextExpression(e){return new D(e)}};"undefined"!=typeof window&&(window.litHtmlVersions||(window.litHtmlVersions=[])).push("1.4.1");const L=(e,...t)=>new k(e,t,"html",I),V=(e,t)=>`${e}--${t}`;let U=!0;void 0===window.ShadyCSS?U=!1:void 0===window.ShadyCSS.prepareTemplateDom&&(console.warn("Incompatible ShadyCSS version detected. Please update to at least @webcomponents/webcomponentsjs@2.0.2 and @webcomponents/shadycss@1.3.1."),U=!1);const R=e=>t=>{const i=V(t.type,e);let a=N.get(i);void 0===a&&(a={stringsArray:new WeakMap,keyString:new Map},N.set(i,a));let n=a.stringsArray.get(t.strings);if(void 0!==n)return n;const s=t.strings.join(o);if(n=a.keyString.get(s),void 0===n){const i=t.getTemplateElement();U&&window.ShadyCSS.prepareTemplateDom(i,e),n=new d(t,i),a.keyString.set(s,n)}return a.stringsArray.set(t.strings,n),n},H=["html","svg"],G=new Set;window.JSCompiler_renameProperty=(e,t)=>e;const W={toAttribute(e,t){switch(t){case Boolean:return e?"":null;case Object:case Array:return null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){switch(t){case Boolean:return null!==e;case Number:return null===e?null:Number(e);case Object:case Array:return JSON.parse(e)}return e}},F=(e,t)=>t!==e&&(t==t||e==e),X={attribute:!0,type:String,converter:W,reflect:!1,hasChanged:F},Y="finalized";class K extends HTMLElement{constructor(){super(),this.initialize()}static get observedAttributes(){this.finalize();const e=[];return this._classProperties.forEach(((t,i)=>{const a=this._attributeNameForProperty(i,t);void 0!==a&&(this._attributeToPropertyMap.set(a,i),e.push(a))})),e}static _ensureClassProperties(){if(!this.hasOwnProperty(JSCompiler_renameProperty("_classProperties",this))){this._classProperties=new Map;const e=Object.getPrototypeOf(this)._classProperties;void 0!==e&&e.forEach(((e,t)=>this._classProperties.set(t,e)))}}static createProperty(e,t=X){if(this._ensureClassProperties(),this._classProperties.set(e,t),t.noAccessor||this.prototype.hasOwnProperty(e))return;const i="symbol"==typeof e?Symbol():`__${e}`,a=this.getPropertyDescriptor(e,i,t);void 0!==a&&Object.defineProperty(this.prototype,e,a)}static getPropertyDescriptor(e,t,i){return{get(){return this[t]},set(a){const n=this[e];this[t]=a,this.requestUpdateInternal(e,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this._classProperties&&this._classProperties.get(e)||X}static finalize(){const e=Object.getPrototypeOf(this);if(e.hasOwnProperty(Y)||e.finalize(),this[Y]=!0,this._ensureClassProperties(),this._attributeToPropertyMap=new Map,this.hasOwnProperty(JSCompiler_renameProperty("properties",this))){const e=this.properties,t=[...Object.getOwnPropertyNames(e),..."function"==typeof Object.getOwnPropertySymbols?Object.getOwnPropertySymbols(e):[]];for(const i of t)this.createProperty(i,e[i])}}static _attributeNameForProperty(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}static _valueHasChanged(e,t,i=F){return i(e,t)}static _propertyValueFromAttribute(e,t){const i=t.type,a=t.converter||W,n="function"==typeof a?a:a.fromAttribute;return n?n(e,i):e}static _propertyValueToAttribute(e,t){if(void 0===t.reflect)return;const i=t.type,a=t.converter;return(a&&a.toAttribute||W.toAttribute)(e,i)}initialize(){this._updateState=0,this._updatePromise=new Promise((e=>this._enableUpdatingResolver=e)),this._changedProperties=new Map,this._saveInstanceProperties(),this.requestUpdateInternal()}_saveInstanceProperties(){this.constructor._classProperties.forEach(((e,t)=>{if(this.hasOwnProperty(t)){const e=this[t];delete this[t],this._instanceProperties||(this._instanceProperties=new Map),this._instanceProperties.set(t,e)}}))}_applyInstanceProperties(){this._instanceProperties.forEach(((e,t)=>this[t]=e)),this._instanceProperties=void 0}connectedCallback(){this.enableUpdating()}enableUpdating(){void 0!==this._enableUpdatingResolver&&(this._enableUpdatingResolver(),this._enableUpdatingResolver=void 0)}disconnectedCallback(){}attributeChangedCallback(e,t,i){t!==i&&this._attributeToProperty(e,i)}_propertyToAttribute(e,t,i=X){const a=this.constructor,n=a._attributeNameForProperty(e,i);if(void 0!==n){const e=a._propertyValueToAttribute(t,i);if(void 0===e)return;this._updateState=8|this._updateState,null==e?this.removeAttribute(n):this.setAttribute(n,e),this._updateState=-9&this._updateState}}_attributeToProperty(e,t){if(8&this._updateState)return;const i=this.constructor,a=i._attributeToPropertyMap.get(e);if(void 0!==a){const e=i.getPropertyOptions(a);this._updateState=16|this._updateState,this[a]=i._propertyValueFromAttribute(t,e),this._updateState=-17&this._updateState}}requestUpdateInternal(e,t,i){let a=!0;if(void 0!==e){const n=this.constructor;i=i||n.getPropertyOptions(e),n._valueHasChanged(this[e],t,i.hasChanged)?(this._changedProperties.has(e)||this._changedProperties.set(e,t),!0!==i.reflect||16&this._updateState||(void 0===this._reflectingProperties&&(this._reflectingProperties=new Map),this._reflectingProperties.set(e,i))):a=!1}!this._hasRequestedUpdate&&a&&(this._updatePromise=this._enqueueUpdate())}requestUpdate(e,t){return this.requestUpdateInternal(e,t),this.updateComplete}async _enqueueUpdate(){this._updateState=4|this._updateState;try{await this._updatePromise}catch(e){}const e=this.performUpdate();return null!=e&&await e,!this._hasRequestedUpdate}get _hasRequestedUpdate(){return 4&this._updateState}get hasUpdated(){return 1&this._updateState}performUpdate(){if(!this._hasRequestedUpdate)return;this._instanceProperties&&this._applyInstanceProperties();let e=!1;const t=this._changedProperties;try{e=this.shouldUpdate(t),e?this.update(t):this._markUpdated()}catch(t){throw e=!1,this._markUpdated(),t}e&&(1&this._updateState||(this._updateState=1|this._updateState,this.firstUpdated(t)),this.updated(t))}_markUpdated(){this._changedProperties=new Map,this._updateState=-5&this._updateState}get updateComplete(){return this._getUpdateComplete()}_getUpdateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._updatePromise}shouldUpdate(e){return!0}update(e){void 0!==this._reflectingProperties&&this._reflectingProperties.size>0&&(this._reflectingProperties.forEach(((e,t)=>this._propertyToAttribute(t,this[t],e))),this._reflectingProperties=void 0),this._markUpdated()}updated(e){}firstUpdated(e){}}K[Y]=!0;const J=Element.prototype;J.msMatchesSelector||J.webkitMatchesSelector;const Z=window.ShadowRoot&&(void 0===window.ShadyCSS||window.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Q=Symbol();class ee{constructor(e,t){if(t!==Q)throw new Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e}get styleSheet(){return void 0===this._styleSheet&&(Z?(this._styleSheet=new CSSStyleSheet,this._styleSheet.replaceSync(this.cssText)):this._styleSheet=null),this._styleSheet}toString(){return this.cssText}}const te=(e,...t)=>{const i=t.reduce(((t,i,a)=>t+(e=>{if(e instanceof ee)return e.cssText;if("number"==typeof e)return e;throw new Error(`Value passed to 'css' function must be a 'css' function result: ${e}. Use 'unsafeCSS' to pass non-literal values, but\n            take care to ensure page security.`)})(i)+e[a+1]),e[0]);return new ee(i,Q)};(window.litElementVersions||(window.litElementVersions=[])).push("2.5.1");const ie={};class ae extends K{static getStyles(){return this.styles}static _getUniqueStyles(){if(this.hasOwnProperty(JSCompiler_renameProperty("_styles",this)))return;const e=this.getStyles();if(Array.isArray(e)){const t=(e,i)=>e.reduceRight(((e,i)=>Array.isArray(i)?t(i,e):(e.add(i),e)),i),i=t(e,new Set),a=[];i.forEach((e=>a.unshift(e))),this._styles=a}else this._styles=void 0===e?[]:[e];this._styles=this._styles.map((e=>{if(e instanceof CSSStyleSheet&&!Z){const t=Array.prototype.slice.call(e.cssRules).reduce(((e,t)=>e+t.cssText),"");return new ee(String(t),Q)}return e}))}initialize(){super.initialize(),this.constructor._getUniqueStyles(),this.renderRoot=this.createRenderRoot(),window.ShadowRoot&&this.renderRoot instanceof window.ShadowRoot&&this.adoptStyles()}createRenderRoot(){return this.attachShadow(this.constructor.shadowRootOptions)}adoptStyles(){const e=this.constructor._styles;0!==e.length&&(void 0===window.ShadyCSS||window.ShadyCSS.nativeShadow?Z?this.renderRoot.adoptedStyleSheets=e.map((e=>e instanceof CSSStyleSheet?e:e.styleSheet)):this._needsShimAdoptedStyleSheets=!0:window.ShadyCSS.ScopingShim.prepareAdoptedCssText(e.map((e=>e.cssText)),this.localName))}connectedCallback(){super.connectedCallback(),this.hasUpdated&&void 0!==window.ShadyCSS&&window.ShadyCSS.styleElement(this)}update(e){const t=this.render();super.update(e),t!==ie&&this.constructor.render(t,this.renderRoot,{scopeName:this.localName,eventContext:this}),this._needsShimAdoptedStyleSheets&&(this._needsShimAdoptedStyleSheets=!1,this.constructor._styles.forEach((e=>{const t=document.createElement("style");t.textContent=e.cssText,this.renderRoot.appendChild(t)})))}render(){return ie}}ae.finalized=!0,ae.render=(e,t,i)=>{if(!i||"object"!=typeof i||!i.scopeName)throw new Error("The `scopeName` option is required.");const a=i.scopeName,o=O.has(t),s=U&&11===t.nodeType&&!!t.host,r=s&&!G.has(a),l=r?document.createDocumentFragment():t;if(((e,t,i)=>{let a=O.get(t);void 0===a&&(n(t,t.firstChild),O.set(t,a=new D(Object.assign({templateFactory:j},i))),a.appendInto(t)),a.setValue(e),a.commit()})(e,l,Object.assign({templateFactory:R(a)},i)),r){const e=O.get(l);O.delete(l);((e,t,i)=>{G.add(e);const a=i?i.element:document.createElement("template"),n=t.querySelectorAll("style"),{length:o}=n;if(0===o)return void window.ShadyCSS.prepareTemplateStyles(a,e);const s=document.createElement("style");for(let e=0;e<o;e++){const t=n[e];t.parentNode.removeChild(t),s.textContent+=t.textContent}(e=>{H.forEach((t=>{const i=N.get(V(t,e));void 0!==i&&i.keyString.forEach((e=>{const{element:{content:t}}=e,i=new Set;Array.from(t.querySelectorAll("style")).forEach((e=>{i.add(e)})),m(e,i)}))}))})(e);const r=a.content;i?function(e,t,i=null){const{element:{content:a},parts:n}=e;if(null==i)return void a.appendChild(t);const o=document.createTreeWalker(a,133,null,!1);let s=f(n),r=0,l=-1;for(;o.nextNode();)for(l++,o.currentNode===i&&(r=g(t),i.parentNode.insertBefore(t,i));-1!==s&&n[s].index===l;){if(r>0){for(;-1!==s;)n[s].index+=r,s=f(n,s);return}s=f(n,s)}}(i,s,r.firstChild):r.insertBefore(s,r.firstChild),window.ShadyCSS.prepareTemplateStyles(a,e);const l=r.querySelector("style");if(window.ShadyCSS.nativeShadow&&null!==l)t.insertBefore(l.cloneNode(!0),t.firstChild);else if(i){r.insertBefore(s,r.firstChild);const e=new Set;e.add(s),m(i,e)}})(a,l,e.value instanceof w?e.value.template:void 0),n(t,t.firstChild),t.appendChild(l),O.set(t,e)}!o&&s&&window.ShadyCSS.styleElement(t.host)},ae.shadowRootOptions={mode:"open"}},381:(e,t,i)=>{"use strict";i.d(t,{WF:()=>re,AH:()=>l,qy:()=>V});const a=window,n=a.ShadowRoot&&(void 0===a.ShadyCSS||a.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),s=new WeakMap;class r{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(n&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=s.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&s.set(t,e))}return e}toString(){return this.cssText}}const l=(e,...t)=>{const i=1===e.length?e[0]:t.reduce(((t,i,a)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[a+1]),e[0]);return new r(i,e,o)},d=n?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new r("string"==typeof e?e:e+"",void 0,o))(t)})(e):e;var c;const h=window,p=h.trustedTypes,u=p?p.emptyScript:"",m=h.reactiveElementPolyfillSupport,g={toAttribute(e,t){switch(t){case Boolean:e=e?u:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},f=(e,t)=>t!==e&&(t==t||e==e),_={attribute:!0,type:String,converter:g,reflect:!1,hasChanged:f},b="finalized";class v extends HTMLElement{constructor(){super(),this._$Ei=new Map,this.isUpdatePending=!1,this.hasUpdated=!1,this._$El=null,this._$Eu()}static addInitializer(e){var t;this.finalize(),(null!==(t=this.h)&&void 0!==t?t:this.h=[]).push(e)}static get observedAttributes(){this.finalize();const e=[];return this.elementProperties.forEach(((t,i)=>{const a=this._$Ep(i,t);void 0!==a&&(this._$Ev.set(a,i),e.push(a))})),e}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this.finalize(),this.elementProperties.set(e,t),!t.noAccessor&&!this.prototype.hasOwnProperty(e)){const i="symbol"==typeof e?Symbol():"__"+e,a=this.getPropertyDescriptor(e,i,t);void 0!==a&&Object.defineProperty(this.prototype,e,a)}}static getPropertyDescriptor(e,t,i){return{get(){return this[t]},set(a){const n=this[e];this[t]=a,this.requestUpdate(e,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)||_}static finalize(){if(this.hasOwnProperty(b))return!1;this[b]=!0;const e=Object.getPrototypeOf(this);if(e.finalize(),void 0!==e.h&&(this.h=[...e.h]),this.elementProperties=new Map(e.elementProperties),this._$Ev=new Map,this.hasOwnProperty("properties")){const e=this.properties,t=[...Object.getOwnPropertyNames(e),...Object.getOwnPropertySymbols(e)];for(const i of t)this.createProperty(i,e[i])}return this.elementStyles=this.finalizeStyles(this.styles),!0}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(d(e))}else void 0!==e&&t.push(d(e));return t}static _$Ep(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}_$Eu(){var e;this._$E_=new Promise((e=>this.enableUpdating=e)),this._$AL=new Map,this._$Eg(),this.requestUpdate(),null===(e=this.constructor.h)||void 0===e||e.forEach((e=>e(this)))}addController(e){var t,i;(null!==(t=this._$ES)&&void 0!==t?t:this._$ES=[]).push(e),void 0!==this.renderRoot&&this.isConnected&&(null===(i=e.hostConnected)||void 0===i||i.call(e))}removeController(e){var t;null===(t=this._$ES)||void 0===t||t.splice(this._$ES.indexOf(e)>>>0,1)}_$Eg(){this.constructor.elementProperties.forEach(((e,t)=>{this.hasOwnProperty(t)&&(this._$Ei.set(t,this[t]),delete this[t])}))}createRenderRoot(){var e;const t=null!==(e=this.shadowRoot)&&void 0!==e?e:this.attachShadow(this.constructor.shadowRootOptions);return((e,t)=>{n?e.adoptedStyleSheets=t.map((e=>e instanceof CSSStyleSheet?e:e.styleSheet)):t.forEach((t=>{const i=document.createElement("style"),n=a.litNonce;void 0!==n&&i.setAttribute("nonce",n),i.textContent=t.cssText,e.appendChild(i)}))})(t,this.constructor.elementStyles),t}connectedCallback(){var e;void 0===this.renderRoot&&(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),null===(e=this._$ES)||void 0===e||e.forEach((e=>{var t;return null===(t=e.hostConnected)||void 0===t?void 0:t.call(e)}))}enableUpdating(e){}disconnectedCallback(){var e;null===(e=this._$ES)||void 0===e||e.forEach((e=>{var t;return null===(t=e.hostDisconnected)||void 0===t?void 0:t.call(e)}))}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$EO(e,t,i=_){var a;const n=this.constructor._$Ep(e,i);if(void 0!==n&&!0===i.reflect){const o=(void 0!==(null===(a=i.converter)||void 0===a?void 0:a.toAttribute)?i.converter:g).toAttribute(t,i.type);this._$El=e,null==o?this.removeAttribute(n):this.setAttribute(n,o),this._$El=null}}_$AK(e,t){var i;const a=this.constructor,n=a._$Ev.get(e);if(void 0!==n&&this._$El!==n){const e=a.getPropertyOptions(n),o="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==(null===(i=e.converter)||void 0===i?void 0:i.fromAttribute)?e.converter:g;this._$El=n,this[n]=o.fromAttribute(t,e.type),this._$El=null}}requestUpdate(e,t,i){let a=!0;void 0!==e&&(((i=i||this.constructor.getPropertyOptions(e)).hasChanged||f)(this[e],t)?(this._$AL.has(e)||this._$AL.set(e,t),!0===i.reflect&&this._$El!==e&&(void 0===this._$EC&&(this._$EC=new Map),this._$EC.set(e,i))):a=!1),!this.isUpdatePending&&a&&(this._$E_=this._$Ej())}async _$Ej(){this.isUpdatePending=!0;try{await this._$E_}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var e;if(!this.isUpdatePending)return;this.hasUpdated,this._$Ei&&(this._$Ei.forEach(((e,t)=>this[t]=e)),this._$Ei=void 0);let t=!1;const i=this._$AL;try{t=this.shouldUpdate(i),t?(this.willUpdate(i),null===(e=this._$ES)||void 0===e||e.forEach((e=>{var t;return null===(t=e.hostUpdate)||void 0===t?void 0:t.call(e)})),this.update(i)):this._$Ek()}catch(e){throw t=!1,this._$Ek(),e}t&&this._$AE(i)}willUpdate(e){}_$AE(e){var t;null===(t=this._$ES)||void 0===t||t.forEach((e=>{var t;return null===(t=e.hostUpdated)||void 0===t?void 0:t.call(e)})),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$Ek(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$E_}shouldUpdate(e){return!0}update(e){void 0!==this._$EC&&(this._$EC.forEach(((e,t)=>this._$EO(t,this[t],e))),this._$EC=void 0),this._$Ek()}updated(e){}firstUpdated(e){}}var y;v[b]=!0,v.elementProperties=new Map,v.elementStyles=[],v.shadowRootOptions={mode:"open"},null==m||m({ReactiveElement:v}),(null!==(c=h.reactiveElementVersions)&&void 0!==c?c:h.reactiveElementVersions=[]).push("1.6.3");const w=window,x=w.trustedTypes,$=x?x.createPolicy("lit-html",{createHTML:e=>e}):void 0,k="$lit$",C=`lit$${(Math.random()+"").slice(9)}$`,S="?"+C,E=`<${S}>`,A=document,D=()=>A.createComment(""),T=e=>null===e||"object"!=typeof e&&"function"!=typeof e,z=Array.isArray,M="[ \t\n\f\r]",q=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,P=/-->/g,B=/>/g,j=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),N=/'/g,O=/"/g,I=/^(?:script|style|textarea|title)$/i,L=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),V=L(1),U=(L(2),Symbol.for("lit-noChange")),R=Symbol.for("lit-nothing"),H=new WeakMap,G=A.createTreeWalker(A,129,null,!1);function W(e,t){if(!Array.isArray(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==$?$.createHTML(t):t}const F=(e,t)=>{const i=e.length-1,a=[];let n,o=2===t?"<svg>":"",s=q;for(let t=0;t<i;t++){const i=e[t];let r,l,d=-1,c=0;for(;c<i.length&&(s.lastIndex=c,l=s.exec(i),null!==l);)c=s.lastIndex,s===q?"!--"===l[1]?s=P:void 0!==l[1]?s=B:void 0!==l[2]?(I.test(l[2])&&(n=RegExp("</"+l[2],"g")),s=j):void 0!==l[3]&&(s=j):s===j?">"===l[0]?(s=null!=n?n:q,d=-1):void 0===l[1]?d=-2:(d=s.lastIndex-l[2].length,r=l[1],s=void 0===l[3]?j:'"'===l[3]?O:N):s===O||s===N?s=j:s===P||s===B?s=q:(s=j,n=void 0);const h=s===j&&e[t+1].startsWith("/>")?" ":"";o+=s===q?i+E:d>=0?(a.push(r),i.slice(0,d)+k+i.slice(d)+C+h):i+C+(-2===d?(a.push(void 0),t):h)}return[W(e,o+(e[i]||"<?>")+(2===t?"</svg>":"")),a]};class X{constructor({strings:e,_$litType$:t},i){let a;this.parts=[];let n=0,o=0;const s=e.length-1,r=this.parts,[l,d]=F(e,t);if(this.el=X.createElement(l,i),G.currentNode=this.el.content,2===t){const e=this.el.content,t=e.firstChild;t.remove(),e.append(...t.childNodes)}for(;null!==(a=G.nextNode())&&r.length<s;){if(1===a.nodeType){if(a.hasAttributes()){const e=[];for(const t of a.getAttributeNames())if(t.endsWith(k)||t.startsWith(C)){const i=d[o++];if(e.push(t),void 0!==i){const e=a.getAttribute(i.toLowerCase()+k).split(C),t=/([.?@])?(.*)/.exec(i);r.push({type:1,index:n,name:t[2],strings:e,ctor:"."===t[1]?Q:"?"===t[1]?te:"@"===t[1]?ie:Z})}else r.push({type:6,index:n})}for(const t of e)a.removeAttribute(t)}if(I.test(a.tagName)){const e=a.textContent.split(C),t=e.length-1;if(t>0){a.textContent=x?x.emptyScript:"";for(let i=0;i<t;i++)a.append(e[i],D()),G.nextNode(),r.push({type:2,index:++n});a.append(e[t],D())}}}else if(8===a.nodeType)if(a.data===S)r.push({type:2,index:n});else{let e=-1;for(;-1!==(e=a.data.indexOf(C,e+1));)r.push({type:7,index:n}),e+=C.length-1}n++}}static createElement(e,t){const i=A.createElement("template");return i.innerHTML=e,i}}function Y(e,t,i=e,a){var n,o,s,r;if(t===U)return t;let l=void 0!==a?null===(n=i._$Co)||void 0===n?void 0:n[a]:i._$Cl;const d=T(t)?void 0:t._$litDirective$;return(null==l?void 0:l.constructor)!==d&&(null===(o=null==l?void 0:l._$AO)||void 0===o||o.call(l,!1),void 0===d?l=void 0:(l=new d(e),l._$AT(e,i,a)),void 0!==a?(null!==(s=(r=i)._$Co)&&void 0!==s?s:r._$Co=[])[a]=l:i._$Cl=l),void 0!==l&&(t=Y(e,l._$AS(e,t.values),l,a)),t}class K{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){var t;const{el:{content:i},parts:a}=this._$AD,n=(null!==(t=null==e?void 0:e.creationScope)&&void 0!==t?t:A).importNode(i,!0);G.currentNode=n;let o=G.nextNode(),s=0,r=0,l=a[0];for(;void 0!==l;){if(s===l.index){let t;2===l.type?t=new J(o,o.nextSibling,this,e):1===l.type?t=new l.ctor(o,l.name,l.strings,this,e):6===l.type&&(t=new ae(o,this,e)),this._$AV.push(t),l=a[++r]}s!==(null==l?void 0:l.index)&&(o=G.nextNode(),s++)}return G.currentNode=A,n}v(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class J{constructor(e,t,i,a){var n;this.type=2,this._$AH=R,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=a,this._$Cp=null===(n=null==a?void 0:a.isConnected)||void 0===n||n}get _$AU(){var e,t;return null!==(t=null===(e=this._$AM)||void 0===e?void 0:e._$AU)&&void 0!==t?t:this._$Cp}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===(null==e?void 0:e.nodeType)&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Y(this,e,t),T(e)?e===R||null==e||""===e?(this._$AH!==R&&this._$AR(),this._$AH=R):e!==this._$AH&&e!==U&&this._(e):void 0!==e._$litType$?this.g(e):void 0!==e.nodeType?this.$(e):(e=>z(e)||"function"==typeof(null==e?void 0:e[Symbol.iterator]))(e)?this.T(e):this._(e)}k(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}$(e){this._$AH!==e&&(this._$AR(),this._$AH=this.k(e))}_(e){this._$AH!==R&&T(this._$AH)?this._$AA.nextSibling.data=e:this.$(A.createTextNode(e)),this._$AH=e}g(e){var t;const{values:i,_$litType$:a}=e,n="number"==typeof a?this._$AC(e):(void 0===a.el&&(a.el=X.createElement(W(a.h,a.h[0]),this.options)),a);if((null===(t=this._$AH)||void 0===t?void 0:t._$AD)===n)this._$AH.v(i);else{const e=new K(n,this),t=e.u(this.options);e.v(i),this.$(t),this._$AH=e}}_$AC(e){let t=H.get(e.strings);return void 0===t&&H.set(e.strings,t=new X(e)),t}T(e){z(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,a=0;for(const n of e)a===t.length?t.push(i=new J(this.k(D()),this.k(D()),this,this.options)):i=t[a],i._$AI(n),a++;a<t.length&&(this._$AR(i&&i._$AB.nextSibling,a),t.length=a)}_$AR(e=this._$AA.nextSibling,t){var i;for(null===(i=this._$AP)||void 0===i||i.call(this,!1,!0,t);e&&e!==this._$AB;){const t=e.nextSibling;e.remove(),e=t}}setConnected(e){var t;void 0===this._$AM&&(this._$Cp=e,null===(t=this._$AP)||void 0===t||t.call(this,e))}}class Z{constructor(e,t,i,a,n){this.type=1,this._$AH=R,this._$AN=void 0,this.element=e,this.name=t,this._$AM=a,this.options=n,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=R}get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}_$AI(e,t=this,i,a){const n=this.strings;let o=!1;if(void 0===n)e=Y(this,e,t,0),o=!T(e)||e!==this._$AH&&e!==U,o&&(this._$AH=e);else{const a=e;let s,r;for(e=n[0],s=0;s<n.length-1;s++)r=Y(this,a[i+s],t,s),r===U&&(r=this._$AH[s]),o||(o=!T(r)||r!==this._$AH[s]),r===R?e=R:e!==R&&(e+=(null!=r?r:"")+n[s+1]),this._$AH[s]=r}o&&!a&&this.j(e)}j(e){e===R?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,null!=e?e:"")}}class Q extends Z{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===R?void 0:e}}const ee=x?x.emptyScript:"";class te extends Z{constructor(){super(...arguments),this.type=4}j(e){e&&e!==R?this.element.setAttribute(this.name,ee):this.element.removeAttribute(this.name)}}class ie extends Z{constructor(e,t,i,a,n){super(e,t,i,a,n),this.type=5}_$AI(e,t=this){var i;if((e=null!==(i=Y(this,e,t,0))&&void 0!==i?i:R)===U)return;const a=this._$AH,n=e===R&&a!==R||e.capture!==a.capture||e.once!==a.once||e.passive!==a.passive,o=e!==R&&(a===R||n);n&&this.element.removeEventListener(this.name,this,a),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t,i;"function"==typeof this._$AH?this._$AH.call(null!==(i=null===(t=this.options)||void 0===t?void 0:t.host)&&void 0!==i?i:this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){Y(this,e)}}const ne=w.litHtmlPolyfillSupport;var oe,se;null==ne||ne(X,J),(null!==(y=w.litHtmlVersions)&&void 0!==y?y:w.litHtmlVersions=[]).push("2.8.0");class re extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e,t;const i=super.createRenderRoot();return null!==(e=(t=this.renderOptions).renderBefore)&&void 0!==e||(t.renderBefore=i.firstChild),i}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{var a,n;const o=null!==(a=null==i?void 0:i.renderBefore)&&void 0!==a?a:t;let s=o._$litPart$;if(void 0===s){const e=null!==(n=null==i?void 0:i.renderBefore)&&void 0!==n?n:null;o._$litPart$=s=new J(t.insertBefore(D(),e),e,void 0,null!=i?i:{})}return s._$AI(e),s})(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),null===(e=this._$Do)||void 0===e||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),null===(e=this._$Do)||void 0===e||e.setConnected(!1)}render(){return U}}re.finalized=!0,re._$litElement$=!0,null===(oe=globalThis.litElementHydrateSupport)||void 0===oe||oe.call(globalThis,{LitElement:re});const le=globalThis.litElementPolyfillSupport;null==le||le({LitElement:re}),(null!==(se=globalThis.litElementVersions)&&void 0!==se?se:globalThis.litElementVersions=[]).push("3.3.3")},330:e=>{"use strict";e.exports=JSON.parse('{"name":"dwains-dashboard","private":true,"version":"3.8.0","description":"dwains-dashboard","scripts":{"build":"webpack --mode=production","watch":"webpack --watch --mode=development","update-card-tools":"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools"},"keywords":[],"author":"Dwain Scheeren","license":"MIT","devDependencies":{"autoprefixer":"^10.2.5","css-loader":"^5.1.3","html-webpack-plugin":"^5.3.1","postcss":"^8.2.8","postcss-cli":"^8.3.1","postcss-loader":"^5.2.0","style-loader":"^2.0.0","tailwindcss":"^2.0.3","webpack":"^5.26.0","webpack-cli":"^4.5.0","webpack-dev-server":"^4.7.4","webpack-merge":"^5.7.3"},"dependencies":{"@mdi/js":"^6.5.95","card-tools":"github:thomasloven/lovelace-card-tools","custom-card-helpers":"^1.8.0","js-cookie":"^3.0.1","lit-element":"^2.2.1","lit-html":"^1.1.2","sortablejs":"^1.14.0"}}')}},t={};function i(a){var n=t[a];if(void 0!==n)return n.exports;var o=t[a]={exports:{}};return e[a](o,o.exports,i),o.exports}i.d=(e,t)=>{for(var a in t)i.o(t,a)&&!i.o(e,a)&&Object.defineProperty(e,a,{enumerable:!0,get:t[a]})},i.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),i(142),i(216),i(919),i(506),i(2),i(87),i(848),i(863),i(831),i(780),i(659),i(462),i(54),i(100),i(825),i(973),i(237),i(826),i(3),i(971),i(640),i(468),i(166),i(991)})();
//# sourceMappingURL=dwains-dashboard.js.map

