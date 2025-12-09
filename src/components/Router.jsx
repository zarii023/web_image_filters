import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';

// Importar páginas
import CatalogPage from '../pages/CatalogPage';
import ProfilePage from '../pages/ProfilePage';
import ResultsPage from '../pages/ResultsPage';

// Importar componentes
import ProductView from './ProductView';

// Importar componentes de administración
import AdminProPanel from '../pages/AdminProPanel.jsx';

// Importar componentes de layout
import Layout from './Layout';
import LoadingSpinner from './LoadingSpinner';

const AppRouter = () => {
  const { loading, user, userType } = useStore();

  // Componente para rutas protegidas
  const ProtectedRoute = ({ children, requireAuth = false, requireProfessional = false }) => {
    if (requireAuth && !user) {
      return <Navigate to="/" replace />;
    }
    
    if (requireProfessional && userType !== 'professional' && userType !== 'admin') {
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Inicio: mostrar catálogo directamente */}
          <Route 
            path="/" 
            element={<CatalogPage />} 
          />
          

          
          {/* Rutas de catálogo por categoría y detalle (profundas) */}
          <Route 
            path="/catalog/:category" 
            element={<CatalogPage />} 
          />
          
          {/* Perfil - requiere autenticación */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute requireAuth={true}>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Resultados - accesible para todos */}
          <Route 
            path="/results/:id" 
            element={<ResultsPage />} 
          />
          
          {/* Ruta para detalles de producto dentro del catálogo */}
          <Route 
            path="/product/:id" 
            element={<CatalogPage />} 
          />
          
          {/* Vista de producto con cámara de belleza */}
          <Route 
            path="/product-view/:productId" 
            element={<ProductView />} 
          />
          
          {/* Panel de administración - editor de filtros */}
          <Route 
            path="/admin" 
            element={<AdminProPanel />} 
          />

          {/* Sin ruta de simulador: flujo se realiza en ProductView */}

          {/* Rutas profesionales - requieren cuenta profesional */}
          <Route 
            path="/professional/*" 
            element={
              <ProtectedRoute requireProfessional={true}>
                <Routes>
                  <Route path="dashboard" element={<div>Dashboard Profesional</div>} />
                  <Route path="clients" element={<div>Gestión de Clientes</div>} />
                  <Route path="analytics" element={<div>Analíticas Avanzadas</div>} />
                </Routes>
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta 404 - redirigir a home */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default AppRouter;
