import { useNavigate } from 'react-router-dom';
import { MARTIDERM_PRODUCTS } from '../data/products';
import filterConfigManager from '../services/FilterConfigManager';
import { Sparkles, SunMoon, Calendar, Droplet, FlaskConical } from 'lucide-react';
 

const CatalogPage = () => {
  const navigate = useNavigate();

  // Filtrar productos
  const filteredProducts = MARTIDERM_PRODUCTS;

  const handleProductSelect = (product) => {
    navigate(`/product-view/${product.id}`);
  };

  

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Catálogo</h1>
          <p className="text-base text-gray-600">Explora la gama de productos</p>
        </div>

        

        {/* Resultados */}
        <div className="mb-6">
          <p className="text-gray-600">Mostrando {filteredProducts.length} productos</p>
        </div>

        {/* Grid de productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-sm transition"
              onClick={() => navigate(`/product-view/${product.id}`)}
            >
              <div className="relative group bg-gray-100 overflow-hidden">
                <img 
                  src={(filterConfigManager.getProductConfig(product.id)?.imageOverrideDataURL) || product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-auto object-contain" 
                  onError={(e)=>{ e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22300%22><defs><linearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22><stop offset=%220%22 stop-color=%22%230C7A59%22/><stop offset=%221%22 stop-color=%22%231f2937%22/></linearGradient></defs><rect width=%22600%22 height=%22300%22 fill=%22url(%23g)%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2236%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22>MD</text></svg>'; }}
                />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center" style={{ backgroundColor: 'rgba(188,215,207,0.88)' }}>
                  <div className="grid grid-cols-3 gap-6 px-6 place-items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow">
                        <Sparkles className="w-6 h-6 text-md-green" />
                      </div>
                      <div className="mt-2 text-[11px] text-white font-semibold uppercase tracking-wide">MANCHAS</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow">
                        <FlaskConical className="w-7 h-7 text-md-green" />
                      </div>
                      <div className="mt-2 text-[11px] text-white font-semibold uppercase tracking-wide">SÉRUMS</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow">
                        <SunMoon className="w-6 h-6 text-md-green" />
                      </div>
                      <div className="mt-2 text-[11px] text-white font-semibold uppercase tracking-wide">DÍA/NOCHE</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow">
                        <Calendar className="w-6 h-6 text-md-green" />
                      </div>
                      <div className="mt-2 text-[11px] text-white font-semibold uppercase tracking-wide">DIARIO</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow">
                        <Droplet className="w-6 h-6 text-md-green" />
                      </div>
                      <div className="mt-2 text-[11px] text-white font-semibold uppercase tracking-wide">PIEL MIXTA</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>{product.line || (product.subcategory ? product.subcategory : '')}</span>
                  <span>{product.size || product.format || ''}</span>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {product.name}
                </h3>
                <p className="text-gray-800 text-base mb-5 line-clamp-3">
                  {product.description}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductSelect(product);
                  }}
                  className="w-full border border-gray-900 text-gray-900 px-4 py-3 text-sm font-semibold uppercase tracking-wide"
                >
                  VER PRODUCTO
                </button>
              </div>
            </div>
          ))}
        </div>

        
      </div>

      
    </div>
  );
};

export default CatalogPage;
