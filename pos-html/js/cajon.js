/*
 * Apertura del cajón monedero.
 *
 * El cajón se conecta a la impresora de tickets (cable RJ11/RJ12) y se abre
 * cuando la impresora recibe la orden ESC/POS "ESC p". Un navegador no puede
 * enviar esa orden por su cuenta, así que hay dos modos:
 *
 *  - 'impresion': al cobrar en efectivo se imprime el ticket sin preguntar. En
 *    las preferencias del controlador (driver) de la impresora se activa
 *    "Abrir cajón antes/después de imprimir" y el cajón abre con cada ticket.
 *  - 'serial': la orden se envía directo a la impresora por Web Serial
 *    (Chrome o Edge en el PC, impresora con puerto COM virtual o serial).
 *    Se autoriza una sola vez con "Conectar impresora".
 *  - 'ayudante': para el cajón conectado a la impresora cuando su controlador no
 *    abre el cajón. El POS abre el enlace poscajon:abrir y el ayudante de Windows
 *    (carpeta ayudante-cajon, se instala una vez) envía la orden a la impresora
 *    en modo RAW, sin imprimir.
 */
(function (global) {
  'use strict';

  function cfg() { return POS.Config.obtener(); }

  function serialDisponible() {
    return !!(global.navigator && global.navigator.serial);
  }

  // ESC p m t1 t2: pulso en el pin 2 (m=0) o pin 5 (m=1), 50 ms encendido, 500 ms apagado.
  function ordenApertura(pin) {
    return new Uint8Array([0x1B, 0x70, pin === 1 ? 0x01 : 0x00, 0x19, 0xFA]);
  }

  function puertoAutorizado() {
    return global.navigator.serial.getPorts().then(function (puertos) { return puertos[0] || null; });
  }

  function enviarSerial(c) {
    if (!serialDisponible()) return Promise.reject(new Error('Este navegador no permite la conexión directa. Usa Chrome o Edge en el PC.'));
    return puertoAutorizado().then(function (puerto) {
      if (!puerto) throw new Error('No hay impresora conectada. Ve a Respaldo y configuración > Cajón monedero > Conectar impresora.');
      var abierto = !!puerto.writable;
      var abrir = abierto ? Promise.resolve() : puerto.open({ baudRate: c.cajonBaudios || 9600 });
      return abrir.then(function () {
        var escritor = puerto.writable.getWriter();
        return escritor.write(ordenApertura(c.cajonPin)).then(function () {
          escritor.releaseLock();
          return abierto ? null : puerto.close();
        }, function (err) {
          escritor.releaseLock();
          throw err;
        });
      });
    });
  }

  // Abre el enlace poscajon: (lo atiende el ayudante de Windows). La primera vez
  // Chrome pregunta si permite abrirlo: "Permitir siempre".
  function enviarAyudante(c) {
    var a = document.createElement('a');
    a.href = 'poscajon:abrir' + (c.cajonPin === 1 ? '?pin=1' : '');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 1000);
  }

  var Cajon = {
    serialDisponible: serialDisponible,
    enviarAyudante: function () { enviarAyudante(cfg()); },

    // Pide al usuario elegir el puerto de la impresora (requiere un clic).
    conectar: function () {
      if (!serialDisponible()) return Promise.reject(new Error('Este navegador no permite la conexión directa (usa Chrome o Edge en el PC; dentro del artefacto no está disponible).'));
      return global.navigator.serial.requestPort();
    },

    conectado: function () {
      if (!serialDisponible()) return Promise.resolve(false);
      return puertoAutorizado().then(function (p) { return !!p; }, function () { return false; });
    },

    // Abre el cajón sin imprimir (modo serial). Devuelve una promesa.
    abrir: function () {
      return enviarSerial(cfg());
    },

    // Llamar después de un cobro, cambio o gasto en efectivo.
    // imprimir: función que imprime el comprobante (para el modo 'impresion').
    // Devuelve true si el comprobante ya se imprimió para abrir el cajón.
    porEfectivo: function (imprimir) {
      var c = cfg();
      if (c.cajonModo === 'serial') {
        enviarSerial(c).catch(function (err) {
          U.aviso('No se pudo abrir el cajón: ' + err.message, 'error', 6000);
        });
        return false;
      }
      if (c.cajonModo === 'ayudante') {
        enviarAyudante(c);
        return false;
      }
      if (c.cajonModo === 'impresion' && imprimir) {
        imprimir();
        return true;
      }
      return false;
    },

    // Botón "Abrir cajón": queda registrado en Auditoría.
    abrirManual: function () {
      var c = cfg();
      if (c.cajonModo === 'ninguno') {
        U.aviso('El cajón no está configurado. Un administrador lo activa en Respaldo y configuración.', 'alerta', 6000);
        return;
      }
      POS.Cajon.registrarApertura('Apertura manual del cajón');
      if (c.cajonModo === 'ayudante') {
        enviarAyudante(c);
      } else if (c.cajonModo === 'serial') {
        enviarSerial(c).then(function () { U.aviso('Cajón abierto', 'ok'); }, function (err) {
          U.aviso('No se pudo abrir el cajón: ' + err.message, 'error', 6000);
        });
      } else {
        // Un comprobante mínimo hace que el driver de la impresora abra el cajón.
        U.imprimirHTML('<!doctype html><meta charset="utf-8"><style>body{font:12px monospace;margin:0;padding:4px}</style>' +
          '<div>Apertura de cajón · ' + U.esc(U.ahora()) + '</div>', 300);
      }
    }
  };

  global.Cajon = Cajon;
})(window);
