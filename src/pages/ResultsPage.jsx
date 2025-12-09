import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, BarChart3, Calendar, Clock, Target } from 'lucide-react';
import { useSimulator } from '../hooks/useStore';
import { MARTIDERM_PRODUCTS } from '../data/products';
import { useEffect, useState } from 'react';

const ResultsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { simulationResults, getExpectedMetrics, getRecommendedProducts } = useSimulator();
  const [simulationData, setSimulationData] = useState(null);
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);

  useEffect(() => {
    // Buscar la simulación por ID
    const simulation = simulationResults.find(result => result.id === id);
    
    if (!simulation) {
      // Si no se encuentra la simulación, redirigir al inicio
      navigate('/');
      return;
    }

    setSimulationData(simulation);

    // Cargar imágenes si están disponibles
    if (simulation.beforeImage) {
      setBeforeImage(simulation.beforeImage);
    }
    if (simulation.afterImage) {
      setAfterImage(simulation.afterImage);
    }
  }, [id, simulationResults, navigate]);

  if (!simulationData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  const product = MARTIDERM_PRODUCTS.find(p => p.id === simulationData.productId);
  const expectedMetrics = getExpectedMetrics(product, simulationData.intensity || 0.5);
  const recommendedProducts = getRecommendedProducts(simulationData.faceAnalysis);

  const handleDownload = () => {
    if (afterImage) {
      const link = document.createElement('a');
      link.download = `martiderm-simulation-${id}.png`;
      link.href = afterImage;
      link.click();
    }
  };

  const handleShare = async () => {
    if (navigator.share && afterImage) {
      try {
        await navigator.share({
          title: 'Simulación Martiderm',
          text: `Mira los resultados de mi simulación con ${product?.name}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copiar URL al portapapeles
      navigator.clipboard.writeText(window.location.href);
      alert('URL copiada al portapapeles');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-md-green hover:text-md-green-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Resultados de Simulación
          </h1>
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(simulationData.timestamp)}
            </div>
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Intensidad: {Math.round((simulationData.intensity || 0.5) * 100)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resultados principales */}
          <div className="lg:col-span-2 space-y-8">
            {/* Comparación de imágenes */}
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Comparación Visual
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Antes</h3>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {beforeImage ? (
                      <img 
                        src={beforeImage} 
                        alt="Imagen antes del tratamiento"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-500">Imagen original no disponible</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Después</h3>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {afterImage ? (
                      <img 
                        src={afterImage} 
                        alt="Imagen después del tratamiento simulado"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-500">Imagen simulada no disponible</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Métricas de mejora basadas en datos clínicos */}
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Métricas de Mejora Esperadas
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Basado en estudios clínicos de {product?.name} con {product?.clinicalStudy?.sampleSize} participantes
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {product?.targetConcerns.includes('arrugas') && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-md-green mb-2">
                      {Math.round((expectedMetrics.wrinkleReduction || 0) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Reducción de arrugas</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Estudio clínico: {product?.clinicalStudy?.results?.wrinkleDepthReduction}%
                    </div>
                  </div>
                )}
                
                {product?.targetConcerns.includes('hidratacion') && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-md-green mb-2">
                      {Math.round((expectedMetrics.hydrationIncrease || 0) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Mejora en hidratación</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Estudio clínico: {product?.clinicalStudy?.results?.hydrationIncrease}%
                    </div>
                  </div>
                )}
                
                {product?.targetConcerns.includes('luminosidad') && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-md-green mb-2">
                      {Math.round((expectedMetrics.brightnessIncrease || 0) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Aumento de luminosidad</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Datos clínicos disponibles
                    </div>
                  </div>
                )}

                {product?.targetConcerns.includes('firmeza') && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-md-green mb-2">
                      {Math.round((expectedMetrics.firmnessImprovement || 0) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Mejora en firmeza</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Estudio clínico: {product?.clinicalStudy?.results?.skinFirmnessIncrease}%
                    </div>
                  </div>
                )}
              </div>
              
              {/* Información del estudio clínico */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información del Estudio Clínico</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Participantes:</span> {product?.clinicalStudy?.sampleSize}
                  </div>
                  <div>
                    <span className="font-medium">Duración:</span> {product?.clinicalStudy?.durationWeeks} semanas
                  </div>
                  <div>
                    <span className="font-medium">Satisfacción:</span> {product?.clinicalStudy?.results?.userSatisfaction}%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {product?.clinicalStudy?.methodology}
                </p>
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            {/* Acciones */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Acciones
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center px-4 py-2 bg-md-green text-white rounded-lg transition-colors"
                  disabled={!afterImage}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Resultados
                </button>
                <button 
                  onClick={handleShare}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </button>
                <Link
                  to={product?.id ? `/product-view/${product.id}` : '/'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Nueva Simulación
                </Link>
              </div>
            </div>

            {/* Información del producto */}
            {product && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Producto Utilizado
                </h3>
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={(filterConfigManager.getProductConfig(product.id)?.imageOverrideDataURL) || product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.description}
                    </p>
                    <div className="mt-2">
                      <span className="text-lg font-bold text-blue-700">€{product.price}</span>
                    </div>
                  </div>
                  <Link
                    to="/"
                    className="block w-full text-center px-4 py-2 btn-outline rounded-lg"
                  >
                    Ver en Catálogo
                  </Link>
                </div>
              </div>
            )}

            {/* Recomendaciones */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Productos Recomendados
              </h3>
              <div className="space-y-3">
                {recommendedProducts.slice(0, 2).map((recommendedProduct) => (
                  <Link
                    key={recommendedProduct.id}
                    to={`/product-view/${recommendedProduct.id}`}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={(filterConfigManager.getProductConfig(recommendedProduct.id)?.imageOverrideDataURL) || recommendedProduct.imageUrl} 
                        alt={recommendedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-900">{recommendedProduct.name}</h5>
                      <p className="text-xs text-gray-600">€{recommendedProduct.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
