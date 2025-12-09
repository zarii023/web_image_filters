import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  RotateCcw, 
  Eye, 
  Settings, 
  Sliders,
  Target,
  Palette,
  Zap,
  Info,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useProductConfiguration } from '../../hooks/useProductConfiguration';
import RealTimePreview from './RealTimePreview';

const ProductEditor = ({ product, onSave, onCancel }) => {
  const {
    configuration,
    updateConfiguration,
    saveConfiguration,
    resetConfiguration,
    applyPreset,
    createPreset,
    getParameterValue,
    validateConfiguration,
    isLoading,
    error
  } = useProductConfiguration(product?.id);

  const [activeTab, setActiveTab] = useState('general');
  const [showPreview, setShowPreview] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showCreatePreset, setShowCreatePreset] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Validar configuración cuando cambie
  useEffect(() => {
    if (configuration) {
      const errors = validateConfiguration(configuration);
      setValidationErrors(errors);
    }
  }, [configuration, validateConfiguration]);

  const handleParameterChange = (category, parameter, value) => {
    updateConfiguration(category, parameter, value);
  };

  const handleSave = async () => {
    try {
      const errors = validateConfiguration(configuration);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      await saveConfiguration();
      onSave?.(configuration);
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const handleReset = () => {
    resetConfiguration();
    setValidationErrors({});
  };

  const handleCreatePreset = async () => {
    if (!presetName.trim()) return;
    
    try {
      await createPreset(presetName, configuration);
      setPresetName('');
      setShowCreatePreset(false);
    } catch (error) {
      console.error('Error creating preset:', error);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'intensity', label: 'Intensidad', icon: Sliders },
    { id: 'zones', label: 'Zonas Faciales', icon: Target },
    { id: 'effects', label: 'Efectos', icon: Palette },
    { id: 'advanced', label: 'Avanzado', icon: Zap }
  ];

  if (!product) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Selecciona un producto para editar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-blue-100 mt-1">{product.category}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleReset}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || Object.keys(validationErrors).length > 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>

        {/* Validation Status */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="mt-4 bg-red-500/20 border border-red-300 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-200" />
              <span className="text-sm text-red-200">
                {Object.keys(validationErrors).length} errores de validación
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-300 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-200" />
              <span className="text-sm text-red-200">{error}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex">
        {/* Sidebar - Tabs */}
        <div className="w-64 bg-gray-50 border-r">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Configuración</h3>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Presets Section */}
          <div className="p-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Presets</h3>
            <div className="space-y-2">
              <button
                onClick={() => applyPreset('default')}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Por defecto
              </button>
              <button
                onClick={() => applyPreset('sensitive')}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Piel sensible
              </button>
              <button
                onClick={() => applyPreset('intensive')}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Intensivo
              </button>
            </div>

            <button
              onClick={() => setShowCreatePreset(true)}
              className="w-full mt-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
            >
              + Crear Preset
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'general' && (
                  <GeneralSettings
                    configuration={configuration}
                    onChange={handleParameterChange}
                    errors={validationErrors}
                  />
                )}
                {activeTab === 'intensity' && (
                  <IntensitySettings
                    configuration={configuration}
                    onChange={handleParameterChange}
                    errors={validationErrors}
                  />
                )}
                {activeTab === 'zones' && (
                  <ZoneSettings
                    configuration={configuration}
                    onChange={handleParameterChange}
                    errors={validationErrors}
                  />
                )}
                {activeTab === 'effects' && (
                  <EffectSettings
                    configuration={configuration}
                    onChange={handleParameterChange}
                    errors={validationErrors}
                  />
                )}
                {activeTab === 'advanced' && (
                  <AdvancedSettings
                    configuration={configuration}
                    onChange={handleParameterChange}
                    errors={validationErrors}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Preview Panel */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-l bg-white overflow-hidden"
            >
              <RealTimePreview
                configuration={configuration}
                product={product}
                onClose={() => setShowPreview(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Preset Modal */}
      <AnimatePresence>
        {showCreatePreset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCreatePreset(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Crear Nuevo Preset</h3>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Nombre del preset"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowCreatePreset(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePreset}
                  disabled={!presetName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  Crear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componentes de configuración específicos
const GeneralSettings = ({ configuration, onChange, errors }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-4">Configuración General</h3>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intensidad Global
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={configuration?.general?.intensity || 50}
            onChange={(e) => onChange('general', 'intensity', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Suave</span>
            <span>{configuration?.general?.intensity || 50}%</span>
            <span>Intenso</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Suavizado
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={configuration?.general?.smoothing || 30}
            onChange={(e) => onChange('general', 'smoothing', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Mínimo</span>
            <span>{configuration?.general?.smoothing || 30}%</span>
            <span>Máximo</span>
          </div>
        </div>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Modo de Aplicación
      </label>
      <select
        value={configuration?.general?.mode || 'auto'}
        onChange={(e) => onChange('general', 'mode', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="auto">Automático</option>
        <option value="manual">Manual</option>
        <option value="guided">Guiado</option>
      </select>
    </div>
  </div>
);

const IntensitySettings = ({ configuration, onChange, errors }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold mb-4">Configuración de Intensidad</h3>
    
    {['forehead', 'cheeks', 'nose', 'chin', 'eyeArea'].map((zone) => (
      <div key={zone} className="border rounded-lg p-4">
        <h4 className="font-medium mb-3 capitalize">{zone.replace(/([A-Z])/g, ' $1')}</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Intensidad</label>
            <input
              type="range"
              min="0"
              max="100"
              value={configuration?.zones?.[zone]?.intensity || 50}
              onChange={(e) => onChange('zones', `${zone}.intensity`, parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">
              {configuration?.zones?.[zone]?.intensity || 50}%
            </span>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Precisión</label>
            <input
              type="range"
              min="0"
              max="100"
              value={configuration?.zones?.[zone]?.precision || 70}
              onChange={(e) => onChange('zones', `${zone}.precision`, parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">
              {configuration?.zones?.[zone]?.precision || 70}%
            </span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ZoneSettings = ({ configuration, onChange, errors }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold mb-4">Configuración por Zonas</h3>
    
    <div className="grid grid-cols-1 gap-4">
      {['forehead', 'cheeks', 'nose', 'chin', 'eyeArea'].map((zone) => (
        <div key={zone} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium capitalize">{zone.replace(/([A-Z])/g, ' $1')}</h4>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuration?.zones?.[zone]?.enabled !== false}
                onChange={(e) => onChange('zones', `${zone}.enabled`, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Activo</span>
            </label>
          </div>
          
          {configuration?.zones?.[zone]?.enabled !== false && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Área de cobertura</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={configuration?.zones?.[zone]?.coverage || 60}
                  onChange={(e) => onChange('zones', `${zone}.coverage`, parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">
                  {configuration?.zones?.[zone]?.coverage || 60}%
                </span>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Difuminado</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={configuration?.zones?.[zone]?.blur || 15}
                  onChange={(e) => onChange('zones', `${zone}.blur`, parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">
                  {configuration?.zones?.[zone]?.blur || 15}px
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const EffectSettings = ({ configuration, onChange, errors }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold mb-4">Efectos Visuales</h3>
    
    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brillo
        </label>
        <input
          type="range"
          min="-50"
          max="50"
          value={configuration?.effects?.brightness || 0}
          onChange={(e) => onChange('effects', 'brightness', parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          {configuration?.effects?.brightness || 0}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contraste
        </label>
        <input
          type="range"
          min="-50"
          max="50"
          value={configuration?.effects?.contrast || 0}
          onChange={(e) => onChange('effects', 'contrast', parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          {configuration?.effects?.contrast || 0}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Saturación
        </label>
        <input
          type="range"
          min="-50"
          max="50"
          value={configuration?.effects?.saturation || 0}
          onChange={(e) => onChange('effects', 'saturation', parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          {configuration?.effects?.saturation || 0}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Temperatura de Color
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={configuration?.effects?.temperature || 0}
          onChange={(e) => onChange('effects', 'temperature', parseInt(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          {configuration?.effects?.temperature || 0}
        </span>
      </div>
    </div>
  </div>
);

const AdvancedSettings = ({ configuration, onChange, errors }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold mb-4">Configuración Avanzada</h3>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Algoritmo de Detección
        </label>
        <select
          value={configuration?.advanced?.detectionAlgorithm || 'blazeface'}
          onChange={(e) => onChange('advanced', 'detectionAlgorithm', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="blazeface">BlazeFace (Rápido)</option>
          <option value="mediapipe">MediaPipe (Preciso)</option>
          <option value="faceapi">Face-API (Completo)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Umbral de Confianza
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={configuration?.advanced?.confidenceThreshold || 0.7}
          onChange={(e) => onChange('advanced', 'confidenceThreshold', parseFloat(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-500">
          {configuration?.advanced?.confidenceThreshold || 0.7}
        </span>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={configuration?.advanced?.useWebGL !== false}
            onChange={(e) => onChange('advanced', 'useWebGL', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">Usar aceleración WebGL</span>
        </label>
      </div>

      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={configuration?.advanced?.enableCaching !== false}
            onChange={(e) => onChange('advanced', 'enableCaching', e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">Habilitar caché de modelos</span>
        </label>
      </div>
    </div>
  </div>
);

export default ProductEditor;