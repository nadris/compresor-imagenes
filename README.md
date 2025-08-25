# 🖼️ Compresor de Imágenes con Sharp

Una API Node.js moderna y eficiente para comprimir imágenes usando la librería Sharp. Procesa imágenes base64 y devuelve versiones optimizadas con reducción significativa de peso.

## ✨ Características

- **Compresión inteligente**: Utiliza Sharp para optimización de alta calidad
- **Múltiples formatos**: Soporta JPEG, PNG y WebP
- **Redimensionamiento**: Opcional con mantenimiento de proporciones
- **Control de calidad**: Ajuste fino de la compresión (1-100%)
- **API RESTful**: Endpoints claros y bien documentados
- **Interfaz web**: UI moderna y responsive para pruebas
- **Drag & Drop**: Subida de archivos intuitiva
- **Métricas detalladas**: Información completa sobre la optimización

## 🚀 Instalación

### Prerrequisitos

- Node.js 16.0.0 o superior
- npm o yarn

### Pasos de instalación

1. **Clonar o descargar el proyecto**
   ```bash
   git clone <tu-repositorio>
   cd image-compressor-api
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar el servidor**
   ```bash
   # Modo desarrollo (con auto-reload)
   npm run dev
   
   # Modo producción
   npm start
   ```

4. **Acceder a la aplicación**
   - API: http://localhost:3000/api
   - Interfaz web: http://localhost:3000

## 📡 API Endpoints

### POST `/api/compress`
Comprime una imagen base64 y devuelve la versión optimizada.

**Parámetros:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "quality": 80,
  "format": "jpeg",
  "width": 800,
  "height": 600
}
```

**Respuesta:**
```json
{
  "success": true,
  "originalSize": 245760,
  "compressedSize": 98304,
  "reduction": "60.00%",
  "compressedImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "format": "jpeg",
  "quality": 80
}
```

### POST `/api/image-info`
Obtiene información detallada de una imagen base64.

**Parámetros:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}
```

**Respuesta:**
```json
{
  "success": true,
  "size": 245760,
  "width": 1920,
  "height": 1080,
  "format": "jpeg",
  "channels": 3,
  "hasProfile": false,
  "hasAlpha": false
}
```

### GET `/api/health`
Verifica el estado del servicio.

**Respuesta:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Image Compressor API"
}
```

## 🎯 Uso

### Desde la interfaz web

1. Abre http://localhost:3000 en tu navegador
2. Arrastra y suelta una imagen o haz clic para seleccionar
3. Ajusta la configuración de compresión:
   - **Calidad**: 1-100% (recomendado: 80%)
   - **Formato**: JPEG, PNG o WebP
   - **Dimensiones**: Ancho y alto opcionales
4. Haz clic en "Comprimir Imagen"
5. Visualiza los resultados y descarga la imagen optimizada

### Desde código

```javascript
// Ejemplo de uso con fetch
const compressImage = async (base64Image) => {
  const response = await fetch('/api/compress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageBase64: base64Image,
      quality: 85,
      format: 'webp',
      width: 1200
    })
  });
  
  const result = await response.json();
  console.log(`Reducción: ${result.reduction}`);
  return result.compressedImage;
};
```

## ⚙️ Configuración

### Variables de entorno

```bash
PORT=3000                    # Puerto del servidor
NODE_ENV=development        # Entorno de ejecución
```

### Límites de archivo

- **Tamaño máximo**: 50MB por imagen
- **Formatos soportados**: JPG, PNG, WebP, GIF, TIFF, etc.
- **Resolución máxima**: Sin límite (depende de la memoria disponible)

## 🔧 Tecnologías utilizadas

- **Backend**: Node.js + Express
- **Procesamiento de imágenes**: Sharp
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Middleware**: CORS, Multer
- **Desarrollo**: Nodemon, Jest

## 📊 Rendimiento

- **Tiempo de procesamiento**: < 2 segundos para imágenes de 5MB
- **Reducción típica**: 40-80% del tamaño original
- **Calidad visual**: Mantiene excelente calidad visual
- **Memoria**: Uso eficiente de memoria

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm test -- --watch
```

## 📁 Estructura del proyecto

```
image-compressor-api/
├── src/
│   └── index.js          # Servidor principal
├── public/
│   └── index.html        # Interfaz web
├── package.json          # Dependencias y scripts
├── README.md            # Documentación
└── .gitignore           # Archivos a ignorar
```

## 🚨 Solución de problemas

### Error: "Sharp module not found"
```bash
npm rebuild sharp
```

### Error: "Memory limit exceeded"
- Reduce el tamaño de las imágenes de entrada
- Ajusta la calidad de compresión
- Considera usar el redimensionamiento

### Error: "Invalid image format"
- Verifica que la imagen sea válida
- Asegúrate de que el base64 esté completo
- Revisa el formato de entrada

## 🤝 Contribuciones

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Si tienes alguna pregunta o problema:

- Abre un issue en GitHub
- Contacta al equipo de desarrollo
- Revisa la documentación de Sharp: https://sharp.pixelplumbing.com/

---

**Desarrollado con ❤️ usando Node.js y Sharp**
