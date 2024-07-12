/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./client/static/javascript/admin-panel.ts":
/*!*************************************************!*\
  !*** ./client/static/javascript/admin-panel.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createTextEditMenu: () => (/* binding */ createTextEditMenu)\n/* harmony export */ });\n/* harmony import */ var _utils_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.ts */ \"./client/static/javascript/utils.ts\");\n\nlet edit_mode_toggle = document.getElementById(\"edit-mode-toggle\");\nconst EDITABLE = {\n  text: [\"p\", \"h1\", \"h2\", \"h3\", \"h4\", \"h5\", \"h6\"],\n  image: [\"img\"],\n  video: [\"video\"],\n  iframe: [\"iframe\"],\n  audio: [\"audio\"],\n  link: [\"a\"]\n};\nlet textEditMenu;\nlet currentlyEditing;\nconst HANDLERS = {\n  text: element => {\n    element.setAttribute(\"contenteditable\", \"true\");\n    element.focus();\n    element.style.outline = \"1px solid blue\";\n    currentlyEditing = element;\n    textEditMenu.style.display = \"flex\";\n    let menuBoundingRect = textEditMenu.getBoundingClientRect();\n    let elementBoundingRect = element.getBoundingClientRect();\n    console.log(menuBoundingRect, elementBoundingRect);\n    textEditMenu.style.left = String(elementBoundingRect.left + elementBoundingRect.width / 2 - menuBoundingRect.width / 2) + \"px\";\n    textEditMenu.style.top = String(elementBoundingRect.bottom + 10) + \"px\";\n    element.focus();\n    element.addEventListener(\"inactive\", () => {\n      console.log(\"inactive\");\n      element.style.outline = \"none\";\n      textEditMenu.style.display = \"none\";\n      element.setAttribute(\"contenteditable\", \"false\");\n    }, {\n      once: true\n    });\n  },\n  image: element => {},\n  video: element => {},\n  iframe: element => {},\n  audio: element => {},\n  link: element => {}\n};\nwindow.addEventListener(\"load\", () => {\n  textEditMenu = createTextEditMenu();\n  textEditMenu.style.display = \"none\";\n  for (let type in EDITABLE) {\n    for (let tag of EDITABLE[type]) {\n      let elements = Array.from(document.getElementsByTagName(tag));\n      for (let element of elements) {\n        element.addEventListener(\"click\", () => {\n          if (edit_mode_toggle.checked) HANDLERS[type](element);\n        });\n      }\n    }\n  }\n  window.addEventListener(\"click\", event => {\n    if (currentlyEditing) {\n      let currentlyEditingBoundingRect = currentlyEditing.getBoundingClientRect();\n      let textEditMenuBoundingRect = textEditMenu.getBoundingClientRect();\n      if (!isPointInRect({\n        x: event.clientX,\n        y: event.clientY\n      }, currentlyEditingBoundingRect) && !isPointInRect({\n        x: event.clientX,\n        y: event.clientY\n      }, textEditMenuBoundingRect)) {\n        currentlyEditing.dispatchEvent(new CustomEvent(\"inactive\"));\n        currentlyEditing = null;\n      }\n    }\n  });\n});\nfunction isPointInRect(point, rect) {\n  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;\n}\nfunction createTextEditMenu() {\n  let menu = (0,_utils_ts__WEBPACK_IMPORTED_MODULE_0__.createElement)(\"menu\", {\n    classes: [\"editor-menu\"],\n    children: [{\n      tag: \"div\",\n      classes: [\"color-picker-wrapper\", \"menu-item-wrapper\"\n      // \"menu-item-round\",\n      ],\n      children: [{\n        tag: \"input\",\n        attributes: {\n          type: \"color\"\n        },\n        classes: [\"color-picker\"],\n        eventHandlers: {\n          input(event) {\n            console.log(\"color changed\", event.target.value);\n            currentlyEditing.style.color = event.target.value;\n          }\n        }\n      }]\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-box\"],\n      children: [{\n        tag: \"span\",\n        classes: [\"font-selector\", \"menu-item\"],\n        text: \"Aa\"\n      }]\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-box\", \"font-size-selector-wrapper\"],\n      children: [{\n        tag: \"input\",\n        attributes: {\n          type: \"number\",\n          min: \"1\",\n          max: \"1000\",\n          value: \"20\",\n          step: \"0.5\",\n          inputmode: \"numeric\"\n        },\n        classes: [\"font-size-selector\", \"menu-item\"],\n        text: \"20\"\n      }],\n      eventHandlers: {\n        input(event) {\n          currentlyEditing.style.fontSize = event.target.value + \"px\";\n        }\n      }\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"span\",\n        classes: [\"bold-toggle\", \"menu-item\"],\n        text: \"B\"\n      }],\n      eventHandlers: {\n        click(event) {\n          let currentFontWeight = window.getComputedStyle(currentlyEditing).fontWeight;\n          currentlyEditing.style.fontWeight = currentFontWeight == \"700\" ? \"400\" : \"700\";\n        }\n      }\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"span\",\n        classes: [\"strikethrough-toggle\", \"menu-item\"],\n        text: \"S\"\n      }],\n      eventHandlers: {\n        click(event) {\n          let currentTextDecoration = window.getComputedStyle(currentlyEditing).textDecoration;\n          currentlyEditing.style.textDecoration = currentTextDecoration == \"line-through\" ? \"none\" : \"line-through\";\n        }\n      }\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"span\",\n        classes: [\"underline-toggle\", \"menu-item\"],\n        text: \"U\"\n      }],\n      eventHandlers: {\n        click(event) {\n          let currentTextDecoration = window.getComputedStyle(currentlyEditing).textDecoration;\n          currentlyEditing.style.textDecoration = currentTextDecoration == \"underline\" ? \"none\" : \"underline\";\n        }\n      }\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"img\",\n        attributes: {\n          src: \"/static/media/image/icon/Align Icon.svg\"\n        },\n        classes: [\"text-align-toggle\", \"menu-item\"]\n      }],\n      eventHandlers: {\n        click(event) {\n          //TODO: SHOW OPTIONS\n          let currentTextAlign = window.getComputedStyle(currentlyEditing).textAlign;\n          currentlyEditing.style.textAlign = currentTextAlign == \"left\" ? \"center\" : \"left\";\n        }\n      }\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"img\",\n        attributes: {\n          src: \"/static/media/image/icon/Bullet Point Icon.svg\"\n        },\n        classes: [\"bullet-point-toggle\", \"menu-item\"]\n      }]\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"img\",\n        attributes: {\n          src: \"/static/media/image/icon/link.svg\"\n        },\n        classes: [\"link-button\", \"menu-item\"]\n      }]\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"img\",\n        attributes: {\n          src: \"/static/media/image/icon/Copy.svg\"\n        },\n        classes: [\"copy-button\", \"menu-item\"]\n      }]\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"menu-item-round\"],\n      children: [{\n        tag: \"img\",\n        attributes: {\n          src: \"/static/media/image/icon/trash.svg\"\n        },\n        classes: [\"delete-button\", \"menu-item\"]\n      }],\n      eventHandlers: {\n        click(event) {\n          currentlyEditing.dispatchEvent(new Event(\"inactive\"));\n          currentlyEditing.remove();\n        }\n      }\n    }, {\n      tag: \"div\",\n      classes: [\"menu-item-wrapper\", \"hover-menu\", \"menu-item-round\"],\n      children: [{\n        tag: \"img\",\n        attributes: {\n          src: \"/static/media/image/icon/ellipsis.svg\"\n        },\n        classes: [\"options-button\", \"hover-menu__text\"]\n      }, {\n        tag: \"menu\",\n        classes: [\"hover-menu__content\", \"right\", \"menu-bar\", \"vertical\"],\n        children: [{\n          tag: \"li\",\n          classes: [\"hover-menu__item\"],\n          text: \"Item 0\"\n        }, {\n          tag: \"li\",\n          classes: [\"hover-menu__item\"],\n          text: \"Item 1\"\n        }, {\n          tag: \"li\",\n          classes: [\"hover-menu__item\"],\n          text: \"Item 2\"\n        }]\n      }]\n    }]\n  });\n  document.body.appendChild(menu);\n  return menu;\n}\n\n\n//# sourceURL=webpack://writingincolor/./client/static/javascript/admin-panel.ts?");

/***/ }),

/***/ "./client/static/javascript/test.ts":
/*!******************************************!*\
  !*** ./client/static/javascript/test.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _admin_panel_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./admin-panel.ts */ \"./client/static/javascript/admin-panel.ts\");\n\n(0,_admin_panel_ts__WEBPACK_IMPORTED_MODULE_0__.createTextEditMenu)();\n\n//# sourceURL=webpack://writingincolor/./client/static/javascript/test.ts?");

/***/ }),

/***/ "./client/static/javascript/utils.ts":
/*!*******************************************!*\
  !*** ./client/static/javascript/utils.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createElement: () => (/* binding */ createElement)\n/* harmony export */ });\nconst newProperties = {\n  setClass() {\n    for (var _len = arguments.length, classes = new Array(_len), _key = 0; _key < _len; _key++) {\n      classes[_key] = arguments[_key];\n    }\n    for (let c of classes) {\n      this.classList.add(c);\n    }\n    return this;\n  },\n  setId(id) {\n    this.id = id;\n    return this;\n  },\n  setText(text) {\n    this.innerText = text;\n    return this;\n  },\n  setHTML(HTML) {\n    this.innerHTML = HTML;\n    return this;\n  }\n};\n\n// Define function overloads\n\n// Implementation\nfunction createElement(elementTypeOrOptions, options) {\n  let elementType = typeof elementTypeOrOptions === \"string\" ? elementTypeOrOptions : elementTypeOrOptions.tag;\n  options = typeof elementTypeOrOptions === \"string\" ? options : elementTypeOrOptions;\n  let element = document.createElement(elementType, {\n    is: options.is\n  });\n  for (let attribute in options.attributes ?? {}) {\n    element.setAttribute(attribute, options.attributes[attribute]);\n  }\n  for (let c of options.classes ?? []) {\n    element.classList.add(c);\n  }\n  if (options.id) {\n    element.id = options.id;\n  }\n  if (options.text) {\n    element.innerText = options.text;\n  }\n  if (options.html) {\n    element.innerHTML = options.html;\n  }\n  for (let child of options.children ?? []) {\n    if (child instanceof Element) {\n      element.appendChild(child);\n    } else {\n      element.appendChild(createElement(child));\n    }\n  }\n  for (let handler in options.eventHandlers ?? {}) {\n    element.addEventListener(handler, options.eventHandlers[handler]);\n  }\n  return element;\n}\nfunction extendElementPrototype() {\n  Object.keys(newProperties).forEach(methodName => {\n    Element.prototype[methodName] = newProperties[methodName];\n  });\n}\n\n// Extend the prototype\nextendElementPrototype();\n\n\n//# sourceURL=webpack://writingincolor/./client/static/javascript/utils.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./client/static/javascript/test.ts");
/******/ 	
/******/ })()
;