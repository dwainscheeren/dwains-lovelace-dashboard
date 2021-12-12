/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/main.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./package.json":
/*!**********************!*\
  !*** ./package.json ***!
  \**********************/
/*! exports provided: name, private, version, description, scripts, keywords, author, license, devDependencies, dependencies, default */
/***/ (function(module) {

eval("module.exports = JSON.parse(\"{\\\"name\\\":\\\"dwains-wrapper-card\\\",\\\"private\\\":true,\\\"version\\\":\\\"0.0.1\\\",\\\"description\\\":\\\"dwains-wrapper-card\\\",\\\"scripts\\\":{\\\"build\\\":\\\"webpack\\\",\\\"watch\\\":\\\"webpack --watch --mode=development\\\",\\\"update-card-tools\\\":\\\"npm uninstall card-tools && npm install thomasloven/lovelace-card-tools\\\"},\\\"keywords\\\":[],\\\"author\\\":\\\"Dwain Scheeren\\\",\\\"license\\\":\\\"MIT\\\",\\\"devDependencies\\\":{\\\"webpack\\\":\\\"^4.42.1\\\",\\\"webpack-cli\\\":\\\"^3.3.11\\\"},\\\"dependencies\\\":{\\\"card-tools\\\":\\\"github:thomasloven/lovelace-card-tools\\\"}}\");\n\n//# sourceURL=webpack:///./package.json?");

/***/ }),

/***/ "./src/main.js":
/*!*********************!*\
  !*** ./src/main.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const bases = [customElements.whenDefined('hui-masonry-view'), customElements.whenDefined('hc-lovelace')];\r\nPromise.race(bases).then(() => {\r\n\r\n  const LitElement = customElements.get('hui-masonry-view')\r\n    ? Object.getPrototypeOf(customElements.get('hui-masonry-view'))\r\n    : Object.getPrototypeOf(customElements.get('hc-lovelace'));\r\n\r\n  const html = LitElement.prototype.html;\r\n\r\n  const css = LitElement.prototype.css;\r\n\r\n\r\n  const createError = (error, config) => {\r\n    return createThing(\"hui-error-card\", {\r\n      type: \"error\",\r\n      error,\r\n      config,\r\n    });\r\n  };\r\n\r\n  const cardHelpers = window.loadCardHelpers()\r\n    ? window.loadCardHelpers()\r\n    : undefined;\r\n\r\n  const createThing = async (tag, config) => {\r\n    if (cardHelpers) {\r\n      const cardHelper = await cardHelpers;\r\n      return cardHelper.createCardElement(config);\r\n    }\r\n\r\n    const element = document.createElement(tag);\r\n\r\n    try {\r\n      element.setConfig(config);\r\n    } catch (err) {\r\n      console.error(tag, err);\r\n      return createError(err.message, config);\r\n    }\r\n\r\n    return element;\r\n  };\r\n\r\n\r\n  class DwainsWrapperCard extends LitElement {\r\n    constructor() {\r\n      super();\r\n    }\r\n\r\n    static get properties() {\r\n      return {\r\n        //hass: {},\r\n      };\r\n    }\r\n\r\n    set hass(hass) {\r\n      this._hass = hass;\r\n      console.log('test1');\r\n    }\r\n\r\n\r\n    async setConfig(config) {\r\n      this._config = JSON.parse(JSON.stringify(config));\r\n\r\n      const cardHelper = await cardHelpers;\r\n      this.card = await cardHelper.createCardElement(this._config.card);\r\n\r\n      this.card.hass = this._hass;\r\n      console.log('test2');\r\n    }\r\n\r\n    render() {\r\n      return html`\r\n        <style>\r\n        ${this._config.style}\r\n        </style>\r\n        <div style=\"${this._config.css}\">\r\n        <ha-card>\r\n          ${this.card}\r\n        </ha-card>\r\n        </div>\r\n      `;\r\n    }\r\n\r\n    set hass(hass) {\r\n      if(!this.card) return;\r\n      this.card.hass = hass;\r\n    }\r\n\r\n    getCardSize() {\r\n      if(this._config.report_size)\r\n        return this._config.report_size;\r\n      let ret = this.shadowRoot;\r\n      if(ret) ret = ret.querySelector(\"ha-card card-maker\");\r\n      if(ret) ret = ret.getCardSize;\r\n      if(ret) ret = ret();\r\n      if(ret) return ret;\r\n      return 1;\r\n    }\r\n\r\n  }\r\n\r\n  if (!customElements.get(\"dwains-wrapper-card\")) {\r\n    customElements.define(\"dwains-wrapper-card\", DwainsWrapperCard);\r\n    const pjson = __webpack_require__(/*! ../package.json */ \"./package.json\");\r\n    console.info(\r\n      `%c DWAINS-WRAPPER-CARD \\n%c      Version ${pjson.version}      `,\r\n      \"color: #2fbae5; font-weight: bold; background: black\",\r\n      \"color: white; font-weight: bold; background: dimgray\"\r\n    );\r\n  }\r\n});\n\n//# sourceURL=webpack:///./src/main.js?");

/***/ })

/******/ });