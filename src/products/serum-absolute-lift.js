export default {
  id: 'serum-absolute-lift',
  name: 'Sérum Absolute Lift',
  category: 'hidratacion',
  subcategory: 'ampollas',
  line: 'The Originals',
  size: '10 ampollas',
  tags: ['Hidratación', 'Ampollas', 'Día', 'Diario', 'Todo tipo'],
  description: 'Sérum reafirmante global con efecto lifting inmediato y a largo plazo. Minimiza la apariencia de las arrugas y líneas de expresión, y redefine el óvalo facial. Es reafirmante, hidratante y mejora la elasticidad de la piel.',
  targetConcerns: ['sequedad', 'hidratacion'],
  efficacyData: { hydrationIncrease: 0.40, smoothnessImprovement: 0.35 },
  clinicalStudy: {
    sampleSize: 95,
    durationWeeks: 4,
    methodology: 'Estudio de hidratación con corneometría',
    results: { hydrationIncrease: 42.5, smoothnessImprovement: 38.7, userSatisfaction: 91.8 }
  },
  ingredients: ['Proteoglicanos', 'Ácido Hialurónico', 'Vitamina E'],
  imageUrl: '/products/serum_absolute_lift_black_diamond_martiderm.jpg.webp',
  professionalOnly: false,
  price: 42.50,
  filterType: 'firmness',
  defaultIntensity: 0.7,
  defaultSigma: 2,
  defaultBrightness: 0,
  webglEffects: { hydration: 0.8, smoothing: 0.5, plumping: 0.4 }
}
