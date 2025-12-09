import React, { useEffect, useState } from 'react'
import WebImageFilter from '../WebImageFilter'
import filterConfigManager from '../../services/FilterConfigManager'
import { FILTERS } from '../../filters'
import buildWebglConfigForProduct from '../../lib/webglConfigBuilder'

export default function AdminInlineDebug({ product, previewImageURL }) {
  const [productConfig, setProductConfig] = useState(null)
  const [webglConfig, setWebglConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!product) return
    const conf = filterConfigManager.getProductConfig(product.id)
    if (!conf) {
      const generated = filterConfigManager.generateProductConfig(product)
      filterConfigManager.saveProductConfig(product.id, generated)
      setProductConfig(generated)
    } else {
      setProductConfig(conf)
    }
    const initial = buildWebglConfigForProduct(product)
    setWebglConfig(initial)
    try { window.dispatchEvent(new CustomEvent('md:webglConfigPreview', { detail: { productId: product.id, webglConfig: initial } })) } catch(_){ }
  }, [product?.id])

  function setField(field, value) {
    setWebglConfig(prev => {
      const next = { ...prev, [field]: value }
      try { window.dispatchEvent(new CustomEvent('md:webglConfigPreview', { detail: { productId: product.id, webglConfig: next } })) } catch(_){ }
      return next
    })
  }

  async function save() {
    if (!product || !productConfig || !webglConfig) return
    setSaving(true)
    const updated = { ...productConfig, webglConfig, lastModified: new Date().toISOString() }
    const ok = filterConfigManager.saveProductConfig(product.id, updated)
    setSaving(false)
    setNotice(ok ? 'Configuración guardada' : 'Error guardando configuración')
    setTimeout(() => setNotice(null), 1500)
  }

  if (!product) return null

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Debug Admin (réplica)</h3>
        <button onClick={save} className="px-3 py-2 bg-md-green text-white rounded disabled:opacity-50" disabled={saving || !webglConfig}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
      {notice && (<div className="mb-3 px-3 py-2 bg-gray-900 text-white rounded">{notice}</div>)}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-1 bg-white rounded-xl shadow border p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm">Tipo de filtro</label>
              <div className="px-3 py-2 rounded border bg-gray-100 text-gray-900">{FILTERS[webglConfig?.filterType]?.label || webglConfig?.filterType || product.filterType}</div>
              <p className="text-xs text-gray-500 mt-1">Bloqueado por el producto.</p>
            </div>
            <div>
              <label className="block text-sm">Intensidad: {Number(webglConfig?.intensity || 0).toFixed(2)}</label>
              <input type="range" min={0} max={1} step={0.01} value={webglConfig?.intensity || 0} onChange={e=>setField('intensity', parseFloat(e.target.value))} className="w-full"/>
            </div>
            <div>
              <label className="block text-sm">Suavizado (sigma): {webglConfig?.sigma || 0}</label>
              <input type="range" min={0} max={10} step={1} value={webglConfig?.sigma || 0} onChange={e=>setField('sigma', parseInt(e.target.value))} className="w-full"/>
            </div>
            <div>
              <label className="block text-sm">Luminosidad: {Number(webglConfig?.brightness || 0).toFixed(2)}</label>
              <input type="range" min={-0.3} max={0.3} step={0.01} value={webglConfig?.brightness || 0} onChange={e=>setField('brightness', parseFloat(e.target.value))} className="w-full"/>
            </div>
            <div>
              <label className="block text-sm">Contraste: {Number(webglConfig?.contrast || 1).toFixed(2)}</label>
              <input type="range" min={0.8} max={1.3} step={0.01} value={webglConfig?.contrast || 1} onChange={e=>setField('contrast', parseFloat(e.target.value))} className="w-full"/>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm">Calidez R+: {webglConfig?.warmthR || 0}</label>
                <input type="range" min={0} max={20} step={1} value={webglConfig?.warmthR || 0} onChange={e=>setField('warmthR', parseInt(e.target.value))} className="w-full"/>
              </div>
              <div>
                <label className="block text-sm">Calidez B-: {webglConfig?.warmthB || 0}</label>
                <input type="range" min={0} max={20} step={1} value={webglConfig?.warmthB || 0} onChange={e=>setField('warmthB', parseInt(e.target.value))} className="w-full"/>
              </div>
              <div>
                <label className="block text-sm">Mezcla Calidez: {Number(webglConfig?.warmthA || 0).toFixed(2)}</label>
                <input type="range" min={0} max={1} step={0.01} value={webglConfig?.warmthA || 0} onChange={e=>setField('warmthA', parseFloat(e.target.value))} className="w-full"/>
              </div>
            </div>
          </div>
        </section>
        <section className="lg:col-span-2">
          <div className="rounded-xl overflow-hidden bg-white border shadow">
            <div className="p-2 text-sm text-gray-600 flex items-center justify-between">
              <span>Preview de {product.name}</span>
              <span>Antes/Después (split)</span>
            </div>
            <div className="p-2">
              {webglConfig && (
                <WebImageFilter config={webglConfig} hideControls={true} minimal={true} initialView={'split'} previewImageURL={previewImageURL || null} />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
