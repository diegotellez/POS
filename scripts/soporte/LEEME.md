# Buzón de soporte del POS

Los POS de los clientes avisan al proveedor de dos formas:

- **WhatsApp** (siempre disponible): el error o la solicitud se abre en WhatsApp
  con el mensaje listo; la persona toca Enviar.
- **Buzón en línea** (opcional, recomendado): los errores llegan **solos**, sin
  que nadie toque nada, a una hoja de Google y a su correo.

El contacto se configura en `pos-html/version.json`, campo `soporte`, y llega a
todos los clientes con la siguiente publicación:

```json
"soporte": {
  "nombre": "Soporte POS",
  "whatsapp": "573001234567",
  "correo": "",
  "url": "https://script.google.com/macros/s/.../exec"
}
```

## Crear el buzón (una sola vez, 5 minutos)

1. En Google Drive cree una hoja de cálculo nueva, por ejemplo "Soporte POS".
2. Menú **Extensiones > Apps Script**. Borre lo que aparece y pegue el
   contenido de `buzon.gs`. Cambie `CORREO` por su correo y guarde.
3. **Implementar > Nueva implementación**, tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
4. Autorice los permisos (hoja y correo) y copie la **URL de la aplicación web**
   (termina en `/exec`). Esa URL va en `soporte.url`.

## Flujo de trabajo

1. Llega el aviso (correo / fila en la hoja / WhatsApp) con un código:
   `E-K7Q-0004` (error automático) o `S-K7Q-0003` (solicitud).
2. Usted decide si se hace. Para implementarlo: "implementa la S-K7Q-0003".
3. Se implementa y se prueba en el artefacto; usted lo revisa.
4. Al publicar se indica qué códigos resuelve:
   `python3 scripts/version.py 2.7 --notas "..." --atiende S-K7Q-0003,E-K7Q-0004`
5. Cuando el cliente se actualiza, en su pantalla **Soporte** la solicitud queda
   como "Publicada en 2.7" y le aparece un aviso.
