# -*- coding: utf-8 -*-
"""Para qué sirve cada texto del sitio. Alimenta el campo `nota` de contenido/textos.toml."""

UI = {
    "nav.about": "Label del link a About. En el header y el pie de las 7 páginas.",
    "nav.work": "Label del link al catálogo completo (all-work.html), no a un caso suelto.",
    "nav.contact": "Label del link a Contact.",
    "nav.lab": "Label del link a Lab. Va en minúscula y en azul para anticipar la mutación de la sección.",
    "nav.langLabel": "Texto del botón ES/EN para lectores de pantalla. No se ve; describe la acción, no el estado.",
    "nav.skip": "Link para saltar al contenido. Solo aparece al navegar con teclado.",
    "nav.primary": "Nombre de la navegación del header para lectores de pantalla.",
    "nav.footer": "Nombre de la navegación del pie para lectores de pantalla.",

    "hero.role": "Volanta del hero de Home, arriba del nombre. Define el rubro en tres palabras.",
    "hero.intro": "Bajada del hero de Home. Es la primera definición de qué hacés: lo lee un reclutador antes que nada.",
    "hero.scroll": "Label del indicador de scroll al pie del hero.",

    "home.workEyebrow": "Volanta de la sección de casos destacados en Home.",
    "home.workTitle": "Título de la sección de casos destacados en Home.",
    "home.viewAll": "Link al catálogo completo. Aparece dos veces en Home: arriba de la grilla y en el botón del final.",

    "work.client": "Etiqueta de la ficha del caso: la columna del cliente.",
    "work.role": "Etiqueta de la ficha: tu rol en el proyecto. También se usa en el detalle de Lab.",
    "work.period": "Etiqueta de la ficha: cuándo se hizo. También se usa en el detalle de Lab.",
    "work.site": "Etiqueta de la ficha: link al sitio publicado. Solo aparece si el caso tiene URL.",
    "work.next": "Volanta del link al caso siguiente, al pie del detalle.",
    "work.back": "Link de vuelta al catálogo, al pie del detalle.",
    "work.notFound": "Mensaje cuando la URL trae un caso que no existe (?case=loquesea).",
    "work.notFoundCta": "Botón de salida de esa pantalla de error.",
    "work.coverPending": "Recuadro de un video del caso que todavía no tiene portada. Se borra cuando esté el frame.",
    "work.zoom": "Lectores de pantalla: botón que abre una imagen del caso en grande. Va seguido de la descripción de la imagen.",
    "work.zoomDialog": "Lectores de pantalla: nombre del visor de imágenes a pantalla completa.",
    "work.close": "Lectores de pantalla: botón que cierra el visor de imágenes.",
    "work.watchVideo": "Lectores de pantalla: link de un video del caso. Va seguido del nombre del video.",

    "all.eyebrow": "Volanta de All Works.",
    "all.title": "Título de All Works.",
    "all.intro": "Bajada de All Works: qué va a encontrar quien entra y con qué criterio está ordenado.",
    "all.filterAll": "Primer filtro del catálogo: muestra todos los casos. Los demás filtros son los tags, que no se traducen.",
    "all.filterLabel": "Nombre del grupo de filtros para lectores de pantalla.",
    "all.empty": "Mensaje si un filtro no deja ningún caso a la vista.",

    "lab.eyebrow": "Volanta de Lab.",
    "lab.title": "Título de Lab. Se le agrega un cursor verde parpadeante por CSS, no va en el texto.",
    "lab.intro": "Bajada de Lab: por qué existe la sección y en qué se diferencia del trabajo con clientes.",
    "lab.back": "Link de vuelta al listado de Lab, al pie del detalle.",
    "lab.next": "Volanta del link al experimento siguiente.",
    "lab.notFound": "Mensaje cuando la URL trae un experimento que no existe.",
    "lab.notFoundCta": "Botón de salida de esa pantalla de error.",

    "about.eyebrow": "Volanta de About.",
    "about.title": "Titular de About (h1). Se corta a ~16 caracteres por línea: conviene que sea corto.",
    "about.name": "Tu nombre, abajo del titular de About, alineado a la izquierda.",
    "about.role": "Tu rol, abajo del titular de About, alineado a la derecha. Enfrenta al nombre.",
    "about.photoPending": "Texto del recuadro que reemplaza a tu foto hasta que exista. Se borra la entrada cuando se cargue la imagen.",
    "about.quote": "Frase destacada de About, en grande y en color de acento. Es la idea que resume todo el bio.",
    "about.p1": "Primer párrafo de About: cómo empezaste y de dónde viene la curiosidad.",
    "about.p2": "Segundo párrafo de About: el recorrido por productoras, agencias, gobierno y fintech, y qué te dejó cada uno.",
    "about.p3": "Tercer párrafo de About: qué conecta todo eso. Es el argumento central del posicionamiento.",
    "about.p4": "Cuarto párrafo de About: qué aportás en un rol de liderazgo. Cierra apuntando a lo que busca quien contrata.",
    "about.timelineTitle": "Título de la sección de recorrido profesional en About.",

    "contact.eyebrow": "Volanta de Contact.",
    "contact.title": "Titular de Contact.",
    "contact.emailLabel": "Etiqueta de la fila del email.",
    "contact.linkedinLabel": "Etiqueta de la fila de LinkedIn.",
    "contact.copied": "Confirmación al copiar el email. Aparece al lado de la etiqueta y se desvanece sola.",
    "contact.copyFail": "Aviso si el navegador bloqueó el copiado, para que lo seleccione a mano.",
    "contact.copyHint": "Texto del botón de email para lectores de pantalla: aclara que copia, no que abre el correo.",
    "contact.based": "Línea de cierre de Contact: desde dónde trabajás y con qué alcance.",

    "media.imagePending": "Texto de los recuadros que reemplazan a las imágenes que faltan. Se borra cuando haya material real.",
    "media.videoPending": "Texto de los recuadros que reemplazan a los videos que faltan.",

    "footer.rights": "Línea de copyright del pie, en las 7 páginas.",
    "footer.location": "Ubicación en el pie, al lado del copyright.",
}

