import React, { useEffect, useState } from 'react'
import WebImageFilter from '../components/WebImageFilter'
import { MARTIDERM_PRODUCTS } from '../data/products'
import filterConfigManager from '../services/FilterConfigManager'
import { FILTERS } from '../filters'

export default function AdminProPanel() {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productConfig, setProductConfig] = useState(null)
  const [webglConfig, setWebglConfig] = useState({ filterType: 'wrinkles', intensity: 0.5, sigma: 4, brightness: 0, contrast: 1, warmthR: 0, warmthB: 0, warmthA: 0 })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (selectedProduct) {
      const conf = filterConfigManager.getProductConfig(selectedProduct.id)
      if (!conf) {
        const generated = filterConfigManager.generateProductConfig(selectedProduct)
        filterConfigManager.saveProductConfig(selectedProduct.id, generated)
        setProductConfig(generated)
      } else {
        setProductConfig(conf)
      }
      const wcfg = (conf && conf.webglConfig) || {}
      const lockedType = selectedProduct.filterType || 'wrinkles'
      const base = (FILTERS[lockedType] && FILTERS[lockedType].defaults) || { intensity: 0.5, sigma: 4, brightness: 0 }
      const deep = (FILTERS[lockedType] && FILTERS[lockedType].deep) || {}
      const di = (selectedProduct.defaultIntensity !== undefined) ? selectedProduct.defaultIntensity : base.intensity
      const ds = (selectedProduct.defaultSigma !== undefined) ? selectedProduct.defaultSigma : base.sigma
      const db = (selectedProduct.defaultBrightness !== undefined) ? selectedProduct.defaultBrightness : base.brightness
      const dc = typeof deep.contrast?.value === 'number' ? deep.contrast.value : 1
      const dwr = typeof deep.warmth?.rPlus === 'number' ? deep.warmth.rPlus : 0
      const dwb = typeof deep.warmth?.bMinus === 'number' ? deep.warmth.bMinus : 0
      const dwa = typeof deep.warmth?.alpha === 'number' ? deep.warmth.alpha : 0
      setWebglConfig({ filterType: lockedType, intensity: di, sigma: ds, brightness: db, contrast: dc, warmthR: dwr, warmthB: dwb, warmthA: dwa, ...wcfg })
    }
  }, [selectedProduct])

  function setField(field, value) {
    setWebglConfig(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    if (!selectedProduct || !productConfig) return
    setSaving(true)
    const updated = { ...productConfig, webglConfig: webglConfig, lastModified: new Date().toISOString() }
    const ok = filterConfigManager.saveProductConfig(selectedProduct.id, updated)
    setSaving(false)
    setNotice(ok ? 'Configuración guardada' : 'Error guardando configuración')
    setTimeout(() => setNotice(null), 2000)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración de Filtros</h1>
          <div className="flex items-center gap-2">
            <button onClick={save} className="px-4 py-2 bg-md-green text-white rounded disabled:opacity-50" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
        {notice && (<div className="mb-4 px-4 py-2 bg-gray-900 text-white rounded">{notice}</div>)}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-xl shadow border p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos</h2>
            <div className="grid grid-cols-1 gap-2">
              {MARTIDERM_PRODUCTS.map(p => (
                <button key={p.id} onClick={() => setSelectedProduct(p)} className={`p-3 rounded border text-left ${selectedProduct?.id===p.id?'border-md-green bg-gray-50':'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-contain rounded" onError={(e)=>{ e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%22 stop-color=%22%230C7A59%22/><stop offset=%231%22 stop-color=%22%231f2937%22/></linearGradient></defs><rect width=%22300%22 height=%22300%22 fill=%22url(%23g)%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2236%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>MD</text></svg>'; }} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.category}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="lg:col-span-1 bg-white rounded-xl shadow border p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración del producto</h2>
            <div className="space-y-4">
              {productConfig && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input type="text" value={productConfig.productName || ''} onChange={(e)=>{ setProductConfig(prev=>({ ...prev, productName: e.target.value })); }} className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Para qué sirve</label>
                    <textarea value={productConfig.description || selectedProduct?.description || ''} onChange={(e)=>{ setProductConfig(prev=>({ ...prev, description: e.target.value })); }} className="w-full px-3 py-2 border rounded h-24" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del producto (local)</label>
                    <input type="file" accept="image/*" onChange={(e)=>{ const f = e.target.files && e.target.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = ()=>{ setProductConfig(prev=>({ ...prev, imageOverrideDataURL: reader.result })); }; reader.readAsDataURL(f); }} />
                    <p className="text-xs text-gray-500">Usa una imagen para previsualizar. Por defecto se usa la imagen local del directorio.</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de filtro</label>
                <div className="px-3 py-2 rounded border bg-gray-100 text-gray-900">
                  {FILTERS[webglConfig.filterType]?.label || webglConfig.filterType}
                </div>
                <p className="text-xs text-gray-500 mt-1">Bloqueado por el producto. Edita solo sus parámetros.</p>
              </div>
              <div>
                <label className="block text-sm">Intensidad: {Number(webglConfig.intensity).toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.01} value={webglConfig.intensity} onChange={e=>setField('intensity', parseFloat(e.target.value))} className="w-full"/>
              </div>
              <div>
                <label className="block text-sm">Suavizado (sigma): {webglConfig.sigma}</label>
                <input type="range" min={0} max={10} step={1} value={webglConfig.sigma} onChange={e=>setField('sigma', parseInt(e.target.value))} className="w-full"/>
              </div>
              <div>
                <label className="block text-sm">Luminosidad: {Number(webglConfig.brightness).toFixed(2)}</label>
                <input type="range" min={-0.3} max={0.3} step={0.01} value={webglConfig.brightness} onChange={e=>setField('brightness', parseFloat(e.target.value))} className="w-full"/>
              </div>
              <div>
                <label className="block text-sm">Contraste: {Number(webglConfig.contrast).toFixed(2)}</label>
                <input type="range" min={0.8} max={1.3} step={0.01} value={webglConfig.contrast} onChange={e=>setField('contrast', parseFloat(e.target.value))} className="w-full"/>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm">Calidez R+: {webglConfig.warmthR}</label>
                  <input type="range" min={0} max={20} step={1} value={webglConfig.warmthR} onChange={e=>setField('warmthR', parseInt(e.target.value))} className="w-full"/>
                </div>
                <div>
                  <label className="block text-sm">Calidez B-: {webglConfig.warmthB}</label>
                  <input type="range" min={0} max={20} step={1} value={webglConfig.warmthB} onChange={e=>setField('warmthB', parseInt(e.target.value))} className="w-full"/>
                </div>
                <div>
                  <label className="block text-sm">Mezcla Calidez: {Number(webglConfig.warmthA).toFixed(2)}</label>
                  <input type="range" min={0} max={1} step={0.01} value={webglConfig.warmthA} onChange={e=>setField('warmthA', parseFloat(e.target.value))} className="w-full"/>
                </div>
              </div>
              <p className="text-xs text-gray-500">Los cambios se aplican en tiempo real al visor de la derecha. Cada foto tomada aplicará automáticamente estos parámetros.</p>
              <div className="pt-2">
                <button onClick={save} className="w-full px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50" disabled={saving}>{saving ? 'Guardando...' : 'Guardar configuración'}</button>
              </div>
            </div>
          </section>
          <section className="lg:col-span-2">
            {selectedProduct && (
              <div className="rounded-xl overflow-hidden bg-white border shadow">
                <div className="p-3 text-sm text-gray-600 flex items-center justify-between">
                  <span>Preview de {(productConfig?.productName) || selectedProduct.name}</span>
                  <span>Antes/Después (split)</span>
                </div>
                <div className="p-2">
                  <WebImageFilter config={webglConfig} hideControls={true} minimal={true} />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
