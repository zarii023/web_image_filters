import { create } from 'zustand';
import { getProductById } from '../data/products';
import filterConfigManager from '../services/FilterConfigManager';

// Store principal de la aplicación Martiderm
export const useStore = create((set, get) => ({
  // Estado de la aplicación
  currentPage: 'home',
  loading: false,
  error: null,

  // Estado del usuario
  user: null,
  userType: 'consumer', // 'consumer' | 'professional' | 'admin'

  // Estado de la imagen y análisis facial
  image: null,
  imageURL: null,
  imgSize: { w: 0, h: 0 },
  faceDetected: false,
  faceAnalysis: null,
  detectingFace: false,

  // Estado del simulador
  selectedProduct: null,
  intensity: 0.5,
  sigma: 3,
  brightness: 0,
  filterType: 'wrinkles',
  view: 'after', // 'after' | 'before' | 'split' | 'mask'
  splitPos: 0.5,

  // Estado de la máscara de pintura
  brushSize: 40,
  hardness: 0.6,
  mode: 'paint', // 'paint' | 'erase'

  // Estado de simulaciones y resultados
  currentSimulation: null,
  simulationResults: [],
  simulationHistory: [],

  // Estado del catálogo
  selectedCategory: null,
  searchQuery: '',
  favoriteProducts: [],

  // Acciones para navegación
  setCurrentPage: (page) => set({ currentPage: page }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Acciones para usuario
  setUser: (user) => set({ user }),
  setUserType: (userType) => set({ userType }),

  // Acciones para imagen y análisis
  setImage: (image) => set({ image }),
  setImageURL: (imageURL) => set({ imageURL }),
  setImgSize: (imgSize) => set({ imgSize }),
  setFaceDetected: (faceDetected) => set({ faceDetected }),
  setFaceAnalysis: (faceAnalysis) => set({ faceAnalysis }),
  setDetectingFace: (detectingFace) => set({ detectingFace }),

  // Acciones para simulador
  setSelectedProduct: (product) => {
    // Aceptar tanto ID como objeto producto
    const productObj = typeof product === 'string' ? getProductById(product) : product;
    set({ selectedProduct: productObj });
  },
  setIntensity: (intensity) => set({ intensity }),
  setSigma: (sigma) => set({ sigma }),
  setBrightness: (brightness) => set({ brightness }),
  setFilterType: (filterType) => set({ filterType }),
  setView: (view) => set({ view }),
  setSplitPos: (splitPos) => set({ splitPos }),

  // Acciones para pintura
  setBrushSize: (brushSize) => set({ brushSize }),
  setHardness: (hardness) => set({ hardness }),
  setMode: (mode) => set({ mode }),

  // Acciones para simulaciones
  setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),
  addSimulationResult: (result) => set((state) => ({
    simulationResults: [...state.simulationResults, result]
  })),
  addToHistory: (simulation) => set((state) => ({
    simulationHistory: [simulation, ...state.simulationHistory]
  })),
  
  // Función para obtener simulación por ID
  getSimulationById: (id) => {
    const { simulationResults } = get();
    return simulationResults.find(result => result.id === id);
  },

  // Acciones para catálogo
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleFavorite: (productId) => set((state) => {
    const favorites = state.favoriteProducts;
    const isFavorite = favorites.includes(productId);
    return {
      favoriteProducts: isFavorite 
        ? favorites.filter(id => id !== productId)
        : [...favorites, productId]
    };
  }),

  // Acciones para resetear estado
  resetSimulator: () => set({
    image: null,
    imageURL: null,
    imgSize: { w: 0, h: 0 },
    faceDetected: false,
    faceAnalysis: null,
    selectedProduct: null,
    intensity: 0.5,
    sigma: 3,
    brightness: 0,
    view: 'after',
    splitPos: 0.5,
    currentSimulation: null
  }),

  clearError: () => set({ error: null }),

  // Función para obtener métricas de mejora basadas en el producto seleccionado
  getExpectedMetrics: () => {
    const { selectedProduct, intensity } = get();
    if (!selectedProduct) return null;

    const baseMetrics = selectedProduct.efficacyData;
    const adjustedMetrics = {};

    // Ajustar métricas según la intensidad seleccionada
    Object.keys(baseMetrics).forEach(key => {
      adjustedMetrics[key] = Math.round(baseMetrics[key] * intensity * 100);
    });

    return adjustedMetrics;
  },

  // Función para obtener productos recomendados basados en el análisis facial
  getRecommendedProducts: () => {
    const { faceAnalysis } = get();
    if (!faceAnalysis || !faceAnalysis.skinAnalysis) return [];

    const concerns = faceAnalysis.skinAnalysis.concerns || [];
    // Aquí se implementaría la lógica de recomendación basada en IA
    // Por ahora retornamos productos que coincidan con las preocupaciones detectadas
    
    return concerns.slice(0, 3); // Limitar a 3 recomendaciones
  },

  // Estado y acciones para filtros de productos (AdminPanel)
  productFilters: {},

  // Función para actualizar filtros de un producto específico
  updateProductFilters: (productId, filters) => {
    // Guardar también en FilterConfigManager si la estructura es avanzada
    try {
      const existing = filterConfigManager.getProductConfig(productId);
      if (existing && existing.filters) {
        const merged = { ...existing, filters: { ...existing.filters, ...filters } };
        filterConfigManager.saveProductConfig(productId, merged);
      }
    } catch (e) {
      // noop
    }
    set((state) => ({
      productFilters: {
        ...state.productFilters,
        [productId]: { ...filters }
      }
    }));
  },

  // Función para obtener filtros de un producto específico
  getProductFilters: (productId) => {
    // Preferir configuración avanzada del gestor si existe
    try {
      let cfg = filterConfigManager.getProductConfig(productId);
      if (!cfg) {
        const p = getProductById(productId);
        if (p) {
          cfg = filterConfigManager.generateProductConfig(p);
          filterConfigManager.saveProductConfig(productId, cfg);
        }
      }
      if (cfg && cfg.filters) {
        return cfg.filters;
      }
    } catch (e) {
      // noop
    }
    const { productFilters } = get();
    return productFilters[productId] || {};
  }
}));

// Hook personalizado para acciones específicas del simulador
export const useSimulator = () => {
  const store = useStore();
  
  return {
    // Estado del simulador
    image: store.image,
    imageURL: store.imageURL,
    selectedProduct: store.selectedProduct,
    intensity: store.intensity,
    view: store.view,
    faceDetected: store.faceDetected,
    simulationResults: store.simulationResults,
    
    // Acciones del simulador
    setImage: store.setImage,
    setImageURL: store.setImageURL,
    setSelectedProduct: store.setSelectedProduct,
    setIntensity: store.setIntensity,
    setView: store.setView,
    resetSimulator: store.resetSimulator,
    addSimulationResult: store.addSimulationResult,
    getSimulationById: store.getSimulationById,
    
    // Métricas calculadas
    getExpectedMetrics: store.getExpectedMetrics,
    getRecommendedProducts: store.getRecommendedProducts
  };
};

// Hook personalizado para el catálogo
export const useCatalog = () => {
  const store = useStore();
  
  return {
    selectedCategory: store.selectedCategory,
    searchQuery: store.searchQuery,
    favoriteProducts: store.favoriteProducts,
    setSelectedCategory: store.setSelectedCategory,
    setSearchQuery: store.setSearchQuery,
    toggleFavorite: store.toggleFavorite
  };
};
