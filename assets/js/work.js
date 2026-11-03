// Detalle de caso — se resuelve con ?case=<id>; sin parámetro cae al primero.

import { t, pick } from "../../data/i18n.js";
import { initSite, getLang, onLangChange, loadCases, queryParam } from "./site.js";
import { el, mediaPlaceholder, mediaItem, mediaCover } from "./ui.js";

const notFoundEl = document.getElementById("not-found");
const articleEl = document.getElementById("case");

const nodes = {
  client: document.getElementById("case-client"),
  title: document.getElementById("case-title"),
  line: document.getElementById("case-line"),
  tags: document.getElementById("case-tags"),
  cover: document.getElementById("case-cover"),
  facts: document.getElementById("case-facts"),
  sheet: document.getElementById("case-sheet"),
  body: document.getElementById("case-body"),
  factClient: document.getElementById("fact-client"),
  factRole: document.getElementById("fact-role"),
  factPeriod: document.getElementById("fact-period"),
  siteWrap: document.getElementById("fact-site-wrap"),
  site: document.getElementById("fact-site"),
  narrative: document.getElementById("case-narrative"),
  gallery: document.getElementById("case-gallery"),
  next: document.getElementById("case-next"),
  nextTitle: document.getElementById("case-next-title")
};

let cases = [];

const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector(".lb__img");
let zoomOrigin = null;

/**
 * Galería: usa el media real del caso si ya está cargado (imagen o video,
 * PRD §4). Mientras no haya material, muestra los bloques del diseño.
 */
function renderGallery(kase, lang) {
  const media = kase.media || [];

  if (media.length) {
    nodes.gallery.replaceChildren(...media.map((entry) => mediaItem(entry, lang)));
    return;
  }

  const pending = [
    t("media.imagePending", lang),
    t("media.imagePending", lang),
    t("media.videoPending", lang)
  ];
  nodes.gallery.replaceChildren(
    ...pending.map((label) => mediaPlaceholder({ label }))
  );
}

/* ------------------------------------------------------------
   Formato por secciones (casos con `sections`).
   Los demás casos siguen con la galería de arriba hasta migrarlos.
   ------------------------------------------------------------ */

const ICON_ZOOM = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>';
const ICON_PLAY = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"></path></svg>';

const ICON_OK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7"></path></svg>';
const ICON_NO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>';

