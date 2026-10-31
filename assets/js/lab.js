// Lab — listado de experimentos.

import { t, pick } from "../../data/i18n.js";
import { initSite, getLang, onLangChange, loadLabItems } from "./site.js";
import { el, mediaPlaceholder } from "./ui.js";
import { initLabGlitch } from "./lab-glitch.js";

const grid = document.getElementById("lab-items");

let items = [];

function labCard(item, lang) {
  const card = el("a", "lab-card");
  card.href = `lab-work.html?item=${encodeURIComponent(item.id)}`;

  card.append(
    mediaPlaceholder({
      icon: "▶",
      name: pick(item.client, lang),
      label: t("media.videoPending", lang)
    })
  );

  const text = el("div", "lab-card__text");
  // Un experimento sin título cargado todavía se anuncia por su cliente
  const title = pick(item.title, lang) || pick(item.client, lang) || item.id;
  text.append(el("h2", "lab-card__title", title));

  const blurb = pick(item.text, lang);
  if (blurb) text.append(el("p", null, blurb));

  card.append(text);
  return card;
}

function render() {
  if (!grid) return;
  const lang = getLang();
  grid.replaceChildren(...items.map((item) => labCard(item, lang)));
}

initSite();
initLabGlitch();
onLangChange(render);

loadLabItems().then((all) => {
  items = all;
  render();
});
