import { FILTERS } from '../filters';
import filterConfigManager from '../services/FilterConfigManager';

export function buildWebglConfigForProduct(product) {
  const pc = filterConfigManager.getProductConfig(product.id) || {};
  const lockedType = product.filterType || (pc.webglConfig && pc.webglConfig.filterType) || 'wrinkles';
  const defaults = (FILTERS[lockedType] && FILTERS[lockedType].defaults) || { intensity: 0.5, sigma: 4, brightness: 0 };
  const deep = (FILTERS[lockedType] && FILTERS[lockedType].deep) || {};
  const base = {
    filterType: lockedType,
    intensity: (product.defaultIntensity !== undefined) ? product.defaultIntensity : defaults.intensity,
    sigma: (product.defaultSigma !== undefined) ? product.defaultSigma : defaults.sigma,
    brightness: (product.defaultBrightness !== undefined) ? product.defaultBrightness : defaults.brightness,
    contrast: typeof deep.contrast?.value === 'number' ? deep.contrast.value : 1.0,
    warmthR: typeof deep.warmth?.rPlus === 'number' ? deep.warmth.rPlus : 0,
    warmthB: typeof deep.warmth?.bMinus === 'number' ? deep.warmth.bMinus : 0,
    warmthA: typeof deep.warmth?.alpha === 'number' ? deep.warmth.alpha : 0,
  };
  const adminCfg = pc.webglConfig || {};
  return { ...base, ...adminCfg, filterType: lockedType };
}

export default buildWebglConfigForProduct;
