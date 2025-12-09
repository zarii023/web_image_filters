import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Circle, 
  Loader2, 
  AlertTriangle, 
  RotateCcw, 
  Clock,
  TrendingUp,
  Zap,
  Eye,
  Scan,
  MapPin,
  Settings
} from 'lucide-react';

const LoadingProgress = ({ 
  currentStage, 
  progress = 0, 
  stages = [
    'Analizando imagen',
    'Detectando rostro', 
    'Mapeando zonas',
    'Calibrando parámetros'
  ],
  showDetails = true,
  className = "",
  retryCount = 0,
  isRetrying = false,
  detectionTime = 0,
  qualityMetrics = null,
  error = null
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [stageTransition, setStageTransition] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);

  // Animar progreso suavemente
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Detectar cambios de etapa para animaciones
  useEffect(() => {
    setStageTransition(true);
    const timer = setTimeout(() => setStageTransition(false), 300);
    return () => clearTimeout(timer);
  }, [currentStage]);

  // Mostrar estadísticas al completar
  useEffect(() => {
    if (progress >= 100 && detectionTime > 0) {
      const timer = setTimeout(() => setShowPerformanceStats(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [progress, detectionTime]);

  // Configuración de etapas con iconos y colores
  const stageConfig = [
    { 
      name: 'Analizando imagen', 
      icon: Scan, 
      color: 'blue',
      description: 'Validando calidad y condiciones'
    },
    { 
      name: 'Detectando rostro', 
      icon: Eye, 
      color: 'purple',
      description: 'Localizando características faciales'
    },
    { 
      name: 'Mapeando zonas', 
      icon: MapPin, 
      color: 'green',
      description: 'Segmentando áreas de tratamiento'
    },
    { 
      name: 'Calibrando parámetros', 
      icon: Settings, 
      color: 'orange',
      description: 'Optimizando configuración'
    }
  ];
  // Calcular qué etapa está activa basada en el progreso
  const getActiveStageIndex = () => {
    if (progress === 0) return -1;
    if (progress <= 20) return 0;
    if (progress <= 50) return 1;
    if (progress <= 80) return 2;
    return 3;
  };

  const activeStageIndex = getActiveStageIndex();

  // Obtener color según el estado
  const getColorClasses = (color, isActive, isCompleted, isError = false) => {
    if (isError) {
      return {
        bg: 'bg-red-50 border-red-500',
        text: 'text-red-700',
        icon: 'text-red-500'
      };
    }
    
    if (isCompleted) {
      return {
        bg: 'bg-green-50 border-green-500',
        text: 'text-green-700',
        icon: 'text-green-500'
      };
    }
    
    if (isActive) {
      const colorMap = {
        blue: { bg: 'bg-blue-50 border-blue-500', text: 'text-blue-700', icon: 'text-blue-500' },
        purple: { bg: 'bg-purple-50 border-purple-500', text: 'text-purple-700', icon: 'text-purple-500' },
        green: { bg: 'bg-green-50 border-green-500', text: 'text-green-700', icon: 'text-green-500' },
        orange: { bg: 'bg-orange-50 border-orange-500', text: 'text-orange-700', icon: 'text-orange-500' }
      };
      return colorMap[color] || colorMap.blue;
    }
    
    return {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-500',
      icon: 'text-gray-400'
    };
  };

  // Componente para cada etapa individual
  const StageItem = ({ stage, index, isActive, isCompleted, config }) => {
    const IconComponent = config?.icon || Circle;
    const colors = getColorClasses(config?.color, isActive, isCompleted, error && isActive);
    const stageProgress = isActive ? ((animatedProgress % 25) / 25) * 100 : 0;

    return (
      <motion.div
        className={`flex items-center gap-3 p-4 rounded-lg transition-all duration-500 border-l-4 ${colors.bg}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: 1, 
          x: 0,
          scale: stageTransition && isActive ? [1, 1.02, 1] : 1
        }}
        transition={{ 
          delay: index * 0.1,
          scale: { duration: 0.3 }
        }}
        whileHover={{ scale: 1.01 }}
      >
        {/* Icono de estado */}
        <div className="flex-shrink-0">
          <motion.div
            animate={isActive ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
          >
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <CheckCircle className={`w-6 h-6 ${colors.icon}`} />
              </motion.div>
            ) : isActive ? (
              error ? (
                <AlertTriangle className={`w-6 h-6 ${colors.icon}`} />
              ) : isRetrying ? (
                <RotateCcw className={`w-6 h-6 ${colors.icon} animate-spin`} />
              ) : (
                <IconComponent className={`w-6 h-6 ${colors.icon} ${isActive ? 'animate-pulse' : ''}`} />
              )
            ) : (
              <Circle className={`w-6 h-6 ${colors.icon}`} />
            )}
          </motion.div>
        </div>

        {/* Texto de la etapa */}
        <div className="flex-1">
          <div className={`font-semibold ${colors.text}`}>
            {stage}
          </div>
          
          {/* Descripción detallada */}
          {config?.description && showDetails && (
            <div className={`text-sm mt-1 ${colors.text} opacity-75`}>
              {config.description}
            </div>
          )}
          
          {/* Estado específico */}
          {isActive && showDetails && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${isRetrying}-${error}`}
                className={`text-sm mt-2 ${colors.text}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {error ? (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Error detectado</span>
                  </div>
                ) : isRetrying ? (
                  <div className="flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 animate-spin" />
                    <span>Reintentando... ({retryCount}/3)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Procesando...</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
          
          {isCompleted && showDetails && (
            <motion.div
              className={`text-sm mt-1 ${colors.text}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Completado exitosamente</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Indicador de progreso circular para la etapa activa */}
        {isActive && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 relative">
              <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className={`${colors.icon} opacity-20`}
                />
                <motion.circle
                  cx="20"
                  cy="20"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className={colors.icon}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 113.1" }}
                  animate={{ 
                    strokeDasharray: `${stageProgress * 1.131} 113.1` 
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${colors.text}`}>
                  {Math.round(stageProgress)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={`loading-progress ${className}`}>
      {/* Encabezado con información de estado */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Detección Facial en Progreso
            </h3>
            {retryCount > 0 && (
              <div className="flex items-center gap-1 mt-1 text-sm text-orange-600">
                <RotateCcw className="w-4 h-4" />
                <span>Intento {retryCount + 1} de 4</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-gray-800">
              {Math.round(animatedProgress)}%
            </span>
            {detectionTime > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <Clock className="w-3 h-3" />
                <span>{(detectionTime / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Barra de progreso principal mejorada */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${animatedProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Efecto de brillo */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  duration: 2,
                  repeat: progress > 0 && progress < 100 ? Infinity : 0,
                  ease: "linear"
                }}
              />
            </motion.div>
          </div>
          
          {/* Indicadores de etapas en la barra */}
          <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-1">
            {[20, 50, 80].map((milestone, index) => (
              <motion.div
                key={milestone}
                className={`w-2 h-2 rounded-full ${
                  animatedProgress >= milestone ? 'bg-white shadow-lg' : 'bg-gray-400'
                }`}
                animate={{
                  scale: animatedProgress >= milestone ? [1, 1.3, 1] : 1
                }}
                transition={{
                  duration: 0.5,
                  delay: animatedProgress >= milestone ? 0.2 : 0
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Lista de etapas mejorada */}
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <StageItem
            key={index}
            stage={stage}
            index={index}
            isActive={index === activeStageIndex}
            isCompleted={index < activeStageIndex}
            config={stageConfig[index]}
          />
        ))}
      </div>

      {/* Panel de información mejorado */}
      {showDetails && (
        <motion.div
          className="mt-6 space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Información de calidad */}
          {qualityMetrics && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Calidad de Imagen: {qualityMetrics.score}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-blue-600">
                  Brillo: {qualityMetrics.metrics?.brightness || 'N/A'}
                </div>
                <div className="text-blue-600">
                  Nitidez: {qualityMetrics.metrics?.sharpness || 'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* Información de procesamiento */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <motion.div
                  className="w-3 h-3 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="flex-1">
                <div className="text-sm text-green-800 font-semibold mb-1">
                  Procesamiento Inteligente
                </div>
                <div className="text-xs text-green-600">
                  Utilizando TensorFlow.js y algoritmos avanzados para detectar 
                  68 puntos faciales con precisión superior al 95%.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mensaje de estado actual mejorado */}
      {currentStage && progress < 100 && (
        <AnimatePresence mode="wait">
          <motion.div
            className="mt-6 text-center"
            key={`${currentStage}-${isRetrying}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full shadow-lg border-2 ${
              error ? 'bg-red-50 border-red-200' :
              isRetrying ? 'bg-orange-50 border-orange-200' :
              'bg-white border-blue-200'
            }`}>
              {error ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : isRetrying ? (
                <RotateCcw className="w-5 h-5 text-orange-500 animate-spin" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              )}
              <span className={`font-medium ${
                error ? 'text-red-700' :
                isRetrying ? 'text-orange-700' :
                'text-gray-700'
              }`}>
                {currentStage}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Indicador de finalización mejorado */}
      {progress >= 100 && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full shadow-xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle className="w-6 h-6" />
            </motion.div>
            <span className="font-bold text-lg">
              ¡Detección Completada!
            </span>
          </div>
          
          {/* Estadísticas de rendimiento */}
          {showPerformanceStats && detectionTime > 0 && (
            <motion.div
              className="mt-4 grid grid-cols-3 gap-4 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-800">
                  {(detectionTime / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-gray-500">Tiempo</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <TrendingUp className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-800">
                  {Math.round((1 - retryCount / 4) * 100)}%
                </div>
                <div className="text-xs text-gray-500">Éxito</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <Zap className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <div className="text-sm font-semibold text-gray-800">
                  {qualityMetrics?.score || 95}%
                </div>
                <div className="text-xs text-gray-500">Calidad</div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default LoadingProgress;