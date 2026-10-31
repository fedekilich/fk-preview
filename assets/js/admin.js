/* ==========================================================================
   admin.js — panel local de gestión de casos (PRD §5.7)

   Lee y escribe archivos del proyecto con la File System Access API, sin
   backend. Reparte lo que escribe según el contrato del proyecto:

     · el texto de cada caso  →  contenido/textos.toml  (fuente de verdad)
     · orden, destacado, tags, media y portada  →  data/cases.json

   Escribe los dos a la vez y con el mismo contenido, así el sitio queda
   correcto de inmediato y una corrida posterior de aplicar-textos.py no
   cambia nada.
   ========================================================================== */

import { patchToml, bloqueCasoToml, quitarBloquesCaso } from "./admin-toml.js";

const RUTA_CASOS = "data/cases.json";
const RUTA_TOML = "contenido/textos.toml";
const CAMPOS_TEXTO = ["client", "title", "oneLiner", "role", "period", "narrative"];

const IMAGENES = { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"], "image/avif": [".avif"] };
const VIDEOS = { "video/mp4": [".mp4"], "video/webm": [".webm"], "video/quicktime": [".mov"] };

const ui = {
  abrir: document.getElementById("abrir"),
  guardar: document.getElementById("guardar"),
  nuevo: document.getElementById("nuevo"),
  estado: document.getElementById("estado"),
  contador: document.getElementById("contador"),
  lista: document.getElementById("lista"),
  editor: document.getElementById("editor"),
  aviso: document.getElementById("aviso")
};

const app = {
  dir: null,
  casos: [],
  toml: null,          // texto del TOML, o null si el proyecto no lo tiene
  original: [],        // copia al abrir, para saber qué texto cambió
  seleccion: null,
  sucio: false,
  subidas: new Map(),  // ruta → File pendiente de escribir al guardar
  vistas: new Map()    // ruta → objectURL para las miniaturas
};

const soportado = "showDirectoryPicker" in window;
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clon = (v) => JSON.parse(JSON.stringify(v));
const seleccionado = () => app.casos.find((c) => c.id === app.seleccion) || null;

function decir(texto, tipo = "") {
  ui.estado.textContent = texto;
  ui.estado.className = `estado${tipo ? " " + tipo : ""}`;
}

function marcarSucio(valor = true) {
  app.sucio = valor;
  ui.guardar.disabled = !valor;
  if (valor) decir("Cambios sin guardar", "sucio");
}

const nombreSeguro = (n) => n.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");

function idDesde(texto) {
  return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "caso";
}

/* ─── Acceso a archivos ─────────────────────────────────────────────────── */

async function carpeta(ruta, crear = false) {
  let h = app.dir;
  for (const parte of ruta.split("/").filter(Boolean)) h = await h.getDirectoryHandle(parte, { create: crear });
  return h;
}

async function leer(ruta) {
  try {
    const partes = ruta.split("/");
    const nombre = partes.pop();
    const dir = partes.length ? await carpeta(partes.join("/")) : app.dir;
    return await (await dir.getFileHandle(nombre)).getFile();
  } catch {
    return null;
  }
}

async function escribir(ruta, contenido) {
  const partes = ruta.split("/");
  const nombre = partes.pop();
  const dir = partes.length ? await carpeta(partes.join("/"), true) : app.dir;
  const handle = await dir.getFileHandle(nombre, { create: true });
  const w = await handle.createWritable();
  await w.write(contenido);
  await w.close();
}

/** URL para previsualizar: primero lo que está por subir, si no lo que ya está en disco. */
async function vista(ruta) {
  if (!ruta) return null;
  if (app.vistas.has(ruta)) return app.vistas.get(ruta);
  const archivo = app.subidas.get(ruta) || (await leer(ruta));
  if (!archivo) return null;
  const url = URL.createObjectURL(archivo);
  app.vistas.set(ruta, url);
  return url;
}

/* ─── Abrir el proyecto ─────────────────────────────────────────────────── */

async function abrirProyecto() {
  try {
    const dir = await window.showDirectoryPicker({ id: "fk-portfolio", mode: "readwrite" });
    if ((await dir.requestPermission({ mode: "readwrite" })) !== "granted") {
      return decir("Permiso denegado", "error");
    }
    app.dir = dir;

    const archivo = await leer(RUTA_CASOS);
    if (!archivo) {
      app.dir = null;
      return decir(`No encontré ${RUTA_CASOS} en esa carpeta`, "error");
    }
    app.casos = (JSON.parse(await archivo.text()).cases || []).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    app.original = clon(app.casos);

    const toml = await leer(RUTA_TOML);
    app.toml = toml ? await toml.text() : null;
    if (!app.toml) {
      ui.aviso.insertAdjacentHTML("beforeend",
        `<br><strong>Ojo:</strong> no encontré <code>${RUTA_TOML}</code>. El texto se va a guardar solo en <code>${RUTA_CASOS}</code>.`);
    }

    app.seleccion = app.casos[0]?.id || null;
    app.subidas.clear();
    app.vistas.clear();
    marcarSucio(false);
    decir(`${dir.name} · cargado`, "ok");
    ui.nuevo.disabled = false;
    pintarLista();
    pintarEditor();
  } catch (e) {
    if (e.name === "AbortError") return;
    console.error(e);
    decir("Error al abrir: " + e.message, "error");
  }
}

/* ─── Guardar ───────────────────────────────────────────────────────────── */

/** El orden real es la posición en el array: acá solo se renumera.
 *  Ojo: no reordena. Si reordenara, deshría cada arrastre al repintar. */
function renumerar() {
  app.casos.forEach((c, i) => { c.order = i + 1; });
}

/** Reordena según el campo numérico "Orden" y vuelve a numerar de 1 a n. */
function reordenarPorCampo() {
  app.casos.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  renumerar();
}

/** Diferencias de texto contra el estado al abrir, en formato de parche TOML. */
function cambiosDeTexto() {
  const previos = new Map(app.original.map((c) => [c.id, c]));
  const cambios = [];
  for (const caso of app.casos) {
    const antes = previos.get(caso.id);
    for (const campo of CAMPOS_TEXTO) {
      for (const idioma of ["es", "en"]) {
        const valor = caso[campo]?.[idioma] ?? "";
        if (!antes || (antes[campo]?.[idioma] ?? "") !== valor) {
          cambios.push({ tabla: `caso.${caso.id}.${campo}`, clave: idioma, valor });
        }
      }
    }
    if (!antes || (antes.url ?? "") !== (caso.url ?? "")) {
      cambios.push({ tabla: `caso.${caso.id}.url`, clave: "valor", valor: caso.url ?? "" });
    }
  }
  return cambios;
}

async function guardar() {
  if (!app.dir) return;
  try {
    decir("Guardando…");
    renumerar();

    for (const [ruta, archivo] of app.subidas) await escribir(ruta, archivo);

    if (app.toml) {
      const { texto, errores } = patchToml(app.toml, cambiosDeTexto());
      if (errores.length) console.warn("textos.toml:", errores);
      app.toml = texto;
      await escribir(RUTA_TOML, texto);
    }

    await escribir(RUTA_CASOS, JSON.stringify({ cases: app.casos }, null, 2) + "\n");

    const subidas = app.subidas.size;
    app.subidas.clear();
    app.original = clon(app.casos);
    marcarSucio(false);
    decir(`Guardado ✓${subidas ? ` · ${subidas} archivo${subidas > 1 ? "s" : ""} copiado${subidas > 1 ? "s" : ""}` : ""}`, "ok");
  } catch (e) {
    console.error(e);
    decir("Error al guardar: " + e.message, "error");
  }
}

/* ─── Lista de casos ────────────────────────────────────────────────────── */

async function pintarLista() {
  renumerar();
  ui.contador.textContent = `${app.casos.length} casos`;

  if (!app.casos.length) {
    ui.lista.innerHTML = '<p class="lista__vacia">Sin casos.</p>';
    return;
  }

  ui.lista.innerHTML = app.casos.map((c) => `
    <div class="caso${c.id === app.seleccion ? " activo" : ""}" data-id="${esc(c.id)}" draggable="true" role="button" tabindex="0">
      <span class="caso__asa" aria-hidden="true">⠿</span>
      <div class="caso__thumb" data-thumb="${esc(c.coverImage || "")}">—</div>
      <div>
        <div class="caso__titulo">${esc(c.title?.es || c.id)}</div>
        <div class="caso__sub">${esc(c.client?.es || "")}</div>
      </div>
      <span class="pastilla${c.featured ? " destacado" : ""}">${c.featured ? "Home" : "Archivo"}</span>
    </div>`).join("");

  for (const nodo of ui.lista.querySelectorAll("[data-thumb]")) {
    const url = await vista(nodo.dataset.thumb);
    if (url) nodo.innerHTML = `<img src="${url}" alt="">`;
  }
}

ui.lista.addEventListener("click", (e) => {
  const fila = e.target.closest(".caso");
  if (!fila) return;
  app.seleccion = fila.dataset.id;
  pintarLista();
  pintarEditor();
});

ui.lista.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const fila = e.target.closest(".caso");
  if (!fila) return;
  e.preventDefault();
  app.seleccion = fila.dataset.id;
  pintarLista();
  pintarEditor();
});

