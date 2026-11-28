// About — narrativa + timeline "Recorrido".
// Los hitos salen de data/timeline.json; los que declaran caseId toman su texto
// de data/cases.json (campos oneLiner y narrative).
//
// La descripción larga ya no se abre con un botón: el scroll decide qué hito
// está activo, la anterior se desvanece y la nueva aparece. Dos decisiones
// sostienen eso:
//   1. No se anima la altura. Cada descripción ocupa siempre su lugar en el
//      flujo y lo único que cambia es la opacidad, así nada salta debajo del
//      dedo mientras se lee.
//   2. El texto nunca se saca del DOM, así sigue existiendo para el buscador
//      del navegador y para un lector de pantalla.

import { pick } from "../../data/i18n.js";
import { initSite, getLang, onLangChange, loadCases, loadMilestones } from "./site.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const timelineEl = document.getElementById("timeline");
const rowsEl = document.getElementById("timeline-rows");
const yearEl = document.getElementById("timeline-year");
const yearNumEl = yearEl ? yearEl.querySelector(".timeline__year-num") : null;

/** Nodos de cada hito, para repintar sin reconstruir el DOM. */
const rows = [];
/** Casos cargados desde data/cases.json, indexados por id. */
let casesById = new Map();
/** Hito activo según el scroll (-1 = todavía ninguno). */
let activeIndex = -1;

/* ---------------------------------------------------------------
   Años del hito: salen del propio período, no de un campo aparte
   --------------------------------------------------------------- */

/** Los dos años de "2006–2014". El segundo puede faltar ("2021–presente"). */
function parseYears(hito) {
  const raw = hito.period ? hito.period.es || hito.period.en || "" : "";
  const found = raw.match(/\d{4}/g) || [];
  return {
    from: found[0] ? Number(found[0]) : null,
    to: found[1] ? Number(found[1]) : null
  };
}

/** La palabra con la que cierra un período abierto: "presente", "present". */
function openEndedWord(hito, lang) {
  const raw = pick(hito.period, lang) || "";
  const parts = raw.split(/[–—-]/);
  const tail = parts.length > 1 ? parts[parts.length - 1].trim() : "";
  return /\d/.test(tail) ? "" : tail;
}

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

  const label = document.createElement("span");
  label.className = "tl-row__static";
  heading.append(label);

  /* Cargo del hito: celda propia, del otro lado de la línea y a la altura
     del nombre. Aparece y se va con el detalle. En el teléfono, donde no hay
     otro lado, el CSS lo baja debajo del nombre. Es lo que diferencia a los
     dos hitos del Gobierno de la Ciudad, que se llaman igual. */
  const role = document.createElement("p");
  role.className = "tl-row__role";

  const body = document.createElement("div");
  body.className = "tl-row__body";

  const teaser = document.createElement("p");
  teaser.className = "tl-row__teaser";

  const panel = document.createElement("div");
  panel.className = "tl-row__panel";
  panel.id = `panel-${hito.id}`;

  const detail = document.createElement("p");
  panel.append(detail);
  body.append(teaser, panel);

  const dot = document.createElement("span");
  dot.className = "tl-row__dot";
  dot.setAttribute("aria-hidden", "true");

  row.append(period, heading, role, body, dot);

  return {
    hito,
    row,
    period,
    label,
    role,
    teaser,
    panel,
    detail,
    dot,
    years: parseYears(hito),
    openEnded: ""
  };
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

    const roleText = hito.role ? pick(hito.role, lang) : "";

    node.period.textContent = pick(hito.period, lang);
    node.label.textContent = pick(hito.title, lang);
    node.role.textContent = roleText;
    node.role.hidden = !roleText;
    node.teaser.textContent = teaserText;
    node.teaser.hidden = !teaserText;
    node.detail.textContent = detailText;
    node.openEnded = openEndedWord(hito, lang);

    // Un hito sin narrativa cargada no reserva espacio ni cruza nada
    node.row.classList.toggle("tl-row--sin-detalle", !detailText);
  });

  updateProgress();
}

