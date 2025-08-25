/**
 * Ejemplo de cliente para la API de compresión de imágenes
 * 
 * Este archivo muestra cómo usar la API desde JavaScript/Node.js
 */

// Función para convertir una imagen a base64
async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Función para comprimir una imagen
async function compressImage(imageBase64, options = {}) {
    const {
        quality = 80,
        format = 'jpeg',
        width,
        height
    } = options;

    try {
        const response = await fetch('/api/compress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageBase64,
                quality,
                format,
                width,
                height
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error al comprimir imagen:', error);
        throw error;
    }
}

// Función para obtener información de una imagen
async function getImageInfo(imageBase64) {
    try {
        const response = await fetch('/api/image-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageBase64 })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error al obtener información de la imagen:', error);
        throw error;
    }
}

// Función para verificar el estado del servicio
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al verificar el estado del servicio:', error);
        throw error;
    }
}

// Ejemplo de uso en el navegador
if (typeof window !== 'undefined') {
    // Función para manejar la subida de archivos
    async function handleFileUpload(file) {
        try {
            console.log('Convirtiendo imagen a base64...');
            const base64 = await imageToBase64(file);
            
            console.log('Obteniendo información de la imagen...');
            const info = await getImageInfo(base64);
            console.log('Información de la imagen:', info);
            
            console.log('Comprimiendo imagen...');
            const result = await compressImage(base64, {
                quality: 75,
                format: 'webp',
                width: 1200
            });
            
            console.log('Resultado de la compresión:', result);
            
            // Mostrar resultados en la consola
            console.log(`✅ Imagen comprimida exitosamente!`);
            console.log(`📊 Tamaño original: ${(result.originalSize / 1024).toFixed(2)} KB`);
            console.log(`📊 Tamaño comprimido: ${(result.compressedSize / 1024).toFixed(2)} KB`);
            console.log(`📊 Reducción: ${result.reduction}`);
            
            return result;
        } catch (error) {
            console.error('Error en el proceso:', error);
            throw error;
        }
    }

    // Función para descargar la imagen comprimida
    function downloadCompressedImage(base64Data, filename = 'compressed_image') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = base64Data;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Exponer funciones globalmente para uso en la consola del navegador
    window.ImageCompressorAPI = {
        compressImage,
        getImageInfo,
        checkHealth,
        handleFileUpload,
        downloadCompressedImage
    };

    console.log('🚀 API de compresión de imágenes cargada!');
    console.log('Usa ImageCompressorAPI.compressImage() para comprimir imágenes');
    console.log('Usa ImageCompressorAPI.getImageInfo() para obtener información');
    console.log('Usa ImageCompressorAPI.checkHealth() para verificar el estado');
}

// Ejemplo de uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
    const fetch = require('node-fetch'); // Necesario para Node.js < 18
    
    module.exports = {
        compressImage,
        getImageInfo,
        checkHealth
    };
    
    // Ejemplo de uso
    async function example() {
        try {
            // Verificar estado del servicio
            const health = await checkHealth();
            console.log('Estado del servicio:', health);
            
            // Aquí podrías cargar una imagen desde un archivo
            // const fs = require('fs');
            // const imageBuffer = fs.readFileSync('imagen.jpg');
            // const base64 = imageBuffer.toString('base64');
            // const result = await compressImage(base64, { quality: 80 });
            
        } catch (error) {
            console.error('Error en el ejemplo:', error);
        }
    }
    
    // Ejecutar ejemplo si es el archivo principal
    if (require.main === module) {
        example();
    }
}