/* Reordenar arrastrando */
let arrastrado = null;

ui.lista.addEventListener("dragstart", (e) => {
  const fila = e.target.closest(".caso");
  if (!fila) return;
  arrastrado = fila.dataset.id;
  fila.classList.add("arrastrando");
  e.dataTransfer.effectAllowed = "move";
});

ui.lista.addEventListener("dragover", (e) => {
  const fila = e.target.closest(".caso");
  if (!fila || !arrastrado) return;
  e.preventDefault();
  ui.lista.querySelectorAll(".destino").forEach((n) => n.classList.remove("destino"));
  fila.classList.add("destino");
});

ui.lista.addEventListener("dragend", () => {
  ui.lista.querySelectorAll(".arrastrando, .destino").forEach((n) => n.classList.remove("arrastrando", "destino"));
  arrastrado = null;
});

ui.lista.addEventListener("drop", (e) => {
  const fila = e.target.closest(".caso");
  if (!fila || !arrastrado) return;
  e.preventDefault();
  const desde = app.casos.findIndex((c) => c.id === arrastrado);
  const hasta = app.casos.findIndex((c) => c.id === fila.dataset.id);
  if (desde === -1 || hasta === -1 || desde === hasta) return;
  const [movido] = app.casos.splice(desde, 1);
  app.casos.splice(hasta, 0, movido);
  renumerar();
  marcarSucio();
  pintarLista();
  pintarEditor();
});