/* ---------------------------------------------------------------
   Línea de progreso, puntos encendidos, hito activo y año de fondo
   --------------------------------------------------------------- */

let progressQueued = false;

function updateProgress() {
  if (!timelineEl || !rows.length) return;

  const rect = timelineEl.getBoundingClientRect();
  const total = rect.height;
  if (total <= 0) return;

  // La línea avanza hasta los 3/4 de la ventana, como un cabezal de lectura
  const progressed = window.innerHeight * 0.75 - rect.top;
  const fillPx = Math.max(0, Math.min(total, progressed));

  timelineEl.style.setProperty("--fill", `${(fillPx / total) * 100}%`);

  // Posición de cada punto respecto del arranque del timeline
  const offsets = rows.map(({ dot }) => {
    const dotRect = dot.getBoundingClientRect();
    return dotRect.top - rect.top + dotRect.height / 2;
  });

  let next = -1;
  rows.forEach(({ dot }, i) => {
    const alcanzado = fillPx >= offsets[i] - 6;
    dot.classList.toggle("is-lit", alcanzado);
    if (alcanzado) next = i;
  });

  // El hito activo es el último que el cabezal de lectura ya pasó
  if (next !== activeIndex) {
    rows.forEach(({ row }, i) => row.classList.toggle("is-active", i === next));
    activeIndex = next;
  }

  updateYear(fillPx, offsets, total);
}

function updateYear(fillPx, offsets, total) {
  if (!yearEl || !yearNumEl) return;

  if (activeIndex < 0) {
    yearEl.classList.remove("is-on");
    return;
  }
  yearEl.classList.add("is-on");

  const node = rows[activeIndex];
  const { from, to } = node.years;
  if (!from) return;

  // Cuánto se recorrió del hito activo: de su punto al del siguiente.
  // Como los períodos son contiguos (2006–2014, 2014–2016, …) el número
  // termina contando de corrido a lo largo de toda la sección.
  const start = offsets[activeIndex];
  const end = activeIndex + 1 < offsets.length ? offsets[activeIndex + 1] : total;
  const span = Math.max(1, end - start);
  const t = prefersReducedMotion.matches
    ? 0
    : Math.max(0, Math.min(1, (fillPx - start) / span));

  /* Una vez que el recorrido llegó a "presente", se queda ahí: Bretzel
     (2024–presente) se superpone con Inviu (2021–presente) y el número no
     tiene que retroceder a 2024. Al subir de nuevo por encima del primer
     período abierto vuelve a contar solo. */
  const yaEnPresente = rows
    .slice(0, activeIndex)
    .find((anterior) => !anterior.years.to && anterior.openEnded);

  let text;
  if (yaEnPresente) {
    text = (node.openEnded || yaEnPresente.openEnded).toUpperCase();
  } else if (to) {
    text = String(Math.round(from + (to - from) * t));
  } else if (node.openEnded && t >= 0.6) {
    // Período abierto: el número llega a su año y resuelve en la palabra
    text = node.openEnded.toUpperCase();
  } else {
    text = String(from);
  }

  yearNumEl.classList.toggle("is-word", /\D/.test(text));
  if (yearNumEl.textContent !== text) yearNumEl.textContent = text;
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

  if (prefersReducedMotion.matches) {
    timelineEl.classList.add("timeline--estatico");
  }

  window.addEventListener("scroll", queueProgress, { passive: true });

  // Al cambiar el ancho cambia el alto de las descripciones: hay que remedir
  let resizeTimer = 0;
  window.addEventListener(
    "resize",
    () => {
      queueProgress();
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateProgress, 150);
    },
    { passive: true }
  );

  if ("ResizeObserver" in window) {
    new ResizeObserver(queueProgress).observe(timelineEl);
  }

  // Las tipografías llegan después del primer pintado y mueven los puntos
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateProgress);
  }

  onLangChange(paint);

  loadMilestones().then(buildTimeline);

  loadCases().then((cases) => {
    casesById = new Map(cases.map((kase) => [kase.id, kase]));
    paint();
  });
}

init();
