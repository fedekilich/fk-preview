// Detalle de experimento — se resuelve con ?item=<id>; sin parámetro cae al primero.

import { t, pick } from "../../data/i18n.js";
import { initSite, getLang, onLangChange, loadLabItems, queryParam } from "./site.js";
import { mediaPlaceholder, mediaItem } from "./ui.js";

const notFoundEl = document.getElementById("not-found");
const articleEl = document.getElementById("item");

const nodes = {
  client: document.getElementById("item-client"),
  title: document.getElementById("item-title"),
  line: document.getElementById("item-line"),
  cover: document.getElementById("item-cover"),
  factRole: document.getElementById("fact-role"),
  factPeriod: document.getElementById("fact-period"),
  narrative: document.getElementById("item-narrative"),
  gallery: document.getElementById("item-gallery"),
  next: document.getElementById("item-next"),
  nextTitle: document.getElementById("item-next-title")
};

let items = [];

function render() {
  const lang = getLang();
  if (!items.length) return;

  const wanted = queryParam("item") || items[0].id;
  const index = items.findIndex((item) => item.id === wanted);

  if (index === -1) {
    notFoundEl.hidden = false;
    articleEl.hidden = true;
    document.title = `${t("lab.notFound", lang)} — Fede Kilich`;
    return;
  }

  notFoundEl.hidden = true;
  articleEl.hidden = false;

  const item = items[index];
  const next = items[(index + 1) % items.length];
  const title = pick(item.title, lang);

  document.title = `${title || t("lab.title", lang)} — Fede Kilich`;

  nodes.client.textContent = pick(item.client, lang);
  nodes.title.textContent = title;

  const blurb = pick(item.text, lang);
  nodes.line.textContent = blurb;
  nodes.line.hidden = !blurb;

  nodes.cover.replaceChildren(
    mediaPlaceholder({ icon: "▶", label: t("media.videoPending", lang) })
  );

  nodes.factRole.textContent = pick(item.role, lang) || "—";
  nodes.factPeriod.textContent = pick(item.period, lang) || "—";

  const narrative = pick(item.narrative, lang);
  nodes.narrative.textContent = narrative;
  nodes.narrative.hidden = !narrative;

  const media = item.media || [];
  nodes.gallery.replaceChildren(...media.map((entry) => mediaItem(entry, lang)));

  nodes.next.href = `lab-work.html?item=${encodeURIComponent(next.id)}`;
  nodes.nextTitle.textContent = pick(next.title, lang) || pick(next.client, lang) || next.id;
}

initSite();
onLangChange(render);

loadLabItems().then((all) => {
  items = all;
  render();
});

window.addEventListener("popstate", render);
