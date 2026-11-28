// Todo el trabajo — catálogo completo con filtro por tag.
//
// Los casos guardan ids de tag; los nombres visibles salen del catálogo
// (data/tags.json), así que cambian con el idioma sin tocar los casos.

import { t } from "../../data/i18n.js";
import { initSite, getLang, onLangChange, loadCases, loadTags, tagLabel } from "./site.js";
import { caseCard, el } from "./ui.js";

const filtersEl = document.getElementById("filters");
const gridEl = document.getElementById("all-cases");
const emptyEl = document.getElementById("all-empty");

let cases = [];
/** Catálogo completo, en su orden: manda el orden de los filtros. */
let catalog = [];
let activeTag = null;
/** Botones vivos: se crean una sola vez para no perder el foco al filtrar. */
let buttons = [];

/** Ids del catálogo con al menos un caso, en el orden del catálogo. */
function usedTags() {
  const enUso = new Set(cases.flatMap((kase) => kase.tags || []));
  return catalog.filter((tag) => enUso.has(tag.id)).map((tag) => tag.id);
}

function buildFilters() {
  const makeButton = (tag) => {
    const button = el("button", "filter");
    button.type = "button";
    button.addEventListener("click", () => {
      activeTag = tag;
      syncFilters();
      renderGrid();
    });
    return { button, tag };
  };

  // El primero es "Todos" (tag null); después, los del catálogo que se usan
  buttons = [makeButton(null), ...usedTags().map((id) => makeButton(id))];

  filtersEl.replaceChildren(...buttons.map(({ button }) => button));
  relabelFilters();
  syncFilters();
}

/** Los nombres de los filtros salen del catálogo: se repintan al cambiar idioma. */
function relabelFilters() {
  const lang = getLang();
  buttons.forEach(({ button, tag }) => {
    button.textContent = tag === null ? t("all.filterAll", lang) : tagLabel(tag, lang);
  });
}

function syncFilters() {
  buttons.forEach(({ button, tag }) => {
    button.setAttribute("aria-pressed", String(activeTag === tag));
  });
}

function renderGrid() {
  const lang = getLang();

  /* Un tag que ya no existe (un link viejo, un estado guardado) cae en
     "Todos", en vez de dejar la grilla vacía sin explicación. */
  if (activeTag && !usedTags().includes(activeTag)) {
    activeTag = null;
    syncFilters();
  }

  const visible = activeTag
    ? cases.filter((kase) => (kase.tags || []).includes(activeTag))
    : cases;

  gridEl.replaceChildren(
    ...visible.map((kase, index) => caseCard(kase, { lang, index }))
  );
  emptyEl.hidden = visible.length > 0;
}

function relabel() {
  relabelFilters();
  renderGrid();
}

initSite();
onLangChange(relabel);

Promise.all([loadCases(), loadTags()]).then(([todos, catalogo]) => {
  cases = todos;
  catalog = catalogo;
  buildFilters();
  renderGrid();
});
