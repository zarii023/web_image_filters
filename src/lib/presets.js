/**
 * Beauty Filter Presets
 * 
 * Configuraciones predefinidas para diferentes preocupaciones de belleza
 */

// Preset por defecto - equilibrado para uso general
export const defaultPreset = {
  smooth: { 
    enabled: true, 
    radius: 4, 
    passes: 2, 
    opacity: 0.4 
  },
  brightness: { 
    enabled: true, 
    value: 8 
  },
  contrast: { 
    enabled: true, 
    value: 1.05 
  },
  warmth: { 
    enabled: true, 
    rPlus: 6, 
    bMinus: 4, 
    alpha: 0.25 
  },
  toneUnify: { 
    enabled: true, 
    threshold: 15, 
    mix: 0.25 
  },
  blemish: { 
    enabled: true, 
    microBlur: 2, 
    alpha: 0.25 
  },
  contourLift: { 
    enabled: true, 
    lift: 0.08, 
    shade: 0.06, 
    feather: 15 
  }
};

// Presets específicos por preocupación
export const presetsByConcern = {
  // Preset para arrugas - enfoque en suavizado y textura
  arrugas: {
    smooth: { 
      enabled: true, 
      radius: 8, 
      passes: 4, 
      opacity: 0.7 
    },
    brightness: { 
      enabled: true, 
      value: 10 
    },
    contrast: { 
      enabled: true, 
      value: 1.03 
    },
    warmth: { 
      enabled: true, 
      rPlus: 8, 
      bMinus: 5, 
      alpha: 0.3 
    },
    toneUnify: { 
      enabled: true, 
      threshold: 12, 
      mix: 0.4 
    },
    blemish: { 
      enabled: true, 
      microBlur: 3, 
      alpha: 0.4 
    },
    contourLift: { 
      enabled: true, 
      lift: 0.06, 
      shade: 0.04, 
      feather: 20 
    }
  },

  // Preset para firmeza - enfoque en contouring y definición
  firmeza: {
    smooth: { 
      enabled: true, 
      radius: 3, 
      passes: 2, 
      opacity: 0.3 
    },
    brightness: { 
      enabled: true, 
      value: 6 
    },
    contrast: { 
      enabled: true, 
      value: 1.12 
    },
    warmth: { 
      enabled: true, 
      rPlus: 5, 
      bMinus: 3, 
      alpha: 0.2 
    },
    toneUnify: { 
      enabled: true, 
      threshold: 18, 
      mix: 0.2 
    },
    blemish: { 
      enabled: false, 
      microBlur: 1, 
      alpha: 0.1 
    },
    contourLift: { 
      enabled: true, 
      lift: 0.15, 
      shade: 0.12, 
      feather: 12 
    }
  },

  // Preset para piel apagada - enfoque en luminosidad y vitalidad
  piel_apagada: {
    smooth: { 
      enabled: true, 
      radius: 5, 
      passes: 3, 
      opacity: 0.5 
    },
    brightness: { 
      enabled: true, 
      value: 18 
    },
    contrast: { 
      enabled: true, 
      value: 1.15 
    },
    warmth: { 
      enabled: true, 
      rPlus: 12, 
      bMinus: 8, 
      alpha: 0.45 
    },
    toneUnify: { 
      enabled: true, 
      threshold: 10, 
      mix: 0.3 
    },
    blemish: { 
      enabled: true, 
      microBlur: 2, 
      alpha: 0.3 
    },
    contourLift: { 
      enabled: true, 
      lift: 0.12, 
      shade: 0.08, 
      feather: 18 
    }
  },

  // Preset para manchas - enfoque en uniformidad del tono
  manchas: {
    smooth: { 
      enabled: true, 
      radius: 6, 
      passes: 3, 
      opacity: 0.6 
    },
    brightness: { 
      enabled: true, 
      value: 12 
    },
    contrast: { 
      enabled: true, 
      value: 1.08 
    },
    warmth: { 
      enabled: true, 
      rPlus: 7, 
      bMinus: 4, 
      alpha: 0.3 
    },
    toneUnify: { 
      enabled: true, 
      threshold: 8, 
      mix: 0.6 
    },
    blemish: { 
      enabled: true, 
      microBlur: 4, 
      alpha: 0.5 
    },
    contourLift: { 
      enabled: true, 
      lift: 0.08, 
      shade: 0.06, 
      feather: 16 
    }
  },

  // Preset para acné - enfoque en reducción de imperfecciones
  acne: {
    smooth: { 
      enabled: true, 
      radius: 7, 
      passes: 4, 
      opacity: 0.65 
    },
    brightness: { 
      enabled: true, 
      value: 8 
    },
    contrast: { 
      enabled: true, 
      value: 1.02 
    },
    warmth: { 
      enabled: true, 
      rPlus: 6, 
      bMinus: 3, 
      alpha: 0.25 
    },
    toneUnify: { 
      enabled: true, 
      threshold: 10, 
      mix: 0.5 
    },
    blemish: { 
      enabled: true, 
      microBlur: 5, 
      alpha: 0.7 
    },
    contourLift: { 
      enabled: true, 
      lift: 0.06, 
      shade: 0.04, 
      feather: 20 
    }
  }
};

