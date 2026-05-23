import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, LayoutDashboard, LayoutGrid, ChefHat, Calculator, PieChart, BookOpen, UsersRound, Menu, X, ChevronRight, Receipt, Users, Banknote, Lock, CheckCircle, Coins, CreditCard, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';

// === COMPONENTS ===
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/salon', icon: LayoutGrid, label: 'Salón / Mesas' },
    { path: '/cocina', icon: ChefHat, label: 'Cocina / Pedidos' },
    { path: '/caja', icon: Calculator, label: 'Caja / Cobros', active: true },
    { path: '/reportes', icon: PieChart, label: 'Reportes' },
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
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20">
              <UtensilsCrossed />
            </div>
            <span className="text-white font-black text-xl tracking-tighter">CHICKEN<span className="text-amber-500">ERP</span></span>
          </div>
          <button onClick={toggleSidebar} className="text-slate-400 hover:text-white md:hidden p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item flex items-center gap-3 p-3 text-sm ${item.active || location.pathname === item.path ? 'sidebar-active' : ''}`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </Link>
          ))}
          <div className="my-4 border-t border-slate-800 mx-4"></div>
          <Link to="/carta" className="sidebar-item flex items-center gap-3 p-3 text-sm"><BookOpen className="w-5 h-5"/> Carta e Inventario</Link>
          <Link to="/usuarios" className="sidebar-item flex items-center gap-3 p-3 text-sm"><UsersRound className="w-5 h-5"/> Personal y Accesos</Link>
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white">AD</div>
            <div className="text-xs">
              <p className="text-white font-bold">Administrador</p>
              <p className="text-slate-500 truncate w-32">Local Principal</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ toggleSidebar }) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
    <div className="flex items-center gap-3">
      <button onClick={toggleSidebar} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden">
        <Menu className="w-6 h-6" />
      </button>
      <div className="hidden sm:flex items-center gap-2 text-slate-500 text-sm font-medium">
        <span>Finanzas</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-bold">Punto de Cobro</span>
      </div>
    </div>
    
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hidden sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Caja Sincronizada
      </div>
    </div>
  </header>
);

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 relative">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        {children}
      </main>
    </div>
  );
};

// === CAJA MODULE ===
const CajaPage = () => {
  const [mesas, setMesas] = useState([]);
  const [stats, setStats] = useState({ atendidas: 0, ingresos: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  useEffect(() => {
    // Mock Data
    const mockMesas = Array.from({length: 15}, (_, i) => ({
      num: i + 1,
      estado: i % 4 === 0 ? 'Servido' : (i % 5 === 0 ? 'Cocina' : 'Libre'),
      pedidoData: (i % 4 === 0 || i % 5 === 0) ? {
        mesero: 'Carlos P.', hora: '14:30', total: Math.random() * 100 + 50,
        items: [{ cant: 1, nombre: '1/4 Pollo a la Brasa', precio: 25 }, { cant: 2, nombre: 'Inka Kola 500ml', precio: 5 }]
      } : null
    }));
    setMesas(mockMesas);
  }, []);

  const mesasPendientes = mesas.filter(m => m.estado !== 'Libre');

  const procesarCobro = () => {
    if(!mesaSeleccionada) return;
    setStats({
      atendidas: stats.atendidas + 1,
      ingresos: stats.ingresos + mesaSeleccionada.pedidoData.total
    });
    setMesas(mesas.map(m => m.num === mesaSeleccionada.num ? { ...m, estado: 'Libre', pedidoData: null } : m));
    setModalOpen(false);
    alert('✅ ¡Cobro procesado exitosamente!');
  };

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Caja y Facturación</h1>
          <p className="text-xs md:text-sm text-slate-500">Cierre de mesas, emisión de comprobantes y liberación de espacios.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-slate-700 uppercase text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Cuentas Pendientes
              </h2>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                {mesasPendientes.length} Mesas
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Mesa</th>
                    <th className="px-6 py-4">Mesero</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm bg-white">
                  {mesasPendientes.length > 0 ? mesasPendientes.map(m => (
                    <tr key={m.num} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-black">{m.num}</div>
                          <span className="font-black text-slate-800 uppercase hidden sm:block">Mesa {m.num}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm">{m.pedidoData?.mesero}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{m.pedidoData?.hora}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {m.estado === 'Servido' 
                          ? <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-max"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Listo p/ Cobrar</span>
                          : <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded border border-amber-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-max"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Comiendo</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-slate-900 text-lg md:text-xl tracking-tight">
                        S/ {m.pedidoData?.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => { setMesaSeleccionada(m); setModalOpen(true); }} className="px-4 py-2.5 bg-slate-900 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md group-hover:scale-105 active:scale-95">Cobrar</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-medium">No hay cuentas pendientes por cobrar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl shadow-xl p-6 text-white flex flex-col sticky top-4">
          <h2 className="font-black uppercase text-sm mb-6 text-amber-400 flex items-center gap-2">
            <PieChart className="w-5 h-5" /> Resumen del Turno
          </h2>
          <div className="space-y-4 flex-1">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 transition-all hover:bg-slate-700">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mesas Atendidas</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-3xl font-black">{stats.atendidas}</p>
              </div>
            </div>
            <div className="bg-amber-500 p-5 rounded-2xl relative overflow-hidden text-slate-900 shadow-lg shadow-amber-500/20 transform transition-all hover:scale-[1.02]">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full opacity-20"></div>
              <p className="text-xs font-black uppercase tracking-wider opacity-80">Ingresos Totales (S/)</p>
              <div className="flex items-center gap-3 mt-2 relative z-10">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900">
                  <Banknote className="w-5 h-5" />
                </div>
                <p className="text-3xl lg:text-4xl font-black font-mono tracking-tighter">{stats.ingresos.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <button className="mt-6 w-full py-4 bg-slate-800 hover:bg-red-500 hover:text-white border border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex justify-center items-center gap-2 text-slate-400">
            <Lock className="w-4 h-4" /> Cerrar Caja (Fin de turno)
          </button>
        </div>
      </div>

      {modalOpen && mesaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-[90vh] md:h-auto md:max-h-[95vh] max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-fade-in">
            <div className="p-4 md:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-900">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tight leading-none">Mesa <span className="text-emerald-400">{mesaSeleccionada.num}</span></h2>
                  <p className="text-xs text-slate-400">Verificación y Pago</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">Detalle del Consumo:</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
                  <ul className="space-y-2">
                    {mesaSeleccionada.pedidoData?.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                        <div className="flex-1">
                          <span className="font-black text-slate-800 inline-block w-6">{item.cant}x</span>
                          <span className="font-medium text-slate-600">{item.nombre}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 shrink-0">S/ {(item.cant * item.precio).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-center bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-inner">
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
                <p className="text-5xl font-black text-emerald-900 font-mono tracking-tighter">S/ {mesaSeleccionada.pedidoData?.total.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-6 md:pb-4">
              <button onClick={procesarCobro} className="w-full py-4 bg-slate-900 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl text-sm transition-all shadow-xl shadow-slate-900/20 flex justify-center items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" /> Confirmar y Liberar Mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// === APP ===
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/" element={<CajaPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
