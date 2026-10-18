# Publicar una versión del POS

El POS se publica en GitHub Pages (`https://diegotellez.github.io/POS/`). Los
equipos que lo abren desde esa dirección (o desde el ícono instalado) lo
guardan en el equipo, funcionan sin internet y reciben las versiones nuevas
solas: al abrir con internet aparece "Hay una versión nueva · Actualizar".

## Una sola vez (administrador del repositorio en GitHub)

1. **Settings > Pages > Build and deployment > Source: GitHub Actions.**
2. **Settings > Environments > github-pages > Deployment branches and tags:**
   agregar la rama `produccion` (por defecto solo deja publicar la rama principal).
3. Crear la rama `produccion` (la primera publicación la crea).

## Cada versión

```bash
# 1. Fijar la versión (app, sw.js, version.json, manuales, README)
python3 scripts/version.py 2.5 --notas "Compras por factura, no vende sin stock, ticket a 48 mm"

# 2. Regenerar los manuales PDF (ver scripts/manuales/README.md)

# 3. Guardar y publicar
git add -A && git commit -m "Versión 2.5"
git push origin HEAD:produccion
```

El flujo `.github/workflows/publicar-pos.yml` revisa que `sw.js` liste todos
los archivos y publica la carpeta `pos-html`. En unos minutos los equipos ven
el aviso. Los datos de cada equipo (localStorage) no se tocan.

## Paso de la copia en carpeta a la versión en línea (una vez por equipo)

1. Abrir el POS de la carpeta (index.html), ir a **Respaldo y configuración >
   Actualizaciones automáticas > Pasar a la versión con actualizaciones**.
2. Se abre la dirección web; confirmar **Pasar los datos**.
3. En esa ventana, **Instalar como aplicación** (o el ícono de instalar de la
   barra de direcciones de Chrome). Desde entonces abrir el POS con ese ícono.
4. Por precaución, antes descargar un respaldo (.json).

Si la copia en carpeta es anterior a esta función (no tiene el botón), use
**Descargar respaldo** en la carpeta y **Restaurar respaldo** en la versión web.
