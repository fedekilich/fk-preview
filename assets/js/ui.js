// Piezas de DOM que comparten varias páginas.

import { t, pick } from "../../data/i18n.js";

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Bloque de media todavía sin material real.
 * `name` imprime el título del caso dentro del placeholder (como en el diseño).
 */
export function mediaPlaceholder({ className = "", name = "", label, icon = "" }) {
  const box = el("div", `media-ph ${className}`.trim());
  const inner = el("div", "media-ph__inner");
  const caption = el("span", "media-ph__label");

  if (icon) {
    const mark = el("span", "media-ph__icon", icon);
    mark.setAttribute("aria-hidden", "true");
    caption.append(mark);
  }
  if (name) caption.append(el("strong", "media-ph__name", name));
  caption.append(document.createTextNode(label));

  inner.append(caption);
  box.append(inner);
  return box;
}

/**
 * Portada real de un caso. Usa el mismo marco que el placeholder (misma clase
 * `media-ph`), así hereda las proporciones y el hover que ya define el CSS de
 * cada contexto: 4/3 en las cards, 21/9 arriba del detalle.
 */
export function mediaCover({ src, alt = "", className = "", focus = "" }) {
  const box = el("div", `media-ph media-ph--foto ${className}`.trim());
  const img = document.createElement("img");
  img.className = "media-ph__img";
  img.src = src;
  img.alt = alt;
  // La portada se recorta al cuadro de la card: `coverFocus` elige qué parte
  // se conserva cuando la proporción no coincide (por defecto, el centro).
  if (focus) img.style.objectPosition = focus;
  img.loading = "lazy";
  img.decoding = "async";
  box.append(img);
  return box;
}

/** Media real de un caso (imagen o video), según PRD §4. */
export function mediaItem(entry, lang) {
  if (entry.type === "video") {
    const video = el("figure", "detail__media");
    const player = document.createElement("video");
    player.src = entry.src;
    player.controls = true;
    player.preload = "metadata";
    if (entry.poster) player.poster = entry.poster;
    video.append(player);
    return video;
  }

  const figure = el("figure", "detail__media");
  const img = document.createElement("img");
  img.src = entry.src;
  img.alt = pick(entry.alt, lang);
  img.loading = "lazy";
  figure.append(img);
  return figure;
}

export function tagList(tags) {
  const list = el("ul", "tag-list");
  tags.forEach((tag) => list.append(el("li", "tag", tag)));
  return list;
}

/**
 * Card de caso, compartida por Home y All Works.
 * `aspect` define la proporción del placeholder; `span` permite que una card
 * ocupe el ancho completo de la grilla (la primera de Home).
 */
export function caseCard(kase, { lang, index, aspect = "4 / 3", span = null }) {
  const title = pick(kase.title, lang);

  const card = el("a", "case-card");
  card.href = `work.html?case=${encodeURIComponent(kase.id)}`;
  if (span) card.style.gridColumn = span;

  const media = kase.coverImage
    ? mediaCover({
        src: kase.coverImage,
        alt: title,
        className: "case-card__media",
        focus: kase.coverFocus
      })
    : mediaPlaceholder({
        className: "case-card__media",
        name: title,
        label: t("media.imagePending", lang)
      });
  media.style.aspectRatio = aspect;

  const meta = el("div", "case-card__meta");
  const info = el("div");

  const client = pick(kase.client, lang);
  if (client) info.append(el("span", "case-card__client", client));
  info.append(el("h3", "case-card__title", title));

  const oneLiner = pick(kase.oneLiner, lang);
  if (oneLiner) info.append(el("p", "case-card__line", oneLiner));

  const tags = (kase.tags || []).slice(0, 3);
  if (tags.length) info.append(tagList(tags));

  meta.append(info, el("span", "case-card__index", String(index + 1).padStart(2, "0")));
  card.append(media, meta);
  return card;
}
