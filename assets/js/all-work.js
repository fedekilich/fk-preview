// All Works — catálogo completo con filtro por tag.

import { t } from "../../data/i18n.js";
import { initSite, getLang, onLangChange, loadCases } from "./site.js";
import { caseCard, el } from "./ui.js";

const filtersEl = document.getElementById("filters");
const gridEl = document.getElementById("all-cases");
const emptyEl = document.getElementById("all-empty");

let cases = [];
let activeTag = null;
/** Botones vivos: se crean una sola vez para no perder el foco al filtrar. */
let buttons = [];

/** Sólo vale la pena filtrar por un tag que aparece en más de un caso. */
function sharedTags() {
  const counts = new Map();
  cases.flatMap((kase) => kase.tags || []).forEach((tag) => {
    counts.set(tag, (counts.get(tag) || 0) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([tag]) => tag)
    .sort();
}

function buildFilters() {
  const makeButton = (label, tag) => {
    const button = el("button", "filter", label);
    button.type = "button";
    button.addEventListener("click", () => {
      activeTag = tag;
      syncFilters();
      renderGrid();
    });
    return { button, tag };
  };

  buttons = [
    makeButton(t("all.filterAll", getLang()), null),
    ...sharedTags().map((tag) => makeButton(tag, tag))
  ];

  filtersEl.replaceChildren(...buttons.map(({ button }) => button));
  syncFilters();
}

function syncFilters() {
  buttons.forEach(({ button, tag }) => {
    button.setAttribute("aria-pressed", String(activeTag === tag));
  });
}

function renderGrid() {
  const lang = getLang();
  const visible = activeTag
    ? cases.filter((kase) => (kase.tags || []).includes(activeTag))
    : cases;

  gridEl.replaceChildren(
    ...visible.map((kase, index) => caseCard(kase, { lang, index }))
  );
  emptyEl.hidden = visible.length > 0;
}

// Al cambiar de idioma sólo cambia la etiqueta "Todos": los tags son nombres propios
function relabel() {
  const all = buttons[0];
  if (all) all.button.textContent = t("all.filterAll", getLang());
  renderGrid();
}

initSite();
onLangChange(relabel);

loadCases().then((all) => {
  cases = all;
  buildFilters();
  renderGrid();
});
