# -*- coding: utf-8 -*-
"""Arma contenido/textos.toml a partir de lo que hoy dice el sitio.

    python3 tools/generar-textos.py

Se corre una sola vez, para sembrar el archivo. A partir de ahí el archivo es la
fuente: se edita a mano y se vuelca al sitio con tools/aplicar-textos.py.

Si el archivo ya existe, aborta: pisarlo perdería lo editado. --forzar lo re-siembra.
"""
import json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _notas as N
from _toml import entrada, banner, seccion

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = lambda *p: os.path.join(RAIZ, *p)

CABECERA = '''# Textos de fedekilich.com
#
# Este archivo es la fuente de todo el texto del sitio. Se edita acá y se vuelca
# al sitio con:
#
#     python3 tools/aplicar-textos.py              # muestra qué cambiaría
#     python3 tools/aplicar-textos.py --aplicar    # lo escribe
#
# Cada entrada tiene:
#     nota   para qué sirve ese texto y dónde se ve
#     es     castellano — es el idioma fuente
#     en     inglés
#     valor  en lugar de es/en, cuando el dato no se traduce (URLs, email)
#
# Dejar `en` vacío hace que el sitio muestre el castellano en su lugar: sirve
# para ir traduciendo de a poco sin romper nada.
#
# Los textos largos van entre tres comillas y respetan los saltos de línea:
# una línea en blanco adentro es un párrafo nuevo.
'''


def bi(campo):
    """Normaliza un campo que puede venir como string suelto o como {es, en}."""
    if isinstance(campo, dict):
        return campo.get("es", ""), campo.get("en", "")
    return campo or "", ""


def limpio(v):
    """Los marcadores TODO_ del sembrado no son texto: se vuelcan vacíos."""
    return "" if isinstance(v, str) and v.startswith("TODO_") else v


def main():
    destino = r("contenido/textos.toml")
    if os.path.exists(destino) and "--forzar" not in sys.argv:
        sys.exit(
            "contenido/textos.toml ya existe y este script lo pisaría entero,\n"
            "perdiendo lo que hayas editado a mano.\n\n"
            "  · Para volcar el archivo al sitio:  python3 tools/aplicar-textos.py\n"
            "  · Para re-sembrarlo igual:          python3 tools/generar-textos.py --forzar"
        )

    partes = [CABECERA]

    # ─── Interfaz ───
    # Node evalúa el literal: así se lee exactamente lo que el sitio usa.
    src = open(r("data/strings.js"), encoding="utf-8").read()
    literal = re.search(r"export const STRINGS = \{.*\n\};", src, re.S).group(0).replace("export ", "")
    strings = json.loads(subprocess.run(
        ["node", "-e", literal + "\nprocess.stdout.write(JSON.stringify(STRINGS));"],
        capture_output=True, text=True, check=True).stdout)
    ES, EN = strings["es"], strings["en"]

    partes.append(banner("Interfaz", "Labels, títulos de sección y mensajes. Los mismos textos se repiten\nen varias páginas: cambiarlos acá los cambia en todas."))
    grupo_actual = None
    for clave, nota in N.UI.items():
        grupo = clave.split(".")[0]
        if grupo != grupo_actual:
            partes.append(seccion({
                "nav": "Navegación", "hero": "Hero de Home", "home": "Home — casos destacados",
                "work": "Caso — ficha y navegación", "all": "All Works", "lab": "Lab",
                "about": "About", "contact": "Contact", "media": "Placeholders de imagen y video",
                "footer": "Pie de página",
            }[grupo]))
            grupo_actual = grupo
        partes.append(entrada(f"ui.{clave}", nota, ES.get(clave, ""), EN.get(clave, "")))

    # ─── Casos ───
    casos = json.load(open(r("data/cases.json"), encoding="utf-8"))["cases"]
    partes.append(banner("Casos", "El contenido de cada caso del portfolio. El orden, el destacado y las\nimágenes no se tocan acá: eso vive en data/cases.json."))
    for c in sorted(casos, key=lambda x: x.get("order", 0)):
        titulo = c["title"]["es"] if isinstance(c["title"], dict) else c["title"]
        partes.append(seccion(f'{c.get("order","?")}. {titulo}   ·   id: {c["id"]}'))
        for campo, nota in N.CASO.items():
            if campo == "url":
                partes.append(entrada(f'caso.{c["id"]}.url', nota, valor=limpio(c.get("url", ""))))
            else:
                es, en = bi(c.get(campo))
                partes.append(entrada(f'caso.{c["id"]}.{campo}', nota, limpio(es), limpio(en)))

    # ─── Lab ───
    items = json.load(open(r("data/lab.json"), encoding="utf-8"))["items"]
    partes.append(banner("Lab", "Los experimentos de la sección Lab."))
    for it in sorted(items, key=lambda x: x.get("order", 0)):
        titulo = bi(it.get("title"))[0] or it["id"]
        partes.append(seccion(f'{it.get("order","?")}. {titulo}   ·   id: {it["id"]}'))
        for campo, nota in N.LAB.items():
            es, en = bi(it.get(campo))
            partes.append(entrada(f'lab.{it["id"]}.{campo}', nota, limpio(es), limpio(en)))

    # ─── Timeline ───
    hitos = json.load(open(r("data/timeline.json"), encoding="utf-8"))["milestones"]
    partes.append(banner("Recorrido", "Los hitos del timeline de About. Los dos últimos tienen caseId: su\nteaser y su detalle se toman del caso, así que acá quedan vacíos."))
    for h in sorted(hitos, key=lambda x: x.get("order", 0)):
        marca = f'   ·   toma el texto del caso «{h["caseId"]}»' if h.get("caseId") else ""
        partes.append(seccion(f'{h["order"]}. {bi(h["title"])[0]}   ·   id: {h["id"]}{marca}'))
        for campo, nota in N.HITO.items():
            if h.get("caseId") and campo in ("teaser", "expanded"):
                continue
            es, en = bi(h.get(campo))
            partes.append(entrada(f'hito.{h["id"]}.{campo}', nota, limpio(es), limpio(en)))

    # ─── Head de cada página ───
    partes.append(banner("Páginas", "Lo que ve un buscador y lo que aparece al compartir el link.\nNo se ve dentro del sitio."))
    for archivo in sorted(f for f in os.listdir(RAIZ) if f.endswith(".html")):
        slug = archivo[:-5]
        partes.append(seccion(archivo))
        for campo in ("title", "description"):
            clave = f"pagina.{slug}.{campo}"
            partes.append(entrada(clave, N.PAGINA[campo], ES.get(clave, ""), EN.get(clave, "")))

    # ─── Datos de contacto ───
    partes.append(banner("Contacto", "Se repiten en el pie de las 7 páginas: cambiarlos acá los cambia\nen todas de una."))
    partes.append(entrada("contacto.email", N.CONTACTO["email"], valor="hola@fedekilich.com"))
    partes.append(entrada("contacto.linkedin", N.CONTACTO["linkedin"], valor="https://www.linkedin.com/in/fedekilich"))
    partes.append(entrada("contacto.linkedinCorto", N.CONTACTO["linkedinCorto"], valor="/in/fedekilich"))

    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, "w", encoding="utf-8") as f:
        f.write("\n".join(partes))
    print(f"contenido/textos.toml escrito")


if __name__ == "__main__":
    main()
