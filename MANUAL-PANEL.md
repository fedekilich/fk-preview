# Manual del panel de casos

El panel (`admin.html`) es una herramienta privada para gestionar los casos del
portfolio sin tocar código: editar textos, ordenar, destacar y subir imágenes.
No está linkeado desde el sitio y no se indexa en buscadores.

---

## Antes de empezar

**Necesitás Chrome o Edge.** El panel usa una función del navegador para leer y
escribir archivos de tu computadora que Safari y Firefox no tienen. En esos dos
la página abre pero no deja hacer nada, y te lo avisa.

**El panel se abre a través del servidor local**, no haciendo doble click en el
archivo. Desde la carpeta del proyecto:

```bash
python3 -m http.server 4321
```

Y después en el navegador: `http://localhost:4321/admin.html`

---

## Primeros pasos

1. **Abrir carpeta del proyecto** — el botón de arriba a la izquierda. Se abre el
   buscador de archivos: elegí la carpeta del portfolio (la que tiene adentro
   `data`, `assets` y `contenido`) y dale permiso cuando el navegador pregunte.
2. El permiso dura **lo que dure la pestaña**. Si la cerrás y volvés, hay que
   abrir la carpeta otra vez. Es así por seguridad del navegador, no es un error.
3. Si elegís una carpeta equivocada te avisa que no encontró `data/cases.json`.

---

## La pantalla

**Barra de arriba:** abrir la carpeta, el estado (qué está pasando en este
momento), crear un caso nuevo y guardar.

**Columna izquierda:** todos los casos en el orden en que aparecen en el sitio,
con su miniatura, su cliente y una etiqueta que dice **Home** o **Archivo**.

**Columna derecha:** todo lo editable del caso que tengas seleccionado.

---

## Qué podés hacer

### Editar los textos

Todos los campos están en **español e inglés**, uno al lado del otro: título,
cliente, one-liner, rol, período y narrativa. Escribís y listo. En la narrativa,
para separar párrafos dejá una línea en blanco entre ellos.

### Decidir qué casos van en Home

El interruptor **Destacado** los mueve entre las dos listas: encendido aparece en
Home, apagado sale solo en All Works. La etiqueta de la columna izquierda cambia
al instante.

### Cambiar el orden

Dos formas, la que te resulte más cómoda:

- **Arrastrando** la fila del caso a la posición que quieras.
- Escribiendo un número en el campo **Orden**. Se reacomoda cuando salís del campo.

El orden que ves en la lista es el orden real del sitio.

### La portada

Es la imagen que se ve en la grilla de Home y arriba de todo cuando entrás al
caso. Tiene su propio bloque y **puede ser una imagen exclusiva**, distinta de
las de la galería.

Podés subirla con el botón o arrastrándola sobre el recuadro. Si preferís usar
una foto que ya subiste a la galería, cada imagen tiene abajo un botón
**Usar de portada**.

Mientras un caso no tenga portada, el sitio sigue mostrando el bloque gris con
el nombre del caso. No se rompe nada.

### Las imágenes y videos del caso

La galería que se ve dentro del caso, más abajo de la narrativa. Podés subir
**imágenes y videos mezclados** en el mismo caso: click en la zona punteada o
arrastrando los archivos.

Cada pieza tiene:

- **←** y **→** para cambiar el orden en que se muestran
- **↻** para reemplazar ese archivo por otro
- **✕** para sacarla
- dos campos de texto para describirla en español y en inglés (es lo que leen
  las personas ciegas y lo que se ve si la imagen no carga)

### Tags y link

Los **tags** son las disciplinas del caso, separadas por coma. Alimentan los
filtros de All Works. La **URL** es el sitio del cliente: si la dejás vacía, la
fila "Ver sitio" no aparece en el caso.

### Casos nuevos y bajas

**+ Caso nuevo** te pide un título y crea el caso vacío, listo para completar.

**Eliminar caso** lo saca del sitio. Los archivos que hayas subido quedan
guardados en su carpeta por si los necesitás después.

---

## Guardar

Nada se escribe hasta que apretás **Guardar** (o `⌘S`). Mientras tengas cambios
sin guardar, el estado de arriba lo dice, y si intentás cerrar la pestaña el
navegador te frena.

Al guardar pasan tres cosas:

- Los **textos** se escriben en `contenido/textos.toml`
- El **orden, los destacados, los tags y las imágenes** en `data/cases.json`
- Los **archivos que subiste** se copian a `assets/` en una carpeta con el nombre
  del caso, por ejemplo `assets/gcba/`

### Por qué los textos van a otro archivo

Tu proyecto ya tenía un sistema donde todo el texto vive en un archivo aparte
(`contenido/textos.toml`) y desde ahí se vuelca al sitio. Si el panel escribiera
los textos en otro lado, la próxima vez que corrieras ese volcado te borraría lo
que hubieras editado acá. Escribiendo en los dos lugares a la vez, el sitio queda
bien al instante y el volcado no cambia nada.

---

## Si algo no sale

**"Este navegador no sirve para el panel"** — estás en Safari o Firefox. Abrilo
en Chrome o Edge.

**"No encontré data/cases.json"** — elegiste otra carpeta. Tiene que ser la raíz
del proyecto.

**Guardaste pero el sitio se ve igual** — el navegador guardó la versión vieja en
memoria. Refrescá forzado con `⌘⇧R`.

**Cerraste sin guardar** — se perdieron esos cambios, incluidos los archivos que
habías elegido subir. Nada se rompe: el proyecto queda como estaba.

---

## Lo que el panel no hace

- **No publica.** Guardar escribe en tu computadora. Subir los cambios al sitio
  publicado es el paso siguiente, con tu flujo de git de siempre.
- **No edita los textos de las páginas** (Home, About, Contact, los botones). Eso
  se sigue editando en `contenido/textos.toml`.
- **No maneja Lab ni la línea de tiempo de About.** Solo casos.