// Nombres amigables para los presets
export const presetNames = {
  default: 'Equilibrado',
  arrugas: 'Anti-Arrugas',
  firmeza: 'Firmeza y Lifting',
  piel_apagada: 'Luminosidad',
  manchas: 'Uniformidad',
  acne: 'Piel Perfecta'
};

// Descripciones de cada preset
export const presetDescriptions = {
  default: 'Mejora general equilibrada para todo tipo de piel',
  arrugas: 'Suaviza líneas de expresión y arrugas finas',
  firmeza: 'Define contornos y mejora la firmeza facial',
  piel_apagada: 'Aporta luminosidad y vitalidad a la piel',
  manchas: 'Unifica el tono y reduce manchas',
  acne: 'Minimiza imperfecciones y suaviza la textura'
};

/**
 * Obtiene un preset por su clave
 * @param {string} presetKey - Clave del preset ('default', 'arrugas', etc.)
 * @returns {Object} - Configuración del preset
 */
export function getPreset(presetKey) {
  if (presetKey === 'default') {
    return { ...defaultPreset };
  }
  
  if (presetsByConcern[presetKey]) {
    return { ...presetsByConcern[presetKey] };
  }
  
  console.warn(`Preset '${presetKey}' no encontrado, usando preset por defecto`);
  return { ...defaultPreset };
}

/**
 * Obtiene la lista de todos los presets disponibles
 * @returns {Array} - Array de objetos con información de presets
 */
export function getAllPresets() {
  const presets = [
    {
      key: 'default',
      name: presetNames.default,
      description: presetDescriptions.default,
      config: defaultPreset
    }
  ];
  
  Object.keys(presetsByConcern).forEach(key => {
    presets.push({
      key,
      name: presetNames[key],
      description: presetDescriptions[key],
      config: presetsByConcern[key]
    });
  });
  
  return presets;
}

/**
 * Mezcla dos presets con un factor de interpolación
 * @param {Object} preset1 - Primer preset
 * @param {Object} preset2 - Segundo preset
 * @param {number} factor - Factor de interpolación (0-1)
 * @returns {Object} - Preset mezclado
 */
export function blendPresets(preset1, preset2, factor) {
  const blended = {};
  
  Object.keys(preset1).forEach(filterKey => {
    blended[filterKey] = {};
    
    Object.keys(preset1[filterKey]).forEach(paramKey => {
      const val1 = preset1[filterKey][paramKey];
      const val2 = preset2[filterKey] ? preset2[filterKey][paramKey] : val1;
      
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        blended[filterKey][paramKey] = val1 + (val2 - val1) * factor;
      } else if (typeof val1 === 'boolean') {
        blended[filterKey][paramKey] = factor > 0.5 ? val2 : val1;
      } else {
        blended[filterKey][paramKey] = val1;
      }
    });
  });
  
  return blended;
}

/**
 * Valida que un preset tenga la estructura correcta
 * @param {Object} preset - Preset a validar
 * @returns {boolean} - true si es válido
 */
export function validatePreset(preset) {
  const requiredFilters = ['smooth', 'brightness', 'contrast', 'warmth', 'toneUnify', 'blemish', 'contourLift'];
  
  for (const filterKey of requiredFilters) {
    if (!preset[filterKey] || typeof preset[filterKey] !== 'object') {
      console.error(`Preset inválido: falta filtro '${filterKey}'`);
      return false;
    }
    
    if (typeof preset[filterKey].enabled !== 'boolean') {
      console.error(`Preset inválido: '${filterKey}.enabled' debe ser boolean`);
      return false;
    }
  }
  
  return true;
}