export default {
  key: 'firmness',
  label: 'Firmeza',
  defaults: { intensity: 0.7, sigma: 2, brightness: 0 },
  deep: {
    smooth: { enabled: true, radius: 3, passes: 2, opacity: 0.3 },
    brightness: { enabled: true, value: 6 },
    contrast: { enabled: true, value: 1.12 },
    warmth: { enabled: true, rPlus: 5, bMinus: 3, alpha: 0.2 },
    toneUnify: { enabled: true, threshold: 18, mix: 0.2 },
    blemish: { enabled: false, microBlur: 1, alpha: 0.1 },
    contourLift: { enabled: true, lift: 0.15, shade: 0.12, feather: 12 }
  }
}
