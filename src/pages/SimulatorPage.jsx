import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import RealTimeFaceDetector from '../components/detection/RealTimeFaceDetector';
import { ArrowLeft, Camera, Settings, Palette, Sparkles } from 'lucide-react';

/**
 * Página del simulador con detección facial en tiempo real
 * Utiliza el nuevo componente RealTimeFaceDetector para análisis en vivo
 */
const SimulatorPage = () => {
  const navigate = useNavigate();
  const { selectedProduct } = useStore();
  
  // Estados del simulador
  const [isDetectionActive, setIsDetectionActive] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('overlay');
  const [filterColor, setFilterColor] = useState('rgba(255, 182, 193, 0.3)');
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Referencia para capturar screenshots
  const detectorRef = useRef(null);

  /**
   * Maneja la detección de caras en tiempo real
   */
  const handleFaceDetected = useCallback((faces) => {
    setDetectedFaces(faces);
    
    // Aquí puedes agregar lógica adicional basada en las caras detectadas
    console.log(`Detectadas ${faces.length} cara(s):`, faces);
  }, []);

  /**
   * Cambia el tipo de filtro aplicado
   */
  const handleFilterChange = useCallback((newFilter) => {
    setCurrentFilter(newFilter);
  }, []);

  /**
   * Cambia el color del filtro
   */
  const handleColorChange = useCallback((newColor) => {
    setFilterColor(newColor);
  }, []);

  /**
   * Alterna la detección activa/inactiva
   */
  const toggleDetection = useCallback(() => {
    setIsDetectionActive(prev => !prev);
  }, []);

  /**
   * Captura una imagen del estado actual
   */
  const captureImage = useCallback(() => {
    // Implementar captura de imagen si es necesario
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      // Aquí podrías guardar la imagen capturada
    }, 1000);
  }, []);

  /**
   * Navega de vuelta al catálogo
   */
  const handleGoBack = useCallback(() => {
    navigate('/catalog');
  }, [navigate]);

  // Opciones de filtros disponibles
  const filterOptions = [
    { id: 'overlay', name: 'Superposición', icon: Palette },
    { id: 'glow', name: 'Resplandor', icon: Sparkles },
    { id: 'frame', name: 'Marco', icon: Camera },
    { id: 'blur', name: 'Desenfoque', icon: Settings }
  ];

  // Colores predefinidos para los filtros
  const colorOptions = [
    { name: 'Rosa', value: 'rgba(255, 182, 193, 0.3)' },
    { name: 'Azul', value: 'rgba(173, 216, 230, 0.3)' },
    { name: 'Verde', value: 'rgba(144, 238, 144, 0.3)' },
    { name: 'Dorado', value: 'rgba(255, 215, 0, 0.3)' },
    { name: 'Púrpura', value: 'rgba(221, 160, 221, 0.3)' },
    { name: 'Naranja', value: 'rgba(255, 165, 0, 0.3)' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Botón de regreso */}
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Volver al catálogo</span>
            </button>
            
            {/* Título */}
            <h1 className="text-xl font-bold text-gray-900">
              Análisis Facial en Tiempo Real
            </h1>
            
            {/* Información del producto */}
            {selectedProduct && (
              <div className="text-sm text-gray-600">
                Producto: <span className="font-medium">{selectedProduct.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel principal - Detector de caras */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Cámara en Vivo
                </h2>
                
                {/* Controles principales */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleDetection}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDetectionActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isDetectionActive ? 'Pausar' : 'Iniciar'}
                  </button>
                  
                  <button
                    onClick={captureImage}
                    disabled={isRecording}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isRecording ? 'Capturando...' : 'Capturar'}
                  </button>
                </div>
              </div>
              
              {/* Componente de detección facial */}
              <div className="flex justify-center">
                <RealTimeFaceDetector
                  ref={detectorRef}
                  onFaceDetected={handleFaceDetected}
                  filterType={currentFilter}
                  filterColor={filterColor}
                  isActive={isDetectionActive}
                  width={640}
                  height={480}
                />
              </div>
              
              {/* Información de detección */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Estado:</span>
                    <span className={`ml-2 ${isDetectionActive ? 'text-green-600' : 'text-red-600'}`}>
                      {isDetectionActive ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Caras detectadas:</span>
                    <span className="ml-2 text-blue-600 font-medium">
                      {detectedFaces.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de controles */}
          <div className="space-y-6">
            
            {/* Selector de filtros */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Filtros Visuales
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {filterOptions.map((filter) => {
                  const IconComponent = filter.icon;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterChange(filter.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentFilter === filter.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-xs font-medium">{filter.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de colores */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Color del Filtro
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorChange(color.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      filterColor === color.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${color.value.replace('0.3', '0.8')}, ${color.value.replace('0.3', '0.4')})`
                    }}
                  >
                    <div className="text-xs font-medium text-gray-800">
                      {color.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Información del producto seleccionado */}
            {selectedProduct && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Producto Seleccionado
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedProduct.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedProduct.category}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    {selectedProduct.description}
                  </div>
                  
                  {selectedProduct.benefits && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        Beneficios:
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedProduct.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-green-500 mt-1">•</span>
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estadísticas de detección */}
            {detectedFaces.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Estadísticas de Detección
                </h3>
                
                <div className="space-y-3">
                  {detectedFaces.map((face, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">
                          Cara {index + 1}
                        </span>
                        <span className="text-sm text-green-600 font-medium">
                          {Math.round(face.score * 100)}% confianza
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          Ancho: {Math.round(face.box.width)}px
                        </div>
                        <div>
                          Alto: {Math.round(face.box.height)}px
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulatorPage;