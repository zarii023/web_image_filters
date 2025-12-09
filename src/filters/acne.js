export default {
  key: 'acne',
  label: 'Acné',
  defaults: { intensity: 0.55, sigma: 3.4, brightness: 0.1 },
  deep: {
    smooth: { enabled: true, radius: 7, passes: 4, opacity: 0.65 },
    brightness: { enabled: true, value: 8 },
    contrast: { enabled: true, value: 1.02 },
    warmth: { enabled: true, rPlus: 6, bMinus: 3, alpha: 0.25 },
    toneUnify: { enabled: true, threshold: 10, mix: 0.5 },
    blemish: { enabled: true, microBlur: 5, alpha: 0.7 },
    contourLift: { enabled: true, lift: 0.06, shade: 0.04, feather: 20 }
  }
}
