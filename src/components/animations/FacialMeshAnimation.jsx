import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Line } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Smile, AlertTriangle, CheckCircle, Target, Zap } from 'lucide-react';
import * as THREE from 'three';

// Componente de puntos animados para landmarks con feedback visual mejorado
const AnimatedLandmarks = ({ landmarks, progress, isAnimating, qualityMetrics, detectionStage }) => {
  const pointsRef = useRef();
  const materialRef = useRef();

  // Convertir landmarks a posiciones 3D con análisis de calidad
  const positions = useMemo(() => {
    if (!landmarks || landmarks.length === 0) {
      // Crear una malla facial genérica más realista para la animación de carga
      const genericFace = [];
      
      // Contorno facial (17 puntos)
      for (let i = 0; i < 17; i++) {
        const angle = (i / 16) * Math.PI - Math.PI / 2;
        const radius = 1.2;
        genericFace.push([
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 1.3,
          Math.sin(i * 0.2) * 0.1
        ]);
      }
      
      // Cejas (10 puntos cada una)
      for (let i = 0; i < 10; i++) {
        const x = (i / 9) * 1.2 - 0.6;
        genericFace.push([x, 0.4, 0.05]); // Ceja derecha
        genericFace.push([-x, 0.4, 0.05]); // Ceja izquierda
      }
      
      // Ojos (12 puntos cada uno)
      for (let i = 0; i < 12; i++) {
        const angle = (i / 11) * Math.PI * 2;
        const radius = 0.15;
        genericFace.push([0.3 + Math.cos(angle) * radius, 0.1 + Math.sin(angle) * radius * 0.7, 0.02]); // Ojo derecho
        genericFace.push([-0.3 + Math.cos(angle) * radius, 0.1 + Math.sin(angle) * radius * 0.7, 0.02]); // Ojo izquierdo
      }
      
      // Nariz (9 puntos)
      for (let i = 0; i < 9; i++) {
        const y = (i / 8) * 0.4 - 0.1;
        genericFace.push([0, y, 0.08]);
      }
      
      // Boca (20 puntos)
      for (let i = 0; i < 20; i++) {
        const angle = (i / 19) * Math.PI;
        const radius = 0.25;
        genericFace.push([Math.cos(angle) * radius, -0.4 + Math.sin(angle) * 0.1, 0.03]);
      }
      
      return new Float32Array(genericFace.flat());
    }

    // Normalizar landmarks reales con mejor escalado
    const normalized = landmarks.map(point => [
      (point[0] - 320) / 320, // Normalizar X
      -(point[1] - 240) / 240, // Normalizar Y (invertir)
      Math.random() * 0.05 // Z con variación aleatoria pequeña
    ]);

    return new Float32Array(normalized.flat());
  }, [landmarks]);

  // Animación de frame con feedback visual mejorado
  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();
    
    if (isAnimating) {
      // Efecto de ondas durante la detección con variaciones por etapa
      const positions = pointsRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        
        // Diferentes efectos según la etapa de detección
        let waveIntensity = 0.1;
        let waveSpeed = 2;
        
        switch (detectionStage) {
          case 'analyzing':
            waveIntensity = 0.05;
            waveSpeed = 1;
            break;
          case 'detecting':
            waveIntensity = 0.15;
            waveSpeed = 3;
            break;
          case 'mapping':
            waveIntensity = 0.2;
            waveSpeed = 4;
            break;
          case 'calibrating':
            waveIntensity = 0.1;
            waveSpeed = 2;
            break;
        }
        
        // Crear ondas basadas en la posición, tiempo y calidad
        const qualityFactor = qualityMetrics?.score ? qualityMetrics.score / 100 : 1;
        positions[i + 2] = Math.sin(time * waveSpeed + x * 5 + y * 5) * waveIntensity * progress * qualityFactor;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Animar el color del material basado en calidad y etapa
      let hue = (time * 0.3) % 1;
      let saturation = 0.8;
      let lightness = 0.6;
      
      if (qualityMetrics?.score) {
        if (qualityMetrics.score >= 80) {
          hue = 0.33; // Verde
          saturation = 0.9;
          lightness = 0.7;
        } else if (qualityMetrics.score >= 60) {
          hue = 0.16; // Amarillo
          saturation = 0.8;
          lightness = 0.6;
        } else {
          hue = 0; // Rojo
          saturation = 0.7;
          lightness = 0.5;
        }
      }
      
      materialRef.current.color.setHSL(hue, saturation, lightness);
      
      // Animar el tamaño de los puntos con pulsación más suave
      const baseSize = landmarks && landmarks.length > 0 ? 4 : 3;
      materialRef.current.size = baseSize + Math.sin(time * 2) * 0.5;
      
      // Ajustar opacidad basada en la calidad
      const qualityOpacity = qualityMetrics?.score ? Math.max(0.6, qualityMetrics.score / 100) : 0.8;
      materialRef.current.opacity = qualityOpacity;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial
        ref={materialRef}
        transparent
        color="#00ff88"
        size={3}
        sizeAttenuation={true}
        opacity={0.8}
      />
    </Points>
  );
};

