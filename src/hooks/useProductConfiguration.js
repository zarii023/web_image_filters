import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Configuraciones por defecto para diferentes categorías de productos
const DEFAULT_CONFIGURATIONS = {
  'anti-aging': {
    intensity: 0.7,
    smoothing: 0.6,
    wrinkle_reduction: 0.8,
    face_zones: {
      forehead: { enabled: true, weight: 0.9 },
      eyeArea: { enabled: true, weight: 0.8 },
      cheeks: { enabled: true, weight: 0.6 },
      nose: { enabled: false, weight: 0.0 }
    },
    advanced_parameters: {
      edge_softness: 0.4,
      color_correction: true,
      texture_enhancement: 0.5
    }
  },
  'hydration': {
    intensity: 0.6,
    smoothing: 0.4,
    moisture_level: 0.8,
    glow_intensity: 0.7,
    face_zones: {
      forehead: { enabled: true, weight: 0.7 },
      cheeks: { enabled: true, weight: 1.0 },
      eyeArea: { enabled: true, weight: 0.6 },
      nose: { enabled: true, weight: 0.5 }
    },
    advanced_parameters: {
      skin_texture: 0.6,
      barrier_repair: 0.7,
      natural_glow: true
    }
  },
  'brightening': {
    intensity: 0.5,
    brightness_boost: 0.6,
    spot_reduction: 0.8,
    tone_evening: 0.7,
    face_zones: {
      forehead: { enabled: true, weight: 0.6 },
      cheeks: { enabled: true, weight: 0.8 },
      eyeArea: { enabled: true, weight: 0.9 },
      nose: { enabled: true, weight: 0.4 }
    },
    advanced_parameters: {
      color_balance: 0.5,
      luminosity: 0.6,
      contrast_enhancement: 0.3
    }
  },
  'acne-treatment': {
    intensity: 0.8,
    blemish_reduction: 0.9,
    pore_minimization: 0.7,
    oil_control: 0.8,
    face_zones: {
      forehead: { enabled: true, weight: 0.9 },
      cheeks: { enabled: true, weight: 0.8 },
      nose: { enabled: true, weight: 1.0 },
      eyeArea: { enabled: false, weight: 0.0 }
    },
    advanced_parameters: {
      texture_refinement: 0.8,
      sebum_control: 0.9,
      anti_inflammatory: 0.6
    }
  }
};

// Presets por tipo de piel
const SKIN_TYPE_PRESETS = {
  oily: {
    oil_control: 0.8,
    pore_minimization: 0.9,
    shine_reduction: 0.7,
    texture_smoothing: 0.6
  },
  dry: {
    hydration_boost: 0.9,
    glow_enhancement: 0.8,
    texture_softening: 0.7,
    barrier_repair: 0.6
  },
  combination: {
    zone_specific_treatment: true,
    t_zone_oil_control: 0.7,
    cheek_hydration: 0.8,
    balanced_approach: 0.6
  },
  sensitive: {
    gentle_application: 0.5,
    irritation_prevention: 0.9,
    soothing_effect: 0.8,
    minimal_intensity: 0.4
  }
};

