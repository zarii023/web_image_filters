export default {
  key: 'wrinkles',
  label: 'Arrugas',
  defaults: { intensity: 0.5, sigma: 4, brightness: 0 },
  deep: {
    smooth: { enabled: true, radius: 8, passes: 4, opacity: 0.7 },
    brightness: { enabled: true, value: 10 },
    contrast: { enabled: true, value: 1.03 },
    warmth: { enabled: true, rPlus: 8, bMinus: 5, alpha: 0.3 },
    toneUnify: { enabled: true, threshold: 12, mix: 0.4 },
    blemish: { enabled: true, microBlur: 3, alpha: 0.4 },
    contourLift: { enabled: true, lift: 0.06, shade: 0.04, feather: 20 }
  }
}
