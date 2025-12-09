export default {
  key: 'brightness',
  label: 'Luminosidad',
  defaults: { intensity: 0, sigma: 0, brightness: 0.07 },
  deep: {
    smooth: { enabled: true, radius: 5, passes: 3, opacity: 0.5 },
    brightness: { enabled: true, value: 18 },
    contrast: { enabled: true, value: 1.15 },
    warmth: { enabled: true, rPlus: 12, bMinus: 8, alpha: 0.45 },
    toneUnify: { enabled: true, threshold: 10, mix: 0.3 },
    blemish: { enabled: true, microBlur: 2, alpha: 0.3 },
    contourLift: { enabled: true, lift: 0.12, shade: 0.08, feather: 18 }
  }
}
