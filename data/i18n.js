// Acceso a los textos del sitio. Los strings viven en strings.js, que se genera
// desde contenido/textos.toml.

import { STRINGS } from "./strings.js";

export function t(key, lang) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.es[key] || key;
}

// Los campos sin traducir quedan vacíos en el archivo de contenido.
const vacio = (value) => typeof value !== "string" || value.trim() === "";

// Devuelve el valor de un campo bilingüe ({ es, en }) o el string tal cual.
// Si falta el idioma pedido, cae al otro antes que mostrar nada.
export function pick(field, lang) {
  if (field == null) return "";
  if (typeof field === "string") return field;

  const wanted = field[lang];
  if (!vacio(wanted)) return wanted;

  const fallback = field.es || field.en || "";
  return vacio(fallback) ? "" : fallback;
}
