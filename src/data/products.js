// Base de datos de productos Martiderm con datos clínicos reales
export const PRODUCT_CATEGORIES = {
  ANTIAGING: 'antiaging',
  HYDRATION: 'hidratacion',
  ACNE: 'acne',
  PIGMENTATION: 'manchas',
  SENSITIVE: 'sensible',
  PROFESSIONAL: 'profesional'
};

export const SKIN_CONCERNS = {
  WRINKLES: 'arrugas',
  FIRMNESS: 'firmeza',
  BRIGHTNESS: 'luminosidad',
  HYDRATION: 'hidratacion',
  DRYNESS: 'sequedad',
  ACNE: 'acne',
  PORES: 'poros',
  OILINESS: 'grasa',
  SPOTS: 'manchas',
  EVENNESS: 'uniformidad',
  SENSITIVITY: 'sensibilidad'
};

import p1 from '../products/ampollas-skin-complex-advanced';
import p2 from '../products/serum-absolute-lift';
import p3 from '../products/acniover-cremigel-activo';
import p4 from '../products/dsp-crema-fps-50+-despigmentante';
import p5 from '../products/serum-ultimate-antiox';

export const MARTIDERM_PRODUCTS = [p1, p2, p3, p4, p5];

// Función para obtener productos por categoría
export const getProductsByCategory = (category) => {
  return MARTIDERM_PRODUCTS.filter(product => product.category === category);
};

// Función para obtener productos por preocupación
export const getProductsByConcern = (concern) => {
  return MARTIDERM_PRODUCTS.filter(product => 
    product.targetConcerns.includes(concern)
  );
};

// Función para obtener producto por ID
export const getProductById = (id) => {
  return MARTIDERM_PRODUCTS.find(product => product.id === id);
};

// Función para obtener productos profesionales
export const getProfessionalProducts = () => {
  return MARTIDERM_PRODUCTS.filter(product => product.professionalOnly);
};

// Función para obtener productos para consumidores
export const getConsumerProducts = () => {
  return MARTIDERM_PRODUCTS.filter(product => !product.professionalOnly);
};
