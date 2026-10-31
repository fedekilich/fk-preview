/* ==========================================================================
   admin-toml.js — edición quirúrgica de contenido/textos.toml

   El panel no reescribe el archivo entero: reemplaza únicamente el valor de
   las entradas que cambiaron. Así se conservan intactos los comentarios, las
   notas de cada entrada y el orden del archivo.
   Va en su propio módulo para poder probarlo fuera del navegador.
   ========================================================================== */

/** Serializa un valor con el mismo criterio que usa el archivo a mano:
 *  comillas triples para los textos largos o con saltos, simples para el resto. */
export function valorToml(texto) {
  const v = String(texto ?? "");
  if (v.includes("\n") || v.length > 90) {
    return '"""\n' + v.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"') + '"""';
  }
  return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/** Ubica el rango de líneas de una tabla `[nombre]`. Devuelve null si no está. */
function rangoTabla(lineas, tabla) {
  const cabecera = `[${tabla}]`;
  const inicio = lineas.findIndex((l) => l.trim() === cabecera);
  if (inicio === -1) return null;
  let fin = lineas.length;
  for (let i = inicio + 1; i < lineas.length; i++) {
    if (lineas[i].trimStart().startsWith("[")) { fin = i; break; }
  }
  return { inicio, fin };
}

/** Ubica el rango de líneas que ocupa `clave = valor` dentro de una tabla. */
function rangoClave(lineas, { inicio, fin }, clave) {
  const patron = new RegExp(`^\\s*${clave}\\s*=`);
  for (let i = inicio + 1; i < fin; i++) {
    if (!patron.test(lineas[i])) continue;
    const resto = lineas[i].slice(lineas[i].indexOf("=") + 1).trim();
    if (!resto.startsWith('"""')) return { desde: i, hasta: i };
    // Multilínea: puede abrir y cerrar en la misma línea o varias más abajo.
    if (resto.length > 3 && resto.endsWith('"""')) return { desde: i, hasta: i };
    for (let j = i + 1; j < fin; j++) {
      if (lineas[j].includes('"""')) return { desde: i, hasta: j };
    }
    return { desde: i, hasta: fin - 1 };
  }
  return null;
}

/**
 * Aplica cambios sobre el texto del TOML.
 * @param {string} texto  contenido actual del archivo
 * @param {Array<{tabla: string, clave: string, valor: string}>} cambios
 * @returns {{texto: string, aplicados: number, errores: string[]}}
 */
export function patchToml(texto, cambios) {
  const lineas = texto.split("\n");
  const errores = [];
  const pendientes = [];

  for (const cambio of cambios) {
    const tabla = rangoTabla(lineas, cambio.tabla);
    if (!tabla) {
      errores.push(`No existe la entrada [${cambio.tabla}] en textos.toml`);
      continue;
    }
    const clave = rangoClave(lineas, tabla, cambio.clave);
    if (!clave) {
      // La entrada existe pero le falta esa clave: la agregamos al final del bloque.
      let fin = tabla.fin - 1;
      while (fin > tabla.inicio && lineas[fin].trim() === "") fin--;
      pendientes.push({ desde: fin + 1, hasta: fin, ...cambio, insertar: true });
      continue;
    }
    pendientes.push({ ...clave, ...cambio });
  }

  // De abajo hacia arriba, así los índices de arriba siguen siendo válidos.
  pendientes.sort((a, b) => b.desde - a.desde);
  for (const p of pendientes) {
    const nueva = `${p.clave} = ${valorToml(p.valor)}`;
    if (p.insertar) lineas.splice(p.desde, 0, nueva);
    else lineas.splice(p.desde, p.hasta - p.desde + 1, nueva);
  }

  return { texto: lineas.join("\n"), aplicados: pendientes.length, errores };
}

/** Bloque nuevo para un caso recién creado. Las notas quedan vacías a propósito:
 *  las escribe Fede, el panel no inventa texto. */
export function bloqueCasoToml(id, titulo) {
  const campos = ["client", "title", "oneLiner", "role", "period", "narrative"];
  const lineas = [
    "",
    "",
    `# ─── ${titulo}   ·   id: ${id} ───`,
    ""
  ];
  for (const campo of campos) {
    lineas.push(`[caso.${id}.${campo}]`, 'nota = ""', 'es = ""', 'en = ""', "");
  }
  lineas.push(`[caso.${id}.url]`, 'nota = ""', 'valor = ""');
  return lineas.join("\n");
}

/** Saca del TOML todas las tablas de un caso (al borrarlo del panel). */
export function quitarBloquesCaso(texto, id) {
  const lineas = texto.split("\n");
  const prefijo = `[caso.${id}.`;
  const conservar = [];
  let saltando = false;

  for (const linea of lineas) {
    const limpia = linea.trimStart();
    if (limpia.startsWith("[")) saltando = limpia.startsWith(prefijo);
    // El comentario que titula el bloque del caso también se va
    if (!saltando && limpia.startsWith("#") && limpia.includes(`id: ${id} `)) continue;
    if (!saltando) conservar.push(linea);
  }
  return conservar.join("\n").replace(/\n{4,}/g, "\n\n\n");
}
