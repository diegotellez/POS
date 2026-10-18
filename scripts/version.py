#!/usr/bin/env python3
"""Fija la versión del POS en todos los lugares y regenera la lista de archivos
del service worker (pos-html/sw.js).

Uso:
  python3 scripts/version.py 2.5 --notas "Qué trae la versión"
  python3 scripts/version.py 2.5 --notas "..." --atiende S-K7Q-0003,E-K7Q-0004
  python3 scripts/version.py --archivos      # solo regenera la lista de sw.js

Actualiza: pos-html/js/app.js (VERSION_APP), pos-html/sw.js (VERSION y
ARCHIVOS), pos-html/version.json, scripts/manuales/base.py y el encabezado
de pos-html/README.md. Al publicar (rama produccion) los clientes instalados
detectan el cambio de sw.js y muestran "Hay una versión nueva".
"""
import argparse
import datetime
import json
import os
import re
import sys
import zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(RAIZ, 'pos-html')
MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
         'septiembre', 'octubre', 'noviembre', 'diciembre']
# Lo que no se guarda de entrada en el equipo (se descarga al usarlo).
EXCLUIR = ('docs/', 'README.md', 'version.json', 'sw.js', 'ayudante-cajon/', 'ayudante-cajon.zip')


def leer(ruta):
    with open(ruta, encoding='utf-8') as f:
        return f.read()


def escribir(ruta, texto):
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write(texto)


def reemplazar(ruta, patron, nuevo, obligatorio=True):
    texto = leer(ruta)
    resultado, n = re.subn(patron, nuevo, texto, count=1, flags=re.S)
    if not n and obligatorio:
        sys.exit('No se encontró %r en %s' % (patron, ruta))
    escribir(ruta, resultado)


def zip_ayudante():
    # ayudante-cajon.zip se descarga desde Configuración > Cajón monedero. Fecha
    # fija en el ZIP para que no cambie si los archivos no cambiaron.
    carpeta = os.path.join(APP, 'ayudante-cajon')
    if not os.path.isdir(carpeta):
        return
    with zipfile.ZipFile(os.path.join(APP, 'ayudante-cajon.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
        for n in sorted(os.listdir(carpeta)):
            if n in ('impresora.txt', 'registro.txt'):
                continue
            info = zipfile.ZipInfo('ayudante-cajon/' + n, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            with open(os.path.join(carpeta, n), 'rb') as f:
                z.writestr(info, f.read())


def archivos():
    lista = ['./']
    for base, carpetas, nombres in os.walk(APP):
        carpetas.sort()
        for n in sorted(nombres):
            rel = os.path.relpath(os.path.join(base, n), APP).replace(os.sep, '/')
            if rel.startswith(EXCLUIR) or n.startswith('.'):
                continue
            lista.append(rel)
    return lista


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('version', nargs='?', help='por ejemplo 2.5')
    ap.add_argument('--notas', default='', help='novedades que verá el cliente en el aviso de actualización')
    ap.add_argument('--atiende', default='', help='códigos de solicitudes o errores que resuelve esta versión (separados por coma)')
    ap.add_argument('--archivos', action='store_true', help='solo regenerar la lista de archivos de sw.js')
    a = ap.parse_args()

    sw = os.path.join(APP, 'sw.js')
    zip_ayudante()
    lista = archivos()
    bloque = '/* ARCHIVOS-INICIO */\nvar ARCHIVOS = ' + json.dumps(lista, indent=2, ensure_ascii=False) + ';\n/* ARCHIVOS-FIN */'
    reemplazar(sw, r'/\* ARCHIVOS-INICIO \*/.*?/\* ARCHIVOS-FIN \*/', bloque.replace('\\', '\\\\'))
    if a.archivos or not a.version:
        print('sw.js: %d archivos' % len(lista))
        return

    v = a.version.strip()
    if not re.match(r'^\d+(\.\d+){1,2}$', v):
        sys.exit('Versión inválida: ' + v)
    hoy = datetime.date.today()
    mes = MESES[hoy.month - 1]
    reemplazar(sw, r"var VERSION = '[^']*';", "var VERSION = '%s';" % v)
    reemplazar(os.path.join(APP, 'js', 'app.js'), r"var VERSION_APP = '[^']*';", "var VERSION_APP = '%s';" % v)
    # El contacto de soporte y las solicitudes atendidas se conservan de una versión a otra.
    ruta_v = os.path.join(APP, 'version.json')
    previo = json.loads(leer(ruta_v)) if os.path.exists(ruta_v) else {}
    atendidas = previo.get('atendidas') or {}
    for cod in filter(None, (c.strip().upper() for c in a.atiende.split(','))):
        atendidas[cod] = v
    nuevo = {'version': v, 'fecha': hoy.isoformat(), 'notas': a.notas,
             'soporte': previo.get('soporte') or {'nombre': 'Soporte POS', 'whatsapp': '', 'correo': '', 'url': ''},
             'atendidas': atendidas}
    escribir(ruta_v, json.dumps(nuevo, ensure_ascii=False, indent=2) + '\n')
    base = os.path.join(RAIZ, 'scripts', 'manuales', 'base.py')
    reemplazar(base, r"VERSION = '[^']*'", "VERSION = '%s'" % v)
    reemplazar(base, r"FECHA_VERSION = '[^']*'", "FECHA_VERSION = '%s de %d'" % (mes.capitalize(), hoy.year))
    reemplazar(os.path.join(APP, 'README.md'), r'\*\*Versión [^*]+\*\* \([^)]*\)',
               '**Versión %s** (%s de %d)' % (v, mes, hoy.year), obligatorio=False)
    print('Versión %s: app.js, sw.js (%d archivos), version.json, manuales y README' % (v, len(lista)))


if __name__ == '__main__':
    main()
