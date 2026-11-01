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
  if (item.type === "stack") {
    const stack = el("div", "stack");
    item.items.forEach((child) => stack.append(pieceItem(child, lang)));
    return stack;
  }
  const node = item.type === "youtube" ? videoItem(item, lang) : imageItem(item, lang);
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

function workSection(section, index, lang) {
  const node = el("section", "ws");

  const head = el("div", "ws__head rv");
  head.append(
    el("span", "ws__num", String(index + 1).padStart(2, "0")),
    el("h2", "display ws__title", pick(section.title, lang))
  );
  node.append(head);

  const intro = pick(section.intro, lang);
  if (intro) {
    const wrap = el("div", "ws__intro rv");
    wrap.append(el("p", "", intro));
    node.append(wrap);
  }

  const rows = el("div", "stack");
  section.rows.forEach((row) => rows.append(pieceRow(row, lang)));
  node.append(rows);
  return node;
}

function resultBlock(result, lang) {
  const node = el("section", "res");

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
  return node;
}

function renderSections(kase, lang) {
  nodes.client.textContent = pick(kase.eyebrow, lang) || pick(kase.client, lang);
  nodes.sheet.replaceChildren(...(kase.facts || []).map((fact) => sheetItem(fact, lang)));

  const parts = [
    ...(kase.blocks || []).map((block) => textBlock(block, lang)),
    ...kase.sections.map((section, i) => workSection(section, i, lang))
  ];
  if (kase.result) parts.push(resultBlock(kase.result, lang));
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

  const sectioned = Array.isArray(kase.sections);
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
      ? mediaCover({ src: kase.coverImage, alt: title })
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
