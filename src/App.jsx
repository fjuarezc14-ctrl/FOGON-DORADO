import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, LayoutDashboard, LayoutGrid, ChefHat, Calculator, PieChart, BookOpen, UsersRound, Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import SalonPage from './pages/SalonPage';
import CocinaPage from './pages/CocinaPage';
import CajaPage from './pages/CajaPage';
import ComprasPage from './pages/ComprasPage';
import ReportesPage from './pages/ReportesPage';
import CartaPage from './pages/CartaPage';
import UsuariosPage from './pages/UsuariosPage';

// === COMPONENTS ===
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/salon', icon: LayoutGrid, label: 'Salón / Mesas' },
    { path: '/cocina', icon: ChefHat, label: 'Cocina / Pedidos' },
    { path: '/caja', icon: Calculator, label: 'Caja / Cobros' },
    { path: '/compras', icon: BookOpen, label: 'Compras / Gastos' },
    { path: '/reportes', icon: PieChart, label: 'Reportes (Contador)' },
    { path: '/carta', icon: BookOpen, label: 'Carta e Inventario' },
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggleSidebar}
      ></div>

      <aside className={`fixed md:relative inset-y-0 left-0 w-64 bg-slate-900 text-slate-400 flex flex-col shadow-2xl z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-6 flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20 shrink-0">
              <UtensilsCrossed />
            </div>
            <span className="text-white font-black text-xl tracking-tighter">FOGÓN<span className="text-amber-500">ERP</span></span>
          </div>
          <button onClick={toggleSidebar} className="text-slate-400 hover:text-white md:hidden p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item flex items-center gap-3 p-3 text-sm ${isActive ? 'sidebar-active' : ''}`}
              >
                <item.icon className="w-5 h-5" /> {item.label}
              </Link>
            )
          })}
          <div className="my-4 border-t border-slate-800 mx-4"></div>
          <Link to="/usuarios" className="sidebar-item flex items-center gap-3 p-3 text-sm"><UsersRound className="w-5 h-5"/> Personal y Accesos</Link>
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">AD</div>
            <div className="text-xs truncate">
              <p className="text-white font-bold">Administrador</p>
              <p className="text-slate-500 truncate w-32">Local Principal</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ toggleSidebar, title }) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
    <div className="flex items-center gap-3">
      <button onClick={toggleSidebar} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden">
        <Menu className="w-6 h-6" />
      </button>
      <div className="hidden sm:flex items-center gap-2 text-slate-500 text-sm font-medium">
        <span>Sistema</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-bold">{title || 'Punto de Cobro'}</span>
      </div>
    </div>
    
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hidden sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Sync BD Activo
      </div>
    </div>
  </header>
);

const Layout = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 relative">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title={title} />
        {children}
      </main>
    </div>
  );
};

// === APP MAIN ENTRY ===
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout title="Resumen de Ventas"><DashboardPage /></Layout>} />
        <Route path="/salon" element={<Layout title="Gestión de Salón"><SalonPage /></Layout>} />
        <Route path="/cocina" element={<Layout title="Monitor de Preparación"><CocinaPage /></Layout>} />
        <Route path="/caja" element={<Layout title="Punto de Cobro"><CajaPage /></Layout>} />
        <Route path="/compras" element={<Layout title="Registro de Compras"><ComprasPage /></Layout>} />
        <Route path="/reportes" element={<Layout title="Panel Contable"><ReportesPage /></Layout>} />
        <Route path="/carta" element={<Layout title="Carta e Inventario"><CartaPage /></Layout>} />
        <Route path="/usuarios" element={<Layout title="Personal y Accesos"><UsuariosPage /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
