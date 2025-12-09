import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Package, 
  Eye, 
  Edit3, 
  Save, 
  Search,
  Sliders,
  Image,
  Palette,
  Sun,
  Droplets,
  Sparkles,
  X
} from 'lucide-react';
import { MARTIDERM_PRODUCTS } from '../data/products';
import { useStore } from '../hooks/useStore';

const AdminPanel = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [productFilters, setProductFilters] = useState({});
  const [showEditor, setShowEditor] = useState(false);

  const { updateProductFilters } = useStore();

  // Inicializar filtros de productos
  useEffect(() => {
    const initialFilters = {};
    MARTIDERM_PRODUCTS.forEach(product => {
      initialFilters[product.id] = { ...product.webglEffects };
    });
    setProductFilters(initialFilters);
  }, []);

  // Filtrar productos
  const filteredProducts = MARTIDERM_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas
  const categories = [...new Set(MARTIDERM_PRODUCTS.map(p => p.category))];

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setShowEditor(true);
  };

  const handleFilterChange = (productId, filterName, value) => {
    setProductFilters(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [filterName]: parseFloat(value)
      }
    }));
  };

  const handleSaveFilters = (productId) => {
    const filters = productFilters[productId];
    updateProductFilters(productId, filters);
    
    // Simular guardado en backend
    console.log(`Filtros guardados para ${productId}:`, filters);
    
    // Mostrar confirmación
    alert('Filtros guardados correctamente');
  };

  const getFilterIcon = (filterName) => {
    const icons = {
      smoothing: Sparkles,
      brightness: Sun,
      firmness: Settings,
      hydration: Droplets,
      plumping: Package,
      poreMinimizing: Eye,
      mattifying: Palette,
      clarifying: Image,
      brightening: Sun,
      evenTone: Palette,
      spotReduction: Edit3,
      comfort: Droplets
    };
    return icons[filterName] || Sliders;
  };

  const getFilterLabel = (filterName) => {
    const labels = {
      smoothing: 'Suavizado',
      brightness: 'Brillo',
      firmness: 'Firmeza',
      hydration: 'Hidratación',
      plumping: 'Volumen',
      poreMinimizing: 'Minimizar Poros',
      mattifying: 'Matificante',
      clarifying: 'Clarificante',
      brightening: 'Iluminación',
      evenTone: 'Tono Uniforme',
      spotReduction: 'Reducir Manchas',
      comfort: 'Confort'
    };
    return labels[filterName] || filterName;
  };

  const FilterEditor = ({ product }) => {
    const filters = productFilters[product.id] || {};
    const filterKeys = Object.keys(filters);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => {
                  e.target.src = '/placeholder-product.jpg';
                }}
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                <p className="text-sm text-gray-600">Configuración de Filtros</p>
              </div>
            </div>
            <button
              onClick={() => setShowEditor(false)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filtros */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterKeys.map((filterName) => {
                const FilterIcon = getFilterIcon(filterName);
                const value = filters[filterName];
                
                return (
                  <div key={filterName} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <FilterIcon className="h-4 w-4 text-blue-600" />
                      <label className="text-sm font-medium text-gray-700">
                        {getFilterLabel(filterName)}
                      </label>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={value}
                        onChange={(e) => handleFilterChange(product.id, filterName, e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={value}
                      onChange={(e) => handleFilterChange(product.id, filterName, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                );
              })}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveFilters(product.id)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Guardar Filtros</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Filtros de Productos</h1>
          <p className="mt-2 text-gray-600">
            Configura los parámetros de filtros para cada producto Martiderm
          </p>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Productos ({filteredProducts.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const filters = productFilters[product.id] || {};
              const filterCount = Object.keys(filters).length;
              
              return (
                <div key={product.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={getProductImage(product.id)}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-product.jpg';
                        }}
                      />
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                        
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.category}
                          </span>
                          
                          <span className="text-xs text-gray-500">
                            {filterCount} filtros configurados
                          </span>
                          
                          <span className="text-xs text-gray-500">
                            €{product.price}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleProductSelect(product)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Sliders className="h-4 w-4" />
                        <span>Configurar Filtros</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Preview de filtros actuales */}
                  {filterCount > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(filters).map(([filterName, value]) => (
                          <span
                            key={filterName}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {getFilterLabel(filterName)}: {(value * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor de filtros modal */}
      {showEditor && selectedProduct && (
        <FilterEditor product={selectedProduct} />
      )}
    </div>
  );
};

export default AdminPanel;
import { getProductImage } from '../lib/images';
