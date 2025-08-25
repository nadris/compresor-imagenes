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

    // Obtener metadatos de la imagen original para calcular dimensiones
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Redimensionar si se especifican dimensiones, pero solo para reducir
    if (width || height) {
      let targetWidth = width;
      let targetHeight = height;

      // Si solo se especifica ancho, calcular alto proporcional
      if (width && !height) {
        targetHeight = Math.round((width / originalWidth) * originalHeight);
      }
      // Si solo se especifica alto, calcular ancho proporcional
      else if (height && !width) {
        targetWidth = Math.round((height / originalHeight) * originalWidth);
      }

          // Solo redimensionar si las dimensiones objetivo son MENORES que las originales
    if (targetWidth < originalWidth || targetHeight < originalHeight) {
      sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Compresión automática para paisajes: si es una imagen de paisaje (ancho > alto) y no se especificaron dimensiones,
    // reducir automáticamente el ancho máximo a 1920px para optimizar
    if (!width && !height && originalWidth > originalHeight && originalWidth > 1920) {
      const scaleFactor = 1920 / originalWidth;
      const newHeight = Math.round(originalHeight * scaleFactor);
      
      sharpInstance = sharpInstance.resize(1920, newHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    }

    // Estrategia de compresión inteligente para imágenes de alta resolución
    let compressedBuffer;
    let mimeType;
    let compressionApplied = false;

    // Si la imagen es muy grande (> 2MB), aplicar compresión más agresiva
    const isHighRes = originalWidth > 3000 || originalHeight > 3000 || imageBuffer.length > 2 * 1024 * 1024;
    
    // Ajustar calidad automáticamente para imágenes de alta resolución
    let adjustedQuality = parseInt(quality);
    if (isHighRes && adjustedQuality > 60) {
      adjustedQuality = Math.max(60, adjustedQuality - 20); // Reducir calidad para imágenes grandes
    }

    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        const jpegOptions = {
          quality: adjustedQuality,
          progressive: true, // Mejor compresión
          mozjpeg: true,     // Algoritmo más eficiente
          force: false
        };
        
        // Para imágenes muy grandes, aplicar compresión adicional
        if (isHighRes) {
          jpegOptions.quality = Math.max(50, adjustedQuality - 10);
        }
        
        compressedBuffer = await sharpInstance
          .jpeg(jpegOptions)
          .toBuffer();
        mimeType = 'image/jpeg';
        compressionApplied = true;
        break;
      
      case 'png':
        const pngOptions = {
          quality: adjustedQuality,
          compressionLevel: isHighRes ? 9 : 6, // Máxima compresión para imágenes grandes
          progressive: true,
          force: false
        };
        
        compressedBuffer = await sharpInstance
          .png(pngOptions)
          .toBuffer();
        mimeType = 'image/png';
        compressionApplied = true;
        break;
      
      case 'webp':
        const webpOptions = {
          quality: adjustedQuality,
          effort: isHighRes ? 6 : 4, // Mayor esfuerzo de compresión para imágenes grandes
          nearLossless: false,
          force: false
        };
        
        compressedBuffer = await sharpInstance
          .webp(webpOptions)
          .toBuffer();
        mimeType = 'image/webp';
        compressionApplied = true;
        break;
      
      default:
        return res.status(400).json({ 
          error: 'Formato no soportado. Use: jpeg, png, o webp' 
        });
    }

    // Si la compresión no fue efectiva, intentar con compresión más agresiva
    if (!compressionApplied || compressedBuffer.length >= imageBuffer.length) {
      console.log('Aplicando compresión agresiva para imagen de alta resolución...');
      
      // Redimensionar más agresivamente si es necesario
      if (originalWidth > 2000 || originalHeight > 2000) {
        const maxDimension = Math.max(originalWidth, originalHeight);
        const targetDimension = Math.min(1920, maxDimension * 0.7); // Reducir al 70% o máximo 1920px
        
        if (originalWidth > originalHeight) {
          const newHeight = Math.round((targetDimension / originalWidth) * originalHeight);
          sharpInstance = sharp(imageBuffer).resize(targetDimension, newHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        } else {
          const newWidth = Math.round((targetDimension / originalHeight) * originalWidth);
          sharpInstance = sharp(imageBuffer).resize(newWidth, targetDimension, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
        
        // Re-aplicar compresión con calidad más baja
        const aggressiveQuality = Math.max(40, adjustedQuality - 20);
        
        switch (format.toLowerCase()) {
          case 'jpeg':
          case 'jpg':
            compressedBuffer = await sharpInstance
              .jpeg({ quality: aggressiveQuality, progressive: true, mozjpeg: true })
              .toBuffer();
            break;
          case 'png':
            compressedBuffer = await sharpInstance
              .png({ quality: aggressiveQuality, compressionLevel: 9 })
              .toBuffer();
            break;
          case 'webp':
            compressedBuffer = await sharpInstance
              .webp({ quality: aggressiveQuality, effort: 6 })
              .toBuffer();
            break;
        }
      }
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
      quality: quality,
      originalDimensions: `${originalWidth} × ${originalHeight}`,
      compressionType: isHighRes ? 'Alta resolución (agresiva)' : 'Estándar',
      qualityAdjusted: adjustedQuality !== parseInt(quality),
      finalQuality: adjustedQuality,
      highResOptimized: isHighRes
    });

  } catch (error) {
    console.error('Error al comprimir imagen:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Endpoint para compresión ultra-agresiva de imágenes de alta resolución
app.post('/api/compress-ultra', async (req, res) => {
  try {
    const { imageBase64, format = 'jpeg', maxDimension = 1600 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ 
        error: 'Se requiere una imagen en base64' 
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Obtener metadatos
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    const originalSize = imageBuffer.length;

    // Calcular nuevas dimensiones (siempre reducir)
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (originalWidth > maxDimension || originalHeight > maxDimension) {
      if (originalWidth > originalHeight) {
        targetWidth = maxDimension;
        targetHeight = Math.round((maxDimension / originalWidth) * originalHeight);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((maxDimension / originalHeight) * originalWidth);
      }
    }

    // Aplicar compresión ultra-agresiva
    let sharpInstance = sharp(imageBuffer).resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

    let compressedBuffer;
    let mimeType;

    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        compressedBuffer = await sharpInstance
          .jpeg({ 
            quality: 40,           // Calidad muy baja para máxima compresión
            progressive: true,     // Mejor compresión
            mozjpeg: true,         // Algoritmo más eficiente
            force: false
          })
          .toBuffer();
        mimeType = 'image/jpeg';
        break;
      
      case 'png':
        compressedBuffer = await sharpInstance
          .png({ 
            quality: 40,           // Calidad muy baja
            compressionLevel: 9,   // Máxima compresión
            progressive: true,
            force: false
          })
          .toBuffer();
        mimeType = 'image/png';
        break;
      
      case 'webp':
        compressedBuffer = await sharpInstance
          .webp({ 
            quality: 40,           // Calidad muy baja
            effort: 6,             // Máximo esfuerzo de compresión
            nearLossless: false,
            force: false
          })
          .toBuffer();
        mimeType = 'image/webp';
        break;
      
      default:
        return res.status(400).json({ 
          error: 'Formato no soportado. Use: jpeg, png, o webp' 
        });
    }

    const compressedBase64 = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;
    const compressedSize = compressedBuffer.length;
    const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    res.json({
      success: true,
      originalSize: originalSize,
      compressedSize: compressedSize,
      reduction: `${reduction}%`,
      compressedImage: compressedBase64,
      format: format,
      originalDimensions: `${originalWidth} × ${originalHeight}`,
      newDimensions: `${targetWidth} × ${targetHeight}`,
      compressionType: 'Ultra-agresiva',
      quality: 40,
      maxDimension: maxDimension
    });

  } catch (error) {
    console.error('Error al comprimir imagen ultra:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Endpoint específico para comprimir paisajes (siempre reduce el tamaño)
app.post('/api/compress-landscape', async (req, res) => {
  try {
    const { imageBase64, quality = 80, format = 'jpeg', maxWidth = 1920 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ 
        error: 'Se requiere una imagen en base64' 
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Obtener metadatos
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Verificar si es una imagen de paisaje
    if (originalWidth <= originalHeight) {
      return res.status(400).json({ 
        error: 'Esta imagen no es un paisaje. Use /api/compress para otros tipos de imágenes.' 
      });
    }

    // Calcular nuevas dimensiones para paisajes (siempre reducir)
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (originalWidth > maxWidth) {
      const scaleFactor = maxWidth / originalWidth;
      targetWidth = maxWidth;
      targetHeight = Math.round(originalHeight * scaleFactor);
    }

    // Aplicar compresión
    let sharpInstance = sharp(imageBuffer).resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

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

    const compressedBase64 = `data:${mimeType};base64,${compressedBuffer.toString('base64')}`;
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
      quality: quality,
      originalDimensions: `${originalWidth} × ${originalHeight}`,
      newDimensions: `${targetWidth} × ${targetHeight}`,
      isLandscape: true,
      maxWidthApplied: maxWidth
    });

  } catch (error) {
    console.error('Error al comprimir paisaje:', error);
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
