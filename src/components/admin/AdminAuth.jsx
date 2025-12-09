import { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Shield, LogOut } from 'lucide-react';
import filterConfigManager from '../../services/FilterConfigManager';

/**
 * AdminAuth - Sistema de autenticación seguro para administradores
 * 
 * Funcionalidades:
 * - Login/logout seguro
 * - Gestión de sesiones con tokens
 * - Interfaz moderna y responsive
 * - Validación de credenciales
 * - Manejo de estados de autenticación
 */

const AdminAuth = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const authenticated = filterConfigManager.isAuthenticated();
    const userData = filterConfigManager.getAuthenticatedUser();
    
    setIsAuthenticated(authenticated);
    setUser(userData);
    
    if (onAuthChange) {
      onAuthChange(authenticated, userData);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = filterConfigManager.authenticateAdmin(
        loginForm.username,
        loginForm.password
      );

      if (result.success) {
        setIsAuthenticated(true);
        setUser({ username: result.username });
        setShowLogin(false);
        setLoginForm({ username: '', password: '' });
        
        if (onAuthChange) {
          onAuthChange(true, { username: result.username });
        }
      } else {
        setError(result.error || 'Error de autenticación');
      }
    } catch (error) {
      setError('Error interno del sistema');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    filterConfigManager.logout();
    setIsAuthenticated(false);
    setUser(null);
    setShowLogin(false);
    
    if (onAuthChange) {
      onAuthChange(false, null);
    }
  };

  const handleInputChange = (field, value) => {
    setLoginForm(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  // Si está autenticado, mostrar información del usuario
  if (isAuthenticated && user) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Administrador: {user.username}
              </p>
              <p className="text-xs text-gray-500">
                Sesión activa
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar botón de login o formulario
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {!showLogin ? (
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Acceso Administrativo
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Inicia sesión para acceder al panel de configuración de filtros
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Iniciar Sesión
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Iniciar Sesión
            </h3>
            <button
              onClick={() => {
                setShowLogin(false);
                setError('');
                setLoginForm({ username: '', password: '' });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de usuario"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowLogin(false);
                  setError('');
                  setLoginForm({ username: '', password: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !loginForm.username || !loginForm.password}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? 'Verificando...' : 'Ingresar'}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">
              <strong>Credenciales de prueba:</strong>
            </p>
            <p className="text-xs text-gray-500">
              Usuario: <code className="bg-white px-1 rounded">admin</code> | 
              Contraseña: <code className="bg-white px-1 rounded">martiderm2024</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuth;