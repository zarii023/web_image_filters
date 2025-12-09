import { useState, useCallback, useRef } from 'react';
import FaceDetectionEngine from '../components/detection/FaceDetectionEngine';

const useFaceDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [stage, setStage] = useState('idle'); // idle, initializing, analyzing, processing, completed, error
  
  const engineRef = useRef(null);
  const maxRetries = 3;

  // Initialize the detection engine
  const initializeEngine = useCallback(async () => {
    try {
      if (!engineRef.current) {
        engineRef.current = new FaceDetectionEngine();
      }
      
      setStage('initializing');
      setProgress(10);
      
      const initialized = await engineRef.current.initialize();
      if (!initialized) {
        throw new Error('No se pudo inicializar el sistema de detección facial');
      }
      
      setProgress(20);
      return true;
    } catch (error) {
      console.error('Error initializing detection engine:', error);
      setError({
        type: 'initialization',
        message: 'Error al inicializar el sistema de detección',
        details: error.message,
        canRetry: true
      });
      setStage('error');
      return false;
    }
  }, []);

  // Validate image quality before detection
  const validateImageQuality = useCallback((imageElement) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = imageElement.naturalWidth || imageElement.width;
      canvas.height = imageElement.naturalHeight || imageElement.height;
      
      ctx.drawImage(imageElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate brightness
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      const brightness = totalBrightness / (data.length / 4);
      
      // Calculate contrast (simplified)
      let variance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const pixelBrightness = (r + g + b) / 3;
        variance += Math.pow(pixelBrightness - brightness, 2);
      }
      const contrast = Math.sqrt(variance / (data.length / 4));
      
      // Quality assessment
      const quality = {
        brightness: brightness / 255,
        contrast: contrast / 255,
        resolution: canvas.width * canvas.height,
        aspectRatio: canvas.width / canvas.height,
        isGoodQuality: brightness > 50 && brightness < 200 && contrast > 20,
        recommendations: []
      };
      
      // Generate recommendations
      if (brightness < 50) {
        quality.recommendations.push('La imagen está muy oscura. Intenta con mejor iluminación.');
      } else if (brightness > 200) {
        quality.recommendations.push('La imagen está muy brillante. Reduce la exposición.');
      }
      
      if (contrast < 20) {
        quality.recommendations.push('La imagen tiene poco contraste. Mejora la iluminación.');
      }
      
      if (quality.resolution < 100000) {
        quality.recommendations.push('La resolución de la imagen es baja. Usa una imagen de mayor calidad.');
      }
      
      return quality;
    } catch (error) {
      console.error('Error validating image quality:', error);
      return {
        brightness: 0.5,
        contrast: 0.5,
        resolution: 0,
        aspectRatio: 1,
        isGoodQuality: false,
        recommendations: ['No se pudo analizar la calidad de la imagen']
      };
    }
  }, []);

  // Main detection function
  const startDetection = useCallback(async (imageElement) => {
    if (!imageElement) {
      setError({
        type: 'input',
        message: 'No se proporcionó una imagen válida',
        details: 'La imagen es requerida para el análisis facial',
        canRetry: false
      });
      setStage('error');
      return null;
    }

    try {
      setIsDetecting(true);
      setError(null);
      setProgress(0);
      setStage('initializing');

      // Initialize engine if needed
      const engineReady = await initializeEngine();
      if (!engineReady) {
        return null;
      }

      setStage('analyzing');
      setProgress(30);

      // Validate image quality
      const quality = validateImageQuality(imageElement);
      setQualityMetrics(quality);
      setProgress(40);

      // If quality is poor and we haven't retried much, provide feedback
      if (!quality.isGoodQuality && retryCount === 0) {
        setError({
          type: 'quality',
          message: 'La calidad de la imagen puede afectar el análisis',
          details: quality.recommendations.join(' '),
          canRetry: true,
          isWarning: true
        });
      }

      setProgress(50);
      setStage('processing');

      // Perform detection
      const result = await engineRef.current.detectFace(imageElement, {
        retryCount,
        qualityMetrics: quality
      });

      if (!result || !result.success) {
        throw new Error(result?.error || 'No se pudo detectar el rostro en la imagen');
      }

      setProgress(90);

      // Process and validate results
      const processedResult = {
        ...result,
        qualityMetrics: quality,
        timestamp: Date.now(),
        retryCount,
        confidence: Math.max(0.7, 1 - (retryCount * 0.1)) // Simulate confidence
      };

      setDetectionResult(processedResult);
      setProgress(100);
      setStage('completed');
      
      // Reset retry count on success
      setRetryCount(0);
      
      return processedResult;

    } catch (error) {
      console.error('Detection error:', error);
      
      const errorInfo = {
        type: 'detection',
        message: 'Error durante la detección facial',
        details: error.message,
        canRetry: retryCount < maxRetries,
        retryCount,
        maxRetries
      };

      // Provide specific error messages based on error type
      if (error.message.includes('Canvas')) {
        errorInfo.message = 'Error de procesamiento de imagen';
        errorInfo.details = 'Tu navegador no soporta el procesamiento de imágenes requerido';
        errorInfo.canRetry = false;
      } else if (error.message.includes('detectar')) {
        errorInfo.message = 'No se detectó un rostro en la imagen';
        errorInfo.details = 'Asegúrate de que la imagen contenga un rostro visible y bien iluminado';
      } else if (error.message.includes('calidad')) {
        errorInfo.message = 'La calidad de la imagen es insuficiente';
        errorInfo.details = 'Intenta con una imagen más clara y mejor iluminada';
      }

      setError(errorInfo);
      setStage('error');
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [retryCount, initializeEngine, validateImageQuality]);

  // Retry detection with incremented count
  const retryDetection = useCallback(async (imageElement) => {
    if (retryCount >= maxRetries) {
      setError({
        type: 'max_retries',
        message: 'Se alcanzó el máximo número de intentos',
        details: 'Por favor, intenta con una imagen diferente o verifica las condiciones de iluminación',
        canRetry: false
      });
      return null;
    }

    setRetryCount(prev => prev + 1);
    return await startDetection(imageElement);
  }, [retryCount, maxRetries, startDetection]);

  // Reset all states
  const reset = useCallback(() => {
    setIsDetecting(false);
    setProgress(0);
    setError(null);
    setRetryCount(0);
    setQualityMetrics(null);
    setDetectionResult(null);
    setStage('idle');
  }, []);

  // Get user-friendly stage description
  const getStageDescription = useCallback(() => {
    switch (stage) {
      case 'initializing':
        return 'Inicializando sistema de detección...';
      case 'analyzing':
        return 'Analizando calidad de imagen...';
      case 'processing':
        return 'Detectando características faciales...';
      case 'completed':
        return 'Análisis completado exitosamente';
      case 'error':
        return 'Error en el análisis';
      default:
        return 'Listo para analizar';
    }
  }, [stage]);

  return {
    // State
    isDetecting,
    progress,
    error,
    retryCount,
    maxRetries,
    qualityMetrics,
    detectionResult,
    stage,
    
    // Actions
    startDetection,
    retryDetection,
    reset,
    
    // Helpers
    getStageDescription,
    canRetry: error?.canRetry && retryCount < maxRetries,
    hasResult: !!detectionResult,
    isError: stage === 'error',
    isCompleted: stage === 'completed'
  };
};

export default useFaceDetection;