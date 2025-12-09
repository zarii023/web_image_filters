import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Download, Share2 } from 'lucide-react';

const AutoResultSlider = ({ beforeImage, afterImage, productName, onBack, onDownload, onShare }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

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

  const updateSliderPosition = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Animación automática inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      let position = 0;
      const interval = setInterval(() => {
        position += 2;
        if (position >= 100) {
          position = 0;
        }
        setSliderPosition(position);
      }, 50);

      // Detener animación después de 3 segundos
      setTimeout(() => {
        clearInterval(interval);
        setSliderPosition(50);
      }, 3000);

      return () => clearInterval(interval);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold">Resultado Final</h2>
              <p className="text-blue-100 text-sm">{productName}</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onShare}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onDownload}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Comparación con slider */}
      <div className="p-6">
        <div
          ref={containerRef}
          className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-col-resize select-none"
          onMouseDown={handleMouseDown}
        >
          {/* Imagen "después" (fondo) */}
          {afterImage && (
            <img
              src={afterImage}
              alt="Después del tratamiento"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          )}

          {/* Imagen "antes" (con clip) */}
          {beforeImage && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
              }}
            >
              <img
                src={beforeImage}
                alt="Antes del tratamiento"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          )}

          {/* Línea divisoria */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 cursor-col-resize"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Handle del slider */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-blue-600 flex items-center justify-center cursor-col-resize">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
            </div>
          </div>

          {/* Etiquetas */}
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            Antes
          </div>
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            Después
          </div>

          {/* Indicador de posición */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
            {Math.round(sliderPosition)}% después
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mt-4 text-center text-gray-600 text-sm">
          Arrastra la línea para comparar el antes y después del tratamiento
        </div>

        {/* Métricas de mejora (simuladas) */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">85%</div>
            <div className="text-sm text-gray-600">Reducción de arrugas</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">92%</div>
            <div className="text-sm text-gray-600">Mejora en luminosidad</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">78%</div>
            <div className="text-sm text-gray-600">Hidratación</div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex space-x-3">
          <button
            onClick={onDownload}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Descargar Resultado
          </button>
          <button
            onClick={onShare}
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Compartir
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoResultSlider;