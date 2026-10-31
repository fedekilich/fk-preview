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

  const tags = kase.tags || [];
  nodes.tags.replaceChildren(...tags.map((tag) => el("li", "tag", tag)));
  nodes.tags.hidden = tags.length === 0;

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

  nodes.next.href = `work.html?case=${encodeURIComponent(next.id)}`;
  nodes.nextTitle.textContent = pick(next.title, lang);
}

initSite();
onLangChange(render);

loadCases().then((all) => {
  cases = all;
  render();
});

// Volver/avanzar en el historial cambia ?case= sin recargar en algunos navegadores
window.addEventListener("popstate", render);
