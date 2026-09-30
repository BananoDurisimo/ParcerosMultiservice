# -*- coding: utf-8 -*-
"""
Cirugia sobre el .docx de casos de uso.

El documento ya existe con sus 89 fichas, su formato y su numeracion; aqui no
se vuelve a crear nada: se localizan dentro de cada tabla los bloques "Flujo de
eventos" y "Flujo de eventos alterno" y se les reemplazan las filas, clonando
una fila existente cuando hacen falta mas. Asi se conserva el estilo de la
tabla, las fuentes y los sombreados originales.
"""
import copy

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def celdas(fila):
    """Celdas reales de la fila (row.cells duplica las combinadas)."""
    return fila._tr.findall(W + 'tc')


def texto_tc(tc):
    return ''.join(t.text or '' for t in tc.iter(W + 't')).strip()


def texto_fila(fila):
    return ' | '.join(texto_tc(c) for c in celdas(fila))


def escribir_tc(tc, texto):
    """Escribe en la celda conservando el formato del primer run."""
    parrafos = tc.findall(W + 'p')
    p = parrafos[0]
    runs = p.findall(W + 'r')
    if runs:
        for r in runs[1:]:
            p.remove(r)
        nodos_t = runs[0].findall(W + 't')
        for t in nodos_t[1:]:
            runs[0].remove(t)
        if nodos_t:
            nodos_t[0].text = texto
            nodos_t[0].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        else:
            t = runs[0].makeelement(W + 't', {})
            t.text = texto
            runs[0].append(t)
    else:
        r = p.makeelement(W + 'r', {})
        t = p.makeelement(W + 't', {})
        t.text = texto
        r.append(t)
        p.append(r)
    for extra in parrafos[1:]:
        tc.remove(extra)


def indices(tabla):
    """Ubica los bloques de flujo. Devuelve (ini_norm, fin_norm, ini_alt, fin_alt)
       como rangos [ini, fin) de filas de contenido, sin los encabezados."""
    filas = tabla.rows
    marca = {}
    for i, f in enumerate(filas):
        t = texto_fila(f).lower()
        if t.startswith('flujo de eventos alterno'):
            marca['alt'] = i
        elif t.startswith('flujo de eventos'):
            marca['norm'] = i
        elif t.startswith('poscondicion'):
            marca['pos'] = i
    if 'norm' not in marca or 'pos' not in marca:
        return None
    ini_norm = marca['norm'] + 2                      # salta titulo y encabezado
    fin_norm = marca.get('alt', marca['pos'])
    if 'alt' in marca:
        return ini_norm, fin_norm, marca['alt'] + 2, marca['pos']
    return ini_norm, fin_norm, None, None


def _ajustar(tabla, ini, fin, cuantas):
    """Deja exactamente `cuantas` filas en [ini, fin), clonando o quitando."""
    tbl = tabla._tbl
    actuales = fin - ini
    if actuales == cuantas:
        return
    if actuales < cuantas:
        molde = tabla.rows[fin - 1]._tr
        for _ in range(cuantas - actuales):
            nueva = copy.deepcopy(molde)
            molde.addnext(nueva)
    else:
        for _ in range(actuales - cuantas):
            tbl.remove(tabla.rows[fin - 1]._tr)
            fin -= 1


def reemplazar_flujos(tabla, normal, alterno):
    """`normal` y `alterno` son listas de (accion_del_actor, respuesta_del_sistema)."""
    pos = indices(tabla)
    if not pos:
        raise ValueError('La tabla no tiene bloque de flujo de eventos.')
    ini_n, fin_n, ini_a, fin_a = pos

    # El alterno va despues: se ajusta primero para no correr los indices del normal.
    if alterno and ini_a is not None:
        _ajustar(tabla, ini_a, fin_a, len(alterno))
        for fila, (a, r) in zip(tabla.rows[ini_a:ini_a + len(alterno)], alterno):
            cs = celdas(fila)
            escribir_tc(cs[0], a)
            if len(cs) > 1:
                escribir_tc(cs[1], r)

    _ajustar(tabla, ini_n, fin_n, len(normal))
    for fila, (a, r) in zip(tabla.rows[ini_n:ini_n + len(normal)], normal):
        cs = celdas(fila)
        escribir_tc(cs[0], a)
        if len(cs) > 1:
            escribir_tc(cs[1], r)


def fijar_fila(tabla, etiqueta, texto):
    """Reescribe la segunda celda de la fila cuyo rotulo empieza por `etiqueta`."""
    for fila in tabla.rows:
        cs = celdas(fila)
        if len(cs) > 1 and texto_tc(cs[0]).lower().startswith(etiqueta.lower()):
            escribir_tc(cs[1], texto)
            return True
    return False


def codigo(tabla):
    """HU_0xx de la ficha, leido de la primera celda."""
    cs = celdas(tabla.rows[0])
    if not cs:
        return None
    t = texto_tc(cs[0])
    return t.replace('Caso de uso N°', '').strip() if 'Caso de uso' in t else None
