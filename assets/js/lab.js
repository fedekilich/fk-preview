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

/* El video del "Próximamente" es decorativo: si el sistema pide menos
   movimiento se queda en el poster. */
function calmarVideo() {
  const video = document.querySelector(".lab-bg__video");
  if (!video) return;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  video.removeAttribute("autoplay");
  video.pause();
}

/* Las copias del glitch salen de data-text, así que tiene que seguir al
   texto real: cambia con el idioma (Próximamente / Coming soon). */
function sincronizarGlitch() {
  const palabra = document.querySelector(".lab-soon__word");
  const copias = document.querySelector(".lab-soon__glitch");
  if (!palabra || !copias) return;
  copias.dataset.text = palabra.textContent.trim();
}

initSite();
initLabGlitch();
calmarVideo();
sincronizarGlitch();
onLangChange(() => {
  render();
  sincronizarGlitch();
});

loadLabItems().then((all) => {
  items = all;
  render();
});
