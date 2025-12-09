import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
import { Camera, Download, RotateCcw, Sparkles } from 'lucide-react';

/**
 * Componente BeautyCam - Cámara con filtros de belleza y detección facial
 * 
 * Funcionalidades:
 * - Captura de video en tiempo real con react-webcam
 * - Detección facial usando TensorFlow.js MediaPipeFaceDetector
 * - Aplicación de filtros de belleza en la región facial
 * - Captura de fotos con filtros aplicados
 * - Interfaz intuitiva para e-commerce de cosméticos
 */
const BeautyCam = ({ 
  productName = "Producto de Belleza",
  onPhotoTaken = null,
  className = ""
}) => {
  // Referencias para elementos del DOM
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  
  // Estados del componente
  const [detector, setDetector] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [processedPhoto, setProcessedPhoto] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [detectedFaces, setDetectedFaces] = useState([]);

  /**
   * Inicializa TensorFlow.js y carga el modelo de detección facial
   */
  const initializeTensorFlow = useCallback(async () => {
    try {
      console.log('🚀 Inicializando TensorFlow.js para BeautyCam...');
      
      // Configurar backend WebGL para mejor rendimiento
      await tf.setBackend('webgl');
      await tf.ready();
      
      console.log('✅ Backend TensorFlow.js inicializado:', tf.getBackend());
      
      // Configuración del modelo MediaPipeFaceDetector
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'short', // Modelo optimizado para velocidad
        maxFaces: 1, // Detectar solo una cara principal
        refineLandmarks: true // Refinar landmarks para mayor precisión
      };
      
      console.log('📥 Cargando modelo MediaPipeFaceDetector...');
      const faceDetector = await faceDetection.createDetector(model, detectorConfig);
      
      setDetector(faceDetector);
      setIsModelLoaded(true);
      setError(null);
      
      console.log('✨ Modelo de detección facial cargado exitosamente');
      
    } catch (err) {
      console.error('❌ Error inicializando TensorFlow.js:', err);
      setError(`Error al cargar el modelo: ${err.message}`);
      setIsModelLoaded(false);
    }
  }, []);

  /**
   * Captura una foto desde la webcam
   */
  const capturePhoto = useCallback(async () => {
    if (!webcamRef.current || !isModelLoaded) {
      setError('Cámara o modelo no disponible');
      return;
    }

    try {
      setIsCapturing(true);
      setError(null);
      
      // Capturar imagen desde la webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('No se pudo capturar la imagen');
      }
      
      setCapturedPhoto(imageSrc);
      
      // Procesar la imagen capturada
      await processImageWithBeautyFilters(imageSrc);
      
    } catch (err) {
      console.error('❌ Error capturando foto:', err);
      setError('Error al capturar la foto. Inténtalo de nuevo.');
    } finally {
      setIsCapturing(false);
    }
  }, [isModelLoaded]);

  /**
   * Procesa la imagen aplicando detección facial y filtros de belleza
   */
  const processImageWithBeautyFilters = useCallback(async (imageSrc) => {
    if (!detector || !canvasRef.current || !originalCanvasRef.current) {
      setError('Detector o canvas no disponible');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Crear elemento de imagen
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      console.log('🔍 Detectando rostros en la imagen...');
      
      // Detectar caras en la imagen
      const faces = await detector.estimateFaces(img);
      setDetectedFaces(faces);
      
      if (faces.length === 0) {
        setError('No se detectó ningún rostro. Asegúrate de estar bien iluminado y mirando a la cámara.');
        setIsProcessing(false);
        return;
      }

      console.log(`✅ Detectadas ${faces.length} cara(s)`);
      
      // Configurar canvas original (sin filtros)
      const originalCanvas = originalCanvasRef.current;
      const originalCtx = originalCanvas.getContext('2d');
      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      originalCtx.drawImage(img, 0, 0);
      
      // Configurar canvas para filtros
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Dibujar imagen original como base
      ctx.drawImage(img, 0, 0);
      
      // Aplicar filtros de belleza a cada cara detectada
      faces.forEach((face, index) => {
        console.log(`💄 Aplicando filtros de belleza a la cara ${index + 1}...`);
        applyBeautyFilters(ctx, img, face);
      });
      
      // Guardar imagen procesada
      const processedImageData = canvas.toDataURL('image/jpeg', 0.9);
      setProcessedPhoto(processedImageData);
      
      // Notificar al componente padre si hay callback
      if (onPhotoTaken) {
        onPhotoTaken({
          original: imageSrc,
          processed: processedImageData,
          faces: faces,
          productName
        });
      }
      
      console.log('✨ Filtros de belleza aplicados exitosamente');
      
    } catch (err) {
      console.error('❌ Error procesando imagen:', err);
      setError('Error al procesar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  }, [detector, productName, onPhotoTaken]);

  /**
   * Aplica filtros de belleza en la región facial detectada
   */
  const applyBeautyFilters = useCallback((ctx, img, face) => {
    const { box } = face;
    
    // Expandir ligeramente el área facial para mejor cobertura
    const padding = 20;
    const faceX = Math.max(0, box.xMin - padding);
    const faceY = Math.max(0, box.yMin - padding);
    const faceWidth = Math.min(img.width - faceX, box.width + padding * 2);
    const faceHeight = Math.min(img.height - faceY, box.height + padding * 2);
    
    // Crear canvas temporal para el área facial
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = faceWidth;
    tempCanvas.height = faceHeight;
    
    // Extraer área facial
    tempCtx.drawImage(img, faceX, faceY, faceWidth, faceHeight, 0, 0, faceWidth, faceHeight);
    
    // 1. SUAVIZADO DE PIEL (Blur sutil)
    console.log('🌟 Aplicando suavizado de piel...');
    tempCtx.filter = 'blur(1.5px)';
    tempCtx.globalCompositeOperation = 'multiply';
    tempCtx.globalAlpha = 0.3;
    tempCtx.drawImage(tempCanvas, 0, 0);
    
    // Resetear filtros
    tempCtx.filter = 'none';
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.globalAlpha = 1.0;
    
    // 2. AUMENTO DE BRILLO Y CONTRASTE
    console.log('☀️ Ajustando brillo y contraste...');
    const imageData = tempCtx.getImageData(0, 0, faceWidth, faceHeight);
    const data = imageData.data;
    
    // Parámetros de ajuste
    const brightness = 15; // Aumento de brillo
    const contrast = 1.1;  // Ligero aumento de contraste
    
    for (let i = 0; i < data.length; i += 4) {
      // Aplicar contraste y brillo a RGB
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));     // R
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness)); // G
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness)); // B
    }
    
    // 3. TONO CÁLIDO (Ligero ajuste hacia tonos dorados)
    console.log('🌅 Aplicando tono cálido...');
    for (let i = 0; i < data.length; i += 4) {
      // Aumentar ligeramente el rojo y reducir el azul para tono cálido
      data[i] = Math.min(255, data[i] + 8);     // R (más cálido)
      data[i + 1] = Math.min(255, data[i + 1] + 4); // G (balance)
      data[i + 2] = Math.max(0, data[i + 2] - 6);   // B (menos frío)
    }
    
    // Aplicar los cambios al canvas temporal
    tempCtx.putImageData(imageData, 0, 0);
    
    // Dibujar el área procesada de vuelta al canvas principal
    ctx.drawImage(tempCanvas, faceX, faceY);
    
    // Dibujar indicador visual de la cara detectada (opcional)
    drawFaceIndicator(ctx, box);
    
  }, []);

  /**
   * Dibuja un indicador visual sutil de la cara detectada
   */
  const drawFaceIndicator = useCallback((ctx, box) => {
    // Guardar estado del contexto
    ctx.save();
    
    // Dibujar marco sutil alrededor de la cara
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Marco con esquinas redondeadas
    const radius = 10;
    ctx.beginPath();
    ctx.roundRect(box.xMin, box.yMin, box.width, box.height, radius);
    ctx.stroke();
    
    // Restaurar estado del contexto
    ctx.restore();
  }, []);

  /**
   * Descarga la imagen procesada
   */
  const downloadProcessedImage = useCallback(() => {
    if (!processedPhoto) return;
    
    const link = document.createElement('a');
    link.download = `beauty-filter-${productName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
    link.href = processedPhoto;
    link.click();
  }, [processedPhoto, productName]);

  /**
   * Reinicia la cámara para tomar una nueva foto
   */
  const resetCamera = useCallback(() => {
    setCapturedPhoto(null);
    setProcessedPhoto(null);
    setDetectedFaces([]);
    setError(null);
  }, []);

  // Efecto para inicializar TensorFlow.js al montar el componente
  useEffect(() => {
    initializeTensorFlow();
    
    // Cleanup al desmontar
    return () => {
      if (detector) {
        detector.dispose();
      }
    };
  }, [initializeTensorFlow]);

  // Configuración de la webcam
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user" // Cámara frontal
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header del componente */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">BeautyCam</h3>
              <p className="text-white/80 text-sm">Prueba {productName} con filtros de belleza</p>
            </div>
          </div>
          
          {/* Indicador de estado del modelo */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isModelLoaded 
              ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
              : 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
          }`}>
            {isModelLoaded ? '✅ Listo' : '⏳ Cargando...'}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Área de la cámara */}
        <div className="space-y-4">
          
          {/* Vista de la cámara o foto capturada */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            {!capturedPhoto ? (
              // Vista de la webcam
              <div className="relative">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  width={640}
                  height={480}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  className="w-full h-auto"
                  onUserMediaError={(error) => {
                    console.error('Error accediendo a la webcam:', error);
                    setError('No se pudo acceder a la cámara. Verifica los permisos.');
                  }}
                />
                
                {/* Overlay con instrucciones */}
                <div className="absolute inset-0 bg-black/20 flex items-end">
                  <div className="w-full p-4 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-center text-sm">
                      Posiciónate bien iluminado y mira directamente a la cámara
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Vista de la foto capturada (original)
              <div className="relative">
                <img 
                  src={capturedPhoto} 
                  alt="Foto capturada" 
                  className="w-full h-auto"
                />
                <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                  Original
                </div>
              </div>
            )}
          </div>

          {/* Controles principales */}
          <div className="flex justify-center space-x-4">
            {!capturedPhoto ? (
              // Botón para capturar foto
              <button
                onClick={capturePhoto}
                disabled={!isModelLoaded || isCapturing}
                className="flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                <Camera className="w-5 h-5" />
                <span>
                  {isCapturing ? 'Capturando...' : '📸 Tomar foto'}
                </span>
              </button>
            ) : (
              // Botones para foto capturada
              <div className="flex space-x-3">
                <button
                  onClick={resetCamera}
                  className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Nueva foto</span>
                </button>
                
                {processedPhoto && (
                  <button
                    onClick={downloadProcessedImage}
                    className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Área de procesamiento y resultado */}
          {capturedPhoto && (
            <div className="space-y-4">
              
              {/* Estado de procesamiento */}
              {isProcessing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="text-blue-800 font-medium">Aplicando filtros de belleza...</p>
                      <p className="text-blue-600 text-sm">Detectando rostro y mejorando la imagen</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resultado con filtros aplicados */}
              {processedPhoto && !isProcessing && (
                <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                  <div className="p-3 bg-green-100 border-b border-green-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-green-800 font-medium">✨ Resultado con filtros de belleza</h4>
                      {detectedFaces.length > 0 && (
                        <span className="text-green-600 text-sm">
                          {detectedFaces.length} rostro{detectedFaces.length !== 1 ? 's' : ''} detectado{detectedFaces.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto"
                      style={{ display: processedPhoto ? 'block' : 'none' }}
                    />
                    <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                      Con filtros de belleza
                    </div>
                  </div>
                  
                  {/* Información de los filtros aplicados */}
                  <div className="p-3 bg-white">
                    <p className="text-gray-600 text-sm mb-2">Filtros aplicados:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs">🌟 Suavizado de piel</span>
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">☀️ Brillo mejorado</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">✨ Contraste optimizado</span>
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs">🌅 Tono cálido</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensajes de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="text-red-500 text-xl">⚠️</div>
                <div>
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas oculto para imagen original */}
      <canvas
        ref={originalCanvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default BeautyCam;