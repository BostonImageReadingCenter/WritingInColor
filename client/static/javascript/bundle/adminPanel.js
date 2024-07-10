/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./client/static/javascript/admin-panel.ts":
/*!*************************************************!*\
  !*** ./client/static/javascript/admin-panel.ts ***!
  \*************************************************/
/***/ (() => {

eval("let edit_mode_toggle = document.getElementById(\"edit-mode-toggle\");\nconst EDITABLE = {\n  text: [\"p\", \"h1\", \"h2\", \"h3\", \"h4\", \"h5\", \"h6\"],\n  image: [\"img\"],\n  video: [\"video\"],\n  iframe: [\"iframe\"],\n  audio: [\"audio\"],\n  link: [\"a\"]\n};\nconst HANDLERS = {\n  text: element => {\n    element.contentEditable = true;\n    element.focus();\n    element.addEventListener(\"blur\", () => {\n      element.contentEditable = false;\n      element.style.border = \"none\";\n    });\n  },\n  image: element => {},\n  video: element => {},\n  iframe: element => {},\n  audio: element => {},\n  link: element => {}\n};\nwindow.addEventListener(\"load\", () => {\n  for (let type in EDITABLE) {\n    for (let tag of EDITABLE[type]) {\n      let elements = document.getElementsByTagName(tag);\n      for (let element of elements) {\n        element.addEventListener(\"click\", () => {\n          if (edit_mode_toggle.checked) HANDLERS[type](element);\n        });\n      }\n    }\n  }\n});\n\n//# sourceURL=webpack://writingincolor/./client/static/javascript/admin-panel.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./client/static/javascript/admin-panel.ts"]();
/******/ 	
/******/ })()
;