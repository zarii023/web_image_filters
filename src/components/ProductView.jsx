import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Sun, Moon, Droplet, Calendar } from 'lucide-react';
import { getProductById, MARTIDERM_PRODUCTS } from '../data/products';
import filterConfigManager from '../services/FilterConfigManager';
import { useStore } from '../hooks/useStore';
 
import BeforeAfterComparison from './BeforeAfterComparison';
import InlineCameraCapture from './InlineCameraCapture';
import WebImageFilter from './WebImageFilter';
import { FILTERS } from '../filters';
import buildWebglConfigForProduct from '../lib/webglConfigBuilder';
 

const ProductView = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { getProductFilters } = useStore();
  
  // Obtener producto por ID
  const product = getProductById(decodeURIComponent(productId)) || getProductById(productId) || MARTIDERM_PRODUCTS[0];
  
  // Estados del componente
  const [currentStep, setCurrentStep] = useState('info');
  
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inlineCamRef = useRef(null);
  const [qty, setQty] = useState(1);
  const [showActives, setShowActives] = useState(false);
  const [showIngredients, setShowIngredients] = useState(true);
  const [showHowTo, setShowHowTo] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  
  const addLog = (msg, data = null) => {
    try {
      setLogs((prev) => [...prev, { ts: new Date().toISOString(), msg, data }]);
    } catch (e) {}
  };

  // Obtener filtros configurados en AdminPanel para este producto
  const adminFilters = useMemo(() => getProductFilters(product.id), [product.id]);
  
  // Mapeo de etiquetas amigables para filtros del admin
  const adminFilterLabels = {
    smooth: 'Suavizado de piel',
    brightness: 'Brillo',
    contrast: 'Contraste',
    warmth: 'Tono cálido',
    toneUnify: 'Uniformidad de tono',
    blemish: 'Imperfecciones',
    contourLift: 'Lifting/Contorno'
  };
  
  const getAdminFilterDisplay = (cfg) => {
    if (!cfg || typeof cfg !== 'object') return '';
    const enabled = cfg.enabled === false ? 'Off' : 'On';
    let val = '';
    if (typeof cfg.opacity === 'number') val = `${Math.round(cfg.opacity * 100)}%`;
    else if (typeof cfg.alpha === 'number') val = `${Math.round(cfg.alpha * 100)}%`;
    else if (typeof cfg.value === 'number') val = `${cfg.value}`;
    else if (typeof cfg.radius === 'number') val = `${cfg.radius}`;
    return val ? `${enabled} · ${val}` : enabled;
  };
  
  // Combinar filtros por defecto del producto con los configurados en admin
  const effectiveFilters = adminFilters || {};

  useEffect(() => {}, []);

  useEffect(() => {
    addLog('Producto cargado', { id: product.id, name: product.name });
  }, [product.id]);

  

  // Función para aplicar filtros CSS a la imagen
  const applyFilters = (imageElement) => {
    if (!imageElement || !effectiveFilters) return;

    const filters = [];
    
    // Mapear filtros a CSS
    if (effectiveFilters.brightness) {
      filters.push(`brightness(${1 + effectiveFilters.brightness})`);
    }
    if (effectiveFilters.contrast) {
      filters.push(`contrast(${1 + effectiveFilters.contrast})`);
    }
    if (effectiveFilters.saturation) {
      filters.push(`saturate(${1 + effectiveFilters.saturation})`);
    }
    if (effectiveFilters.smoothing) {
      filters.push(`blur(${effectiveFilters.smoothing * 0.5}px)`);
    }
    if (effectiveFilters.warmth) {
      filters.push(`sepia(${effectiveFilters.warmth * 0.3})`);
    }

    return filters.join(' ');
  };

  // Manejar captura de imagen desde SimpleCam
  const handleImageCapture = (captureData) => {
    // SimpleCam ya devuelve tanto la imagen original como la procesada
    setCapturedImage(captureData.original);
    setProcessedImage(captureData.processed);
    setIsProcessing(false);
    setCurrentStep('results');
  };

  // Reiniciar proceso
  const handleReset = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setCurrentStep('camera');
  };

  // Descargar resultado
  const handleDownload = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = `${product.name}-resultado.jpg`;
      link.click();
    }
  };

  const processWithFilters = async (dataUrl) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const done = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.src = dataUrl;
      await done;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      const filters = [];
      const val = (cfg, fallback = 0) => {
        if (cfg == null) return fallback;
        if (typeof cfg === 'number') return cfg;
        if (typeof cfg === 'object') {
          if (typeof cfg.value === 'number') return cfg.value;
          if (typeof cfg.opacity === 'number') return cfg.opacity;
          if (typeof cfg.alpha === 'number') return cfg.alpha;
          if (typeof cfg.radius === 'number') return cfg.radius;
          if (cfg.enabled === false) return 0;
        }
        return fallback;
      };
      const b = val(effectiveFilters?.brightness);
      if (b) filters.push(`brightness(${1 + b * 0.25})`);
      const c = val(effectiveFilters?.contrast);
      if (c) filters.push(`contrast(${1 + c * 0.25})`);
      const s = val(effectiveFilters?.saturation);
      if (s) filters.push(`saturate(${1 + s * 0.3})`);
      const smooth = val(effectiveFilters?.smooth, val(effectiveFilters?.smoothing));
      if (smooth) filters.push(`blur(${Math.max(0, smooth) * 1.5}px)`);
      const warm = val(effectiveFilters?.warmth);
      if (warm) filters.push(`sepia(${Math.min(1, warm * 0.5)})`);
      ctx.filter = filters.join(' ');
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      console.warn('Procesado falló, uso original', e);
      return dataUrl;
    }
  };

  const buildCssFilterStringFromAdmin = (filtersObj) => {
    const parts = [];
    const f = filtersObj || {};
    if (f.brightness && typeof f.brightness === 'object' && f.brightness.enabled !== false) {
      const val = Number(f.brightness.value);
      parts.push(`brightness(${isFinite(val) ? 1 + val / 100 : 1})`);
    }
    if (f.contrast && typeof f.contrast === 'object' && f.contrast.enabled !== false) {
      const val = Number(f.contrast.value);
      parts.push(`contrast(${isFinite(val) ? val : 1})`);
    }
    if (f.warmth && typeof f.warmth === 'object' && f.warmth.enabled !== false) {
      const alpha = Number(f.warmth.alpha);
      parts.push(`sepia(${isFinite(alpha) ? alpha : 0.25})`);
    }
    if (f.smooth && typeof f.smooth === 'object' && f.smooth.enabled !== false) {
      const radius = Number(f.smooth.radius);
      const opacity = Number(f.smooth.opacity);
      const px = (isFinite(radius) ? radius : 0) * (isFinite(opacity) ? opacity : 1);
      if (px > 0) parts.push(`blur(${px}px)`);
    }
    return parts.join(' ');
  };

  const processWithAdminCssFilters = async (dataUrl) => {
    try {
      const img = new Image(); img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      const css = buildCssFilterStringFromAdmin(adminFilters);
      try { addLog('Aplicando CSS filters', { css }); } catch(_){ }
      ctx.filter = css || 'none';
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      return dataUrl;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        setCurrentStep('results');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoCapture = async (imageData) => {
    setCapturedImage(imageData);
    setIsProcessing(true);
    try {
      addLog('Foto capturada', { size: (imageData || '').length });
      addLog('Usando WebGL con config', { webglConfig });
      setProcessedImage(null);
    } catch (e) {
      setProcessedImage(imageData);
    }
    setIsProcessing(false);
    setCurrentStep('results');
  };

  const buildWebglConfig = () => buildWebglConfigForProduct(product);

  const [webglConfig, setWebglConfig] = useState(buildWebglConfig());
  useEffect(() => {
    try {
      const cfg = buildWebglConfig();
      setWebglConfig(cfg);
      try { addLog('webglConfig actualizado', cfg); } catch(_) {}
    } catch (_) {}
  }, [product.id]);

  useEffect(() => {
    const onStorage = (e) => {
      try {
        if (e && e.key === 'martiderm_filter_configs') {
          const cfg = buildWebglConfig();
          setWebglConfig(cfg);
          try { addLog('webglConfig actualizado (storage)', cfg); } catch(_) {}
        }
      } catch(_) {}
    };
    const onPreview = (e) => {
      try {
        const d = e && e.detail;
        if (d && d.productId === product.id && d.webglConfig) {
          setWebglConfig(d.webglConfig);
          try { addLog('webglConfig actualizado (preview)', d.webglConfig); } catch(_) {}
        }
      } catch(_) {}
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('md:webglConfigPreview', onPreview);
    return () => window.removeEventListener('storage', onStorage);
  }, [product.id]);

  const startCamera = () => { addLog('Abrir cámara', { productId: product.id }); setCurrentStep('camera'); };

  const stopCamera = () => {};

  const capturePhoto = async () => {
    const api = inlineCamRef.current;
    if (api && typeof api.capture === 'function') {
      addLog('Tomar foto', { productId: product.id });
      await api.capture();
    }
  };

  

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-700 hover:text-md-green transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver al inicio
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
            <div className="w-24"></div>
          </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{product.line || ''}</span>
                  <span>{product.size || ''}</span>
                </div>
                <h2 className="font-serif text-4xl lg:text-6xl text-gray-900 leading-tight">{product.name}</h2>
                <div className="text-md-green text-sm">☆☆☆☆☆ <span className="ml-1 text-gray-600">(0)</span></div>
                <p className="text-gray-700 text-base">{product.description}</p>
                
              </div>
              <div className="flex flex-col items-start w-full">
                <div className="w-full bg-gray-100 rounded-lg p-4 flex items-center justify-center h-[480px] relative">
                  {currentStep === 'camera' ? (
                    <InlineCameraCapture ref={inlineCamRef} onCapture={handleAutoCapture} />
                  ) : currentStep === 'results' ? (
                    <div className="relative w-full h-[480px] overflow-hidden">
                      <WebImageFilter
                        config={webglConfig}
                        hideControls
                        minimal
                        compact
                        mirrored
                        initialView={'split'}
                        previewImageURL={capturedImage}
                        onProcessed={(url)=> { setProcessedImage(url); addLog('WebGL procesado', { urlLength: (url||'').length, filterType: webglConfig.filterType }); }}
                        onConfigApplied={(cfg)=>{ addLog('Config aplicada al render', cfg); }}
                      />
                    </div>
                  ) : (
                    <img
                      src={(filterConfigManager.getProductConfig(product.id)?.imageOverrideDataURL) || product.imageUrl}
                      alt={product.name}
                      className="w-full h-full max-w-full max-h-full object-cover"
                      onError={(e)=>{ e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22600%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%22 stop-color=%22%230C7A59%22/><stop offset=%221%22 stop-color=%22%231f2937%22/></linearGradient></defs><rect width=%22600%22 height=%22600%22 fill=%22url(%23g)%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2250%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>MD</text></svg>'; }}
                    />
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                </div>
                {/* Controles bajo la imagen */}
                <div className="w-full mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 border border-gray-300 rounded flex items-center justify-center">
                      <Minus className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="w-10 h-10 border border-gray-300 rounded flex items-center justify-center text-gray-900">{qty}</div>
                    <button onClick={() => setQty(qty + 1)} className="w-10 h-10 border border-gray-300 rounded flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="flex-1 px-4 py-2 bg-gray-900 text-white rounded">Añadir a la bolsa</button>
                    <div className="text-gray-900 font-bold">€{product.price}</div>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button onClick={() => (currentStep === 'camera' ? capturePhoto() : startCamera())} className="flex-1 px-4 py-3 btn-outline border border-gray-900 text-gray-900 rounded hover:bg-gray-50">
                      {currentStep === 'camera' ? 'Tomar foto' : 'Usar cámara'}
                    </button>
                    {currentStep !== 'camera' && (
                      <>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="upload-photo" />
                        <label htmlFor="upload-photo" className="flex-1 px-4 py-3 btn-outline border border-gray-900 text-gray-900 rounded hover:bg-gray-50 text-center cursor-pointer flex items-center justify-center">
                          Subir foto
                        </label>
                      </>
                    )}
                    {currentStep === 'camera' && (
                      <button onClick={() => setCurrentStep('info')} className="flex-1 px-4 py-3 btn-outline border border-gray-900 text-gray-900 rounded hover:bg-gray-50">
                        Cancelar
                      </button>
                    )}
                  </div>
                  
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-gray-900 font-semibold mb-3">Información básica</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-md-green" />
                      </div>
                      <div className="mt-2 text-xs text-gray-700">Diario</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center">
                        <Sun className="w-5 h-5 text-md-green" />
                      </div>
                      <div className="mt-2 text-xs text-gray-700">Día/Noche</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center">
                        <Droplet className="w-5 h-5 text-md-green" />
                      </div>
                      <div className="mt-2 text-xs text-gray-700">Piel mixta/grasa</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center">
                        <Moon className="w-5 h-5 text-md-green" />
                      </div>
                      <div className="mt-2 text-xs text-gray-700">{product.size || ''}</div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <button onClick={() => setShowActives(!showActives)} className="w-full flex items-center justify-between text-left">
                    <span className="text-gray-900 font-semibold">Activos</span>
                    <span className="text-gray-700">{showActives ? '-' : '+'}</span>
                  </button>
                  {showActives && (
                    <div className="mt-3 text-sm text-gray-700">{product.targetConcerns.join(', ')}</div>
                  )}
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <button onClick={() => setShowIngredients(!showIngredients)} className="w-full flex items-center justify-between text-left">
                    <span className="text-gray-900 font-semibold">Ingredientes</span>
                    <span className="text-gray-700">{showIngredients ? '-' : '+'}</span>
                  </button>
                  {showIngredients && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.ingredients.map((ingredient, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{ingredient}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <button onClick={() => setShowHowTo(!showHowTo)} className="w-full flex items-center justify-between text-left">
                    <span className="text-gray-900 font-semibold">Modo de aplicación</span>
                    <span className="text-gray-700">{showHowTo ? '-' : '+'}</span>
                  </button>
                  {showHowTo && (
                    <div className="mt-3 text-sm text-gray-700">Aplicar una cantidad adecuada sobre la piel limpia según indicaciones.</div>
                  )}
                </div>
          </div>
        </div>
        
      </div>
    </div>
  </div>
  );
};

export default ProductView;
