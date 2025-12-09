/**
 * FilterConfigManager - Servicio para gestionar configuraciones de filtros por producto
 * 
 * Funcionalidades:
 * - Almacenamiento persistente de configuraciones de filtros
 * - Gestión de configuraciones por producto
 * - Sistema de autenticación para administradores
 * - Backup y restauración de configuraciones
 * - Valores predeterminados para filtros
 */

// Configuraciones predeterminadas para cada tipo de filtro (alineadas con beautyFilters)
const DEFAULT_FILTER_CONFIG = {
  // 1) Arrugas → Suavizado de piel
  smooth: {
    enabled: true,
    intensity: 36, // referencia visual
    radius: 4,
    passes: 2,
    opacity: 0.4
  },
  // 2) Piel apagada → Brillo
  brightness: {
    enabled: true,
    intensity: 91, // referencia visual
    value: 8
  },
  // Ajuste de contraste general
  contrast: {
    enabled: true,
    intensity: 10,
    value: 1.05
  },
  // Tono cálido / glow
  warmth: {
    enabled: true,
    intensity: 20,
    rPlus: 6,
    bMinus: 4,
    alpha: 0.25
  },
  // 2) Manchas → Unificar tono
  toneUnify: {
    enabled: true,
    intensity: 65, // referencia visual
    threshold: 15,
    mix: 0.25
  },
  // 5) Acné → Reducir imperfecciones
  blemish: {
    enabled: true,
    intensity: 35, // referencia visual
    microBlur: 2,
    alpha: 0.25
  },
  // 3) Firmeza → Lifting y contouring
  contourLift: {
    enabled: true,
    intensity: 24, // referencia visual
    lift: 0.08,
    shade: 0.06,
    feather: 15
  },
  // Extras
  highlights: {
    enabled: false,
    intensity: 10
  },
  shadows: {
    enabled: false,
    intensity: 5
  }
};

// Presets por preocupación de piel
const CONCERN_PRESETS = {
  arrugas: {
    smooth: { enabled: true, intensity: 36, radius: 6, passes: 3, opacity: 0.6 },
    contourLift: { enabled: true, intensity: 20, lift: 0.06, shade: 0.05, feather: 18 }
  },
  manchas: {
    toneUnify: { enabled: true, intensity: 65, threshold: 14, mix: 0.35 },
    brightness: { enabled: true, intensity: 20, value: 10 }
  },
  firmeza: {
    contourLift: { enabled: true, intensity: 24, lift: 0.08, shade: 0.06, feather: 20 },
    contrast: { enabled: true, intensity: 12, value: 1.07 }
  },
  luminosidad: {
    brightness: { enabled: true, intensity: 91, value: 12 },
    warmth: { enabled: true, intensity: 25, rPlus: 8, bMinus: 5, alpha: 0.3 }
  },
  acne: {
    blemish: { enabled: true, intensity: 35, microBlur: 3, alpha: 0.35 },
    toneUnify: { enabled: true, intensity: 40, threshold: 16, mix: 0.3 }
  }
};

// Configuraciones específicas por categoría de producto (usando categorías reales)
const CATEGORY_PRESETS = {
  // Antiaging: foco en arrugas y firmeza
  antiaging: {
    smooth: { enabled: true, intensity: 36, radius: 6, passes: 3, opacity: 0.6 },
    contourLift: { enabled: true, intensity: 24, lift: 0.07, shade: 0.05, feather: 18 },
    brightness: { enabled: true, intensity: 20, value: 10 },
    warmth: { enabled: true, intensity: 22, rPlus: 7, bMinus: 5, alpha: 0.28 }
  },
  // Manchas / pigmentación: foco en unificar tono y luminosidad
  manchas: {
    toneUnify: { enabled: true, intensity: 65, threshold: 14, mix: 0.35 },
    brightness: { enabled: true, intensity: 25, value: 10 },
    warmth: { enabled: false }
  },
  // Hidratación: suavizado ligero y glow moderado
  hidratacion: {
    smooth: { enabled: true, intensity: 25, radius: 3, passes: 2, opacity: 0.35 },
    brightness: { enabled: true, intensity: 18, value: 8 },
    warmth: { enabled: true, intensity: 15, rPlus: 5, bMinus: 3, alpha: 0.2 }
  },
  // Acné: foco en reducción de imperfecciones y tono uniforme
  acne: {
    blemish: { enabled: true, intensity: 35, microBlur: 3, alpha: 0.35 },
    toneUnify: { enabled: true, intensity: 40, threshold: 16, mix: 0.3 },
    brightness: { enabled: false }
  }
};

class FilterConfigManager {
  constructor() {
    this.storageKey = 'martiderm_filter_configs';
    this.authKey = 'martiderm_admin_auth';
    this.backupKey = 'martiderm_config_backup';
    this.init();
  }

  /**
   * Inicializa el gestor de configuraciones
   */
  init() {
    // Verificar si existen configuraciones guardadas
    const savedConfigs = this.loadConfigurations();
    if (!savedConfigs || Object.keys(savedConfigs).length === 0) {
      this.initializeDefaultConfigurations();
    }
  }

