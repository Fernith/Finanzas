import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X, Sun, Moon, Settings, Wallet, TrendingDown, TrendingUp, LineChart, Target, Repeat } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';

export default function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { temaActual, alternarTemaTemporal } = useConfig();
  const isDarkMode = temaActual === 'oscuro';

  const toggleTheme = () => {
    alternarTemaTemporal();
  };

  const navLinks = [
    { path: '/', label: 'Finanzas', icon: Wallet, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { path: '/gastos', label: 'Gastos', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
    { path: '/ingresos', label: 'Ingresos', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { path: '/inversiones', label: 'Inversiones', icon: LineChart, color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    { path: '/ahorros', label: 'Ahorros', icon: Target, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    { path: '/suscripciones', label: 'Suscripciones', icon: Repeat, color: 'text-slate-800 dark:text-white', bg: 'bg-slate-200/50 dark:bg-neutral-800' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Contenedor principal con justify-between para separar Izquierda y Derecha */}
        <div className="flex justify-between items-center h-16 w-full">
          
          {/* IZQUIERDA: Botón Hamburguesa (Móvil) + Links de navegación (Escritorio) */}
          <div className="flex items-center">
            
            {/* Botón Menú Móvil (Solo visible en pantallas pequeñas, alineado a la izquierda) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 -ml-2 mr-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Links de navegación (Solo Desktop) */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? `${link.bg} ${link.color} scale-105 shadow-sm` 
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={18} className={`mr-2 ${isActive ? '' : link.color}`} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* DERECHA: Modo Oscuro y Ajustes */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Alternar modo oscuro"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Link
              to="/ajustes"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800 transition-colors"
              title="Ajustes"
            >
              <Settings size={20} />
            </Link>
          </div>

        </div>
      </div>

      {/* MENÚ MÓVIL (Desplegable) */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-black absolute w-full shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive 
                      ? `${link.bg} ${link.color}` 
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon size={20} className={`mr-3 ${isActive ? '' : link.color}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}