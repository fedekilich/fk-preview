// Home — grilla de casos destacados.
// La primera card ocupa el ancho completo, como en el diseño.

import { initSite, getLang, onLangChange, loadCases, featured } from "./site.js";
import { caseCard } from "./ui.js";

const grid = document.getElementById("featured-cases");

let cases = [];

function render() {
  if (!grid) return;
  const lang = getLang();

  grid.replaceChildren(
    ...cases.map((kase, index) =>
      caseCard(kase, {
        lang,
        index,
        aspect: index === 0 ? "21 / 9" : "16 / 10",
        span: index === 0 ? "1 / -1" : null
      })
    )
  );
}

initSite();
onLangChange(render);

loadCases().then((all) => {
  cases = featured(all);
  render();
});

// --- Hero: video de la masa -------------------------------------
// Con "reducir movimiento" queda el primer cuadro fijo (igual al póster).
// Si no, se pausa cuando el hero sale de pantalla, para no gastar de más.
const heroVideo = document.querySelector(".hero__video");

if (heroVideo) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (reduce.matches) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
    heroVideo.currentTime = 0;
  } else if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      // El navegador puede entregar varias lecturas juntas: vale la última,
      // no la primera, que puede estar vencida.
      const entry = entries[entries.length - 1];
      if (entry.isIntersecting) heroVideo.play().catch(() => {});
      else heroVideo.pause();
    }, { threshold: 0.05 }).observe(heroVideo);
  }
}