  /**
   * Inicializa configuraciones predeterminadas para todos los productos
   */
  initializeDefaultConfigurations() {
    try {
      // Importar productos dinámicamente para evitar dependencias circulares
      import('../data/products.js').then(({ MARTIDERM_PRODUCTS }) => {
        const configs = {};
        
        MARTIDERM_PRODUCTS.forEach(product => {
          configs[product.id] = this.generateProductConfig(product);
        });
        
        this.saveConfigurations(configs);
      });
    } catch (error) {
      console.error('Error inicializando configuraciones:', error);
    }
  }

  /**
   * Genera configuración específica para un producto
   */
  generateProductConfig(product) {
    const baseConfig = { ...DEFAULT_FILTER_CONFIG };
    const categoryPreset = CATEGORY_PRESETS[product.category];
    
    if (categoryPreset) {
      // Aplicar presets específicos de la categoría
      Object.keys(categoryPreset).forEach(filterType => {
        if (baseConfig[filterType]) {
          baseConfig[filterType] = {
            ...baseConfig[filterType],
            ...categoryPreset[filterType]
          };
        }
      });
    }

    // Aplicar presets por preocupaciones del producto (si existen)
    if (product.targetConcerns && Array.isArray(product.targetConcerns)) {
      product.targetConcerns.forEach(concern => {
        const preset = CONCERN_PRESETS[concern];
        if (preset) {
          Object.keys(preset).forEach(filterType => {
            if (baseConfig[filterType]) {
              baseConfig[filterType] = {
                ...baseConfig[filterType],
                ...preset[filterType]
              };
            }
          });
        }
      });
    }
    
    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      filters: baseConfig,
      lastModified: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Obtiene la configuración de filtros para un producto específico
   */
  getProductConfig(productId) {
    const configs = this.loadConfigurations();
    return configs[productId] || null;
  }

  /**
   * Guarda la configuración de filtros para un producto
   */
  saveProductConfig(productId, config) {
    const configs = this.loadConfigurations();
    configs[productId] = {
      ...config,
      lastModified: new Date().toISOString()
    };
    this.saveConfigurations(configs);
    return true;
  }

  /**
   * Obtiene todas las configuraciones
   */
  getAllConfigurations() {
    return this.loadConfigurations();
  }

  /**
   * Carga configuraciones desde localStorage
   */
  loadConfigurations() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      return {};
    }
  }

  /**
   * Guarda configuraciones en localStorage
   */
  saveConfigurations(configs) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(configs));
      // Crear backup automático
      this.createBackup(configs);
      return true;
    } catch (error) {
      console.error('Error guardando configuraciones:', error);
      return false;
    }
  }

  /**
   * Crea un backup de las configuraciones
   */
  createBackup(configs = null) {
    try {
      const configsToBackup = configs || this.loadConfigurations();
      const backup = {
        timestamp: new Date().toISOString(),
        configurations: configsToBackup,
        version: '1.0'
      };
      localStorage.setItem(this.backupKey, JSON.stringify(backup));
      return true;
    } catch (error) {
      console.error('Error creando backup:', error);
      return false;
    }
  }

  /**
   * Restaura configuraciones desde backup
   */
  restoreFromBackup() {
    try {
      const backup = localStorage.getItem(this.backupKey);
      if (backup) {
        const backupData = JSON.parse(backup);
        this.saveConfigurations(backupData.configurations);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restaurando backup:', error);
      return false;
    }
  }

  /**
   * Exporta configuraciones para descarga
   */
  exportConfigurations() {
    const configs = this.loadConfigurations();
    const exportData = {
      timestamp: new Date().toISOString(),
      configurations: configs,
      version: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importa configuraciones desde archivo
   */
  importConfigurations(jsonData) {
    try {
      const importData = JSON.parse(jsonData);
      if (importData.configurations) {
        this.saveConfigurations(importData.configurations);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importando configuraciones:', error);
      return false;
    }
  }

  /**
   * Resetea configuraciones a valores predeterminados
   */
  resetToDefaults() {
    try {
      localStorage.removeItem(this.storageKey);
      this.initializeDefaultConfigurations();
      return true;
    } catch (error) {
      console.error('Error reseteando configuraciones:', error);
      return false;
    }
  }

  /**
   * Estado de autenticación del administrador
   */
  isAuthenticated() {
    try {
      const raw = localStorage.getItem(this.authKey);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!data?.authenticated;
    } catch (e) {
      return false;
    }
  }

  /**
   * Autentica al administrador con credenciales simples de demo
   */
  authenticateAdmin(username, password) {
    // Credenciales de prueba visibles en AdminAuth
    const validUser = username === 'admin';
    const validPass = password === 'martiderm2024';
    if (validUser && validPass) {
      const session = {
        authenticated: true,
        username,
        token: `adm-${Date.now()}`,
        lastLogin: new Date().toISOString()
      };
      localStorage.setItem(this.authKey, JSON.stringify(session));
      return { success: true, username };
    }
    return { success: false, error: 'Credenciales inválidas' };
  }

  /**
   * Obtiene información del usuario autenticado
   */
  getAuthenticatedUser() {
    try {
      const raw = localStorage.getItem(this.authKey);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.authenticated) {
        return { username: data.username };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Cierra sesión del administrador
   */
  logout() {
    try {
      localStorage.removeItem(this.authKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Compatibilidad: método singular usado por AdminPanel
   */
  exportConfiguration() {
    return this.exportConfigurations();
  }
}

export default new FilterConfigManager();

// Exportar también la clase para testing
export { FilterConfigManager, DEFAULT_FILTER_CONFIG, CATEGORY_PRESETS };