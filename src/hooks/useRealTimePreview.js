import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash-es';

export const useRealTimePreview = (productId, testImage) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState(new Map());
  const [renderTime, setRenderTime] = useState(0);
  
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Inicializar canvas y worker
  useEffect(() => {
    // Crear canvas para renderizado
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 400;
      canvasRef.current.height = 400;
    }

    // Inicializar worker para procesamiento en background (simulado)
    // En producción, esto sería un Web Worker real
    workerRef.current = {
      postMessage: (data) => {
        // Simular procesamiento asíncrono
        setTimeout(() => {
          handleWorkerMessage({ data: { type: 'PREVIEW_COMPLETE', result: data } });
        }, 100);
      }
    };

    return () => {
      // Cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Manejar mensajes del worker
  const handleWorkerMessage = useCallback((event) => {
    const { type, result, error: workerError } = event.data;

    switch (type) {
      case 'PREVIEW_COMPLETE':
        setPreviewUrl(result.previewUrl);
        setRenderTime(result.renderTime);
        setIsGenerating(false);
        break;
      case 'PREVIEW_ERROR':
        setError(workerError);
        setIsGenerating(false);
        break;
    }
  }, []);

  // Generar clave de cache basada en parámetros
  const generateCacheKey = useCallback((parameters) => {
    return JSON.stringify({
      productId,
      testImage: testImage?.name || 'default',
      parameters: parameters
    });
  }, [productId, testImage]);

  // Aplicar efectos usando WebGL (simulado)
  const applyEffectsWebGL = useCallback(async (imageElement, parameters) => {
    const startTime = performance.now();
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Dibujar imagen original
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      
      // Aplicar efectos basados en parámetros
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Aplicar efectos según la configuración
      for (let i = 0; i < data.length; i += 4) {
        // Aplicar intensidad
        if (parameters.intensity) {
          const factor = parameters.intensity;
          data[i] = Math.min(255, data[i] * (1 + factor * 0.2)); // R
          data[i + 1] = Math.min(255, data[i + 1] * (1 + factor * 0.2)); // G
          data[i + 2] = Math.min(255, data[i + 2] * (1 + factor * 0.2)); // B
        }
        
        // Aplicar suavizado
        if (parameters.smoothing && parameters.smoothing > 0) {
          // Efecto de suavizado simple
          const smoothFactor = parameters.smoothing * 0.1;
          data[i] = data[i] * (1 - smoothFactor) + 128 * smoothFactor;
          data[i + 1] = data[i + 1] * (1 - smoothFactor) + 128 * smoothFactor;
          data[i + 2] = data[i + 2] * (1 - smoothFactor) + 128 * smoothFactor;
        }
        
        // Aplicar corrección de brillo
        if (parameters.brightness_boost) {
          const brightness = parameters.brightness_boost * 50;
          data[i] = Math.min(255, Math.max(0, data[i] + brightness));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));
        }
      }
      
      // Aplicar efectos por zonas faciales si están disponibles
      if (parameters.face_zones) {
        Object.entries(parameters.face_zones).forEach(([zoneName, zoneConfig]) => {
          if (zoneConfig.enabled && zoneConfig.weight > 0) {
            // Aplicar efectos específicos por zona
            // En producción, esto usaría las coordenadas reales de las zonas
            applyZoneSpecificEffects(data, zoneName, zoneConfig, canvas.width, canvas.height);
          }
        });
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      return {
        previewUrl: canvas.toDataURL('image/jpeg', 0.9),
        renderTime: Math.round(renderTime),
        cacheKey: generateCacheKey(parameters)
      };
      
    } catch (error) {
      throw new Error(`Error aplicando efectos: ${error.message}`);
    }
  }, [generateCacheKey]);

  // Aplicar efectos específicos por zona
  const applyZoneSpecificEffects = (imageData, zoneName, zoneConfig, width, height) => {
    // Simulación de aplicación de efectos por zona
    // En producción, esto usaría las coordenadas reales de las zonas faciales
    const weight = zoneConfig.weight;
    
    switch (zoneName) {
      case 'forehead':
        // Aplicar efectos anti-edad en la frente
        applyAntiAgingEffect(imageData, 0, 0, width, height * 0.3, weight);
        break;
      case 'cheeks':
        // Aplicar efectos de hidratación en mejillas
        applyHydrationEffect(imageData, 0, height * 0.3, width, height * 0.4, weight);
        break;
      case 'eyeArea':
        // Aplicar efectos para contorno de ojos
        applyEyeAreaEffect(imageData, 0, height * 0.2, width, height * 0.3, weight);
        break;
    }
  };

  // Efectos específicos (simulados)
  const applyAntiAgingEffect = (data, x, y, w, h, intensity) => {
    // Efecto anti-edad simulado
    for (let i = 0; i < data.length; i += 4) {
      const factor = intensity * 0.1;
      data[i] = Math.min(255, data[i] * (1 + factor));
      data[i + 1] = Math.min(255, data[i + 1] * (1 + factor));
      data[i + 2] = Math.min(255, data[i + 2] * (1 + factor));
    }
  };

  const applyHydrationEffect = (data, x, y, w, h, intensity) => {
    // Efecto de hidratación simulado
    for (let i = 0; i < data.length; i += 4) {
      const factor = intensity * 0.05;
      data[i + 1] = Math.min(255, data[i + 1] * (1 + factor)); // Aumentar verde
    }
  };

  const applyEyeAreaEffect = (data, x, y, w, h, intensity) => {
    // Efecto para contorno de ojos simulado
    for (let i = 0; i < data.length; i += 4) {
      const factor = intensity * 0.08;
      data[i] = Math.min(255, data[i] * (1 + factor));
      data[i + 2] = Math.min(255, data[i + 2] * (1 + factor));
    }
  };

  // Función principal para generar preview
  const generatePreview = useCallback(async (parameters) => {
    if (!testImage || !parameters) {
      setError('Imagen de prueba o parámetros no disponibles');
      return;
    }

    // Cancelar generación anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const cacheKey = generateCacheKey(parameters);
    
    // Verificar cache
    if (cache.has(cacheKey)) {
      const cachedResult = cache.get(cacheKey);
      setPreviewUrl(cachedResult.previewUrl);
      setRenderTime(cachedResult.renderTime);
      return cachedResult;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Crear elemento de imagen
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Error cargando imagen'));
      });

      if (testImage instanceof Blob) {
        img.src = URL.createObjectURL(testImage);
      } else if (typeof testImage === 'string') {
        img.src = testImage;
      } else {
        throw new Error('Formato de imagen no soportado');
      }

      const imageElement = await imageLoadPromise;
      
      // Generar preview con efectos
      const result = await applyEffectsWebGL(imageElement, parameters);
      
      // Guardar en cache
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, result);
        
        // Limitar tamaño del cache
        if (newCache.size > 50) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        
        return newCache;
      });

      setPreviewUrl(result.previewUrl);
      setRenderTime(result.renderTime);
      setIsGenerating(false);

      return result;

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setIsGenerating(false);
      }
      throw err;
    }
  }, [testImage, generateCacheKey, cache, applyEffectsWebGL]);

  // Versión debounced para evitar demasiadas llamadas
  const generatePreviewDebounced = useCallback(
    debounce(generatePreview, 300),
    [generatePreview]
  );

  // Limpiar cache
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // Obtener estadísticas del cache
  const getCacheStats = useCallback(() => {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }, [cache]);

  // Precargar preview con parámetros por defecto
  const preloadPreview = useCallback(async (defaultParameters) => {
    if (!testImage) return;
    
    try {
      await generatePreview(defaultParameters);
    } catch (error) {
      console.warn('Error precargando preview:', error);
    }
  }, [testImage, generatePreview]);

  return {
    // Estado
    previewUrl,
    isGenerating,
    error,
    renderTime,
    
    // Acciones
    generatePreview,
    generatePreviewDebounced,
    clearCache,
    preloadPreview,
    
    // Utilidades
    getCacheStats,
    
    // Referencias
    canvasRef
  };
};