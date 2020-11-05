!function(e){var t={};function r(i){if(t[i])return t[i].exports;var a=t[i]={i:i,l:!1,exports:{}};return e[i].call(a.exports,a,a.exports,r),a.l=!0,a.exports}r.m=e,r.c=t,r.d=function(e,t,i){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(r.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var a in e)r.d(i,a,function(t){return e[t]}.bind(null,a));return i},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="",r(r.s=0)}([function(e,t,r){const i=[customElements.whenDefined("home-assistant-main"),customElements.whenDefined("hui-view")];Promise.race(i).then(()=>{const e=customElements.get("home-assistant-main")?Object.getPrototypeOf(customElements.get("home-assistant-main")):Object.getPrototypeOf(customElements.get("hui-view")),t=e.prototype.html,i=e.prototype.css;class a extends e{static get properties(){return{hass:{},config:{},active:{}}}constructor(){super()}render(){var e=this.config.entity,r=this.hass.states[e];const i=void 0===r.attributes.friendly_name?r.entity_id.split(".")[1].replace(/_/g," "):r.attributes.friendly_name;return(4&r.attributes.supported_features)>0&&(128&r.attributes.supported_features)>0?t`
          <ha-card
              .header=${this.config.title||i}>
              
              <div class="group">
                <center>
                  <span class="title">Position <span class="percentage" id="percentage">${r.attributes.current_position} %</span></span>
                </center>
                <div class="left">
                  <div class="spacer">
                    <span class="open">${this.hass.localize("component.cover.state._.open")}</span>
                  </div>
                </div>
                <div class="right">
                  <div class="spacer">
                    <span class="closed">${this.hass.localize("component.cover.state._.closed")}</span>
                  </div>
                </div>
                <div class="spacer">
                  <input 
                    type="range" 
                    class="range horizontal round" 
                    .value="${"closed"===r.state?0:r.attributes.current_position}" 
                    @change=${e=>this._setCoverPosition(r,e.target.value)}
                  >
                </div>
              </div>

              <div class="group">
                <center>
                  <span class="title">Tilt <span class="percentage" id="percentage">${r.attributes.current_tilt_position} %</span></span>
                </center>
                <div class="left">
                  <div class="spacer">
                    <span class="open">${this.hass.localize("component.cover.state._.open")}</span>
                  </div>
                </div>
                <div class="right">
                  <div class="spacer">
                    <span class="closed">${this.hass.localize("component.cover.state._.closed")}</span>
                  </div>
                </div>
                <div class="spacer">
                  <input 
                    type="range" 
                    class="range horizontal round" 
                    .value="${r.attributes.current_tilt_position}" 
                    @change=${e=>this._setTiltPosition(r,e.target.value)}
                  >
                </spacer>
              </div>
          </ha-card>
        `:(4&r.attributes.supported_features)>0?t`
          <ha-card
              .header=${this.config.title||i}>
              <div class="slider">
                  <span class="open">${this.hass.localize("component.cover.state._.open")} <span class="percentage" id="percentage">${"closed"===r.state?0:r.attributes.current_position} %</span></span>
                  <div class="outer">
                      <input 
                          type="range" 
                          class="range vertical-heighest-first round" 
                          .value="${"closed"===r.state?0:r.attributes.current_position}" 
                          @change=${e=>this._setCoverPosition(r,e.target.value)}
                      >
                  </div>
                  <span class="open">${this.hass.localize("component.cover.state._.closed")}</span>
              </div>
          </ha-card>
        `:t`
          <ha-card
              .header=${this.config.title||i}>
              <div class="buttons">
                <ha-cover-controls
                    .hass="${this.hass}"
                    .stateObj="${r}"
                ></ha-cover-controls>
              </div>
          </ha-card>
        `}_createRange(e){const t=[];for(let r=0;r<e;r++)t.push(r);return t}_setCoverPosition(e,t){this.hass.callService("cover","set_cover_position",{entity_id:e.entity_id,position:t})}_setTiltPosition(e,t){this.hass.callService("cover","set_cover_tilt_position",{entity_id:e.entity_id,tilt_position:t})}_switch(e){this.hass.callService("homeassistant","toggle",{entity_id:e.entity_id})}setConfig(e){if(!e.entity)throw new Error("You need to define an entity");this.config=e}getCardSize(){return 3}static get styles(){return i`
          ha-card {
            padding: 0 0 15px 0px;
            display: block;
            position: relative;
            background: white;
            margin: 0 0 25px 0;
          }
          .card-header {
            font-size: 16px;
            text-align: center;
            padding-left: 0px;
            padding-right: 0px;
          }
          .slider {
            width: auto;
            text-align: center;
          }
          .buttons {
            height: 128px;
            width: auto;
            margin-left: 30px;
            margin-top: 48px;
          }
          .title, .open, .closed {
            font-size: 13px;
            display: block
          }
          .percentage {
            color: #48c5ff;
          }
          .outer {
            height: 80px;
            padding-top: 60px;
            display: block;
          }
          .group {
            padding-top: 15px;
          }
          .left .right
          {
            width: 50%;
          }
          .left
          {
            float:left;
            text-align: left;
          }

          .right
          {
            float:right;
            text-aling: right;
          }

          .spacer
          {
            padding: 0 20px;
          }

          input[type="range"].range
          {
              cursor: pointer;
              -webkit-appearance: none;
              z-index: 200;
              width: 60px;
              height: 15px;
              border: 1px solid #e6e6e6;
              background-color: #e6e6e6;
              background-image: -webkit-gradient(linear, 0% 0%, 0% 100%, from(#e6e6e6), to(#d2d2d2));
              background-image: -webkit-linear-gradient(right, #e6e6e6, #d2d2d2);
              background-image: -moz-linear-gradient(right, #e6e6e6, #d2d2d2);
              background-image: -ms-linear-gradient(right, #e6e6e6, #d2d2d2);
              background-image: -o-linear-gradient(right, #e6e6e6, #d2d2d2);
              margin: 5px;
          }
          input[type="range"].range:focus
          {
              border: 0 !imporant;
              outline: none !important;
          }
          input[type="range"].range::-webkit-slider-thumb
          {
              -webkit-appearance: none;
              width: 15px;
              height: 15px;
              background-color: #555;
              background-image: -webkit-gradient(linear, 0% 0%, 0% 100%, from(#4DDBFF), to(#00CCFF));
              background-image: -webkit-linear-gradient(right, #4DDBFF, #00CCFF);
              background-image: -moz-linear-gradient(right, #4DDBFF, #00CCFF);
              background-image: -ms-linear-gradient(right, #4DDBFF, #00CCFF);
              background-image: -o-linear-gradient(right, #4DDBFF, #00CCFF);
          }
          input[type="range"].round {
              -webkit-border-radius: 20px;
              -moz-border-radius: 20px;
              border-radius: 20px;
          }
          input[type="range"].round::-webkit-slider-thumb {
              -webkit-border-radius: 5px;
              -moz-border-radius: 5px;
              -o-border-radius: 5px;
          }
          .vertical-heighest-first
          {
              width: 120px !important;
              -webkit-transform:rotate(270deg);
              -moz-transform:rotate(270deg);
              -o-transform:rotate(270deg);
              -ms-transform:rotate(270deg);
              transform:rotate(270deg);
          }

          .horizontal
          {
            width: 100% !important;
            -webkit-transform:rotate(180deg);
              -moz-transform:rotate(180deg);
              -o-transform:rotate(180deg);
              -ms-transform:rotate(180deg);
              transform:rotate(180deg);
          }
      `}}if(!customElements.get("dwains-cover-card")){customElements.define("dwains-cover-card",a);const e=r(1);console.info(`%c DWAINS-COVER-CARD \n%c   Version ${e.version}   `,"color: #2fbae5; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray")}})},function(e){e.exports=JSON.parse('{"name":"dwains-cover-card","private":true,"version":"0.0.5","description":"dwains-cover-card","scripts":{"build":"webpack","watch":"webpack --watch --mode=development","update-card-tools":"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools"},"keywords":[],"author":"Dwain Scheeren","license":"MIT","devDependencies":{"webpack":"^4.42.1","webpack-cli":"^3.3.11"},"dependencies":{"card-tools":"github:thomasloven/lovelace-card-tools","lit-element":"^2.2.1","lit-html":"^1.1.2"}}')}]);