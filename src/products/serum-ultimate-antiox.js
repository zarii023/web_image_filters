export default {
  id: 'serum-ultimate-antiox',
  name: 'Sérum Ultimate Antiox',
  category: 'hidratacion',
  subcategory: 'crema',
  line: 'Essentials',
  size: '50 ml',
  tags: ['Hidratación', 'Cremas', 'Día/Noche', 'Diario', 'Piel Sensible'],
  description: 'Sérum revitalizante global con potente acción antioxidante. Ilumina la piel, unifica el tono y minimiza arrugas. Es reafirmante e hidrata la piel en profundidad.',
  targetConcerns: ['sequedad', 'hidratacion', 'sensibilidad'],
  efficacyData: { hydrationIncrease: 0.35, barrierRepair: 0.45, comfortImprovement: 0.50 },
  clinicalStudy: {
    sampleSize: 110,
    durationWeeks: 6,
    methodology: 'Estudio de hidratación y confort',
    results: { hydrationIncrease: 38.4, barrierFunction: 47.1, comfortScore: 52.3, userSatisfaction: 89.7 }
  },
  ingredients: ['Ceramidas', 'Ácido Hialurónico', 'Glicerina', 'Manteca de Karité'],
  imageUrl: '/products/serum_ultimate_antiox_black_diamond_premios_clara.jpg.webp',
  professionalOnly: false,
  price: 35.50,
  filterType: 'brightness',
  defaultIntensity: 0,
  defaultSigma: 0,
  defaultBrightness: 0.07,
  webglEffects: { hydration: 0.7, smoothing: 0.4, comfort: 0.6 }
}
