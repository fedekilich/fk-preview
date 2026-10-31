/* ==========================================================================
   lab-glitch.js — glitch de transición de pantalla completa
   Corre una sola vez, apenas termina el corte de color (CSS: .lab-cut).
   Enfoque: se clona .lab-stage y se arman capas sobre un overlay —
   4 bandas horizontales con desplazamiento propio + 2 copias tintadas para el
   RGB split + scanlines. Se destruye todo al terminar; no queda nada corriendo.
   ========================================================================== */

const CUT_MS = 340;    // duración del corte de color (assets/css/lab.css)
const GLITCH_MS = 320; // duración del glitch
const BANDAS = [       // franjas irregulares, en % de alto de viewport
  [0, 26],
  [26, 47],
  [47, 71],
  [71, 100]
];

const azar = (min, max) => min + Math.random() * (max - min);

function glitch() {
  const stage = document.querySelector(".lab-stage");
  if (!stage) return;

  const overlay = document.createElement("div");
  overlay.className = "glitch";
  overlay.setAttribute("aria-hidden", "true");

  const desplazamiento = -window.scrollY;

  /** Copia de la pantalla, sin ids duplicados y sin foco alcanzable. */
  function copia() {
    const clon = stage.cloneNode(true);
    clon.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clon.querySelectorAll("a, button, input, video").forEach((el) => {
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-hidden", "true");
    });
    clon.classList.remove("is-glitching");
    clon.style.transform = `translateY(${desplazamiento}px)`;
    return clon;
  }

  // 1. Block displacement: cada banda es una copia recortada que se corre sola
  BANDAS.forEach(([desde, hasta], i) => {
    const banda = document.createElement("div");
    banda.className = "glitch__layer glitch__band";
    banda.style.clipPath = `inset(${desde}% 0 ${100 - hasta}% 0)`;
    banda.style.setProperty("--dx", `${azar(8, 20).toFixed(1)}px`);
    banda.style.setProperty("--dir", Math.random() < 0.5 ? "-1" : "1");
    banda.style.animationDelay = `${(i * 12).toFixed(0)}ms`;
    banda.append(copia());
    overlay.append(banda);
  });

  // 2. RGB split: la misma pantalla, corrida y tintada, en modo screen
  ["red", "cyan"].forEach((canal) => {
    const capa = document.createElement("div");
    capa.className = `glitch__layer glitch__rgb glitch__rgb--${canal}`;
    capa.append(copia());
    overlay.append(capa);
  });

  // 3. Scanlines de alto contraste barriendo la pantalla
  const scan = document.createElement("div");
  scan.className = "glitch__scan";
  scan.append(
    document.createElement("span"),
    document.createElement("span"),
    document.createElement("span")
  );
  overlay.append(scan);

  stage.classList.add("is-glitching");
  document.body.append(overlay);

  setTimeout(() => {
    overlay.remove();
    stage.classList.remove("is-glitching");
  }, GLITCH_MS);
}

/** Encadena el glitch al corte de color. No hace nada si se pidió menos movimiento. */
export function initLabGlitch() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setTimeout(glitch, CUT_MS);
}
