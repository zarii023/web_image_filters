import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

/**
 * BeforeAfterComparison - Interfaz comparativa con slider interactivo
 * 
 * Funcionalidades:
 * - Vista "antes" y "después" lado a lado
 * - Slider interactivo para comparar ambas versiones
 * - Animaciones suaves entre estados
 * - Controles de navegación y acciones
 * - Responsive design
 */

const BeforeAfterComparison = ({
  originalImage,
  processedImage,
  productName = "Producto",
  onDownload,
  className = "",
  initialView = "after", // "before" | "center" | "after"
  initialPercentage = 25, // porcentaje de "Después" al cargar
  minimal = false
}) => {
  
  
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    // Animación inicial del slider según initialView/initialPercentage
    if (originalImage && processedImage) {
      const targetMap = { before: 10, center: 50, after: 90 };
      const fallbackTarget = targetMap[initialView] ?? 50;
      const target = typeof initialPercentage === 'number'
        ? Math.max(0, Math.min(100, initialPercentage))
        : fallbackTarget;
      setIsAnimating(true);
      const startPosition = sliderPosition;
      const duration = 400;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentPosition = startPosition + (target - startPosition) * easeOut;
        setSliderPosition(currentPosition);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [originalImage, processedImage, initialView, initialPercentage]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    updateSliderPosition(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      updateSliderPosition(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    updateSliderPosition(e.touches[0]);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      updateSliderPosition(e.touches[0]);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const updateSliderPosition = (event) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const animateSlider = (targetPosition) => {
    setIsAnimating(true);
    const startPosition = sliderPosition;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentPosition = startPosition + (targetPosition - startPosition) * easeOut;
      setSliderPosition(currentPosition);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  };

  const showBefore = () => animateSlider(10);
  const showAfter = () => animateSlider(90);
  const showCenter = () => animateSlider(50);

  const handleDownload = () => {
    if (onDownload) {
      onDownload({ original: originalImage, processed: processedImage });
    } else {
      // Implementación por defecto
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = `${productName}_resultado.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  

  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();
    const handleGlobalTouchMove = (e) => handleTouchMove(e);
    const handleGlobalTouchEnd = () => handleTouchEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  if (!originalImage || !processedImage) return null;

  return (
    <div className={`w-full h-full ${className}`}>
      <div 
        ref={containerRef}
        className="relative w-full h-full bg-gray-100 overflow-hidden cursor-col-resize select-none rounded-lg"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Imagen Procesada (Después) - Fondo completo */}
          <div className="absolute inset-0">
            <img
              src={processedImage}
              alt="Después"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {!minimal && (
              <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                Después
              </div>
            )}
          </div>

        {/* Imagen Original (Antes) - Recortada por slider */}
          <div 
            className="absolute inset-0 overflow-hidden transition-all duration-100"
            style={{ 
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              transition: isAnimating ? 'clip-path 0.5s ease-out' : 'none'
            }}
          >
            <img
              src={originalImage}
              alt="Antes"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {!minimal && (
              <div className="absolute top-4 left-4 bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                Antes
              </div>
            )}
          </div>

        {/* Línea del Slider */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-white z-10 transition-all duration-100"
            style={{ 
              left: `${sliderPosition}%`,
              transform: 'translateX(-50%)',
              transition: isAnimating ? 'left 0.5s ease-out' : 'none'
            }}
          >
            {/* Handle del Slider */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow border border-gray-300 flex items-center justify-center cursor-col-resize">
              <div className="flex space-x-0.5">
                <ChevronLeft className="w-3 h-3 text-gray-600" />
                <ChevronRight className="w-3 h-3 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Descarga - ícono en esquina */}
          <button
            onClick={handleDownload}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full p-2 shadow"
            aria-label="Descargar"
          >
            <Download className="w-4 h-4 text-gray-800" />
          </button>
        </div>
      {/* Fin minimal */}
    </div>
  );
};

export default BeforeAfterComparison;