const shortUrl = (url) => url.replace(/^https?:\/\//, "");

// Cantidad de columnas de una fila: "repeat(4, 1fr)" → 4, ".4fr .4fr .714fr" → 3
function columnCount(columns) {
  const repeat = /^repeat\(\s*(\d+)/.exec(columns);
  return repeat ? Number(repeat[1]) : columns.trim().split(/\s+/).length;
}

function sheetItem(fact, lang) {
  const item = el("div", fact.wide ? "is-wide" : "");
  item.append(el("dt", "", pick(fact.label, lang)));
  const value = el("dd");

  if (fact.links) {
    fact.links.forEach((url, i) => {
      if (i) value.append(document.createElement("br"));
      const link = el("a", "", `${shortUrl(url)} ↗`);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      value.append(link);
    });
  } else {
    value.textContent = pick(fact.value, lang) || "—";
  }

  item.append(value);
  return item;
}

function textBlock(block, lang) {
  const section = el("section", "tb");
  section.append(el("p", "eyebrow tb__label rv", pick(block.label, lang)));
  const body = el("div", "tb__body rv");
  block.paragraphs.forEach((paragraph) => body.append(el("p", "", pick(paragraph, lang))));
  section.append(body);
  return section;
}

function imageItem(item, lang) {
  const img = document.createElement("img");
  img.src = item.src;
  img.alt = pick(item.alt, lang);
  img.loading = "lazy";
  img.decoding = "async";

  if (!item.zoom) {
    img.className = item.transparent ? "piece piece--clear rv" : "piece rv";
    return img;
  }

  img.className = item.transparent ? "piece--clear" : "";
  const button = el("button", "zoombtn rv");
  button.type = "button";
  button.setAttribute("aria-label", `${t("work.zoom", lang)}: ${img.alt}`);
  button.append(img);
  button.insertAdjacentHTML("beforeend", `<span class="zoombtn__icon">${ICON_ZOOM}</span>`);
  button.addEventListener("click", () => openZoom(button, img));
  return button;
}

// Video de YouTube: portada liviana que se cambia por el reproductor al hacer
// clic. Sin JS el link abre el video en YouTube.
function videoItem(item, lang) {
  const link = el("a", "vid rv");
  link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.style.aspectRatio = item.ratio || "16 / 9";
  link.setAttribute("aria-label", `${t("work.watchVideo", lang)}: ${item.title}`);

  if (item.poster) {
    const img = document.createElement("img");
    img.src = item.poster;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    link.append(img);
  } else {
    link.append(el("span", "vid__ph", t("work.coverPending", lang)));
  }

  link.insertAdjacentHTML("beforeend", `<span class="vid__play">${ICON_PLAY}</span>`);
  link.append(el("span", "vid__tag", "YouTube"));

  link.addEventListener("click", (event) => {
    event.preventDefault();
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.id)}?autoplay=1&rel=0`;
    frame.title = item.title;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;

    const box = el("div", "vid");
    box.style.aspectRatio = link.style.aspectRatio;
    box.append(frame);
    link.replaceWith(box);
    frame.focus();
  });

  return link;
}

function pieceItem(item, lang) {
  // Dentro de una fila, `stack` es una columna de piezas (no el módulo `stack`)
  if (item.type === "stack") {
    const stack = el("div", "stack");
    item.items.forEach((child) => stack.append(pieceItem(child, lang)));
    return stack;
  }

  let node;
  if (item.type === "youtube") node = videoItem(item, lang);
  else if (MODULES[item.type]) node = MODULES[item.type](item, lang);
  else node = imageItem(item, lang);

  if (item.span) {
    node.classList.add("is-span");
    node.style.setProperty("--span", item.span);
  }
  return node;
}

function pieceRow(row, lang) {
  const node = el("div", "row");
  node.style.setProperty("--cols", row.columns);
  if (columnCount(row.columns) >= 4) node.classList.add("row--many");
  if (row.maxWidth) {
    node.classList.add("row--narrow");
    node.style.setProperty("--row-max", row.maxWidth);
  }
  if (row.fit === "cover") {
    node.classList.add("mosaic");
    if (row.ratio) node.style.setProperty("--ratio", row.ratio);
    if (row.position) node.style.setProperty("--pos", row.position);
  }
  row.items.forEach((item) => node.append(pieceItem(item, lang)));
  return node;
}

/* --- Módulos de sección (casos con `flow`) -------------------- */

// Escalona el revelado: 2, 3 y 4 corren el animation-range (ver detail.css).
function reveal(node, step) {
  node.classList.add("rv");
  if (step > 1) node.classList.add(`rv--${step}`);
  return node;
}

// Imagen suelta: se apoya directo sobre la franja, sin marco ni fondo.
function plainImage(entry, lang, className = "") {
  const img = document.createElement("img");
  img.src = entry.src;
  img.alt = pick(entry.alt, lang);
  img.loading = "lazy";
  img.decoding = "async";
  if (className) img.className = className;
  if (entry.width) img.style.width = entry.width;
  if (entry.maxWidth) img.style.maxWidth = entry.maxWidth;
  return img;
}

// Imagen con título y texto abajo.
function figureModule(item, lang) {
  const node = reveal(el("figure", "fig"));
  const box = el("div", "fig__box");
  if (item.ratio) box.style.aspectRatio = item.ratio;

  const img = plainImage(item.image, lang);
  if (item.imageWidth) img.style.width = item.imageWidth;
  box.append(img);

  const caption = el("figcaption");
  caption.append(el("strong", "", pick(item.title, lang)), document.createTextNode(pick(item.text, lang)));
  node.append(box, caption);
  return node;
}

// Notas: título en negrita y texto, separadas por líneas finas.
function notesModule(item, lang) {
  const node = reveal(el("ul", "notes"));
  item.items.forEach((note) => {
    const line = el("li");
    line.append(el("strong", "", pick(note.title, lang)), document.createTextNode(pick(note.text, lang)));
    node.append(line);
  });
  return node;
}

// Un mismo logo en tres marcos, con tilde o cruz.
function diagnosisModule(item, lang) {
  const node = reveal(el("div", "diag"));
  node.style.setProperty("--cols", item.columns);

  item.items.forEach((entry) => {
    const figure = el("figure", "fig");
    const box = el("div", `diag__box diag__box--${entry.variant}`);
    box.append(plainImage({ src: item.src }, lang));
    box.insertAdjacentHTML(
      "beforeend",
      `<span class="diag__mark diag__mark--${entry.ok ? "ok" : "no"}" aria-hidden="true">${entry.ok ? ICON_OK : ICON_NO}</span>`
    );
    figure.append(box, el("figcaption", "", pick(entry.caption, lang)));
    node.append(figure);
  });
  return node;
}

// Dos grupos de conceptos unidos por un corchete que baja al resultado.
function rationaleModule(item, lang) {
  const node = reveal(el("div", "rac"));

  const group = (words, className) => {
    const text = el("p", className);
    words.forEach((word, i) => {
      if (i) text.append(document.createElement("br"));
      text.append(document.createTextNode(pick(word, lang)));
    });
    return text;
  };

  const link = el("div", "rac__link");
  link.setAttribute("aria-hidden", "true");

  const sum = el("div", "rac__sum");
  sum.append(el("p", "display", pick(item.result, lang)));

  node.append(group(item.left, "rac__word"), group(item.right, "rac__word rac__word--b"), link, sum);
  return node;
}

// Logo grande sobre su color de fondo y dos textos que explican cada parte.
function logoAnatomyModule(item, lang) {
  const node = reveal(el("div", "anat"));

  const mark = el("div", "anat__mark");
  if (item.background) mark.style.background = item.background;
  mark.append(plainImage(item, lang));
  node.append(mark);

  item.parts.forEach((part) => {
    const column = el("div", "anat__part");
    column.append(el("p", "anat__cap", pick(part.label, lang)), el("p", "anat__txt", pick(part.text, lang)));
    node.append(column);
  });
  return node;
}

// Fila de piezas, cada una sobre su color de fondo.
function tilesModule(item, lang) {
  const node = el("div", "tiles");
  node.style.setProperty("--n", item.items.length);
  if (item.items.length >= 4) node.classList.add("tiles--many");
  if (item.ratio) node.style.setProperty("--ratio", item.ratio);
  if (item.padding) node.style.setProperty("--tile-pad", item.padding);

  item.items.forEach((tile) => {
    const cell = reveal(el("div", "tiles__cell"));
    cell.style.background = tile.bg;
    cell.append(plainImage(tile, lang));
    node.append(cell);
  });
  return node;
}

// Muestra de color en HTML: nombre y hex abajo a la izquierda.
function swatch(entry, lang, className = "") {
  const node = el("div", `sw ${className}`.trim());
  node.style.background = entry.hex;
  if (entry.light) node.classList.add("sw--light");
  node.append(el("p", "sw__name", pick(entry.name, lang)), el("p", "sw__hex", entry.hex));
  return node;
}

/* Paleta: principal, acentos y base, tipografía y barra de proporciones.
   Los casos que solo traen `swatches` muestran las muestras y nada más. */
function paletteModule(item, lang) {
  if (item.swatches) {
    const node = reveal(el("div", "pal pal--sw"));
    if (item.columns) node.style.setProperty("--cols", item.columns);
    item.swatches.forEach((entry) => node.append(swatch(entry, lang)));
    return node;
  }

  const parts = document.createDocumentFragment();

  const palette = reveal(el("div", "pal"));
  palette.append(swatch(item.main, lang, "sw--main"));
  [...item.accents, ...item.base].forEach((entry) => palette.append(swatch(entry, lang)));

  const type = reveal(el("div", "pal2"));
  const family = el("div", "sw sw--type");
  family.append(el("p", "sw__name", t("work.typeface", lang)), el("p", "sw__family", item.typography.family));
  const weights = el("div", "sw sw--type");
  weights.append(el("p", "sw__name", t("work.weights", lang)), el("p", "sw__hex", pick(item.typography.weights, lang)));
  type.append(family, weights);

  const proportions = reveal(el("div", "prop"));
  const text = el("div", "prop__txt");
  text.append(
    el("p", "prop__cap", pick(item.proportions.label, lang)),
    el("p", "prop__txt-body", pick(item.proportions.text, lang))
  );
  const bar = el("div", "prop__bar");
  bar.setAttribute("aria-hidden", "true");
  item.proportions.bar.forEach((band) => {
    const share = el("span");
    share.style.flex = band.flex;
    share.style.background = band.hex;
    bar.append(share);
  });
  proportions.append(text, bar);

  parts.append(palette, type, proportions);
  return parts;
}

// Formas arriba y, abajo, el título y el texto de cada grupo.
function graphicElementsModule(item, lang) {
  const parts = document.createDocumentFragment();
  const box = el("div", "el");
  const grid = el("div", "el__grid");
  const captions = el("div", "el__caps");

  item.groups.forEach((group, i) => {
    const cell = reveal(el("div", group.band ? "el__cell el__cell--band" : "el__cell"), i + 1);
    group.images.forEach((image) => cell.append(plainImage(image, lang)));
    grid.append(cell);

    const caption = reveal(el("div", "el__cap-item"), i + 1);
    caption.append(el("p", "el__cap", pick(group.label, lang)), el("p", "el__txt", pick(group.text, lang)));
    captions.append(caption);
  });

  box.append(grid);
  parts.append(box, captions);
  return parts;
}

// Etiqueta a la izquierda y texto desde la columna 5, dentro de la franja.
function textRowModule(item, lang) {
  const node = reveal(el("div", "wsrow"));
  node.append(el("p", "eyebrow", pick(item.label, lang)), el("p", "wsrow__body", pick(item.text, lang)));
  return node;
}

// Dos composiciones armadas por capas: cada pieza entra por separado.
function compositionsModule(item, lang) {
  const node = el("div", "duo");

  item.items.forEach((composition) => {
    const box = el("div", composition.center ? "duo__box duo__box--center" : "duo__box");
    composition.layers.forEach((layer) => {
      const img = reveal(
        plainImage(layer, lang, layer.absolute ? "duo__layer duo__layer--abs" : "duo__layer"),
        layer.delay
      );
      ["left", "right", "top", "marginLeft"].forEach((side) => {
        if (layer[side]) img.style[side] = layer[side];
      });
      if (layer.z != null) img.style.zIndex = layer.z;
      box.append(img);
    });
    node.append(box);
  });
  return node;
}

// Laptop arriba y, abajo, los recortes de la web con el celular encima.
function webShowcaseModule(item, lang) {
  const node = el("div", "webpanel");
  node.append(reveal(plainImage(item.laptop, lang, "webpanel__laptop")));

  const collage = el("div", "collage");
  const grid = el("div", "collage__grid");
  item.cards.forEach((card) => grid.append(reveal(plainImage(card, lang))));
  collage.append(grid, plainImage(item.phone, lang, "collage__phone"));

  node.append(collage);
  return node;
}

// Columna centrada de imágenes, cada una con su ancho.
function stackModule(item, lang) {
  const node = el("div", "apps");
  item.items.forEach((child) => node.append(reveal(plainImage(child, lang))));
  return node;
}

// Logos sobre cajas de un color, con título y texto abajo.
function logoBoxesModule(item, lang) {
  const node = el("div", "lbox");
  node.style.setProperty("--n", item.columns);
  if (item.columns >= 3) node.classList.add("lbox--many");
  if (item.ratio) node.style.setProperty("--lbox-ratio", item.ratio);
  if (item.padding) node.style.setProperty("--lbox-pad", item.padding);

  item.items.forEach((entry, i) => {
    const figure = reveal(el("figure", "fig"), (i % item.columns) + 1);
    const box = el("div", "lbox__box");
    if (item.bg) box.style.background = item.bg;
    box.append(plainImage(entry.image, lang));

    const caption = el("figcaption");
    const title = pick(entry.title, lang);
    if (title) caption.append(el("strong", "", title));
    caption.append(document.createTextNode(pick(entry.text, lang)));

    figure.append(box, caption);
    node.append(figure);
  });
  return node;
}

// Logo principal grande y centrado, sobre el color de la marca.
function logoHeroModule(item, lang) {
  const node = reveal(el("div", "idmain"));
  if (item.background) node.style.background = item.background;
  node.append(plainImage(item, lang));
  return node;
}

// Muestras tipográficas en vivo, con la fuente real del caso.
function typeSpecimenModule(item, lang) {
  const node = el("div", "type");
  if (item.columns) node.style.setProperty("--cols", item.columns);

  item.items.forEach((entry, i) => {
    // La primera es la de títulos: columna ancha y muestra más grande
    const cell = reveal(el("div", i === 0 ? "type__cell type__cell--lead" : "type__cell"), i + 1);
    const family = `"${entry.family}", sans-serif`;

    const sample = el("p", "type__sample");
    sample.style.fontFamily = family;
    if (entry.weight) sample.style.fontWeight = entry.weight;
    if (entry.uppercase) sample.style.textTransform = "uppercase";
    if (entry.color) sample.style.color = entry.color;
    pick(entry.sample, lang).split("\n").forEach((line, n) => {
      if (n) sample.append(document.createElement("br"));
      sample.append(document.createTextNode(line));
    });

    const glyphs = el("p", "type__abc", entry.glyphs);
    glyphs.style.fontFamily = family;

    cell.append(el("p", "type__cap", pick(entry.label, lang)), sample, glyphs);
    node.append(cell);
  });
  return node;
}

// Etiqueta y texto a la izquierda, y las tramas sobre blanco a la derecha.
function patternModule(item, lang) {
  const node = el("div", "trama");

  const text = reveal(el("div", "trama__txt"));
  text.append(el("p", "trama__cap", pick(item.label, lang)), el("p", "trama__body", pick(item.text, lang)));

  const images = el("div", "trama__imgs");
  item.items.forEach((entry, i) => {
    const box = reveal(el("div", "trama__box"), i + 1);
    box.append(plainImage(entry, lang));
    images.append(box);
  });

  node.append(text, images);
  return node;
}

// La notebook arriba y, saliendo de abajo de la base, la página que sigue.
function webStripModule(item, lang) {
  const node = el("div", "wstrip");
  node.append(reveal(plainImage(item.laptop, lang, "wstrip__laptop")));

  const page = el("div", "wstrip__page");
  if (item.background) page.style.background = item.background;
  item.sections.forEach((entry) => page.append(reveal(plainImage(entry, lang))));

  node.append(page);
  return node;
}

// Grilla de imágenes del mismo formato.
function gridModule(item, lang) {
  const node = el("div", "pgrid");
  node.style.setProperty("--n", item.columns);
  item.items.forEach((entry, i) => node.append(reveal(plainImage(entry, lang), (i % item.columns) + 1)));
  return node;
}

// Una pieza plana sobre un panel de color.
function panelModule(item, lang) {
  const node = reveal(el("div", "flat"));
  if (item.background) node.style.background = item.background;
  node.append(plainImage(item.image, lang));
  return node;
}

// Posts con el gap mínimo y ancho acotado: se lee como un feed.
function feedModule(item, lang) {
  const node = el("div", "feed");
  node.style.setProperty("--n", item.columns);
  if (item.maxWidth) node.style.setProperty("--feed-max", item.maxWidth);
  item.items.forEach((entry, i) => node.append(reveal(plainImage(entry, lang), (i % item.columns) + 1)));
  return node;
}

// Fila de stories con esquinas redondeadas, bajo su etiqueta.
function storiesModule(item, lang) {
  const parts = document.createDocumentFragment();

  const head = reveal(el("div", "sub"));
  head.append(el("p", "sub__cap", pick(item.label, lang)));

  const row = el("div", "stories");
  item.items.forEach((entry, i) => row.append(reveal(plainImage(entry, lang), i + 1)));

  parts.append(head, row);
  return parts;
}

const MODULES = {
  row: pieceRow,
  figure: figureModule,
  notes: notesModule,
  diagnosis: diagnosisModule,
  rationale: rationaleModule,
  logoAnatomy: logoAnatomyModule,
  tiles: tilesModule,
  palette: paletteModule,
  graphicElements: graphicElementsModule,
  textRow: textRowModule,
  compositions: compositionsModule,
  webShowcase: webShowcaseModule,
  stack: stackModule,
  logoBoxes: logoBoxesModule,
  logoHero: logoHeroModule,
  typeSpecimen: typeSpecimenModule,
  pattern: patternModule,
  webStrip: webStripModule,
  grid: gridModule,
  panel: panelModule,
  feed: feedModule,
  stories: storiesModule
};

/* Flujo del caso: `flow` intercala textos y secciones en un solo orden.
   Los casos del formato anterior traen `blocks` + `sections` por separado. */

function caseFlow(kase) {
  if (Array.isArray(kase.flow)) return kase.flow;
  return [
    ...(kase.blocks || []).map((block) => ({ ...block, kind: "block" })),
    ...(kase.sections || []).map((section) => ({ ...section, kind: "section" }))
  ];
}

// Contenido de una sección: módulos (`content`) o filas de piezas (`rows`).
function sectionContent(section) {
  if (Array.isArray(section.content)) return section.content;
  return (section.rows || []).map((row) => ({ ...row, type: "row" }));
}

function contentModule(item, lang) {
  const build = MODULES[item.type];
  if (build) return build(item, lang);
  // Imagen suelta: va directo sobre la franja, sin marco (salvo que se amplíe)
  if (item.type === "image" && !item.zoom) return reveal(plainImage(item, lang, "wsimg"));
  return pieceItem(item, lang);
}

function workSection(section, number, lang) {
  const node = el("section", "ws");

  // Las secciones sin número (`numbered: false`) no llevan encabezado
  if (section.numbered !== false) {
    const head = el("div", "ws__head rv");
    head.append(
      el("span", "ws__num", String(number).padStart(2, "0")),
      el("h2", "display ws__title", pick(section.title, lang))
    );
    node.append(head);
  }

  const intro = pick(section.intro, lang);
  if (intro) {
    const wrap = el("div", "ws__intro rv");
    wrap.append(el("p", "", intro));
    node.append(wrap);
  }

  const content = el("div", "ws__content");
  sectionContent(section).forEach((item) => content.append(contentModule(item, lang)));
  node.append(content);
  return node;
}

// Quote de la clienta, con las comillas en acento.
function quoteBlock(quote, lang, className = "") {
  const node = reveal(el("blockquote", `quote ${className}`.trim()));

  const mark = (character) => {
    const span = el("span", "q", character);
    span.setAttribute("aria-hidden", "true");
    return span;
  };

  const text = el("p");
  text.append(mark("\u201C"), document.createTextNode(pick(quote.text, lang)), mark("\u201D"));

  const credit = el("footer");
  credit.append(el("strong", "", quote.author));
  if (quote.source) credit.append(document.createTextNode(`, ${quote.source}`));

  node.append(text, credit);
  return node;
}

function resultBlock(result, lang) {
  const node = el("section", result.quote ? "res res--quote" : "res");

  const text = el("div", "res__text rv");
  text.append(el("p", "eyebrow", pick(result.label, lang)), el("p", "res__lead", pick(result.text, lang)));
  node.append(text);

  if (result.stat) {
    const stat = el("div", "res__num rv");
    stat.append(
      el("p", "display res__big", result.stat.value),
      el("p", "res__cap", pick(result.stat.caption, lang))
    );
    node.append(stat);
  }
  if (result.quote) node.append(quoteBlock(result.quote, lang, "res__quote"));
  return node;
}

// Testimonio de cierre, antes de "Siguiente caso".
function closingBlock(quote, lang) {
  const node = el("section", "closing");
  node.append(quoteBlock(quote, lang));
  return node;
}

function renderSections(kase, lang) {
  nodes.client.textContent = pick(kase.eyebrow, lang) || pick(kase.client, lang);
  nodes.sheet.replaceChildren(...(kase.facts || []).map((fact) => sheetItem(fact, lang)));

  let number = 0;
  const parts = caseFlow(kase).map((item) => {
    if (item.kind === "block") return textBlock(item, lang);
    if (item.numbered !== false) number += 1;
    return workSection(item, number, lang);
  });

  if (kase.result) parts.push(resultBlock(kase.result, lang));
  if (kase.closingQuote) parts.push(closingBlock(kase.closingQuote, lang));
  nodes.body.replaceChildren(...parts);
}

function setFormat(sectioned) {
  nodes.sheet.hidden = !sectioned;
  nodes.body.hidden = !sectioned;
  nodes.cover.hidden = sectioned;
  nodes.facts.hidden = sectioned;
  nodes.narrative.parentElement.hidden = sectioned;
  nodes.gallery.hidden = sectioned;
}

/* --- Visor de imágenes ---------------------------------------- */

function openZoom(button, img) {
  zoomOrigin = button;
  lightboxImg.src = img.currentSrc || img.src;
  lightboxImg.alt = img.alt;
  document.documentElement.style.overflow = "hidden";
  lightbox.showModal();
}

// Se cierra con la cruz, con un clic en cualquier parte o con Escape (nativo).
lightbox.addEventListener("click", () => lightbox.close());
lightbox.addEventListener("close", () => {
  lightboxImg.src = "";
  document.documentElement.style.overflow = "";
  if (zoomOrigin && zoomOrigin.isConnected) zoomOrigin.focus();
  zoomOrigin = null;
});

function render() {
  const lang = getLang();
  if (!cases.length) return;

  const wanted = queryParam("case") || cases[0].id;
  const index = cases.findIndex((kase) => kase.id === wanted);

  if (index === -1) {
    notFoundEl.hidden = false;
    articleEl.hidden = true;
    document.title = `${t("work.notFound", lang)} — Fede Kilich`;
    return;
  }

  notFoundEl.hidden = true;
  articleEl.hidden = false;

  const kase = cases[index];
  const next = cases[(index + 1) % cases.length];
  const title = pick(kase.title, lang);

  document.title = `${title} — Fede Kilich`;

  const client = pick(kase.client, lang);
  nodes.client.textContent = client;
  nodes.title.textContent = title;
  nodes.line.textContent = pick(kase.oneLiner, lang);

  nodes.next.href = `work.html?case=${encodeURIComponent(next.id)}`;
  nodes.nextTitle.textContent = pick(next.title, lang);

  const sectioned = Array.isArray(kase.flow) || Array.isArray(kase.sections);
  setFormat(sectioned);

  const tags = kase.tags || [];
  nodes.tags.replaceChildren(...tags.map((tag) => el("li", "tag", tag)));
  nodes.tags.hidden = sectioned || tags.length === 0;

  if (sectioned) {
    renderSections(kase, lang);
    return;
  }

  nodes.cover.replaceChildren(
    kase.coverImage
      ? mediaCover({ src: kase.coverImage, alt: title, focus: kase.coverFocus })
      : mediaPlaceholder({ name: title, label: t("media.imagePending", lang) })
  );

  nodes.factClient.textContent = client || "—";
  nodes.factRole.textContent = pick(kase.role, lang) || "—";
  nodes.factPeriod.textContent = pick(kase.period, lang) || "—";

  if (kase.url) {
    nodes.siteWrap.hidden = false;
    nodes.site.href = kase.url;
    nodes.site.textContent = `${kase.url.replace(/^https?:\/\//, "")} ↗`;
  } else {
    nodes.siteWrap.hidden = true;
  }

  nodes.narrative.textContent = pick(kase.narrative, lang);
  renderGallery(kase, lang);
}

initSite();
onLangChange(render);

loadCases().then((all) => {
  cases = all;
  render();
});

// Volver/avanzar en el historial cambia ?case= sin recargar en algunos navegadores
window.addEventListener("popstate", render);
