import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Image as ImageIcon, 
  Zap, 
  Clock, 
  Eye,
  Download,
  Maximize2,
  RotateCcw,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const RealTimePreview = ({ 
  configuration, 
  testImage, 
  isGenerating, 
  previewUrl,
  onConfigurationChange 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [renderStats, setRenderStats] = useState({
    renderTime: 0,
    effectsApplied: 0,
    zonesProcessed: 0
  });
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);

  // Cargar imagen original cuando cambie testImage
  useEffect(() => {
    if (testImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImageUrl(e.target.result);
        setError(null);
      };
      reader.onerror = () => {
        setError('Error cargando la imagen');
      };
      reader.readAsDataURL(testImage);
    }
  }, [testImage]);

  // Actualizar estadísticas cuando se genere un nuevo preview
  useEffect(() => {
    if (previewUrl && configuration) {
      const effectsCount = Object.values(configuration.face_zones || {})
        .filter(zone => zone.enabled).length;
      
      const zonesCount = Object.keys(configuration.face_zones || {}).length;
      
      setRenderStats({
        renderTime: Math.floor(Math.random() * 300) + 100, // Simulado
        effectsApplied: effectsCount,
        zonesProcessed: zonesCount
      });
    }
  }, [previewUrl, configuration]);

  // Descargar imagen procesada
  const handleDownload = () => {
    if (!previewUrl) return;

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `preview_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Resetear vista
  const handleReset = () => {
    setShowComparison(false);
    setIsFullscreen(false);
    setError(null);
  };

  // Alternar vista de comparación
  const toggleComparison = () => {
    setShowComparison(!showComparison);
  };

  // Alternar pantalla completa
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!testImage && !originalImageUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <ImageIcon className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-center text-sm">
          Sube una imagen de prueba para ver la vista previa en tiempo real
        </p>
      </div>
    );
  }

  const PreviewContent = () => (
    <div className="space-y-4">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Vista Previa</h4>
        <div className="flex items-center space-x-2">
          {originalImageUrl && (
            <button
              onClick={toggleComparison}
              className={`p-2 rounded-lg transition-colors ${
                showComparison 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Comparar con original"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Pantalla completa"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleReset}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Resetear vista"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de preview */}
      <div className="relative">
        {showComparison ? (
          // Vista de comparación
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 text-center">Original</p>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {originalImageUrl && (
                  <img
                    src={originalImageUrl}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 text-center">Procesada</p>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                {isGenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
                    <div className="text-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">Procesando...</p>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : error ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-red-500">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-xs">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Vista simple
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Aplicando efectos...</p>
                  <div className="w-32 bg-gray-200 rounded-full h-1 mt-2">
                    <motion.div
                      className="bg-blue-600 h-1 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : originalImageUrl ? (
              <img
                src={originalImageUrl}
                alt="Original"
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {/* Overlay de estado */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90">
                <div className="text-center text-red-600">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Estadísticas de renderizado */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Estadísticas de Procesamiento</h5>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
            <p className="text-gray-600">{renderStats.renderTime}ms</p>
            <p className="text-gray-500">Tiempo</p>
          </div>
          
          <div className="text-center">
            <Zap className="w-4 h-4 text-gray-500 mx-auto mb-1" />
            <p className="text-gray-600">{renderStats.effectsApplied}</p>
            <p className="text-gray-500">Efectos</p>
          </div>
          
          <div className="text-center">
            <Settings className="w-4 h-4 text-gray-500 mx-auto mb-1" />
            <p className="text-gray-600">{renderStats.zonesProcessed}</p>
            <p className="text-gray-500">Zonas</p>
          </div>
        </div>
      </div>

      {/* Controles de acción */}
      <div className="flex space-x-2">
        <button
          onClick={handleDownload}
          disabled={!previewUrl}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm transition-colors ${
            previewUrl
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Descargar</span>
        </button>
      </div>

      {/* Indicador de estado */}
      <div className="flex items-center justify-center space-x-2 text-xs">
        {isGenerating ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
            <span className="text-blue-600">Generando preview...</span>
          </>
        ) : previewUrl ? (
          <>
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-green-600">Preview actualizado</span>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-3 h-3 text-red-600" />
            <span className="text-red-600">Error en preview</span>
          </>
        ) : (
          <>
            <Settings className="w-3 h-3 text-gray-400" />
            <span className="text-gray-400">Esperando configuración</span>
          </>
        )}
      </div>
    </div>
  );

  // Vista en pantalla completa
  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
        onClick={toggleFullscreen}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          className="max-w-4xl max-h-full bg-white rounded-lg p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Vista Previa - Pantalla Completa</h3>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-hidden rounded-lg">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview Fullscreen"
                className="w-full h-full object-contain"
              />
            ) : originalImageUrl ? (
              <img
                src={originalImageUrl}
                alt="Original Fullscreen"
                className="w-full h-full object-contain opacity-50"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100">
                <ImageIcon className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return <PreviewContent />;
};

export default RealTimePreview;