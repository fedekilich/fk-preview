# -*- coding: utf-8 -*-
"""Vuelca contenido/textos.toml al sitio.

    python3 tools/aplicar-textos.py              # muestra qué cambiaría
    python3 tools/aplicar-textos.py --aplicar    # lo escribe
    python3 tools/aplicar-textos.py --faltantes  # lista qué textos faltan escribir

Escribe data/strings.js entero y mezcla el texto dentro de cases.json, lab.json
y timeline.json sin tocar el resto de esos archivos (orden, destacados, media).
Si el archivo de contenido tiene algo mal, no escribe nada.
"""
import json, os, re, sys, tomllib

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = lambda *p: os.path.join(RAIZ, *p)
APLICAR = "--aplicar" in sys.argv

CAMPOS_CASO = ("client", "title", "oneLiner", "role", "period", "narrative")
CAMPOS_LAB = ("client", "title", "role", "period", "text", "narrative")
CAMPOS_HITO = ("period", "title", "teaser", "expanded")


CLAVES_ENTRADA = ("nota", "es", "en", "valor")


def hojas(nodo, pre=""):
    """Recorre el TOML y devuelve (ruta.con.puntos, entrada) por cada entrada.

    Basta con que aparezca cualquiera de los campos de una entrada: así una
    entrada a la que le falta la nota se ve y se puede reportar, en vez de
    quedar ignorada en silencio."""
    if not isinstance(nodo, dict):
        return
    if any(c in nodo for c in CLAVES_ENTRADA):
        yield pre, nodo
        return
    for clave, valor in nodo.items():
        yield from hojas(valor, f"{pre}.{clave}" if pre else clave)


def revisar(entradas):
    """Devuelve la lista de problemas del archivo de contenido."""
    problemas = []
    for ruta, e in entradas.items():
        if not e.get("nota", "").strip():
            problemas.append(f"{ruta}: le falta la nota que explica para qué sirve.")
        tiene_valor = "valor" in e
        tiene_par = "es" in e or "en" in e
        if tiene_valor and tiene_par:
            problemas.append(f"{ruta}: usa `valor` y `es`/`en` a la vez; elegí uno.")
        elif not tiene_valor and not tiene_par:
            problemas.append(f"{ruta}: no tiene ni `valor` ni `es`/`en`.")
        if ruta.split(".")[0] not in ("ui", "caso", "lab", "hito", "pagina", "contacto"):
            problemas.append(f"{ruta}: no reconozco ese grupo; el sitio la ignoraría.")
    return problemas


def bilingue(e):
    return {"es": (e.get("es") or "").strip(), "en": (e.get("en") or "").strip()}


def faltantes(entradas):
    """Lista las entradas a las que todavía les falta texto."""
    sin_es, sin_en = [], []
    for ruta, e in sorted(entradas.items()):
        if "valor" in e:
            continue
        es = (e.get("es") or "").strip()
        if not es:
            sin_es.append((ruta, e["nota"]))
        elif not (e.get("en") or "").strip():
            sin_en.append(ruta)

    if sin_es:
        print(f"Falta escribir en castellano — {len(sin_es)}:\n")
        for ruta, nota in sin_es:
            print(f"  {ruta}")
            print(f"      {nota}\n")
    if sin_en:
        print(f"Falta traducir al inglés — {len(sin_en)}:")
        print("  (mientras tanto el sitio muestra el castellano)\n")
        for ruta in sin_en:
            print(f"  {ruta}")
    if not sin_es and not sin_en:
        print("No falta ningún texto.")


