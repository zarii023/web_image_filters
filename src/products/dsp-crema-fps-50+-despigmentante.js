export default {
  id: 'dsp-crema-fps-50+-despigmentante',
  name: 'DSP-Crema FPS 50+ despigmentante',
  category: 'manchas',
  subcategory: 'serum',
  line: 'Pigment Zero',
  size: '30 ml',
  tags: ['Manchas', 'Sérum', 'Noche', 'Diario', 'Todo tipo'],
  description: 'DSP-Crema FPS 50+ contiene una fórmula basada en innovadores activos despigmentantes y fotoprotectores de última generación, convirtiéndose en un producto excepcional para el tratamiento de manchas durante el día: reduce y previene la aparición de manchas melánicas o hiperpigmentaciones, protege la piel de las radiaciones solares (UVA/UVB), unifica el tono, hidrata y aporta un potente efecto antioxidante. Además, su nueva textura fluida ligera permite aplicarla fácilmente dejando una agradable sensación de confort.',
  targetConcerns: ['manchas', 'uniformidad', 'luminosidad'],
  efficacyData: { spotReduction: 0.50, toneEvenness: 0.40, brightnessIncrease: 0.30 },
  clinicalStudy: {
    sampleSize: 65,
    durationWeeks: 16,
    methodology: 'Estudio despigmentante con análisis de imagen',
    results: { melasmaReduction: 52.7, toneUniformity: 43.2, brightnessIncrease: 31.8, userSatisfaction: 92.4 }
  },
  ingredients: ['Kojic Acid', 'Arbutin', 'Vitamina C', 'Niacinamida'],
  imageUrl: '/products/dsp-crema-fps-50-despigmentante.jpg.webp',
  professionalOnly: true,
  price: 89.90,
  filterType: 'spots',
  defaultIntensity: 0.65,
  defaultSigma: 5,
  defaultBrightness: 0.05,
  webglEffects: { brightening: 0.8, evenTone: 0.7, spotReduction: 0.6 }
}
