import React, { useMemo } from 'react'
import WebImageFilter from './WebImageFilter'
import filterConfigManager from '../services/FilterConfigManager'

export default function ProductTestModal({ open, onClose, productId }) {
  const cfg = useMemo(() => {
    if (!productId) return null
    const pc = filterConfigManager.getProductConfig(productId)
    const webgl = pc?.webglConfig || {}
    const fallback = { filterType: 'wrinkles', intensity: 0.5, sigma: 4, brightness: 0 }
    return { ...fallback, ...webgl }
  }, [productId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-pink-50 via-white to-blue-50">
      <div className="absolute inset-0 overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/5 text-gray-700 hover:bg-black/10 flex items-center justify-center text-xl">×</button>
        <div className="h-screen w-full flex flex-col">
          <div className="px-6 pt-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">Vista previa</div>
              <div className="text-sm text-gray-500">Sube una imagen o usa la cámara. Mostramos solo el resultado.</div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <WebImageFilter config={cfg} hideControls={true} minimal={true} forceAfter={true} />
          </div>
        </div>
      </div>
    </div>
  )
}