def main():
    ruta_doc = r("contenido/textos.toml")
    if not os.path.exists(ruta_doc):
        sys.exit("No existe contenido/textos.toml. Generalo con tools/generar-textos.py")

    try:
        doc = tomllib.load(open(ruta_doc, "rb"))
    except tomllib.TOMLDecodeError as err:
        sys.exit(f"contenido/textos.toml no se puede leer:\n  {err}")

    entradas = dict(hojas(doc))
    problemas = revisar(entradas)
    if problemas:
        print("No se aplicó nada. El archivo de contenido tiene problemas:")
        for p in problemas:
            print("  ✗", p)
        sys.exit(1)

    if "--faltantes" in sys.argv:
        faltantes(entradas)
        return

    cambios = []   # (archivo, qué, antes, ahora)

    # ─── data/strings.js: interfaz + head de cada página ───
    ES, EN = {}, {}
    for ruta, e in entradas.items():
        if ruta.startswith("ui."):
            clave = ruta[3:]
        elif ruta.startswith("pagina."):
            clave = ruta
        else:
            continue
        ES[clave], EN[clave] = (e.get("es") or "").strip(), (e.get("en") or "").strip()

    viejo_strings = open(r("data/strings.js"), encoding="utf-8").read() if os.path.exists(r("data/strings.js")) else ""
    m = re.search(r"const STRINGS = (\{.*\n\});", viejo_strings, re.S)
    previo = {"es": {}, "en": {}}
    if m:
        import subprocess
        previo = json.loads(subprocess.run(
            ["node", "-e", "const S = " + m.group(1) + ";process.stdout.write(JSON.stringify(S));"],
            capture_output=True, text=True, check=True).stdout)
    for clave in sorted(set(ES) | set(previo["es"])):
        for idioma, nuevo in (("es", ES), ("en", EN)):
            antes, ahora = previo[idioma].get(clave, ""), nuevo.get(clave, "")
            if antes != ahora:
                cambios.append(("data/strings.js", f"{clave} · {idioma}", antes, ahora))

    def serializar(d):
        return "\n".join(f'    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},'
                         for k, v in sorted(d.items())).rstrip(",")

    nuevo_strings = ("// GENERADO por tools/aplicar-textos.py desde contenido/textos.toml.\n"
                     "// No editar a mano: los cambios se pisan en el próximo volcado.\n\n"
                     "export const STRINGS = {\n  es: {\n" + serializar(ES) +
                     "\n  },\n\n  en: {\n" + serializar(EN) + "\n  }\n};\n")

    # ─── JSON de datos: se mezcla solo el texto ───
    def mezclar(archivo, clave_lista, prefijo, campos, id_key="id"):
        ruta = r("data", archivo)
        datos = json.load(open(ruta, encoding="utf-8"))
        for item in datos[clave_lista]:
            for campo in campos:
                e = entradas.get(f"{prefijo}.{item[id_key]}.{campo}")
                if e is None:
                    continue
                antes = item.get(campo)
                ahora = bilingue(e)
                if antes != ahora:
                    # Se informa por idioma: si solo cambia el inglés, tiene que verse
                    previo = antes if isinstance(antes, dict) else {"es": antes or "", "en": ""}
                    for idioma in ("es", "en"):
                        if previo.get(idioma, "") != ahora[idioma]:
                            cambios.append((f"data/{archivo}",
                                            f'{item[id_key]}.{campo} · {idioma}',
                                            previo.get(idioma, ""), ahora[idioma]))
                    item[campo] = ahora
            e_url = entradas.get(f"{prefijo}.{item[id_key]}.url")
            if e_url is not None:
                ahora = (e_url.get("valor") or "").strip()
                if item.get("url", "") != ahora:
                    cambios.append((f"data/{archivo}", f'{item[id_key]}.url', item.get("url", ""), ahora))
                    item["url"] = ahora
        return ruta, datos

    ruta_casos, casos = mezclar("cases.json", "cases", "caso", CAMPOS_CASO)
    ruta_lab, lab = mezclar("lab.json", "items", "lab", CAMPOS_LAB)
    ruta_hitos, hitos = mezclar("timeline.json", "milestones", "hito", CAMPOS_HITO)

    # ─── Datos de contacto repetidos en el HTML ───
    html_files = sorted(f for f in os.listdir(RAIZ) if f.endswith(".html"))
    contacto = entradas.get("contacto.email"), entradas.get("contacto.linkedin"), entradas.get("contacto.linkedinCorto")
    reemplazos = []
    contacto_html = open(r("contact.html"), encoding="utf-8").read()
    actual_email = re.search(r'id="email-value"[^>]*>([^<]+)<', contacto_html).group(1).strip()
    actual_link = re.search(r'href="(https://www\.linkedin\.com/[^"]+)"', contacto_html).group(1)
    actual_corto = re.search(r'data-contacto-corto[^>]*>([^<]+)<|/in/[A-Za-z0-9-]+', contacto_html).group(0)
    nuevos = [(actual_email, (contacto[0] or {}).get("valor", "").strip()),
              (actual_link, (contacto[1] or {}).get("valor", "").strip())]
    for viejo, nuevo in nuevos:
        if nuevo and viejo != nuevo:
            n = sum(open(r(f), encoding="utf-8").read().count(viejo) for f in html_files)
            cambios.append(("*.html", f"{viejo} → {nuevo}", f"{n} apariciones", nuevo))
            reemplazos.append((viejo, nuevo))

    # ─── Reporte ───
    if not cambios:
        print("El archivo de contenido y el sitio ya dicen lo mismo.")
        return

    print(f"{len(cambios)} cambios{'' if APLICAR else ' (simulacro)'}:\n")
    corto = lambda t: (t[:70] + "…") if len(t) > 70 else t
    for archivo, que, antes, ahora in cambios:
        print(f"  {archivo} · {que}")
        print(f"      antes: {corto(antes) or '(vacío)'}")
        print(f"      ahora: {corto(ahora) or '(vacío)'}")

    if not APLICAR:
        print("\nSimulacro. Para escribir: python3 tools/aplicar-textos.py --aplicar")
        return

    # ─── Escritura ───
    open(r("data/strings.js"), "w", encoding="utf-8").write(nuevo_strings)
    for ruta, datos in ((ruta_casos, casos), (ruta_lab, lab), (ruta_hitos, hitos)):
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
            f.write("\n")
    for archivo in html_files:
        ruta = r(archivo)
        html = open(ruta, encoding="utf-8").read()
        for viejo, nuevo in reemplazos:
            html = html.replace(viejo, nuevo)
        open(ruta, "w", encoding="utf-8").write(html)

    print("\nAplicado.")


if __name__ == "__main__":
    main()
