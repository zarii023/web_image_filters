import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';

/**
 * Componente de detección facial en tiempo real
 * Utiliza react-webcam para capturar video y TensorFlow.js para detectar rostros
 * Aplica filtros visuales sobre las caras detectadas en tiempo real
 */
const RealTimeFaceDetector = ({ 
  onFaceDetected, 
  filterType = 'overlay', 
  filterColor = 'rgba(255, 182, 193, 0.3)',
  isActive = true,
  width = 640,
  height = 480
}) => {
  // Referencias para los elementos del DOM
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Estados del componente
  const [detector, setDetector] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [error, setError] = useState(null);
  
  // Sanitizar color para evitar negro y clamped alpha
  const safeColor = React.useMemo(() => {
    try {
      const c = (filterColor || '').toString().trim().toLowerCase();
      if (!c) return 'rgba(255,182,193,0.3)';
      if (c === 'black' || c === '#000' || c === '#000000') return 'rgba(255,182,193,0.3)';
      const m = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)/);
      if (m) {
        const r = parseInt(m[1],10), g = parseInt(m[2],10), b = parseInt(m[3],10);
        const aIn = m[4] !== undefined ? parseFloat(m[4]) : 0.3;
        const isNearBlack = r < 20 && g < 20 && b < 20;
        const a = Math.min(Math.max(aIn, 0), 0.35);
        if (isNearBlack) return `rgba(255,182,193,${a})`;
        return `rgba(${r},${g},${b},${a})`;
      }
      return 'rgba(255,182,193,0.3)';
    } catch {
      return 'rgba(255,182,193,0.3)';
    }
  }, [filterColor]);

  const bumpAlpha = React.useCallback((c, to = '0.8') => {
    const m = c.match(/rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+),\s*([0-9.]+)\)/);
    if (m) return `rgba(${m[1]},${m[2]},${m[3]},${to})`;
    return c;
  }, []);

  /**
   * Inicializa TensorFlow.js y carga el modelo de detección facial
   */
  const initializeTensorFlow = useCallback(async () => {
    try {
      console.log('Inicializando TensorFlow.js...');
      
      // Configurar el backend WebGL para mejor rendimiento
      await tf.setBackend('webgl');
      await tf.ready();
      
      console.log('Backend TensorFlow.js inicializado:', tf.getBackend());
      
      // Cargar el modelo MediaPipeFaceDetector
      const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
      const detectorConfig = {
        runtime: 'tfjs',
        modelType: 'short', // 'short' para mejor rendimiento, 'full' para mayor precisión
        maxFaces: 5, // Máximo número de caras a detectar
        refineLandmarks: true // Refinar landmarks para mayor precisión
      };
      
      console.log('Cargando modelo MediaPipeFaceDetector...');
      const faceDetector = await faceDetection.createDetector(model, detectorConfig);
      
      setDetector(faceDetector);
      setIsModelLoaded(true);
      setError(null);
      
      console.log('Modelo de detección facial cargado exitosamente');
      
    } catch (err) {
      console.error('Error inicializando TensorFlow.js:', err);
      setError(`Error al cargar el modelo: ${err.message}`);
      setIsModelLoaded(false);
    }
  }, []);

  /**
   * Detecta caras en el frame actual del video
   */
  const detectFaces = useCallback(async () => {
    // Verificar que todos los elementos necesarios estén disponibles
    if (!detector || !webcamRef.current || !canvasRef.current || !isActive) {
      return;
    }

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    // Verificar que el video esté listo
    if (!video || video.readyState !== 4) {
      return;
    }

    try {
      // Detectar caras en el frame actual
      const faces = await detector.estimateFaces(video);
      
      // Actualizar el estado con las caras detectadas
      setDetectedFaces(faces);
      
      // Notificar al componente padre si hay caras detectadas
      if (onFaceDetected && faces.length > 0) {
        onFaceDetected(faces);
      }
      
      // Dibujar las detecciones y filtros en el canvas
      drawDetections(canvas, video, faces);
      
    } catch (err) {
      console.error('Error en detección facial:', err);
      // No establecer error aquí para evitar interrumpir el bucle de detección
    }
  }, [detector, isActive, onFaceDetected]);

  /**
   * Dibuja las detecciones de caras y aplica filtros visuales
   */
  const drawDetections = useCallback((canvas, video, faces) => {
    const ctx = canvas.getContext('2d');
    
    // Configurar el canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar el frame base del vídeo para evitar fondo negro
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      // Si falla el drawImage, continuar y renderizar overlays
    }
    
    // Dibujar cada cara detectada
    faces.forEach((face, index) => {
      const { box, keypoints } = face;
      
      // Aplicar filtro visual según el tipo seleccionado
      switch (filterType) {
        case 'overlay':
          drawOverlayFilter(ctx, box);
          break;
        case 'glow':
          drawGlowFilter(ctx, box);
          break;
        case 'frame':
          drawFrameFilter(ctx, box);
          break;
        case 'blur':
          drawBlurFilter(ctx, box, video);
          break;
        default:
          drawOverlayFilter(ctx, box);
      }
      
      // Dibujar puntos clave faciales (opcional)
      if (keypoints && keypoints.length > 0) {
        drawKeypoints(ctx, keypoints);
      }
      
      // Dibujar información de la detección
      drawDetectionInfo(ctx, box, index, face.score);
    });

    // Asegurar fondo blanco bajo el canvas para evitar áreas negras con transparencia
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }, [filterType, filterColor]);

  /**
   * Dibuja un filtro de superposición semitransparente
   */
  const drawOverlayFilter = useCallback((ctx, box) => {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = safeColor;
    ctx.fillRect(box.xMin, box.yMin, box.width, box.height);
    ctx.strokeStyle = bumpAlpha(safeColor, '0.8');
    ctx.lineWidth = 2;
    ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
    ctx.restore();
  }, [safeColor, bumpAlpha]);

  /**
   * Dibuja un filtro de resplandor alrededor de la cara
   */
  const drawGlowFilter = useCallback((ctx, box) => {
    const c = ctx?.canvas;
    const cw = c?.width || 1;
    const ch = c?.height || 1;
    const safe = (v, fb) => (typeof v === 'number' && Number.isFinite(v)) ? v : fb;
    const sr = (v, fb) => Math.max(0, safe(v, fb));

    const centerX = safe(box.xMin + box.width / 2, cw / 2);
    const centerY = safe(box.yMin + box.height / 2, ch / 2);
    const radius = sr(Math.max(safe(box.width, cw * 0.4), safe(box.height, ch * 0.4)) / 2, Math.min(cw, ch) * 0.2);
    
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius * 1.2);
    gradient.addColorStop(0, safeColor);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }, [safeColor]);

  /**
   * Dibuja un marco decorativo alrededor de la cara
   */
  const drawFrameFilter = useCallback((ctx, box) => {
    const padding = 20;
    const frameX = box.xMin - padding;
    const frameY = box.yMin - padding;
    const frameWidth = box.width + padding * 2;
    const frameHeight = box.height + padding * 2;
    
    // Marco exterior
    ctx.strokeStyle = filterColor.replace('0.3', '1');
    ctx.lineWidth = 4;
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
    
    // Esquinas decorativas
    const cornerSize = 15;
    ctx.lineWidth = 3;
    
    // Esquina superior izquierda
    ctx.beginPath();
    ctx.moveTo(frameX, frameY + cornerSize);
    ctx.lineTo(frameX, frameY);
    ctx.lineTo(frameX + cornerSize, frameY);
    ctx.stroke();
    
    // Esquina superior derecha
    ctx.beginPath();
    ctx.moveTo(frameX + frameWidth - cornerSize, frameY);
    ctx.lineTo(frameX + frameWidth, frameY);
    ctx.lineTo(frameX + frameWidth, frameY + cornerSize);
    ctx.stroke();
    
    // Esquina inferior izquierda
    ctx.beginPath();
    ctx.moveTo(frameX, frameY + frameHeight - cornerSize);
    ctx.lineTo(frameX, frameY + frameHeight);
    ctx.lineTo(frameX + cornerSize, frameY + frameHeight);
    ctx.stroke();
    
    // Esquina inferior derecha
    ctx.beginPath();
    ctx.moveTo(frameX + frameWidth - cornerSize, frameY + frameHeight);
    ctx.lineTo(frameX + frameWidth, frameY + frameHeight);
    ctx.lineTo(frameX + frameWidth, frameY + frameHeight - cornerSize);
    ctx.stroke();
  }, [filterColor]);

  /**
   * Dibuja un efecto de desenfoque en el área de la cara
   */
  const drawBlurFilter = useCallback((ctx, box, video) => {
    // Crear un canvas temporal para el efecto de desenfoque
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = box.width;
    tempCanvas.height = box.height;
    
    // Copiar la región de la cara al canvas temporal
    tempCtx.drawImage(video, box.xMin, box.yMin, box.width, box.height, 0, 0, box.width, box.height);
    
    // Aplicar filtro de desenfoque
    ctx.filter = 'blur(8px)';
    ctx.drawImage(tempCanvas, box.xMin, box.yMin);
    ctx.filter = 'none';
    
    // Agregar borde
    ctx.strokeStyle = filterColor.replace('0.3', '0.8');
    ctx.lineWidth = 2;
    ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
  }, [filterColor]);

  /**
   * Dibuja los puntos clave faciales
   */
  const drawKeypoints = useCallback((ctx, keypoints) => {
    ctx.fillStyle = '#FF6B6B';
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 1;
    
    keypoints.forEach((keypoint) => {
      const { x, y } = keypoint;
      
      // Dibujar punto
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  /**
   * Dibuja información de la detección
   */
  const drawDetectionInfo = useCallback((ctx, box, index, score) => {
    const confidence = Math.round(score * 100);
    const text = `Cara ${index + 1}: ${confidence}%`;
    
    // Eliminar rectángulo negro de fondo para evitar overlays oscuros
    // ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    // ctx.fillRect(box.xMin, box.yMin - 25, 120, 20);
    
    // Dibujar texto con sombra suave para legibilidad sin bloquear la cara
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.fillText(text, box.xMin + 5, box.yMin - 10);
    ctx.restore();
  }, []);

  /**
   * Bucle principal de detección usando requestAnimationFrame
   */
  const detectionLoop = useCallback(() => {
    if (isActive && isModelLoaded) {
      detectFaces();
    }
    
    // Continuar el bucle de detección
    animationRef.current = requestAnimationFrame(detectionLoop);
  }, [detectFaces, isActive, isModelLoaded]);

  /**
   * Inicia el bucle de detección
   */
  const startDetection = useCallback(() => {
    if (!isDetecting && isModelLoaded) {
      setIsDetecting(true);
      detectionLoop();
    }
  }, [isDetecting, isModelLoaded, detectionLoop]);

  /**
   * Detiene el bucle de detección
   */
  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Efecto para inicializar TensorFlow.js al montar el componente
  useEffect(() => {
    initializeTensorFlow();
    
    // Cleanup al desmontar
    return () => {
      stopDetection();
      if (detector) {
        detector.dispose();
      }
    };
  }, [initializeTensorFlow, stopDetection]);

  // Efecto para controlar el bucle de detección
  useEffect(() => {
    if (isActive && isModelLoaded && !isDetecting) {
      startDetection();
    } else if (!isActive && isDetecting) {
      stopDetection();
    }
  }, [isActive, isModelLoaded, isDetecting, startDetection, stopDetection]);

  // Configuración de la webcam
  const videoConstraints = {
    width: width,
    height: height,
    facingMode: "user" // Cámara frontal
  };

  return (
    <div className="relative inline-block">
      {/* Webcam para capturar video */}
      <Webcam
        ref={webcamRef}
        audio={false}
        width={width}
        height={height}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="rounded-lg"
        onUserMedia={() => {
          console.log('Webcam iniciada correctamente');
        }}
        onUserMediaError={(error) => {
          console.error('Error accediendo a la webcam:', error);
          setError('No se pudo acceder a la cámara');
        }}
      />
      
      {/* Canvas superpuesto para dibujar las detecciones */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none rounded-lg"
        style={{
          width: width,
          height: height
        }}
      />
      
      {/* Indicadores de estado */}
      <div className="absolute top-2 left-2 space-y-1">
        {/* Estado del modelo */}
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          isModelLoaded 
            ? 'bg-green-500 text-white' 
            : 'bg-yellow-500 text-white'
        }`}>
          {isModelLoaded ? 'Modelo cargado' : 'Cargando modelo...'}
        </div>
        
        {/* Estado de detección */}
        {isModelLoaded && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            isDetecting 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-500 text-white'
          }`}>
            {isDetecting ? 'Detectando...' : 'Pausado'}
          </div>
        )}
        
        {/* Contador de caras */}
        {detectedFaces.length > 0 && (
          <div className="px-2 py-1 rounded text-xs font-medium bg-purple-500 text-white">
            {detectedFaces.length} cara{detectedFaces.length !== 1 ? 's' : ''} detectada{detectedFaces.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-500 text-white p-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default RealTimeFaceDetector;