/* ─── Editor ────────────────────────────────────────────────────────────── */

function campoBilingue(caso, clave, etiqueta, { area = false } = {}) {
  const control = (idioma) => area
    ? `<textarea data-bind="${clave}.${idioma}">${esc(caso[clave]?.[idioma] || "")}</textarea>`
    : `<input type="text" data-bind="${clave}.${idioma}" value="${esc(caso[clave]?.[idioma] || "")}">`;
  return `
    <div class="dos">
      <div class="campo"><label><span class="idioma">ES</span>${etiqueta}</label>${control("es")}</div>
      <div class="campo"><label><span class="idioma">EN</span>${etiqueta}</label>${control("en")}</div>
    </div>`;
}

async function pintarEditor() {
  const c = seleccionado();
  if (!c) {
    ui.editor.innerHTML = '<p class="editor__vacio">Abrí la carpeta del proyecto y elegí un caso.</p>';
    return;
  }

  ui.editor.innerHTML = `
    <h2 class="editor__titulo">${esc(c.title?.es || c.id)}</h2>
    <p class="editor__id"><code>${esc(c.id)}</code> · posición ${c.order}</p>

    <fieldset>
      <legend>Publicación</legend>
      <label class="switch">
        <input type="checkbox" data-bind="featured" ${c.featured ? "checked" : ""}>
        <span>Destacado — aparece en Home. Si está apagado, sale solo en All Works.</span>
      </label>
      <div class="campo dos" style="margin-top:14px">
        <div><label>Orden</label><input type="number" min="1" data-bind="order" value="${c.order}"></div>
        <div><label>URL del proyecto</label><input type="text" data-bind="url" value="${esc(c.url || "")}"></div>
      </div>
      <div class="campo">
        <label>Tags</label>
        <input type="text" data-bind="tags" value="${esc((c.tags || []).join(", "))}">
        <span class="ayuda">Separados por coma. Alimentan los filtros de All Works.</span>
      </div>
    </fieldset>

    <fieldset>
      <legend>Textos <span class="pendiente">se guardan en contenido/textos.toml</span></legend>
      ${campoBilingue(c, "title", "Título")}
      ${campoBilingue(c, "client", "Cliente")}
      ${campoBilingue(c, "oneLiner", "One-liner")}
      ${campoBilingue(c, "role", "Rol")}
      ${campoBilingue(c, "period", "Período")}
      ${campoBilingue(c, "narrative", "Narrativa", { area: true })}
    </fieldset>

    <fieldset>
      <legend>Portada <span class="pendiente">se ve en la grilla y arriba del caso</span></legend>
      <div class="portada">
        <div class="portada__vista" id="portada-vista"><span>Sin portada</span></div>
        <div class="portada__lado">
          <p class="ayuda" style="margin:0 0 10px">
            Puede ser una imagen propia, distinta de las de la galería. Se copia a
            <code>assets/${esc(c.id)}/</code>. También podés arrastrarla acá.
          </p>
          <div class="media-card__acciones">
            <button class="btn" type="button" data-portada-subir>${c.coverImage ? "Reemplazar" : "Subir imagen"}</button>
            ${c.coverImage ? '<button class="btn btn--peligro" type="button" data-portada-quitar>Quitar</button>' : ""}
          </div>
          ${c.coverImage ? `<p class="ayuda" style="margin-top:8px"><code>${esc(c.coverImage)}</code></p>` : ""}
        </div>
      </div>
    </fieldset>

    <fieldset>
      <legend>Media del caso</legend>
      <div class="media-grid" id="media"></div>
      <div class="nuevo" id="subir" style="margin-top:12px">
        Subir imágenes o videos — click o arrastrá acá. Se copian a <code>assets/${esc(c.id)}/</code>
      </div>
    </fieldset>

    <div class="acciones">
      <button class="btn btn--primario" type="button" data-accion="guardar">Guardar</button>
      <button class="btn btn--peligro" type="button" data-accion="borrar">Eliminar caso</button>
    </div>`;

  await pintarPortada();
  await pintarMedia();
}

async function pintarPortada() {
  const c = seleccionado();
  const caja = document.getElementById("portada-vista");
  if (!caja) return;
  const url = await vista(c.coverImage);
  caja.innerHTML = url ? `<img src="${url}" alt="">` : "<span>Sin portada</span>";
}

async function pintarMedia() {
  const c = seleccionado();
  const cont = document.getElementById("media");
  if (!cont) return;

  const media = c.media || [];
  if (!media.length) {
    cont.innerHTML = '<p class="editor__vacio" style="padding:16px 0">Todavía no hay media. El sitio muestra placeholders.</p>';
    return;
  }

  cont.innerHTML = media.map((m, i) => {
    const alt = typeof m.alt === "string" ? { es: m.alt, en: "" } : (m.alt || {});
    const esPortada = c.coverImage && c.coverImage === m.src;
    return `
      <div class="media-card" data-i="${i}">
        <div class="media-card__vista" data-vista="${i}"><span>${esc(m.type)}</span></div>
        <div class="media-card__fila">
          <span class="media-card__tipo">${esc((m.src || "").split("/").pop() || m.type)}</span>
          <span class="media-card__acciones">
            <button class="btn btn--sm" type="button" data-mover="izq" data-i="${i}" title="Mover antes">←</button>
            <button class="btn btn--sm" type="button" data-mover="der" data-i="${i}" title="Mover después">→</button>
            <button class="btn btn--sm" type="button" data-reemplazar="${i}" title="Reemplazar archivo">↻</button>
            <button class="btn btn--sm btn--peligro" type="button" data-quitar="${i}" title="Quitar">✕</button>
          </span>
        </div>
        <input type="text" data-alt-es="${i}" value="${esc(alt.es || "")}" placeholder="Texto alternativo ES">
        <input type="text" data-alt-en="${i}" value="${esc(alt.en || "")}" placeholder="Texto alternativo EN">
        ${m.type === "image"
          ? `<button class="btn btn--sm ${esPortada ? "btn--primario" : ""}" type="button" data-portada="${i}" style="margin-top:7px;width:100%">
               ${esPortada ? "Es la portada" : "Usar de portada"}</button>`
          : ""}
      </div>`;
  }).join("");

  for (const [i, m] of media.entries()) {
    const nodo = cont.querySelector(`[data-vista="${i}"]`);
    const url = await vista(m.src);
    if (!url) continue;
    nodo.innerHTML = m.type === "video"
      ? `<video src="${url}" muted playsinline preload="metadata"></video>`
      : `<img src="${url}" alt="">`;
  }
}

/* ─── Edición de campos ─────────────────────────────────────────────────── */

