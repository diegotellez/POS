require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./src/routes');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

// Archivos estáticos generados por `ng build` (carpeta dist/ del frontend Angular).
// Todo el sistema (frontend + backend) corre como un único proceso Node local.
const distPath = path.join(__dirname, 'public');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res
      .status(200)
      .send(
        'Backend POS activo. Compila el frontend con "ng build" y copia el resultado a backend/public para servir la interfaz.'
      );
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor POS escuchando en http://localhost:${PORT}`);
});
