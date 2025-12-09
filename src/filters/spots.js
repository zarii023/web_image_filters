export default {
  key: 'spots',
  label: 'Manchas/Tono',
  defaults: { intensity: 0.65, sigma: 5, brightness: 0.05 },
  deep: {
    smooth: { enabled: true, radius: 6, passes: 3, opacity: 0.6 },
    brightness: { enabled: true, value: 12 },
    contrast: { enabled: true, value: 1.08 },
    warmth: { enabled: true, rPlus: 7, bMinus: 4, alpha: 0.3 },
    toneUnify: { enabled: true, threshold: 8, mix: 0.6 },
    blemish: { enabled: true, microBlur: 4, alpha: 0.5 },
    contourLift: { enabled: true, lift: 0.08, shade: 0.06, feather: 16 }
  }
}