ui.editor.addEventListener("input", (e) => {
  const c = seleccionado();
  if (!c) return;
  const campo = e.target;

  if (campo.dataset.bind) {
    const ruta = campo.dataset.bind;
    let valor = campo.type === "checkbox" ? campo.checked : campo.value;
    if (ruta === "order") valor = Number(valor) || 1;
    if (ruta === "tags") valor = campo.value.split(",").map((t) => t.trim()).filter(Boolean);

    if (ruta.includes(".")) {
      const [clave, idioma] = ruta.split(".");
      c[clave] = c[clave] || { es: "", en: "" };
      c[clave][idioma] = valor;
    } else {
      c[ruta] = valor;
    }
    marcarSucio();
    if (["featured", "title.es", "client.es"].includes(ruta)) pintarLista();
    return;
  }

  const iEs = campo.dataset.altEs, iEn = campo.dataset.altEn;
  if (iEs !== undefined || iEn !== undefined) {
    const i = Number(iEs ?? iEn);
    const m = c.media[i];
    if (typeof m.alt === "string") m.alt = { es: m.alt, en: "" };
    m.alt = m.alt || { es: "", en: "" };
    m.alt[iEs !== undefined ? "es" : "en"] = campo.value;
    marcarSucio();
  }
});

ui.editor.addEventListener("change", (e) => {
  // El reordenamiento por número se aplica al confirmar el campo, no mientras se tipea
  if (e.target.dataset.bind !== "order") return;
  reordenarPorCampo();
  pintarLista();
  pintarEditor();
});

ui.editor.addEventListener("click", async (e) => {
  const c = seleccionado();
  if (!c) return;
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.accion === "guardar") return guardar();

  if (btn.dataset.accion === "borrar") {
    if (!confirm(`¿Eliminar «${c.title?.es || c.id}»?\n\nSe borra de cases.json y de textos.toml. Los archivos de assets/${c.id}/ quedan donde están.`)) return;
    app.casos = app.casos.filter((x) => x.id !== c.id);
    if (app.toml) app.toml = quitarBloquesCaso(app.toml, c.id);
    app.seleccion = app.casos[0]?.id || null;
    marcarSucio();
    pintarLista();
    pintarEditor();
    return;
  }

  if (btn.dataset.portadaSubir !== undefined) {
    const [archivo] = await elegirArchivos(IMAGENES, false, "Imagen de portada");
    if (!archivo) return;
    await ponerPortada(c, archivo);
    return;
  }

  if (btn.dataset.portadaQuitar !== undefined) {
    // Solo se descarta el archivo pendiente si la portada no se usa además en la galería
    const enGaleria = (c.media || []).some((m) => m.src === c.coverImage);
    if (!enGaleria) app.subidas.delete(c.coverImage);
    c.coverImage = "";
    marcarSucio();
    pintarEditor();
    pintarLista();
    return;
  }

  if (btn.dataset.quitar !== undefined) {
    const [fuera] = c.media.splice(Number(btn.dataset.quitar), 1);
    app.subidas.delete(fuera.src);
    if (c.coverImage === fuera.src) c.coverImage = "";
    marcarSucio();
    pintarMedia();
    return;
  }

  if (btn.dataset.mover) {
    const i = Number(btn.dataset.i);
    const j = btn.dataset.mover === "izq" ? i - 1 : i + 1;
    if (j < 0 || j >= c.media.length) return;
    [c.media[i], c.media[j]] = [c.media[j], c.media[i]];
    marcarSucio();
    pintarMedia();
    return;
  }

  if (btn.dataset.portada !== undefined) {
    c.coverImage = c.media[Number(btn.dataset.portada)].src;
    marcarSucio();
    pintarMedia();
    pintarLista();
    return;
  }

  if (btn.dataset.reemplazar !== undefined) {
    const i = Number(btn.dataset.reemplazar);
    const anterior = c.media[i];
    const tipos = anterior.type === "video" ? VIDEOS : IMAGENES;
    const [archivo] = await elegirArchivos(tipos, false);
    if (!archivo) return;
    const ruta = await rutaLibre(c.id, archivo.name);
    app.subidas.set(ruta, archivo);
    app.subidas.delete(anterior.src);
    if (c.coverImage === anterior.src) c.coverImage = ruta;
    anterior.src = ruta;
    anterior.type = archivo.type.startsWith("video") ? "video" : "image";
    marcarSucio();
    pintarMedia();
    pintarLista();
  }
});

/* ─── Subida de archivos ────────────────────────────────────────────────── */

async function elegirArchivos(accept, multiple, descripcion = "Media") {
  try {
    const handles = await window.showOpenFilePicker({
      multiple, types: [{ description: descripcion, accept }], excludeAcceptAllOption: false
    });
    return await Promise.all(handles.map((h) => h.getFile()));
  } catch (e) {
    if (e.name === "AbortError") return [];
    throw e;
  }
}

