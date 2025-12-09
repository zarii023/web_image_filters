import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  Camera, 
  Sun, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Target,
  Move,
  RotateCcw,
  Lightbulb
} from 'lucide-react';

const FaceDetectionGuide = ({
  isActive = false,
  imageElement = null,
  onQualityChange = null,
  showInstructions = true,
  className = ""
}) => {
  const [facePosition, setFacePosition] = useState({ x: 50, y: 50, detected: false });
  const [qualityMetrics, setQualityMetrics] = useState({
    lighting: { status: 'checking', score: 0, message: 'Analizando iluminación...' },
    distance: { status: 'checking', score: 0, message: 'Verificando distancia...' },
    angle: { status: 'checking', score: 0, message: 'Comprobando ángulo...' },
    stability: { status: 'checking', score: 0, message: 'Evaluando estabilidad...' },
    sharpness: { status: 'checking', score: 0, message: 'Midiendo nitidez...' }
  });
  const [overallQuality, setOverallQuality] = useState(0);
  const [instructions, setInstructions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const canvasRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const previousMetricsRef = useRef(null);

  // Iniciar análisis en tiempo real cuando se activa
  useEffect(() => {
    if (isActive && imageElement) {
      startRealTimeAnalysis();
    } else {
      stopRealTimeAnalysis();
    }

    return () => stopRealTimeAnalysis();
  }, [isActive, imageElement]);

  // Análisis en tiempo real de la calidad de imagen
  const startRealTimeAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) return;

    setIsAnalyzing(true);
    
    analysisIntervalRef.current = setInterval(() => {
      if (imageElement && canvasRef.current) {
        analyzeImageQuality();
      }
    }, 500); // Análisis cada 500ms para fluidez
  }, [imageElement]);

  const stopRealTimeAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  // Analizar calidad de imagen en tiempo real
  const analyzeImageQuality = useCallback(async () => {
    if (!imageElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas
    canvas.width = imageElement.naturalWidth || imageElement.width || 640;
    canvas.height = imageElement.naturalHeight || imageElement.height || 480;
    ctx.drawImage(imageElement, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Análisis de métricas
    const lighting = analyzeLighting(imageData);
    const distance = analyzeDistance(imageData, canvas);
    const angle = analyzeFaceAngle(imageData, canvas);
    const stability = analyzeStability(imageData);
    const sharpness = analyzeSharpness(imageData, canvas);
    
    const newMetrics = {
      lighting,
      distance,
      angle,
      stability,
      sharpness
    };
    
    // Calcular calidad general
    const overall = calculateOverallQuality(newMetrics);
    
    // Generar instrucciones específicas
    const newInstructions = generateInstructions(newMetrics);
    
    // Actualizar estado
    setQualityMetrics(newMetrics);
    setOverallQuality(overall);
    setInstructions(newInstructions);
    
    // Notificar cambios de calidad
    if (onQualityChange) {
      onQualityChange({
        metrics: newMetrics,
        overall,
        instructions: newInstructions
      });
    }
    
    previousMetricsRef.current = newMetrics;
  }, [imageElement, onQualityChange]);

  // Analizar iluminación
  const analyzeLighting = (imageData) => {
    const data = imageData.data;
    let brightness = 0;
    let pixelCount = 0;
    
    // Calcular brillo promedio
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      brightness += (r + g + b) / 3;
      pixelCount++;
    }
    
    brightness = brightness / pixelCount;
    
    let status, message, score;
    
    if (brightness < 60) {
      status = 'poor';
      message = 'Muy oscuro - mejore la iluminación';
      score = Math.max(0, brightness / 60 * 40);
    } else if (brightness > 200) {
      status = 'poor';
      message = 'Muy brillante - reduzca la luz';
      score = Math.max(0, (255 - brightness) / 55 * 40);
    } else if (brightness < 80 || brightness > 180) {
      status = 'warning';
      message = brightness < 80 ? 'Un poco oscuro' : 'Un poco brillante';
      score = 70;
    } else {
      status = 'good';
      message = 'Iluminación perfecta';
      score = 100;
    }
    
    return { status, message, score, value: Math.round(brightness) };
  };

  // Analizar distancia (basado en tamaño de rostro detectado)
  const analyzeDistance = (imageData, canvas) => {
    // Simulación de detección de rostro para calcular distancia
    const faceArea = detectFaceArea(imageData, canvas);
    const imageArea = canvas.width * canvas.height;
    const faceRatio = faceArea / imageArea;
    
    let status, message, score;
    
    if (faceRatio < 0.05) {
      status = 'poor';
      message = 'Muy lejos - acérquese más';
      score = Math.min(40, faceRatio / 0.05 * 40);
    } else if (faceRatio > 0.4) {
      status = 'poor';
      message = 'Muy cerca - aléjese un poco';
      score = Math.max(0, (0.6 - faceRatio) / 0.2 * 40);
    } else if (faceRatio < 0.1 || faceRatio > 0.3) {
      status = 'warning';
      message = faceRatio < 0.1 ? 'Un poco lejos' : 'Un poco cerca';
      score = 70;
    } else {
      status = 'good';
      message = 'Distancia perfecta';
      score = 100;
    }
    
    return { status, message, score, value: Math.round(faceRatio * 100) };
  };

  // Analizar ángulo facial
  const analyzeFaceAngle = (imageData, canvas) => {
    // Simulación de análisis de ángulo basado en simetría
    const symmetryScore = calculateFaceSymmetry(imageData, canvas);
    
    let status, message, score;
    
    if (symmetryScore < 0.6) {
      status = 'poor';
      message = 'Rostro muy ladeado - centre su cara';
      score = symmetryScore * 60;
    } else if (symmetryScore < 0.8) {
      status = 'warning';
      message = 'Ajuste ligeramente el ángulo';
      score = 70;
    } else {
      status = 'good';
      message = 'Ángulo perfecto';
      score = 100;
    }
    
    return { status, message, score, value: Math.round(symmetryScore * 100) };
  };

  // Analizar estabilidad (cambios entre frames)
  const analyzeStability = (imageData) => {
    if (!previousMetricsRef.current) {
      return { status: 'checking', message: 'Midiendo estabilidad...', score: 50, value: 0 };
    }
    
    // Comparar con frame anterior (simulado)
    const stabilityScore = Math.random() * 0.3 + 0.7; // Simulación
    
    let status, message, score;
    
    if (stabilityScore < 0.7) {
      status = 'poor';
      message = 'Imagen inestable - mantenga quieta la cámara';
      score = stabilityScore * 60;
    } else if (stabilityScore < 0.85) {
      status = 'warning';
      message = 'Ligero movimiento detectado';
      score = 70;
    } else {
      status = 'good';
      message = 'Imagen estable';
      score = 100;
    }
    
    return { status, message, score, value: Math.round(stabilityScore * 100) };
  };

  // Analizar nitidez
  const analyzeSharpness = (imageData, canvas) => {
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    let gradientSum = 0;
    let pixelCount = 0;
    
    // Calcular gradiente Sobel simplificado
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gx = Math.abs(data[idx] - data[idx - 4]) + Math.abs(data[idx + 4] - data[idx]);
        const gy = Math.abs(data[idx] - data[idx - width * 4]) + Math.abs(data[idx + width * 4] - data[idx]);
        gradientSum += Math.sqrt(gx * gx + gy * gy);
        pixelCount++;
      }
    }
    
    const sharpness = gradientSum / pixelCount;
    
    let status, message, score;
    
    if (sharpness < 15) {
      status = 'poor';
      message = 'Imagen borrosa - enfoque la cámara';
      score = Math.min(40, sharpness / 15 * 40);
    } else if (sharpness < 25) {
      status = 'warning';
      message = 'Ligeramente desenfocada';
      score = 70;
    } else {
      status = 'good';
      message = 'Imagen nítida';
      score = 100;
    }
    
    return { status, message, score, value: Math.round(sharpness) };
  };

  // Detectar área facial (simulado)
  const detectFaceArea = (imageData, canvas) => {
    // Simulación básica de detección de área facial
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const estimatedFaceWidth = Math.min(canvas.width, canvas.height) * 0.3;
    const estimatedFaceHeight = estimatedFaceWidth * 1.2;
    
    return estimatedFaceWidth * estimatedFaceHeight;
  };

  // Calcular simetría facial (simulado)
  const calculateFaceSymmetry = (imageData, canvas) => {
    // Simulación de análisis de simetría
    return Math.random() * 0.3 + 0.7; // Entre 0.7 y 1.0
  };

  // Calcular calidad general
  const calculateOverallQuality = (metrics) => {
    const scores = Object.values(metrics).map(m => m.score);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average);
  };

  // Generar instrucciones específicas
  const generateInstructions = (metrics) => {
    const instructions = [];
    
    Object.entries(metrics).forEach(([key, metric]) => {
      if (metric.status === 'poor') {
        instructions.push({
          type: 'error',
          icon: AlertTriangle,
          message: metric.message,
          priority: 'high'
        });
      } else if (metric.status === 'warning') {
        instructions.push({
          type: 'warning',
          icon: Eye,
          message: metric.message,
          priority: 'medium'
        });
      }
    });
    
    // Agregar instrucciones positivas
    const goodMetrics = Object.values(metrics).filter(m => m.status === 'good').length;
    if (goodMetrics === Object.keys(metrics).length) {
      instructions.push({
        type: 'success',
        icon: CheckCircle,
        message: '¡Perfecto! Condiciones ideales para la detección',
        priority: 'low'
      });
    }
    
    return instructions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  // Obtener color según el estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Obtener icono según la métrica
  const getMetricIcon = (metricKey) => {
    const icons = {
      lighting: Sun,
      distance: Move,
      angle: RotateCcw,
      stability: Target,
      sharpness: Eye
    };
    return icons[metricKey] || Eye;
  };

  return (
    <div className={`face-detection-guide ${className}`}>
      {/* Canvas oculto para análisis */}
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      
      {/* Marco de guía facial */}
      <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
        {/* Overlay de guía */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            animate={{
              scale: isActive ? [1, 1.02, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: isActive ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            {/* Marco facial */}
            <div className={`w-48 h-56 border-4 rounded-full ${
              overallQuality >= 80 ? 'border-green-400' :
              overallQuality >= 60 ? 'border-yellow-400' :
              'border-red-400'
            } relative`}>
              
              {/* Puntos de referencia */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <div className="absolute top-16 left-8 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <div className="absolute top-16 right-8 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              
              {/* Indicador de calidad central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${
                    overallQuality >= 80 ? 'border-green-400 bg-green-400/20' :
                    overallQuality >= 60 ? 'border-yellow-400 bg-yellow-400/20' :
                    'border-red-400 bg-red-400/20'
                  }`}
                  animate={{
                    rotate: isAnalyzing ? 360 : 0,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isAnalyzing ? Infinity : 0,
                    ease: "linear"
                  }}
                >
                  <span className="text-white font-bold text-sm">
                    {overallQuality}%
                  </span>
                </motion.div>
              </div>
            </div>
            
            {/* Instrucciones de posicionamiento */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
              <div className="text-white text-sm font-medium">
                Centre su rostro en el marco
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Efectos de escaneo */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent"
              initial={{ y: -100 }}
              animate={{ y: 300 }}
              exit={{ y: 300 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}
        </AnimatePresence>
      </div>
      
      {/* Panel de métricas en tiempo real */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(qualityMetrics).map(([key, metric]) => {
          const IconComponent = getMetricIcon(key);
          return (
            <motion.div
              key={key}
              className="bg-gray-800 rounded-lg p-3 text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <IconComponent className={`w-5 h-5 mx-auto mb-1 ${getStatusColor(metric.status)}`} />
              <div className="text-xs text-gray-300 capitalize mb-1">
                {key === 'lighting' ? 'Luz' :
                 key === 'distance' ? 'Distancia' :
                 key === 'angle' ? 'Ángulo' :
                 key === 'stability' ? 'Estabilidad' :
                 'Nitidez'}
              </div>
              <div className={`text-sm font-bold ${getStatusColor(metric.status)}`}>
                {metric.score}%
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Instrucciones dinámicas */}
      {showInstructions && instructions.length > 0 && (
        <div className="mt-4 space-y-2">
          <AnimatePresence>
            {instructions.slice(0, 3).map((instruction, index) => {
              const IconComponent = instruction.icon;
              return (
                <motion.div
                  key={`${instruction.type}-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    instruction.type === 'error' ? 'bg-red-900/30 border border-red-500/30' :
                    instruction.type === 'warning' ? 'bg-yellow-900/30 border border-yellow-500/30' :
                    'bg-green-900/30 border border-green-500/30'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                    instruction.type === 'error' ? 'text-red-400' :
                    instruction.type === 'warning' ? 'text-yellow-400' :
                    'text-green-400'
                  }`} />
                  <span className="text-white text-sm">
                    {instruction.message}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      
      {/* Indicador de estado general */}
      <div className="mt-4 text-center">
        <motion.div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            overallQuality >= 80 ? 'bg-green-500/20 text-green-400' :
            overallQuality >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}
          animate={{
            scale: overallQuality >= 80 ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: overallQuality >= 80 ? Infinity : 0,
          }}
        >
          {overallQuality >= 80 ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Listo para detectar</span>
            </>
          ) : overallQuality >= 60 ? (
            <>
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm font-medium">Ajustando condiciones...</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Mejore las condiciones</span>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FaceDetectionGuide;