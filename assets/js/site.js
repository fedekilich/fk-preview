// Estado de idioma compartido por todo el sitio.
// Los textos se marcan en el HTML con data-i18n / data-i18n-aria-label.

import { t } from "../../data/i18n.js";

const STORAGE_KEY = "fk-lang";
const listeners = new Set();

let lang = readStored();

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
  } catch (e) {
    return "es";
  }
}

export function getLang() {
  return lang;
}

export function onLangChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setLang(next) {
  const value = next === "en" ? "en" : "es";
  if (value === lang) return;
  lang = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch (e) {
    /* modo privado: el idioma vale solo para esta sesión */
  }
  applyStrings();
  listeners.forEach((callback) => callback(lang));
}

function applyStrings() {
  document.documentElement.lang = lang;

  // textContent reemplaza todo el contenido: marcar sólo elementos de texto.
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (el.firstElementChild) {
      console.warn("[fk] data-i18n sobre un elemento con hijos:", el);
      return;
    }
    el.textContent = t(el.dataset.i18n, lang);
    // Quien duplica su texto en data-text (las copias del glitch de hover del
    // link a Lab) lo mantiene al día con el idioma.
    if (el.dataset.text !== undefined) el.dataset.text = el.textContent;
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel, lang));
  });

  // La meta description del head también se traduce
  document.querySelectorAll("[data-i18n-content]").forEach((el) => {
    el.setAttribute("content", t(el.dataset.i18nContent, lang));
  });

  document.querySelectorAll(".lang-toggle__opt").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.lang === lang);
  });
}

export function initSite() {
  document.querySelectorAll(".lang-toggle").forEach((button) => {
    button.addEventListener("click", () => setLang(lang === "es" ? "en" : "es"));
  });
  applyStrings();
}

// Carga un JSON de data/ y devuelve la lista bajo `key`, ordenada por `order`.
// Requiere servidor HTTP: fetch no corre sobre file://.
async function loadList(file, key) {
  try {
    const response = await fetch(new URL(`../../data/${file}`, import.meta.url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const list = Array.isArray(data[key]) ? data[key] : [];
    return [...list].sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.warn(`[fk] No se pudo cargar data/${file}:`, error.message);
    return [];
  }
}

export const loadCases = () => loadList("cases.json", "cases");
export const loadLabItems = () => loadList("lab.json", "items");
export const loadMilestones = () => loadList("timeline.json", "milestones");

export const featured = (cases) => cases.filter((kase) => kase.featured);

// Lee un parámetro de la query string (?case=gcba).
export function queryParam(name) {
  return new URLSearchParams(location.search).get(name);
}