/** assets/<id>/<archivo>, evitando pisar algo que ya exista. */
async function rutaLibre(id, nombre) {
  const limpio = nombreSeguro(nombre);
  const punto = limpio.lastIndexOf(".");
  const base = punto > 0 ? limpio.slice(0, punto) : limpio;
  const ext = punto > 0 ? limpio.slice(punto) : "";
  let ruta = `assets/${id}/${base}${ext}`;
  let n = 2;
  while (app.subidas.has(ruta) || (await leer(ruta))) ruta = `assets/${id}/${base}-${n++}${ext}`;
  return ruta;
}

/** Deja la imagen lista para copiarse a assets/<id>/ y la marca como portada. */
async function ponerPortada(caso, archivo) {
  const anterior = caso.coverImage;
  const ruta = await rutaLibre(caso.id, archivo.name);
  app.subidas.set(ruta, archivo);
  if (anterior && !(caso.media || []).some((m) => m.src === anterior)) app.subidas.delete(anterior);
  caso.coverImage = ruta;
  marcarSucio();
  pintarEditor();
  pintarLista();
}

async function sumarArchivos(archivos) {
  const c = seleccionado();
  if (!c || !archivos.length) return;
  c.media = c.media || [];
  for (const archivo of archivos) {
    const ruta = await rutaLibre(c.id, archivo.name);
    app.subidas.set(ruta, archivo);
    c.media.push({
      type: archivo.type.startsWith("video") ? "video" : "image",
      src: ruta,
      alt: { es: "", en: "" }
    });
  }
  marcarSucio();
  pintarMedia();
}

ui.editor.addEventListener("click", async (e) => {
  if (!e.target.closest("#subir")) return;
  try {
    await sumarArchivos(await elegirArchivos({ ...IMAGENES, ...VIDEOS }, true));
  } catch (err) {
    console.error(err);
    decir("Error al subir: " + err.message, "error");
  }
});

const ZONAS = "#subir, #portada-vista";

ui.editor.addEventListener("dragover", (e) => {
  const zona = e.target.closest(ZONAS);
  if (!zona) return;
  e.preventDefault();
  zona.classList.add("encima");
});
ui.editor.addEventListener("dragleave", (e) => e.target.closest(ZONAS)?.classList.remove("encima"));
ui.editor.addEventListener("drop", async (e) => {
  const zona = e.target.closest(ZONAS);
  if (!zona) return;
  e.preventDefault();
  zona.classList.remove("encima");
  const c = seleccionado();
  if (!c) return;

  if (zona.id === "portada-vista") {
    const imagen = [...e.dataTransfer.files].find((f) => f.type.startsWith("image"));
    if (imagen) await ponerPortada(c, imagen);
    return;
  }

  const archivos = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image") || f.type.startsWith("video"));
  if (archivos.length) await sumarArchivos(archivos);
});

/* ─── Caso nuevo ────────────────────────────────────────────────────────── */

ui.nuevo.addEventListener("click", () => {
  const titulo = prompt("Título del caso nuevo (ES):");
  if (!titulo) return;
  let id = idDesde(titulo);
  while (app.casos.some((c) => c.id === id)) id += "-2";

  const vacio = () => ({ es: "", en: "" });
  app.casos.push({
    id, featured: false, order: app.casos.length + 1,
    client: vacio(), url: "", title: { es: titulo, en: titulo },
    oneLiner: vacio(), role: vacio(), period: vacio(), narrative: vacio(),
    media: [], coverImage: "", tags: []
  });
  if (app.toml) app.toml += bloqueCasoToml(id, titulo);
  app.seleccion = id;
  marcarSucio();
  pintarLista();
  pintarEditor();
});

/* ─── Arranque ──────────────────────────────────────────────────────────── */

ui.abrir.addEventListener("click", abrirProyecto);
ui.guardar.addEventListener("click", guardar);

window.addEventListener("beforeunload", (e) => {
  if (!app.sucio) return;
  e.preventDefault();
  e.returnValue = "";
});

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    if (app.dir && app.sucio) guardar();
  }
});

if (!soportado) {
  ui.abrir.disabled = true;
  ui.aviso.classList.add("error");
  ui.aviso.innerHTML = "<strong>Este navegador no sirve para el panel.</strong> La File System Access API " +
    "solo existe en Chrome y Edge. Abrí <code>admin.html</code> en alguno de los dos para poder editar y guardar.";
  decir("Navegador no compatible", "error");
}
