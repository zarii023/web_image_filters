import { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Download, 
  Upload,
  Sliders,
  Palette,
  Sun,
  Contrast,
  Sparkles,
  Lightbulb,
  Moon,
  Eraser
} from 'lucide-react';
import { MARTIDERM_PRODUCTS } from '../../data/products';
import filterConfigManager from '../../services/FilterConfigManager';
import FilterLivePreviewModal from './FilterLivePreviewModal';

/**
 * AdminFilterConfig - Panel de configuración de filtros por producto
 * 
 * Funcionalidades:
 * - Configuración de filtros por producto
 * - Preview en tiempo real
 * - Gestión de intensidades y parámetros
 * - Backup y restauración
 * - Interfaz intuitiva con controles deslizantes
 */

const AdminFilterConfig = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterConfig, setFilterConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      loadProductConfig(selectedProduct.id);
    }
  }, [selectedProduct]);

  const loadProductConfig = (productId) => {
    setIsLoading(true);
    try {
      let config = filterConfigManager.getProductConfig(productId);
      
      if (!config) {
        // Generar configuración por defecto si no existe
        const product = MARTIDERM_PRODUCTS.find(p => p.id === productId);
        config = filterConfigManager.generateProductConfig(product);
        filterConfigManager.saveProductConfig(productId, config);
      }
      
      setFilterConfig(config);
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setHasChanges(false);
    } catch (error) {
      showNotification('Error cargando configuración', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterType, property, value) => {
    if (!filterConfig) return;

    const newConfig = {
      ...filterConfig,
      filters: {
        ...filterConfig.filters,
        [filterType]: {
          ...filterConfig.filters[filterType],
          [property]: value
        }
      }
    };

    setFilterConfig(newConfig);
    setHasChanges(true);
  };

  const saveConfiguration = async () => {
    if (!selectedProduct || !filterConfig) return;

    setIsLoading(true);
    try {
      const success = filterConfigManager.saveProductConfig(selectedProduct.id, filterConfig);
      
      if (success) {
        setOriginalConfig(JSON.parse(JSON.stringify(filterConfig)));
        setHasChanges(false);
        showNotification('Configuración guardada exitosamente', 'success');
      } else {
        showNotification('Error guardando configuración', 'error');
      }
    } catch (error) {
      showNotification('Error interno del sistema', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToOriginal = () => {
    if (originalConfig) {
      setFilterConfig(JSON.parse(JSON.stringify(originalConfig)));
      setHasChanges(false);
      showNotification('Configuración restaurada', 'info');
    }
  };

  const resetToDefaults = () => {
    if (selectedProduct) {
      const defaultConfig = filterConfigManager.generateProductConfig(selectedProduct);
      setFilterConfig(defaultConfig);
      setHasChanges(true);
      showNotification('Configuración restaurada a valores por defecto', 'info');
    }
  };

  const exportConfiguration = () => {
    try {
      const exportData = filterConfigManager.exportConfigurations();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `martiderm-filter-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Configuración exportada', 'success');
    } catch (error) {
      showNotification('Error exportando configuración', 'error');
    }
  };

  const importConfiguration = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const success = filterConfigManager.importConfigurations(e.target.result);
        if (success) {
          if (selectedProduct) {
            loadProductConfig(selectedProduct.id);
          }
          showNotification('Configuración importada exitosamente', 'success');
        } else {
          showNotification('Error importando configuración', 'error');
        }
      } catch (error) {
        showNotification('Archivo de configuración inválido', 'error');
      }
    };
    reader.readAsText(file);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getFilterIcon = (filterType) => {
    const icons = {
      smooth: Sparkles,
      brightness: Sun,
      contrast: Contrast,
      warmth: Palette,
      toneUnify: Lightbulb,
      blemish: Eraser,
      contourLift: Settings,
      highlights: Lightbulb,
      shadows: Moon
    };
    return icons[filterType] || Settings;
  };

  const getFilterLabel = (filterType) => {
    const labels = {
      smooth: 'Arrugas · Suavizado de Piel',
      brightness: 'Luminosidad · Brillo',
      contrast: 'Contraste',
      warmth: 'Glow · Tono Cálido',
      toneUnify: 'Manchas · Tono Uniforme',
      blemish: 'Acné · Imperfecciones',
      contourLift: 'Firmeza · Lifting/Contorno',
      highlights: 'Luces',
      shadows: 'Sombras'
    };
    return labels[filterType] || filterType;
  };

  return (
    <div className="space-y-6">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-md-green text-white' :
          notification.type === 'error' ? 'bg-gray-900 text-white' :
          'bg-gray-700 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Selector de Producto */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Configuración de Filtros por Producto
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MARTIDERM_PRODUCTS.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedProduct?.id === product.id
                  ? 'border-md-green bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-contain rounded"
                />
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {product.category}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel de Configuración */}
      {selectedProduct && filterConfig && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedProduct.name}
              </h3>
              <p className="text-sm text-gray-500">
                Configuración de filtros de belleza
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPreview ? 'Ocultar' : 'Preview'}</span>
              </button>
            </div>
          </div>

          {/* Controles de Filtros */}
          <div className="space-y-6">
            {Object.entries(filterConfig.filters).map(([filterType, config]) => {
              const IconComponent = getFilterIcon(filterType);
              
              return (
                <div key={filterType} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-5 h-5 text-md-green" />
                      <h4 className="font-medium text-gray-900">
                        {getFilterLabel(filterType)}
                      </h4>
                    </div>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => handleFilterChange(filterType, 'enabled', e.target.checked)}
                        className="rounded border-gray-300 text-md-green focus:ring-md-green"
                      />
                      <span className="ml-2 text-sm text-gray-600">Activado</span>
                    </label>
                  </div>

                  {config.enabled && (
                    <div className="space-y-4">
                      {/* Intensidad */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Intensidad: {config.intensity}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.intensity}
                          onChange={(e) => handleFilterChange(filterType, 'intensity', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      {/* Parámetros específicos */}
                      {filterType === 'smooth' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Radio: {config.radius}
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={config.radius}
                              onChange={(e) => handleFilterChange(filterType, 'radius', parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Pasadas: {config.passes}
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="6"
                              step="1"
                              value={config.passes}
                              onChange={(e) => handleFilterChange(filterType, 'passes', parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Opacidad: {config.opacity}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={config.opacity}
                              onChange={(e) => handleFilterChange(filterType, 'opacity', parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                        </>
                      )}

                      {filterType === 'brightness' && config.value !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor: {config.value}
                          </label>
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            step="1"
                            value={config.value}
                            onChange={(e) => handleFilterChange(filterType, 'value', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                      )}

                      {filterType === 'contrast' && config.value !== undefined && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valor: {config.value}
                          </label>
                          <input
                            type="range"
                            min="0.8"
                            max="1.3"
                            step="0.01"
                            value={config.value}
                            onChange={(e) => handleFilterChange(filterType, 'value', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                        </div>
                      )}

                      {filterType === 'warmth' && (
                        <>
                          {config.rPlus !== undefined && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rojo+: {config.rPlus}
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="20"
                                step="1"
                                value={config.rPlus}
                                onChange={(e) => handleFilterChange(filterType, 'rPlus', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                            </div>
                          )}
                          {config.bMinus !== undefined && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Azul-: {config.bMinus}
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="20"
                                step="1"
                                value={config.bMinus}
                                onChange={(e) => handleFilterChange(filterType, 'bMinus', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                            </div>
                          )}
                          {config.alpha !== undefined && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mezcla: {config.alpha}
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={config.alpha}
                                onChange={(e) => handleFilterChange(filterType, 'alpha', parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {filterType === 'toneUnify' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Umbral: {config.threshold}
                            </label>
                            <input
                              type="range"
                              min="5"
                              max="30"
                              step="1"
                              value={config.threshold}
                              onChange={(e) => handleFilterChange(filterType, 'threshold', parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Mezcla: {config.mix}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={config.mix}
                              onChange={(e) => handleFilterChange(filterType, 'mix', parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                        </>
                      )}

                      {filterType === 'blemish' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Micro-Blur: {config.microBlur}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="5"
                              step="0.5"
                              value={config.microBlur}
                              onChange={(e) => handleFilterChange(filterType, 'microBlur', parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Mezcla: {config.alpha}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={config.alpha}
                              onChange={(e) => handleFilterChange(filterType, 'alpha', parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                        </>
                      )}

                      {filterType === 'contourLift' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Lift: {config.lift}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="0.2"
                              step="0.01"
                              value={config.lift}
                              onChange={(e) => handleFilterChange(filterType, 'lift', parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sombra: {config.shade}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="0.2"
                              step="0.01"
                              value={config.shade}
                              onChange={(e) => handleFilterChange(filterType, 'shade', parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Feather: {config.feather}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="50"
                              step="1"
                              value={config.feather}
                              onChange={(e) => handleFilterChange(filterType, 'feather', parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={resetToOriginal}
                disabled={!hasChanges}
                className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Deshacer</span>
              </button>
              
              <button
                onClick={resetToDefaults}
                className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
                <span>Por Defecto</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={exportConfiguration}
                className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
              
              <label className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Importar</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfiguration}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={saveConfiguration}
                disabled={!hasChanges || isLoading}
                className="flex items-center space-x-2 px-6 py-2 bg-md-green text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {showPreview && selectedProduct && (
        <FilterLivePreviewModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          product={selectedProduct}
          filterConfig={filterConfig}
        />
      )}
    </div>
  );
};

export default AdminFilterConfig;
