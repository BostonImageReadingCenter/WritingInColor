(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&i(s)}).observe(document,{childList:!0,subtree:!0});function n(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(e){if(e.ep)return;e.ep=!0;const o=n(e);fetch(e.href,o)}})();let d=document.getElementById("edit-mode-toggle");const l={text:["p","h1","h2","h3","h4","h5","h6"],image:["img"],video:["video"],iframe:["iframe"],audio:["audio"],link:["a"]},c={text:t=>{t.contentEditable=!0,t.focus(),t.addEventListener("blur",()=>{t.contentEditable=!1,t.style.border="none"})},image:t=>{},video:t=>{},iframe:t=>{},audio:t=>{},link:t=>{}};window.addEventListener("load",()=>{for(let t in l)for(let r of l[t]){let n=document.getElementsByTagName(r);for(let i of n)i.addEventListener("click",()=>{d.checked&&c[t](i)})}});console.log("effects.js");