import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Navbar from './components/general/Navbar';
import ModalTransaccion from './components/operaciones/ModalTransaccion';
import { ConfigProvider } from './context/ConfigContext';
import Suscripciones from './pages/Suscripciones';

// Importa aquí tus páginas
import Balance from './pages/Finanzas';
import Gastos from './pages/Gastos';
import Ingresos from './pages/Ingresos';
import Inversiones from './pages/Inversiones';
import Ahorros from './pages/Ahorros';
import Ajustes from './pages/Ajustes';
import Liquidez from './pages/Liquidez';

function App() {
  const [modalGlobalAbierto, setModalGlobalAbierto] = useState(false);

  return (
    <ConfigProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 dark:bg-black transition-colors duration-300 relative">
          <Navbar />
          
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full pb-24">
            <Routes>
              <Route path="/" element={<Balance />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/ingresos" element={<Ingresos />} />
              <Route path="/inversiones" element={<Inversiones />} />
              <Route path="/ahorros" element={<Ahorros />} />
              <Route path="/ajustes" element={<Ajustes />} />
              <Route path="/ahorros/liquidez" element={<Liquidez />} />
              <Route path="/suscripciones" element={<Suscripciones />} />
            </Routes>
          </main>

          {/* BOTÓN FLOTANTE GENÉRICO GLOBAL (FAB) */}
          <button
            onClick={() => setModalGlobalAbierto(true)}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 p-4 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
            title="Añadir Operación"
          >
            <Plus size={28} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* MODAL GLOBAL (Dispara un evento cuando guarda) */}
          <ModalTransaccion
            isOpen={modalGlobalAbierto}
            onClose={() => setModalGlobalAbierto(false)}
            onSuccess={() => window.dispatchEvent(new Event('actualizarTransacciones'))}
            tipoInicial="GASTO" 
          />
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;