// Componente de efectos de partículas mejorado
const ParticleEffects = ({ isAnimating, progress, detectionStage, qualityMetrics }) => {
  const particlesRef = useRef();
  
  const particlePositions = useMemo(() => {
    const positions = [];
    const particleCount = 150; // Más partículas para mejor efecto
    
    for (let i = 0; i < particleCount; i++) {
      // Distribuir partículas en forma más orgánica
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = Math.random() * 3 + 1;
      const height = (Math.random() - 0.5) * 2;
      
      positions.push(
        Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5,
        Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5,
        height
      );
    }
    return new Float32Array(positions);
  }, []);

  useFrame((state) => {
    if (!particlesRef.current || !isAnimating) return;

    const time = state.clock.getElapsedTime();
    const positions = particlesRef.current.geometry.attributes.position.array;

    // Diferentes comportamientos según la etapa
    let flowSpeed = 0.01;
    let turbulence = 0.5;
    
    switch (detectionStage) {
      case 'analyzing':
        flowSpeed = 0.005;
        turbulence = 0.2;
        break;
      case 'detecting':
        flowSpeed = 0.02;
        turbulence = 0.8;
        break;
      case 'mapping':
        flowSpeed = 0.015;
        turbulence = 1.0;
        break;
      case 'calibrating':
        flowSpeed = 0.01;
        turbulence = 0.3;
        break;
    }

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      // Movimiento fluido con turbulencia
      positions[i + 1] += Math.sin(time + x) * flowSpeed;
      positions[i + 2] = Math.sin(time * 2 + x + y) * turbulence;
      
      // Resetear partículas que salen del área
      if (positions[i + 1] > 4) {
        positions[i + 1] = -4;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Ajustar opacidad y color basado en calidad
    const baseOpacity = progress * 0.4;
    const qualityFactor = qualityMetrics?.score ? qualityMetrics.score / 100 : 1;
    particlesRef.current.material.opacity = baseOpacity * qualityFactor;
    
    // Color dinámico basado en calidad
    if (qualityMetrics?.score) {
      if (qualityMetrics.score >= 80) {
        particlesRef.current.material.color.setHex(0x00ff88); // Verde
      } else if (qualityMetrics.score >= 60) {
        particlesRef.current.material.color.setHex(0xffaa00); // Amarillo
      } else {
        particlesRef.current.material.color.setHex(0xff4444); // Rojo
      }
    } else {
      particlesRef.current.material.color.setHex(0x4a90e2); // Azul por defecto
    }
  });

  return (
    <Points ref={particlesRef} positions={particlePositions}>
      <PointMaterial
        transparent
        color="#4a90e2"
        size={1.5}
        sizeAttenuation={true}
        opacity={0.4}
      />
    </Points>
  );
};

// Componente de conexiones entre landmarks
const LandmarkConnections = ({ landmarks, isAnimating, progress }) => {
  const connectionsRef = useRef();
  
  const connectionLines = useMemo(() => {
    if (!landmarks || landmarks.length < 68) return [];
    
    // Definir conexiones faciales principales
    const connections = [
      // Contorno facial
      ...Array.from({ length: 16 }, (_, i) => [i, i + 1]),
      // Ceja derecha
      ...Array.from({ length: 4 }, (_, i) => [17 + i, 18 + i]),
      // Ceja izquierda  
      ...Array.from({ length: 4 }, (_, i) => [22 + i, 23 + i]),
      // Nariz
      ...Array.from({ length: 3 }, (_, i) => [27 + i, 28 + i]),
      ...Array.from({ length: 4 }, (_, i) => [31 + i, 32 + i]),
      // Ojo derecho
      ...Array.from({ length: 5 }, (_, i) => [36 + i, 37 + i]),
      [41, 36], // Cerrar ojo derecho
      // Ojo izquierdo
      ...Array.from({ length: 5 }, (_, i) => [42 + i, 43 + i]),
      [47, 42], // Cerrar ojo izquierdo
      // Boca exterior
      ...Array.from({ length: 11 }, (_, i) => [48 + i, 49 + i]),
      [59, 48], // Cerrar boca exterior
      // Boca interior
      ...Array.from({ length: 7 }, (_, i) => [60 + i, 61 + i]),
      [67, 60], // Cerrar boca interior
    ];
    
    return connections.map(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      if (!startPoint || !endPoint) return null;
      
      return [
        [(startPoint[0] - 320) / 320, -(startPoint[1] - 240) / 240, 0],
        [(endPoint[0] - 320) / 320, -(endPoint[1] - 240) / 240, 0]
      ];
    }).filter(Boolean);
  }, [landmarks]);

  useFrame((state) => {
    if (!connectionsRef.current || !isAnimating) return;
    
    const time = state.clock.getElapsedTime();
    // Efecto de pulsación en las conexiones
    connectionsRef.current.material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
  });

  if (connectionLines.length === 0) return null;

  return (
    <group ref={connectionsRef}>
      {connectionLines.map((line, index) => (
        <Line
          key={index}
          points={line}
          color="#00ff88"
          lineWidth={2}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  );
};

// Componente principal de animación de malla facial mejorado
const FacialMeshAnimation = ({ 
  landmarks, 
  isAnimating, 
  progress = 0,
  onAnimationComplete,
  className = "",
  // Nuevas props para feedback visual
  qualityMetrics,
  detectionStage = 'analyzing',
  error,
  isRetrying = false,
  retryCount = 0
}) => {
  const containerRef = useRef();
  const [showConnections, setShowConnections] = useState(false);
  const [feedbackMessages, setFeedbackMessages] = useState([]);

  // Efecto para completar animación
  useEffect(() => {
    if (progress >= 100 && onAnimationComplete) {
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onAnimationComplete]);

  // Mostrar conexiones cuando se detectan landmarks
  useEffect(() => {
    if (landmarks && landmarks.length >= 68) {
      setShowConnections(true);
    }
  }, [landmarks]);

  // Generar mensajes de feedback basados en métricas de calidad
  useEffect(() => {
    const messages = [];
    
    if (qualityMetrics) {
      if (qualityMetrics.score >= 80) {
        messages.push({ type: 'success', text: 'Excelente calidad de detección', icon: CheckCircle });
      } else if (qualityMetrics.score >= 60) {
        messages.push({ type: 'warning', text: 'Calidad aceptable, optimizando...', icon: Target });
      } else {
        messages.push({ type: 'error', text: 'Calidad baja, ajustando parámetros', icon: AlertTriangle });
      }
      
      // Mensajes específicos por métricas
      if (qualityMetrics.metrics?.brightness < 0.3) {
        messages.push({ type: 'warning', text: 'Poca iluminación detectada', icon: Eye });
      }
      if (qualityMetrics.metrics?.sharpness < 0.5) {
        messages.push({ type: 'warning', text: 'Imagen poco nítida', icon: Target });
      }
    }
    
    if (isRetrying) {
      messages.push({ type: 'info', text: `Reintentando... (${retryCount}/3)`, icon: Zap });
    }
    
    setFeedbackMessages(messages);
  }, [qualityMetrics, isRetrying, retryCount]);

  return (
    <motion.div
      ref={containerRef}
      className={`facial-mesh-animation ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isAnimating ? 1 : 0.7, 
        scale: isAnimating ? 1 : 0.95 
      }}
      transition={{ duration: 0.5 }}
      style={{
        width: '100%',
        height: '400px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Canvas 3D para la malla facial */}
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, 5]} intensity={0.5} color="#4a90e2" />
        
        {/* Landmarks animados */}
        <AnimatedLandmarks 
          landmarks={landmarks}
          progress={progress / 100}
          isAnimating={isAnimating}
          qualityMetrics={qualityMetrics}
          detectionStage={detectionStage}
        />
        
        {/* Conexiones entre landmarks */}
        {showConnections && (
          <LandmarkConnections
            landmarks={landmarks}
            isAnimating={isAnimating}
            progress={progress / 100}
          />
        )}
        
        {/* Efectos de partículas */}
        <ParticleEffects 
          isAnimating={isAnimating}
          progress={progress / 100}
          detectionStage={detectionStage}
          qualityMetrics={qualityMetrics}
        />
      </Canvas>

      {/* Overlay con información de progreso mejorado */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          className="text-center text-white mb-4"
          animate={{ opacity: isAnimating ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-lg font-semibold mb-2">
            {error ? 'Error en detección' : 
             detectionStage === 'analyzing' ? 'Analizando imagen' :
             detectionStage === 'detecting' ? 'Detectando rostro' :
             detectionStage === 'mapping' ? 'Mapeando características' :
             detectionStage === 'calibrating' ? 'Calibrando parámetros' :
             'Procesando detección facial'}
          </div>
          <div className="text-sm opacity-75">
            {landmarks && landmarks.length > 0 
              ? `${landmarks.length} puntos detectados`
              : isRetrying ? 'Reintentando detección...' : 'Inicializando...'
            }
          </div>
          
          {/* Barra de progreso visual */}
          <div className="mt-3 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-400 to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Mensajes de feedback en tiempo real */}
        <AnimatePresence>
          {feedbackMessages.length > 0 && (
            <motion.div
              className="space-y-2 max-w-xs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {feedbackMessages.slice(0, 2).map((message, index) => {
                const IconComponent = message.icon;
                return (
                  <motion.div
                    key={`${message.type}-${index}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm ${
                      message.type === 'success' ? 'bg-green-500/20 border border-green-400/30' :
                      message.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-400/30' :
                      message.type === 'error' ? 'bg-red-500/20 border border-red-400/30' :
                      'bg-blue-500/20 border border-blue-400/30'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <IconComponent className={`w-4 h-4 ${
                      message.type === 'success' ? 'text-green-400' :
                      message.type === 'warning' ? 'text-yellow-400' :
                      message.type === 'error' ? 'text-red-400' :
                      'text-blue-400'
                    }`} />
                    <span className="text-white text-xs font-medium">
                      {message.text}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Efecto de brillo en los bordes */}
      <motion.div
        className="absolute inset-0 rounded-12"
        style={{
          background: `linear-gradient(45deg, 
            transparent 30%, 
            rgba(0, 255, 136, 0.1) 50%, 
            transparent 70%
          )`,
          backgroundSize: '200% 200%'
        }}
        animate={{
          backgroundPosition: isAnimating ? ['0% 0%', '100% 100%'] : '0% 0%'
        }}
        transition={{
          duration: 2,
          repeat: isAnimating ? Infinity : 0,
          ease: 'linear'
        }}
      />

      {/* Panel de métricas en tiempo real */}
      <AnimatePresence>
        {(landmarks && landmarks.length > 0) || qualityMetrics && (
          <motion.div
            className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 min-w-[160px]"
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-white text-sm space-y-2">
              {/* Estado de detección */}
              <div className="flex items-center gap-2">
                <motion.div
                  className={`w-2 h-2 rounded-full ${
                    error ? 'bg-red-400' :
                    isRetrying ? 'bg-orange-400' :
                    landmarks && landmarks.length > 0 ? 'bg-green-400' : 'bg-blue-400'
                  }`}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-medium">
                  {error ? 'Error' :
                   isRetrying ? 'Reintentando' :
                   landmarks && landmarks.length > 0 ? 'Detectado' : 'Analizando'}
                </span>
              </div>
              
              {/* Métricas de calidad */}
              {qualityMetrics && (
                <>
                  <div className="border-t border-white/20 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-75">Calidad:</span>
                      <span className={`text-xs font-bold ${
                        qualityMetrics.score >= 80 ? 'text-green-400' :
                        qualityMetrics.score >= 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {qualityMetrics.score}%
                      </span>
                    </div>
                    
                    {qualityMetrics.metrics && (
                      <div className="mt-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="opacity-75">Brillo:</span>
                          <span>{Math.round(qualityMetrics.metrics.brightness * 100)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="opacity-75">Nitidez:</span>
                          <span>{Math.round(qualityMetrics.metrics.sharpness * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {/* Contador de landmarks */}
              {landmarks && landmarks.length > 0 && (
                <div className="border-t border-white/20 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-75">Puntos:</span>
                    <span className="font-bold text-green-400">{landmarks.length}</span>
                  </div>
                </div>
              )}
              
              {/* Contador de reintentos */}
              {retryCount > 0 && (
                <div className="border-t border-white/20 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-75">Reintentos:</span>
                    <span className="font-bold text-orange-400">{retryCount}/3</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FacialMeshAnimation;