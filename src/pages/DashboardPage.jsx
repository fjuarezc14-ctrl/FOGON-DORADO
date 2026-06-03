import React, { useState, useEffect } from 'react';
import { Users, Flame, CheckCircle, Banknote, LayoutGrid, ChefHat, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function DashboardPage() {
  const [stats, setStats] = useState({ ocupadas: 0, totalMesas: 15, enCocina: 0, atendidas: 0, ingresos: 0 });
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    const updateStats = async () => {
      try {
        const [mesas, resumen, rotacion] = await Promise.all([
          api.getMesas(),
          api.getResumenVentas(),
          api.getRotacion(),
        ]);
        setStats({
          ocupadas: mesas.filter(m => m.estado !== 'Libre').length,
          totalMesas: mesas.length,
          enCocina: mesas.filter(m => m.estado === 'Cocina').length,
          atendidas: resumen.atendidas || 0,
          ingresos: resumen.ingresos || 0,
        });
        const categoriasExcluidas = ['Bebidas y Refrescos', 'Cervezas', 'Bar y Cocteles', 'Postres'];
        const platosFiltrados = rotacion.filter(p => !categoriasExcluidas.includes(p.categoria));
        setTopProducts(platosFiltrados.slice(0, 5));
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 3000);
    return () => clearInterval(interval);
  }, []);


  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-slate-500 text-sm font-medium">
          <span>Inicio</span>
          <span className="text-slate-900 font-bold">Resumen de Ventas</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sync BD Activo
          </div>
          <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2 hidden md:block"></div>
          <Link to="/salon" className="bg-slate-900 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md">
            <LayoutGrid className="w-4 h-4 text-amber-400" /> <span className="hidden sm:inline">Ir al Salón</span>
          </Link>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Estado Actual del Local</h1>
          <p className="text-xs md:text-sm text-slate-500">Métricas en tiempo real sincronizadas con la Base de Datos.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center z-10"><Users className="w-6 h-6" /></div>
            <div className="z-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Mesas Ocupadas</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.ocupadas} / {stats.totalMesas}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center z-10"><Flame className="w-6 h-6" /></div>
            <div className="z-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">En Cocina</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.enCocina} Ticket{stats.enCocina !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center z-10"><CheckCircle className="w-6 h-6" /></div>
            <div className="z-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Atenciones Hoy</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{stats.atendidas}</p>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl shadow-lg flex items-center gap-4 relative overflow-hidden text-white transition-all duration-300 hover:-translate-y-1">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500 rounded-full opacity-20"></div>
            <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-2xl flex items-center justify-center z-10"><Banknote className="w-6 h-6" /></div>
            <div className="z-10">
              <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Ingresos Caja</p>
              <p className="text-2xl font-black mt-1 font-mono">S/ {stats.ingresos.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* TOP 5 PRODUCTOS MÁS VENDIDOS WIDGET */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 uppercase text-sm tracking-wider">Top 5 Productos Más Vendidos (Hoy)</h2>
              <p className="text-xs text-slate-400">Rotación de platos de hoy ordenados por volumen de venta.</p>
            </div>
          </div>
          {topProducts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <div key={p.id || idx} className="py-3 flex items-center justify-between font-bold text-slate-700 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="text-slate-850 font-black">{p.nombre}</span>
                      <span className="text-[10px] text-slate-400 uppercase ml-2 px-2 py-0.5 rounded bg-slate-50 border border-slate-100">
                        {p.categoria}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 font-mono">
                    <div className="text-right">
                      <span className="text-slate-400 text-xs mr-1">Cant:</span>
                      <span className="text-slate-900 font-black">{p.cantidad}</span>
                    </div>
                    <div className="text-right w-24">
                      <span className="text-emerald-600 font-black">S/ {p.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs">No hay ventas registradas el día de hoy.</p>
          )}
        </div>

        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/salon" className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 rounded-2xl flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-xl flex items-center justify-center transition-colors shrink-0"><LayoutGrid className="w-6 h-6" /></div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase">Atención Salón</h3>
              <p className="text-xs text-slate-400 mt-0.5">Mapa de mesas y Punto de Venta (POS).</p>
            </div>
          </Link>

          <Link to="/cocina" className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 rounded-2xl flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-xl flex items-center justify-center transition-colors shrink-0"><ChefHat className="w-6 h-6" /></div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase">Monitor Cocina</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tickets de pedidos en tiempo real.</p>
            </div>
          </Link>

          <Link to="/caja" className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 rounded-2xl flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-xl flex items-center justify-center transition-colors shrink-0"><Calculator className="w-6 h-6" /></div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase">Caja y Cobros</h3>
              <p className="text-xs text-slate-400 mt-0.5">Facturación, pagos y liberación de mesas.</p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
