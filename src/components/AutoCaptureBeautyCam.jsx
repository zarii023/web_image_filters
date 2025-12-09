import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { Camera, Loader, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import filterConfigManager from '../services/FilterConfigManager';

/**
 * AutoCaptureBeautyCam - Cámara con captura automática y procesamiento de filtros
 * 
 * Funcionalidades:
 * - Captura automática al detectar rostro
 * - Aplicación de filtros predefinidos según producto
 * - Procesamiento en tiempo real con WebGL
 * - Estados de carga y feedback visual
 * - Integración con sistema de configuración
 */

const AutoCaptureBeautyCam = ({ 
  productId, 
  onCaptureComplete, 
  onError,
  autoStart = false 
}) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const animationRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, initializing, detecting, capturing, processing, completed, error
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [error, setError] = useState(null);
  const [filterConfig, setFilterConfig] = useState(null);

  // Configuración de la cámara
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user'
  };

  useEffect(() => {
    if (productId) {
      loadFilterConfiguration();
    }
  }, [productId]);

  useEffect(() => {
    if (autoStart && filterConfig) {
      startCapture();
    }
  }, [autoStart, filterConfig]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const loadFilterConfiguration = () => {
    try {
      const config = filterConfigManager.getProductConfig(productId);
      setFilterConfig(config);
    } catch (error) {
      console.error('Error cargando configuración de filtros:', error);
      setError('Error cargando configuración de filtros');
    }
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (detectorRef.current) {
      detectorRef.current = null;
    }
  };

  const initializeFaceDetection = async () => {
    try {
      setStatus('initializing');
      setIsLoading(true);

      // Inicializar TensorFlow.js
      await import('@tensorflow/tfjs-backend-webgl');
      
      // Crear detector de rostros
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'short',
        maxFaces: 1
      };
      
      detectorRef.current = await faceDetection.createDetector(model, detectorConfig);
      
      setStatus('detecting');
      setIsLoading(false);
      
      // Iniciar detección continua
      startFaceDetection();
      
    } catch (error) {
      console.error('Error inicializando detección facial:', error);
      setError('Error inicializando cámara');
      setStatus('error');
      setIsLoading(false);
      if (onError) onError(error);
    }
  };

  const startFaceDetection = () => {
    const detectFaces = async () => {
      if (!webcamRef.current || !detectorRef.current || status !== 'detecting') {
        return;
      }

      const video = webcamRef.current.video;
      if (video && video.readyState === 4) {
        try {
          const faces = await detectorRef.current.estimateFaces(video);
          const hasFace = faces && faces.length > 0;
          
          setFaceDetected(hasFace);
          
          if (hasFace && !countdown) {
            // Iniciar countdown para captura automática
            startCountdown();
          }
        } catch (error) {
          console.error('Error en detección facial:', error);
        }
      }

      if (status === 'detecting') {
        animationRef.current = requestAnimationFrame(detectFaces);
      }
    };

    detectFaces();
  };

  const startCountdown = () => {
    setStatus('capturing');
    let count = 3;
    setCountdown(count);

    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(countdownInterval);
        captureAndProcess();
      }
    }, 1000);
  };

  const captureAndProcess = async () => {
    try {
      setStatus('processing');
      setCountdown(0);
      
      // Capturar imagen original
      const imageSrc = webcamRef.current.getScreenshot();
      setOriginalImage(imageSrc);
      
      // Procesar imagen con filtros
      const processed = await applyFilters(imageSrc);
      setProcessedImage(processed);
      
      setStatus('completed');
      
      if (onCaptureComplete) {
        onCaptureComplete({
          original: imageSrc,
          processed: processed,
          productId: productId,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error procesando imagen:', error);
      setError('Error procesando imagen');
      setStatus('error');
      if (onError) onError(error);
    }
  };

  const applyFilters = async (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Dibujar imagen original
        ctx.drawImage(img, 0, 0);
        
        // Aplicar filtros según configuración
        if (filterConfig && filterConfig.filters) {
          applyImageFilters(ctx, canvas.width, canvas.height);
        }
        
        // Retornar imagen procesada
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = imageSrc;
    });
  };

  const applyImageFilters = (ctx, width, height) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const filters = filterConfig.filters;
    
    // Aplicar filtros pixel por pixel
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      
      // Suavizado de piel (simplificado)
      if (filters.skinSmoothing?.enabled) {
        const intensity = filters.skinSmoothing.intensity / 100;
        const smoothing = 1 - (intensity * 0.3);
        r = Math.min(255, r * (1 + intensity * 0.1));
        g = Math.min(255, g * (1 + intensity * 0.1));
        b = Math.min(255, b * (1 + intensity * 0.1));
      }
      
      // Brillo
      if (filters.brightness?.enabled) {
        const intensity = filters.brightness.intensity / 100;
        const brightness = intensity * 50;
        r = Math.min(255, Math.max(0, r + brightness));
        g = Math.min(255, Math.max(0, g + brightness));
        b = Math.min(255, Math.max(0, b + brightness));
      }
      
      // Contraste
      if (filters.contrast?.enabled) {
        const intensity = filters.contrast.intensity / 100;
        const contrast = 1 + (intensity * 0.5);
        r = Math.min(255, Math.max(0, ((r - 128) * contrast) + 128));
        g = Math.min(255, Math.max(0, ((g - 128) * contrast) + 128));
        b = Math.min(255, Math.max(0, ((b - 128) * contrast) + 128));
      }
      
      // Tono cálido
      if (filters.warmTone?.enabled) {
        const intensity = filters.warmTone.intensity / 100;
        r = Math.min(255, r + (intensity * 20));
        g = Math.min(255, g + (intensity * 10));
        b = Math.max(0, b - (intensity * 5));
      }
      
      // Saturación
      if (filters.saturation?.enabled) {
        const intensity = filters.saturation.intensity / 100;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const saturation = 1 + intensity;
        r = Math.min(255, Math.max(0, gray + saturation * (r - gray)));
        g = Math.min(255, Math.max(0, gray + saturation * (g - gray)));
        b = Math.min(255, Math.max(0, gray + saturation * (b - gray)));
      }
      
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const startCapture = () => {
    setIsActive(true);
    setError(null);
    setOriginalImage(null);
    setProcessedImage(null);
    setFaceDetected(false);
    setCountdown(0);
    initializeFaceDetection();
  };

  const stopCapture = () => {
    setIsActive(false);
    setStatus('idle');
    cleanup();
  };

  const resetCapture = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
    setStatus('idle');
    setFaceDetected(false);
    setCountdown(0);
    cleanup();
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'initializing':
        return 'Inicializando cámara...';
      case 'detecting':
        return faceDetected ? 'Rostro detectado - Preparando captura...' : 'Posiciona tu rostro en el centro';
      case 'capturing':
        return `Capturando en ${countdown}...`;
      case 'processing':
        return 'Aplicando filtros de belleza...';
      case 'completed':
        return 'Captura completada exitosamente';
      case 'error':
        return error || 'Error en el proceso';
      default:
        return 'Listo para capturar';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'detecting':
        return faceDetected ? 'text-green-600' : 'text-yellow-600';
      case 'capturing':
        return 'text-blue-600';
      case 'processing':
        return 'text-purple-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Estado y Controles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Captura Automática con Filtros
          </h3>
          
          <div className="flex items-center space-x-2">
            {!isActive ? (
              <button
                onClick={startCapture}
                disabled={!filterConfig}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Camera className="w-4 h-4" />
                <span>Iniciar Captura</span>
              </button>
            ) : (
              <button
                onClick={stopCapture}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
              >
                <span>Detener</span>
              </button>
            )}
            
            {(originalImage || error) && (
              <button
                onClick={resetCapture}
                className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Estado del Proceso */}
        <div className="flex items-center space-x-3 mb-4">
          {isLoading ? (
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
          ) : status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : status === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Camera className="w-5 h-5 text-gray-400" />
          )}
          
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusMessage()}
          </span>
          
          {countdown > 0 && (
            <div className="ml-auto">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                {countdown}
              </div>
            </div>
          )}
        </div>

        {/* Cámara */}
        {isActive && (
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-auto"
            />
            
            {/* Overlay de detección */}
            {faceDetected && status === 'detecting' && (
              <div className="absolute inset-0 border-4 border-green-400 rounded-lg animate-pulse">
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                  Rostro Detectado
                </div>
              </div>
            )}
            
            {/* Overlay de captura */}
            {status === 'capturing' && (
              <div className="absolute inset-0 bg-white bg-opacity-20 flex items-center justify-center">
                <div className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-xl">
                  {countdown}
                </div>
              </div>
            )}
            
            {/* Overlay de procesamiento */}
            {status === 'processing' && (
              <div className="absolute inset-0 bg-purple-600 bg-opacity-80 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="font-medium">Aplicando filtros...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Canvas oculto para procesamiento */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>

      {/* Información de Configuración */}
      {filterConfig && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            Filtros Configurados para este Producto:
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filterConfig.filters)
              .filter(([_, config]) => config.enabled)
              .map(([filterType, config]) => (
                <span
                  key={filterType}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {filterType} ({config.intensity}%)
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoCaptureBeautyCam;