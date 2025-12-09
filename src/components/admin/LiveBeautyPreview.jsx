import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';

// Vista previa en vivo aplicando filtros sobre el frame usando ctx.filter
// Actualiza en tiempo real mientras se mueven los sliders del panel
const LiveBeautyPreview = ({ filters = {} }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  const buildCssFilterString = (filters) => {
    const parts = [];
    // Brillo: -20..20 → brightness(1 + val/100)
    if (filters.brightness && typeof filters.brightness === 'object' && filters.brightness.enabled !== false) {
      const val = Number(filters.brightness.value);
      parts.push(`brightness(${isFinite(val) ? 1 + val / 100 : 1})`);
    }
    // Contraste: ~0.8..1.3
    if (filters.contrast && typeof filters.contrast === 'object' && filters.contrast.enabled !== false) {
      const val = Number(filters.contrast.value);
      parts.push(`contrast(${isFinite(val) ? val : 1})`);
    }
    // Tono cálido
    if (filters.warmth && typeof filters.warmth === 'object' && filters.warmth.enabled !== false) {
      const alpha = Number(filters.warmth.alpha);
      parts.push(`sepia(${isFinite(alpha) ? alpha : 0.25})`);
    }
    // Suavizado (aprox)
    if (filters.smooth && typeof filters.smooth === 'object' && filters.smooth.enabled !== false) {
      const radius = Number(filters.smooth.radius);
      const opacity = Number(filters.smooth.opacity);
      const px = (isFinite(radius) ? radius : 0) * (isFinite(opacity) ? opacity : 1);
      if (px > 0) parts.push(`blur(${px}px)`);
    }
    return parts.join(' ');
  };

  useEffect(() => {
    let rafId;

    const render = () => {
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        rafId = requestAnimationFrame(render);
        return;
      }

      // Comprobar que el vídeo esté listo (metadata y frames)
      const isVideoReady = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
      if (!isVideoReady) {
        rafId = requestAnimationFrame(render);
        return;
      }
      if (!ready) setReady(true);

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);

      // Aplicar filtros al dibujar directamente el vídeo
      const filterString = buildCssFilterString(filters);
      ctx.filter = filterString || 'none';
      try {
        ctx.drawImage(video, 0, 0, width, height);
      } catch (e) {
        // Si falla el draw (raro), reintentar en el siguiente frame
      }
      // Reset de filtro para futuras operaciones
      ctx.filter = 'none';

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [filters, ready]);

  return (
    <div className="relative w-full">
      <div className="relative rounded-lg overflow-hidden bg-gray-100">
        {/* Mantener el vídeo en el DOM (no completamente hidden) para asegurar frames */}
        <Webcam
          ref={webcamRef}
          audio={false}
          className="absolute inset-0 opacity-0 pointer-events-none"
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user' }}
        />
        {/* Canvas con el resultado */}
        <canvas ref={canvasRef} className="w-full h-auto block" />
      </div>
      <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs bg-blue-600 text-white shadow">
        {ready ? 'Vista previa (en vivo)' : 'Inicializando cámara...'}
      </div>
    </div>
  );
};

export default LiveBeautyPreview;