const express = require('express');
const cors = require('cors');
const sharp = require('sharp');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Endpoint para comprimir imagen base64
app.post('/api/compress', async (req, res) => {
  try {
    const { imageBase64, quality = 80, format = 'jpeg', width, height } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ 
        error: 'Se requiere una imagen en base64' 
      });
    }

    // Remover el prefijo data:image/...;base64, si existe
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convertir base64 a buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Configurar Sharp con las opciones de compresión
    let sharpInstance = sharp(imageBuffer);

    // Redimensionar si se especifican dimensiones
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Aplicar compresión según el formato
    let compressedBuffer;
    let mimeType;

    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        compressedBuffer = await sharpInstance
          .jpeg({ quality: parseInt(quality) })
          .toBuffer();
        mimeType = 'image/jpeg';
        break;
      
      case 'png':
        compressedBuffer = await sharpInstance
          .png({ quality: parseInt(quality) })
          .toBuffer();
        mimeType = 'image/png';
        break;
      
      case 'webp':
        compressedBuffer = await sharpInstance
          .webp({ quality: parseInt(quality) })
          .toBuffer();
        mimeType = 'image/webp';
        break;
      
      default:
        return res.status(400).json({ 
          error: 'Formato no soportado. Use: jpeg, png, o webp' 
        });
    }

    // Convertir a base64
    const compressedBase64 = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;

    // Calcular reducción de peso
    const originalSize = imageBuffer.length;
    const compressedSize = compressedBuffer.length;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    res.json({
      success: true,
      originalSize: originalSize,
      compressedSize: compressedSize,
      reduction: `${reduction}%`,
      compressedImage: compressedBase64,
      format: format,
      quality: quality
    });

  } catch (error) {
    console.error('Error al comprimir imagen:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Endpoint para obtener información de la imagen
app.post('/api/image-info', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ 
        error: 'Se requiere una imagen en base64' 
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const metadata = await sharp(imageBuffer).metadata();

    res.json({
      success: true,
      size: imageBuffer.length,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
      hasProfile: metadata.hasProfile,
      hasAlpha: metadata.hasAlpha
    });

  } catch (error) {
    console.error('Error al obtener información de la imagen:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Image Compressor API'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal!',
    details: err.message 
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📸 API de compresión de imágenes lista`);
  console.log(`📁 Archivos estáticos en: ${path.join(__dirname, '../public')}`);
});
