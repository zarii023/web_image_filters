export default {
  id: 'acniover-cremigel-activo',
  name: 'Acniover Cremige Activo',
  category: 'acne',
  subcategory: 'tratamiento',
  line: 'Acniover',
  size: '40 ml',
  tags: ['Tendencia Acnéica', 'Cremas', 'Día/Noche', 'Diario', 'Piel Mixta'],
  description: 'Cremigel ligero de fácil absorción ayuda a reducir la secreción de grasa, minimiza los poros, puntos negros y espinillas. Al contener ácido salicílico encapsulado, respeta la piel y su hidratación.',
  targetConcerns: ['acne', 'poros', 'grasa'],
  efficacyData: { acneReduction: 0.60, poreRefinement: 0.25, oilControl: 0.45 },
  clinicalStudy: {
    sampleSize: 80,
    durationWeeks: 12,
    methodology: 'Estudio clínico en piel acneica',
    results: { acneLesionReduction: 62.3, poreVisibilityReduction: 28.1, sebumReduction: 47.5, userSatisfaction: 88.9 }
  },
  ingredients: ['Niacinamida', 'Ácido Salicílico', 'Zinc PCA'],
  imageUrl: '/products/acniover-cremigel-activo_0.jpg.webp',
  professionalOnly: false,
  price: 28.90,
  filterType: 'acne',
  defaultIntensity: 0.55,
  defaultSigma: 3.4,
  defaultBrightness: 0.1,
  webglEffects: { poreMinimizing: 0.6, mattifying: 0.7, clarifying: 0.5 }
}
