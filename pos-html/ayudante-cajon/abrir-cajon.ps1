# Abre el cajon monedero conectado a la impresora termica (cable RJ11/RJ12).
# Envia a la impresora la orden ESC/POS "ESC p" en modo RAW (sin imprimir nada),
# aunque el controlador de la impresora no tenga la opcion de abrir el cajon.
# Lo llama el POS con el enlace poscajon:abrir (registrado por instalar.bat).
param([string]$Enlace = '')

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$registro = Join-Path $dir 'registro.txt'
function Anotar($texto) { Add-Content -Path $registro -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $texto) }

try {
  $archivo = Join-Path $dir 'impresora.txt'
  $impresora = ''
  if (Test-Path $archivo) { $impresora = (Get-Content $archivo -Raw).Trim() }
  if (-not $impresora) { $impresora = (Get-CimInstance Win32_Printer | Where-Object { $_.Default }).Name }
  if (-not $impresora) { throw 'No hay impresora configurada ni predeterminada' }

  # pin=1 en el enlace usa el pin 5; por defecto el pin 2 (el mas comun).
  $pin = 0
  if ($Enlace -match 'pin=1') { $pin = 1 }

  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class ImpresoraRaw {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern int StartDocPrinter(IntPtr h, int nivel, DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int escritos);
  public static bool Enviar(string impresora, byte[] datos) {
    IntPtr h;
    if (!OpenPrinter(impresora, out h, IntPtr.Zero)) return false;
    DOCINFO di = new DOCINFO();
    di.pDocName = "Abrir cajon POS";
    di.pDataType = "RAW";
    bool ok = false;
    if (StartDocPrinter(h, 1, di) != 0) {
      if (StartPagePrinter(h)) { int w; ok = WritePrinter(h, datos, datos.Length, out w); EndPagePrinter(h); }
      EndDocPrinter(h);
    }
    ClosePrinter(h);
    return ok;
  }
}
"@
  # ESC p m t1 t2: pulso de 50 ms en el pin elegido.
  $ok = [ImpresoraRaw]::Enviar($impresora, [byte[]](27, 112, $pin, 25, 250))
  if ($ok) { Anotar ('Cajon abierto en "' + $impresora + '"') } else { Anotar ('No se pudo enviar la orden a "' + $impresora + '"') }
} catch {
  Anotar ('Error: ' + $_.Exception.Message)
}