CASO = {
    "client": "Cliente y contexto del caso. Se muestra como volanta arriba del título y en la ficha. No se traduce salvo que el país cambie de nombre.",
    "title": "Título del caso. Aparece en la card, en el detalle y en la pestaña del navegador.",
    "oneLiner": "Una línea que resume el caso. Es lo que se lee en la card del catálogo y bajo el título del detalle.",
    "role": "Qué hiciste vos en el proyecto. Va en la ficha del detalle.",
    "period": "Cuándo se hizo. Va en la ficha del detalle.",
    "narrative": "El caso contado completo: el problema, qué se hizo y cómo terminó. Es el cuerpo del detalle.",
    "url": "Sitio publicado del cliente. Si está vacío, la fila «Ver sitio» no aparece.",
}

LAB = {
    "client": "Cliente o marco del experimento. Se muestra dentro del recuadro del video y como volanta del detalle.",
    "title": "Título del experimento, en la card y en el detalle.",
    "role": "Qué hiciste. Va en la ficha del detalle.",
    "period": "Cuándo se hizo. Va en la ficha del detalle.",
    "text": "Una línea sobre qué es la pieza. Se lee en la card y bajo el título del detalle.",
    "narrative": "El experimento contado completo. Es el cuerpo del detalle.",
}

HITO = {
    "period": "Años del hito. Se muestra arriba del título, en versalitas.",
    "title": "Nombre del lugar o del rol. Es el botón que despliega el detalle.",
    "teaser": "Una línea sobre esa etapa, siempre visible bajo el título.",
    "expanded": "El detalle que se despliega al abrir el hito: qué hacías y qué se logró ahí.",
}

PAGINA = {
    "title": "Título de la pestaña del navegador y de los resultados de búsqueda.",
    "description": "Resumen de la página para buscadores y para las tarjetas al compartir el link.",
}

CONTACTO = {
    "email": "Tu email. Se copia al portapapeles en Contact y aparece en el pie de las 7 páginas.",
    "linkedin": "URL completa de tu perfil de LinkedIn.",
    "linkedinCorto": "Cómo se muestra el perfil en pantalla, sin el dominio.",
}
