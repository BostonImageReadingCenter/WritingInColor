"use strict";

let edit_mode_toggle = document.getElementById("edit-mode-toggle");
const EDITABLE = {
  text: ["p", "h1", "h2", "h3", "h4", "h5", "h6"],
  image: ["img"],
  video: ["video"],
  iframe: ["iframe"],
  audio: ["audio"],
  link: ["a"]
};
const HANDLERS = {
  text: element => {
    element.contentEditable = true;
    element.focus();
    element.addEventListener("blur", () => {
      element.contentEditable = false;
      element.style.border = "none";
    });
  },
  image: element => {},
  video: element => {},
  iframe: element => {},
  audio: element => {},
  link: element => {}
};
window.addEventListener("load", () => {
  for (let type in EDITABLE) {
    for (let tag of EDITABLE[type]) {
      let elements = document.getElementsByTagName(tag);
      for (let element of elements) {
        element.addEventListener("click", () => {
          if (edit_mode_toggle.checked) HANDLERS[type](element);
        });
      }
    }
  }
});