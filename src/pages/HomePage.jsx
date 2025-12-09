import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Microscope, Star, Users, Award, ChevronRight } from 'lucide-react';
import { MARTIDERM_PRODUCTS } from '../data/products';

const HomePage = () => {
  const [featuredProducts] = useState(MARTIDERM_PRODUCTS.slice(0, 3));

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Descubre el
                  <span className="text-amber-400 block">Futuro de tu Piel</span>
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Simula los efectos de los productos Martiderm en tu piel con tecnología de IA avanzada. 
                  Resultados basados en estudios clínicos reales.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-8 py-4 bg-amber-500 text-blue-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors group"
                >
                  Probar Productos
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-900 transition-colors"
                >
                  Ver Catálogo
                </Link>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-blue-600">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">95%</div>
                  <div className="text-sm text-blue-200">Precisión</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">50+</div>
                  <div className="text-sm text-blue-200">Productos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">10K+</div>
                  <div className="text-sm text-blue-200">Simulaciones</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8">
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <Microscope className="w-24 h-24 text-blue-700" />
                </div>
                <div className="mt-6 space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Simulación en Tiempo Real
                  </h3>
                  <p className="text-gray-600">
                    Sube tu foto y ve los resultados instantáneamente con nuestra IA especializada en dermatología.
                  </p>
                </div>
              </div>
              {/* Elementos decorativos */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-400 rounded-full opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-300 rounded-full opacity-30"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Características principales */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir Martiderm Simulator?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tecnología de vanguardia respaldada por décadas de investigación dermatológica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                <Microscope className="w-8 h-8 text-blue-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Tecnología Avanzada
              </h3>
              <p className="text-gray-600 leading-relaxed">
                IA entrenada con miles de casos clínicos para simular efectos cosméticos con precisión científica.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-amber-200 transition-colors">
                <Award className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Estudios Clínicos
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Resultados basados en estudios clínicos reales con datos de eficacia comprobada.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
                <Users className="w-8 h-8 text-green-700" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Para Profesionales
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Herramientas especializadas para dermatólogos y profesionales de la estética.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Productos Destacados
              </h2>
              <p className="text-xl text-gray-600">
                Descubre nuestros productos más populares
              </p>
            </div>
            <Link
              to="/"
              className="hidden sm:flex items-center text-blue-700 hover:text-blue-800 font-medium"
            >
              Ver todos
              <ChevronRight className="ml-1 w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="bg-gradient-to-br from-blue-50 to-amber-50 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-700 font-medium">
                      {product.category}
                    </span>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-amber-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">4.8</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">
                      €{product.price}
                    </span>
                    <Link
                      to={`/product-view/${product.id}`}
                      className="text-blue-700 hover:text-blue-800 font-medium text-sm"
                    >
                      Simular →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Link
              to="/"
              className="inline-flex items-center text-blue-700 hover:text-blue-800 font-medium"
            >
              Ver todos los productos
              <ChevronRight className="ml-1 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-blue-700 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            ¿Listo para transformar tu rutina de cuidado?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Únete a miles de usuarios que ya han descubierto el poder de la simulación cosmética
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-8 py-4 bg-amber-500 text-blue-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors text-lg group"
          >
            Comenzar Ahora
            <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
