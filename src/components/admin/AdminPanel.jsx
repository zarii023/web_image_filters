import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  Settings,
  Eye,
  Save,
  Upload,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  LogOut,
  Shield,
  Sliders
} from 'lucide-react';
import AdminAuth from './AdminAuth';
import AdminFilterConfig from './AdminFilterConfig';
import ProductEditor from './ProductEditor';
import RealTimePreview from './RealTimePreview';
import filterConfigManager from '../../services/FilterConfigManager';

const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFilterConfig, setShowFilterConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Verificar autenticación al cargar
  useEffect(() => {
    setIsAuthenticated(true);
  }, []);

  // Cargar productos desde localStorage
  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    showNotification('Autenticación exitosa', 'success');
  };

  const handleLogout = () => {
    filterConfigManager.logout();
    setIsAuthenticated(false);
    setActiveTab('products');
    showNotification('Sesión cerrada', 'info');
  };

  const loadProducts = () => {
    try {
      const savedProducts = localStorage.getItem('martiderm_products');
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        // Productos por defecto con configuraciones de filtros
        const defaultProducts = [
          {
            id: 'ampollas-proteoglicanos',
            name: 'Ampollas Proteoglicanos',
            category: 'ampollas',
            description: 'Hidratación intensa y efecto lifting',
            image: '/images/products/proteoglicanos.jpg',
            price: 29.99,
            filterConfig: filterConfigManager.getProductConfig('ampollas-proteoglicanos')
          },
          {
            id: 'vitamin-c-serum',
            name: 'Vitamin C Serum',
            category: 'serums',
            description: 'Antioxidante y luminosidad',
            image: '/images/products/vitamin-c.jpg',
            price: 34.99,
            filterConfig: filterConfigManager.getProductConfig('vitamin-c-serum')
          },
          {
            id: 'retinol-cream',
            name: 'Retinol Cream',
            category: 'cremas',
            description: 'Anti-edad y renovación celular',
            image: '/images/products/retinol.jpg',
            price: 39.99,
            filterConfig: filterConfigManager.getProductConfig('retinol-cream')
          }
        ];
        setProducts(defaultProducts);
        saveProducts(defaultProducts);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      showNotification('Error cargando productos', 'error');
    }
  };

  const saveProducts = (productsToSave) => {
    try {
      localStorage.setItem('martiderm_products', JSON.stringify(productsToSave));
      showNotification('Productos guardados exitosamente', 'success');
    } catch (error) {
      console.error('Error guardando productos:', error);
      showNotification('Error guardando productos', 'error');
    }
  };

  const handleFilterConfigSave = (productId, config) => {
    try {
      // Guardar configuración en FilterConfigManager
      filterConfigManager.saveProductConfig(productId, config);
      
      // Actualizar producto en la lista
      const updatedProducts = products.map(product => 
        product.id === productId 
          ? { ...product, filterConfig: config }
          : product
      );
      
      setProducts(updatedProducts);
      saveProducts(updatedProducts);
      
      showNotification('Configuración de filtros guardada', 'success');
      setShowFilterConfig(false);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showNotification('Error guardando configuración', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const exportConfiguration = async () => {
    try {
      setIsLoading(true);
      const config = filterConfigManager.exportConfiguration();
      const dataStr = JSON.stringify(config, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `martiderm-config-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showNotification('Configuración exportada exitosamente', 'success');
    } catch (error) {
      console.error('Error exportando configuración:', error);
      showNotification('Error exportando configuración', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const importConfiguration = async (event) => {
    try {
      setIsLoading(true);
      const file = event.target.files[0];
      if (!file) return;

      const text = await file.text();
      const config = JSON.parse(text);
      
      filterConfigManager.importConfiguration(config);
      loadProducts(); // Recargar productos con nueva configuración
      
      showNotification('Configuración importada exitosamente', 'success');
    } catch (error) {
      console.error('Error importando configuración:', error);
      showNotification('Error importando configuración', 'error');
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products.map(p => p.category))];

  // Si no está autenticado, mostrar componente de autenticación
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
            <p className="text-gray-600">Acceso restringido - Autenticación requerida</p>
          </div>
          
          <AdminAuth onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Panel de Administración</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfiguration}
                  className="hidden"
                  id="import-config"
                />
                <label
                  htmlFor="import-config"
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Importar</span>
                </label>
                
                <button
                  onClick={exportConfiguration}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'products', label: 'Productos', icon: Eye },
              { id: 'filters', label: 'Configuración de Filtros', icon: Sliders },
              { id: 'settings', label: 'Configuración', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {notification.type === 'info' && <Info className="w-5 h-5" />}
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="sm:w-48">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">Todas las categorías</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setShowEditor(true);
                  }}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Producto</span>
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-w-16 aspect-h-9">
                    <img
                      src={product.image || '/images/placeholder-product.jpg'}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                      <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        {product.category}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                    
                    {product.price && (
                      <p className="text-lg font-bold text-purple-600 mb-4">€{product.price}</p>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowEditor(true);
                        }}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowFilterConfig(true);
                        }}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Sliders className="w-4 h-4" />
                        <span>Filtros</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowPreview(true);
                        }}
                        className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Vista</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
                <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
              </div>
            )}
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración Global de Filtros</h2>
              <p className="text-gray-600 mb-6">
                Gestiona las configuraciones de filtros que se aplicarán automáticamente a cada producto.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{product.category}</p>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowFilterConfig(true);
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      <Sliders className="w-4 h-4" />
                      <span>Configurar Filtros</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuración del Sistema</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Backup y Restauración</h3>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={exportConfiguration}
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportar Configuración</span>
                    </button>
                    
                    <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Importar Configuración</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={importConfiguration}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Información del Sistema</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Productos configurados:</span>
                        <span className="ml-2 text-gray-600">{products.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Última actualización:</span>
                        <span className="ml-2 text-gray-600">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showEditor && (
          <ProductEditor
            product={selectedProduct}
            onSave={(product) => {
              if (selectedProduct) {
                // Actualizar producto existente
                const updatedProducts = products.map(p => 
                  p.id === product.id ? product : p
                );
                setProducts(updatedProducts);
                saveProducts(updatedProducts);
              } else {
                // Agregar nuevo producto
                const newProducts = [...products, { ...product, id: Date.now().toString() }];
                setProducts(newProducts);
                saveProducts(newProducts);
              }
              setShowEditor(false);
              setSelectedProduct(null);
            }}
            onCancel={() => {
              setShowEditor(false);
              setSelectedProduct(null);
            }}
          />
        )}

        {showFilterConfig && selectedProduct && (
          <AdminFilterConfig
            product={selectedProduct}
            onSave={(config) => handleFilterConfigSave(selectedProduct.id, config)}
            onCancel={() => {
              setShowFilterConfig(false);
              setSelectedProduct(null);
            }}
          />
        )}

        {showPreview && selectedProduct && (
          <RealTimePreview
            product={selectedProduct}
            onClose={() => {
              setShowPreview(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;