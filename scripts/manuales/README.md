# Generador de los manuales PDF

Regenera `pos-html/docs/*.pdf` con capturas reales del sistema.

```bash
# 1. Capturas de pantalla (Playwright + Chromium)
node scripts/manuales/capturas.js /tmp/capturas

# 2. PDFs (Python 3 + reportlab + Pillow; fuentes DejaVu)
cd scripts/manuales
python3 manual_instalacion.py /tmp/capturas "../../pos-html/docs/Manual de instalación, configuración y mantenimiento.pdf"
python3 manual_usuario.py     /tmp/capturas "../../pos-html/docs/Manual del Usuario.pdf"
```

Después de regenerar, recorta el espacio en blanco de `u04-ticket.jpg` si cambia el tamaño del ticket.
