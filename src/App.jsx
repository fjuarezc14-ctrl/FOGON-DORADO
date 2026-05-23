import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, LayoutDashboard, LayoutGrid, ChefHat, Calculator, PieChart, BookOpen, UsersRound, Menu, X, ChevronRight, Receipt, Users, Banknote, Lock, CheckCircle, Coins, CreditCard, Smartphone, Search, UploadCloud, Download, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

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
        Online
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

// === COMPRAS MODULE ===
const ComprasPage = () => {
  const [compras, setCompras] = useState([
    { id: 'C001', fecha: '2026-05-20', proveedor: 'AVICOLA SAN FERNANDO S.A.', ruc: '20100100100', base: 500.00, igv: 90.00, total: 590.00 },
    { id: 'C002', fecha: '2026-05-21', proveedor: 'MERCADO CENTRAL (Papas)', ruc: '10404040401', base: 120.00, igv: 0.00, total: 120.00 },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    // Simulación de lectura de XML
    alert("Procesando XML de Factura Electrónica...\n\nSe extrajo: DISTRIBUIDORA INCA KOLA S.A.\nRUC: 20404040404\nTotal: S/ 350.00");
    const nuevaCompra = { id: `C00${compras.length+1}`, fecha: new Date().toISOString().split('T')[0], proveedor: 'DISTRIBUIDORA INCA KOLA S.A.', ruc: '20404040404', base: 296.61, igv: 53.39, total: 350.00 };
    setCompras([nuevaCompra, ...compras]);
  };

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Registro de Compras (RCE)</h1>
        <p className="text-xs md:text-sm text-slate-500">Ingreso automático de facturas de proveedores para el crédito fiscal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DRAG AND DROP ZONE */}
        <div className="lg:col-span-1">
          <div 
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${isDragging ? 'border-amber-500 bg-amber-50 scale-105' : 'border-slate-300 bg-white hover:border-amber-400 hover:bg-slate-50'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="font-black text-slate-700 uppercase mb-2">Carga Automática</h3>
            <p className="text-xs text-slate-500 mb-6">Arrastra el archivo <span className="font-bold text-slate-700">.XML</span> de la factura de tu proveedor aquí.</p>
            <button className="px-6 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors w-full">
              Explorar Archivos
            </button>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button className="text-xs font-bold text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center justify-center gap-1 w-full">
                <FileText className="w-4 h-4"/> Registro Manual
              </button>
            </div>
          </div>
        </div>

        {/* TABLA DE COMPRAS */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-black text-slate-700 uppercase text-sm">Historial de Compras del Mes</h2>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Proveedor / RUC</th>
                    <th className="px-6 py-4 text-right">Base Imp.</th>
                    <th className="px-6 py-4 text-right">IGV (18%)</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {compras.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs">{c.fecha}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{c.proveedor}</div>
                        <div className="text-[10px] text-slate-400 font-mono">RUC: {c.ruc}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">S/ {c.base.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">S/ {c.igv.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-black text-slate-900">S/ {c.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// === REPORTES (CONTADOR) MODULE ===
const ReportesPage = () => {
  // Datos simulados del mes
  const resumen = {
    ventasTotal: 12500.00,
    ventasBase: 10593.22,
    ventasIGV: 1906.78, // Débito Fiscal
    comprasTotal: 4800.00,
    comprasBase: 4067.80,
    comprasIGV: 732.20, // Crédito Fiscal
  };
  
  const igvPagar = resumen.ventasIGV - resumen.comprasIGV;

  const exportarAExcel = () => {
    // Simulación de descarga CSV
    const csvContent = "data:text/csv;charset=utf-8,FECHA,TIPO,COMPROBANTE,BASE_IMPONIBLE,IGV,TOTAL\n2026-05-01,VENTA,F001-001,100.00,18.00,118.00";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_contable_mayo_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Panel Contable</h1>
          <p className="text-xs md:text-sm text-slate-500">Resumen tributario y exportación para el contador.</p>
        </div>
        <button onClick={exportarAExcel} className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
          <Download className="w-4 h-4" /> Exportar a Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* TARJETA VENTAS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5"/></div>
            <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest">Ventas (Débito Fiscal)</h2>
          </div>
          <p className="text-3xl font-black font-mono text-slate-900 mb-2">S/ {resumen.ventasTotal.toFixed(2)}</p>
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-2 mt-4">
            <span>Base Imp: S/ {resumen.ventasBase.toFixed(2)}</span>
            <span className="font-bold text-blue-600">IGV: S/ {resumen.ventasIGV.toFixed(2)}</span>
          </div>
        </div>

        {/* TARJETA COMPRAS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><TrendingDown className="w-5 h-5"/></div>
            <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest">Compras (Crédito Fiscal)</h2>
          </div>
          <p className="text-3xl font-black font-mono text-slate-900 mb-2">S/ {resumen.comprasTotal.toFixed(2)}</p>
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-2 mt-4">
            <span>Base Imp: S/ {resumen.comprasBase.toFixed(2)}</span>
            <span className="font-bold text-rose-600">IGV: S/ {resumen.comprasIGV.toFixed(2)}</span>
          </div>
        </div>

        {/* TARJETA IGV ESTIMADO */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500 rounded-full opacity-10 blur-xl"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 bg-slate-800 text-amber-400 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5"/></div>
            <h2 className="font-black text-amber-400 uppercase text-xs tracking-widest">IGV a Pagar (Estimado)</h2>
          </div>
          <p className="text-4xl font-black font-mono text-white mb-2 relative z-10">S/ {igvPagar.toFixed(2)}</p>
          <div className="flex justify-between text-xs text-slate-400 border-t border-slate-700 pt-2 mt-4 relative z-10">
            <span>Débito - Crédito Fiscal</span>
            <span>Mayo 2026</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// === CAJA MODULE (PREVIOUS CODE COMPRESSED FOR BREVITY) ===
const CajaPage = () => {
  const [mesas, setMesas] = useState([]);
  const [stats, setStats] = useState({ atendidas: 0, ingresos: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [tipoComprobante, setTipoComprobante] = useState('Boleta');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [numDocumento, setNumDocumento] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [isBuscando, setIsBuscando] = useState(false);

  useEffect(() => {
    const mockMesas = Array.from({length: 15}, (_, i) => ({
      num: i + 1,
      estado: i % 4 === 0 ? 'Servido' : (i % 5 === 0 ? 'Cocina' : 'Libre'),
      pedidoData: (i % 4 === 0 || i % 5 === 0) ? {
        mesero: 'Carlos P.', hora: '14:30', total: 60.00,
        items: [{ cant: 1, nombre: '1 Pollo a la Brasa', precio: 50 }, { cant: 1, nombre: 'Gaseosa 1.5L', precio: 10 }]
      } : null
    }));
    setMesas(mockMesas);
  }, []);

  const mesasPendientes = mesas.filter(m => m.estado !== 'Libre');

  const buscarCliente = () => {
    if (!numDocumento) return;
    setIsBuscando(true);
    setTimeout(() => {
      if (tipoComprobante === 'Factura') {
        setClienteNombre('EMPRESA DE PRUEBA S.A.C.');
        setClienteDireccion('AV. LAS PALMERAS 123, LIMA');
      } else {
        setClienteNombre('JUAN PEREZ GONZALES');
        setClienteDireccion('CALLE LOS PINOS 456');
      }
      setIsBuscando(false);
    }, 1000);
  };

  const procesarCobroYFacturar = () => {
    if(!mesaSeleccionada) return;
    const total = mesaSeleccionada.pedidoData.total;
    setStats({ atendidas: stats.atendidas + 1, ingresos: stats.ingresos + total });
    setMesas(mesas.map(m => m.num === mesaSeleccionada.num ? { ...m, estado: 'Libre', pedidoData: null } : m));
    setNumDocumento(''); setClienteNombre(''); setClienteDireccion(''); setModalOpen(false);
    alert(`✅ ¡Cobro procesado para la ${tipoComprobante}!`);
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
              <h2 className="font-black text-slate-700 uppercase text-sm flex items-center gap-2"><Receipt className="w-4 h-4" /> Cuentas Pendientes</h2>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">{mesasPendientes.length} Mesas</span>
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
                      <td className="px-6 py-4 text-right font-mono font-black text-slate-900 text-lg md:text-xl tracking-tight">S/ {m.pedidoData?.total.toFixed(2)}</td>
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
          <h2 className="font-black uppercase text-sm mb-6 text-amber-400 flex items-center gap-2"><PieChart className="w-5 h-5" /> Resumen del Turno</h2>
          <div className="space-y-4 flex-1">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 transition-all hover:bg-slate-700">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mesas Atendidas</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400"><Users className="w-5 h-5" /></div>
                <p className="text-3xl font-black">{stats.atendidas}</p>
              </div>
            </div>
            <div className="bg-amber-500 p-5 rounded-2xl relative overflow-hidden text-slate-900 shadow-lg shadow-amber-500/20 transform transition-all hover:scale-[1.02]">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full opacity-20"></div>
              <p className="text-xs font-black uppercase tracking-wider opacity-80">Ingresos Totales (S/)</p>
              <div className="flex items-center gap-3 mt-2 relative z-10">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900"><Banknote className="w-5 h-5" /></div>
                <p className="text-3xl lg:text-4xl font-black font-mono tracking-tighter">{stats.ingresos.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <button className="mt-6 w-full py-4 bg-slate-800 hover:bg-red-500 hover:text-white border border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex justify-center items-center gap-2 text-slate-400"><Lock className="w-4 h-4" /> Cerrar Caja</button>
        </div>
      </div>

      {modalOpen && mesaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[95vh] max-w-3xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-fade-in">
            <div className="p-4 md:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-900"><Banknote className="w-5 h-5" /></div>
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tight leading-none">Cobro Mesa <span className="text-emerald-400">{mesaSeleccionada.num}</span></h2>
                  <p className="text-xs text-slate-400">Facturación Electrónica</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1 grid md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">Tipo de Comprobante:</label>
                  <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 font-bold text-slate-800 transition-all">
                    <option value="Boleta">Boleta Electrónica (DNI)</option>
                    <option value="Factura">Factura Electrónica (RUC)</option>
                    <option value="Ticket">Ticket Interno</option>
                  </select>
                </div>
                {(tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">{tipoComprobante === 'Factura' ? 'RUC del Cliente' : 'DNI del Cliente'}:</label>
                      <div className="flex gap-2">
                        <input type="text" value={numDocumento} onChange={(e) => setNumDocumento(e.target.value)} placeholder={tipoComprobante === 'Factura' ? 'Ej. 20000000000' : 'Ej. 70000000'} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
                        <button onClick={buscarCliente} disabled={!numDocumento || isBuscando} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                          {isBuscando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Search className="w-4 h-4"/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1 text-[10px] tracking-widest uppercase">Nombre / Razón Social:</label>
                      <input type="text" readOnly value={clienteNombre} placeholder="Autocompletado..." className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-medium rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-5 flex flex-col">
                <div className="mt-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white">
                  <div className="space-y-2 mb-4 border-b border-slate-700 pb-4">
                    <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="font-mono">S/ {(mesaSeleccionada.pedidoData?.total / 1.18).toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-slate-400"><span>IGV (18%)</span><span className="font-mono">S/ {(mesaSeleccionada.pedidoData?.total - (mesaSeleccionada.pedidoData?.total / 1.18)).toFixed(2)}</span></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">Total a Pagar</p>
                    <p className="text-4xl font-black text-white font-mono tracking-tighter"><span className="text-xl text-slate-500 mr-1">S/</span>{mesaSeleccionada.pedidoData?.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <button onClick={procesarCobroYFacturar} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black uppercase tracking-widest rounded-xl text-sm transition-all shadow-lg flex justify-center items-center gap-2"><CheckCircle className="w-5 h-5" /> Emitir y Cobrar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// === APP MAIN ENTRY ===
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/caja" element={<Layout title="Punto de Cobro"><CajaPage /></Layout>} />
        <Route path="/compras" element={<Layout title="Registro de Compras"><ComprasPage /></Layout>} />
        <Route path="/reportes" element={<Layout title="Panel Contable"><ReportesPage /></Layout>} />
        <Route path="/" element={<Layout title="Punto de Cobro"><CajaPage /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
