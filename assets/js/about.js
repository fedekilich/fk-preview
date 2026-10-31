// About — narrativa + timeline "Recorrido".
// Los hitos salen de data/timeline.json; los que declaran caseId toman su texto
// de data/cases.json (campos oneLiner y narrative).

import { pick } from "../../data/i18n.js";
import { initSite, getLang, onLangChange, loadCases, loadMilestones } from "./site.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const timelineEl = document.getElementById("timeline");
const rowsEl = document.getElementById("timeline-rows");

/** Nodos de cada hito, para repintar sin reconstruir el DOM. */
const rows = [];
/** Casos cargados desde data/cases.json, indexados por id. */
let casesById = new Map();

/* ---------------------------------------------------------------
   Construcción del DOM (una sola vez)
   --------------------------------------------------------------- */

function buildRow(hito, index) {
  const row = document.createElement("div");
  row.className = `tl-row ${index % 2 === 0 ? "tl-row--left" : "tl-row--right"}`;

  const period = document.createElement("span");
  period.className = "tl-row__period";

  const heading = document.createElement("h3");
  heading.className = "tl-row__heading";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "tl-row__toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", `panel-${hito.id}`);

  const label = document.createElement("span");
  const plus = document.createElement("span");
  plus.className = "tl-plus";
  plus.setAttribute("aria-hidden", "true");
  toggle.append(label, plus);
  heading.append(toggle);

  const body = document.createElement("div");
  body.className = "tl-row__body";

  const teaser = document.createElement("p");
  teaser.className = "tl-row__teaser";

  const panel = document.createElement("div");
  panel.className = "tl-row__panel";
  panel.id = `panel-${hito.id}`;
  panel.hidden = true;

  const detail = document.createElement("p");
  panel.append(detail);
  body.append(teaser, panel);

  const dot = document.createElement("span");
  dot.className = "tl-row__dot";
  dot.setAttribute("aria-hidden", "true");

  row.append(period, heading, body, dot);

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    panel.hidden = open;
    if (!open) {
      // reinicia la animación de apertura en cada despliegue
      panel.style.animation = "none";
      void panel.offsetWidth;
      panel.style.animation = "";
    }
    updateProgress();
  });

  return { hito, row, period, toggle, label, plus, teaser, panel, detail, dot };
}

/* ---------------------------------------------------------------
   Texto (se repinta al cambiar de idioma o al llegar los casos)
   --------------------------------------------------------------- */

function paint() {
  const lang = getLang();

  rows.forEach((node) => {
    const { hito } = node;
    let teaserText = hito.teaser ? pick(hito.teaser, lang) : "";
    let detailText = hito.expanded ? pick(hito.expanded, lang) : "";

    if (hito.caseId) {
      const kase = casesById.get(hito.caseId);
      if (kase) {
        teaserText = pick(kase.oneLiner, lang);
        detailText = pick(kase.narrative, lang);
      }
    }

    node.period.textContent = pick(hito.period, lang);
    node.label.textContent = pick(hito.title, lang);
    node.teaser.textContent = teaserText;
    node.teaser.hidden = !teaserText;
    node.detail.textContent = detailText;

    // Sin narrativa cargada todavía no hay nada que desplegar
    const hasDetail = Boolean(detailText);
    node.toggle.disabled = !hasDetail;
    node.plus.hidden = !hasDetail;
    if (!hasDetail) {
      node.toggle.setAttribute("aria-expanded", "false");
      node.panel.hidden = true;
    }
  });

  updateProgress();
}

/* ---------------------------------------------------------------
   Línea de progreso + puntos encendidos
   --------------------------------------------------------------- */

let progressQueued = false;

function updateProgress() {
  if (!timelineEl) return;

  const rect = timelineEl.getBoundingClientRect();
  const total = rect.height;
  if (total <= 0) return;

  // La línea avanza hasta los 3/4 de la ventana, como un cabezal de lectura
  const progressed = window.innerHeight * 0.75 - rect.top;
  const fillPx = Math.max(0, Math.min(total, progressed));

  timelineEl.style.setProperty("--fill", `${(fillPx / total) * 100}%`);

  rows.forEach(({ dot }) => {
    const dotRect = dot.getBoundingClientRect();
    const offset = dotRect.top - rect.top + dotRect.height / 2;
    dot.classList.toggle("is-lit", fillPx >= offset - 6);
  });
}

function queueProgress() {
  if (progressQueued) return;
  progressQueued = true;
  requestAnimationFrame(() => {
    progressQueued = false;
    updateProgress();
  });
}

/* ---------------------------------------------------------------
   Entrada en escena
   --------------------------------------------------------------- */

function observeRows() {
  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    rows.forEach(({ row }) => row.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
  );

  rows.forEach(({ row }) => observer.observe(row));
}

/* ---------------------------------------------------------------
   Init
   --------------------------------------------------------------- */

function buildTimeline(hitos) {
  const fragment = document.createDocumentFragment();
  hitos.forEach((hito, index) => {
    const node = buildRow(hito, index);
    rows.push(node);
    fragment.append(node.row);
  });
  rowsEl.append(fragment);

  paint();
  observeRows();

  requestAnimationFrame(updateProgress);
}

function init() {
  initSite();
  if (!rowsEl) return;

  window.addEventListener("scroll", queueProgress, { passive: true });
  window.addEventListener("resize", queueProgress, { passive: true });

  // Abrir un hito cambia la altura del timeline: recalcular la línea
  if ("ResizeObserver" in window) {
    new ResizeObserver(queueProgress).observe(timelineEl);
  }

  onLangChange(paint);

  loadMilestones().then(buildTimeline);

  loadCases().then((cases) => {
    casesById = new Map(cases.map((kase) => [kase.id, kase]));
    paint();
  });
}

init();
