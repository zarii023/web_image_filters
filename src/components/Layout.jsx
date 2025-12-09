import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Home } from 'lucide-react';
import { useStore } from '../hooks/useStore';

const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, userType } = useStore();

  const navigation = [
    { name: 'Inicio', href: '/', icon: Home },
  ];

  // Agregar navegación profesional si el usuario es profesional
  if (userType === 'professional' || userType === 'admin') {
    navigation.push(
      { name: 'Dashboard', href: '/professional/dashboard', icon: User }
    );
  }

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-md-green rounded-sm"></div>
                <span className="text-xl font-bold text-gray-900">Martiderm</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-colors ${
                      isActivePath(item.href)
                        ? 'text-md-green'
                        : 'text-gray-700 hover:text-md-green'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 text-gray-700 hover:text-md-green"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm">{user.name || 'Perfil'}</span>
                  </Link>
                  {userType === 'professional' && (
                    <span className="px-2 py-1 text-xs text-gray-600">Profesional</span>
                  )}
                </div>
              ) : (
                <Link
                  to="/admin"
                  className="btn-outline px-4 py-2 rounded-md text-sm font-medium"
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                      isActivePath(item.href)
                        ? 'text-md-green'
                        : 'text-gray-700 hover:text-md-green'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile User Menu */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {user ? (
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-md-green"
                  >
                    <User className="w-5 h-5" />
                    <span>{user.name || 'Perfil'}</span>
                  </Link>
                ) : (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full block px-3 py-2 text-md-green font-medium"
                  >
                    Admin
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white text-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo y descripción */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-md-green rounded-sm"></div>
                <span className="text-xl font-bold text-gray-900">Martiderm</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Tecnología de simulación cosmética basada en estudios clínicos.
              </p>
            </div>

            {/* Enlaces rápidos */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-gray-900">Navegación</h3>
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="text-gray-600 hover:text-md-green text-sm transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Información legal */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-gray-900">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-md-green text-sm transition-colors">
                    Términos de Uso
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-md-green text-sm transition-colors">
                    Política de Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-md-green text-sm transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">© 2024 Martiderm</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
