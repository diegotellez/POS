const { exec } = require('child_process');
const path = require('path');
const AppError = require('./AppError');

function abrir(comando) {
  return new Promise((resolve) => {
    exec(comando, (error) => resolve(!error));
  });
}

async function abrirCarpetaYWhatsApp(rutaArchivo) {
  const numero = process.env.WHATSAPP_NUMERO;
  if (!numero) {
    throw new AppError('No hay un número de WhatsApp configurado en el servidor (WHATSAPP_NUMERO)');
  }

  const carpeta = path.dirname(rutaArchivo);
  const comandoExplorador =
    process.platform === 'win32'
      ? `explorer "${carpeta}"`
      : process.platform === 'darwin'
      ? `open "${carpeta}"`
      : `xdg-open "${carpeta}"`;

  const urlWhatsApp = `https://wa.me/${numero}`;
  const comandoWhatsApp =
    process.platform === 'win32'
      ? `start "" "${urlWhatsApp}"`
      : process.platform === 'darwin'
      ? `open "${urlWhatsApp}"`
      : `xdg-open "${urlWhatsApp}"`;

  const explorerAbierto = await abrir(comandoExplorador);
  const whatsappAbierto = await abrir(comandoWhatsApp);

  return { explorerAbierto, whatsappAbierto, carpeta, urlWhatsApp };
}

module.exports = { abrirCarpetaYWhatsApp };
