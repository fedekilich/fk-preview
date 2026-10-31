# -*- coding: utf-8 -*-
"""Emisor mínimo de TOML: solo lo que necesita contenido/textos.toml."""


def cadena(valor):
    """Devuelve el valor como literal TOML, en una línea o en bloque."""
    if "\n" in valor or len(valor) > 90:
        assert '"""' not in valor, "el texto no puede contener tres comillas seguidas"
        cuerpo = valor.replace("\\", "\\\\")
        # Una comilla final pegada al cierre daría cuatro seguidas
        if cuerpo.endswith('"'):
            cuerpo = cuerpo[:-1] + '\\"'
        return '"""\n' + cuerpo + '"""'
    return '"' + valor.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _linea(valor):
    """Fuerza una sola línea: las notas nunca van en bloque."""
    return '"' + valor.replace("\\", "\\\\").replace('"', '\\"') + '"'


def entrada(ruta, nota, es=None, en=None, valor=None):
    """Un bloque [ruta] con su nota y sus versiones."""
    assert "\n" not in nota, f"la nota de {ruta} no puede tener saltos de línea"
    lineas = [f"[{ruta}]", f"nota = {_linea(nota)}"]
    if valor is not None:
        lineas.append(f"valor = {cadena(valor)}")
    else:
        lineas.append(f"es = {cadena(es or '')}")
        lineas.append(f"en = {cadena(en or '')}")
    return "\n".join(lineas) + "\n"


def banner(titulo, detalle=""):
    ancho = 74
    partes = ["", "# " + "═" * ancho, f"#  {titulo.upper()}"]
    if detalle:
        for linea in detalle.split("\n"):
            partes.append(f"#  {linea}")
    partes.append("# " + "═" * ancho)
    return "\n".join(partes) + "\n"


def seccion(titulo):
    return f"\n# ─── {titulo} " + "─" * max(0, 68 - len(titulo)) + "\n"