export const useProductConfiguration = (productId) => {
  const [configuration, setConfiguration] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [localChanges, setLocalChanges] = useState({});
  
  const queryClient = useQueryClient();

  // Query para obtener la configuración del producto
  const { data: serverConfiguration, isLoading, error } = useQuery({
    queryKey: ['productConfiguration', productId],
    queryFn: async () => {
      // Simular llamada a API - en producción sería una llamada real a Supabase
      if (!productId) return null;
      
      // Por ahora, devolver configuración por defecto basada en la categoría del producto
      // En producción, esto vendría de la base de datos
      const product = await getProductById(productId);
      const category = product?.category?.toLowerCase() || 'anti-aging';
      
      return {
        id: `config_${productId}`,
        product_id: productId,
        ...DEFAULT_CONFIGURATIONS[category] || DEFAULT_CONFIGURATIONS['anti-aging'],
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    },
    enabled: !!productId
  });

  // Mutation para guardar configuración
  const saveConfigurationMutation = useMutation({
    mutationFn: async (configData) => {
      // Simular guardado en base de datos
      console.log('Guardando configuración:', configData);
      
      // En producción, esto sería una llamada a Supabase
      return {
        ...configData,
        updated_at: new Date().toISOString()
      };
    },
    onSuccess: (savedConfig) => {
      // Actualizar cache
      queryClient.setQueryData(['productConfiguration', productId], savedConfig);
      setIsDirty(false);
      setLocalChanges({});
    }
  });

  // Actualizar configuración local cuando llegan datos del servidor
  useEffect(() => {
    if (serverConfiguration && !isDirty) {
      setConfiguration(serverConfiguration);
    }
  }, [serverConfiguration, isDirty]);

  // Función para actualizar un parámetro específico
  const updateParameter = useCallback((parameterPath, value) => {
    setConfiguration(prev => {
      if (!prev) return prev;

      const newConfig = { ...prev };
      const pathParts = parameterPath.split('.');
      
      // Navegar por el path y actualizar el valor
      let current = newConfig;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      current[pathParts[pathParts.length - 1]] = value;
      
      return newConfig;
    });

    // Marcar como modificado
    setIsDirty(true);
    setLocalChanges(prev => ({
      ...prev,
      [parameterPath]: value
    }));
  }, []);

  // Función para guardar configuración
  const saveConfiguration = useCallback(async () => {
    if (!configuration || !isDirty) return;

    try {
      await saveConfigurationMutation.mutateAsync(configuration);
      return true;
    } catch (error) {
      console.error('Error guardando configuración:', error);
      throw error;
    }
  }, [configuration, isDirty, saveConfigurationMutation]);

  // Función para resetear a configuración por defecto
  const resetToDefault = useCallback(() => {
    if (!productId) return;

    // Obtener configuración por defecto basada en la categoría
    const defaultConfig = DEFAULT_CONFIGURATIONS['anti-aging']; // Por defecto
    
    setConfiguration(prev => ({
      ...prev,
      ...defaultConfig,
      updated_at: new Date().toISOString()
    }));
    
    setIsDirty(true);
  }, [productId]);

  // Función para aplicar preset por tipo de piel
  const applyPreset = useCallback((skinType) => {
    const preset = SKIN_TYPE_PRESETS[skinType];
    if (!preset) return;

    setConfiguration(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        ...preset,
        skin_type: skinType,
        updated_at: new Date().toISOString()
      };
    });

    setIsDirty(true);
  }, []);

  // Función para crear un nuevo preset personalizado
  const createPreset = useCallback(async (presetName, skinType = 'normal') => {
    if (!configuration) return;

    const presetData = {
      id: `preset_${Date.now()}`,
      name: presetName,
      skin_type: skinType,
      product_id: productId,
      parameters: { ...configuration },
      created_at: new Date().toISOString()
    };

    // En producción, guardar en base de datos
    console.log('Creando preset:', presetData);
    
    return presetData;
  }, [configuration, productId]);

  // Función para obtener el valor de un parámetro específico
  const getParameter = useCallback((parameterPath) => {
    if (!configuration) return undefined;

    const pathParts = parameterPath.split('.');
    let current = configuration;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }, [configuration]);

  // Función para validar configuración
  const validateConfiguration = useCallback((config = configuration) => {
    if (!config) return { isValid: false, errors: ['Configuración no disponible'] };

    const errors = [];

    // Validar rangos de parámetros
    if (config.intensity < 0 || config.intensity > 1) {
      errors.push('Intensidad debe estar entre 0 y 1');
    }

    // Validar zonas faciales
    if (config.face_zones) {
      Object.entries(config.face_zones).forEach(([zone, settings]) => {
        if (settings.weight < 0 || settings.weight > 1) {
          errors.push(`Peso de zona ${zone} debe estar entre 0 y 1`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [configuration]);

  return {
    // Estado
    configuration,
    isLoading,
    error,
    isDirty,
    localChanges,
    
    // Acciones
    updateParameter,
    saveConfiguration,
    resetToDefault,
    applyPreset,
    createPreset,
    
    // Utilidades
    getParameter,
    validateConfiguration,
    
    // Estado de guardado
    isSaving: saveConfigurationMutation.isPending,
    saveError: saveConfigurationMutation.error
  };
};

// Función auxiliar para obtener producto por ID (simulada)
async function getProductById(productId) {
  // En producción, esto sería una consulta a la base de datos
  return {
    id: productId,
    category: 'Anti-Aging', // Valor por defecto
    name: 'Producto de ejemplo'
  };
}