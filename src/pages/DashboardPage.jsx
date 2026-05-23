import React, { useState, useEffect } from 'react';
import { Users, Flame, CheckCircle, Banknote, LayoutGrid, ChefHat, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [stats, setStats] = useState({ ocupadas: 0, totalMesas: 15, enCocina: 0, atendidas: 0, ingresos: 0 });

  useEffect(() => {
    const updateStats = () => {
      let mesasDB = JSON.parse(localStorage.getItem('polleria_mesas'));
      if (!mesasDB) {
        mesasDB = Array.from({length: 15}, (_, i) => ({ num: i + 1, estado: 'Libre', pedidoData: null }));
        localStorage.setItem('polleria_mesas', JSON.stringify(mesasDB));
      }

      let statsDB = JSON.parse(localStorage.getItem('polleria_stats'));
      if (!statsDB) {
        statsDB = { atendidas: 0, ingresos: 0 };
        localStorage.setItem('polleria_stats', JSON.stringify(statsDB));
      }

      const ocupadas = mesasDB.filter(m => m.estado !== 'Libre').length;
      const totalMesas = mesasDB.length;
      const enCocina = mesasDB.filter(m => m.estado === 'Cocina').length;

      setStats({
        ocupadas,
        totalMesas,
        enCocina,
        atendidas: statsDB.atendidas,
        ingresos: statsDB.ingresos
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-slate-500 text-sm font-medium">
            <span>Inicio</span>
            <span className="text-slate-900 font-bold">Resumen de Ventas</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hidden sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sync Activo
          </div>
          <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2 hidden md:block"></div>
          <Link to="/salon" className="bg-slate-900 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md">
            <UtensilsIcon className="w-4 h-4 text-amber-400" /> <span className="hidden xs:inline sm:inline">Ir al Salón</span>
          </Link>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Estado Actual del Local</h1>
          <p className="text-xs md:text-sm text-slate-500">Métricas en tiempo real sincronizadas con salón y cocina.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center z-10"><Users className="w-6 h-6"/></div>
            <div className="z-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Mesas Ocupadas</p>
              <p className="text-2xl font-black text-slate-800 mt-1 transition-all duration-300">{stats.ocupadas} / {stats.totalMesas}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center z-10"><Flame className="w-6 h-6"/></div>
            <div className="z-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">En Cocina</p>
              <p className="text-2xl font-black text-slate-800 mt-1 transition-all duration-300">{stats.enCocina} Tickets</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center z-10"><CheckCircle className="w-6 h-6"/></div>
            <div className="z-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Atenciones Hoy</p>
              <p className="text-2xl font-black text-slate-800 mt-1 transition-all duration-300">{stats.atendidas}</p>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl shadow-lg flex items-center gap-4 relative overflow-hidden text-white transition-all duration-300 hover:-translate-y-1">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500 rounded-full opacity-20"></div>
            <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-2xl flex items-center justify-center z-10"><Banknote className="w-6 h-6"/></div>
            <div className="z-10">
              <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">Ingresos Caja</p>
              <p className="text-2xl font-black mt-1 font-mono transition-all duration-300">S/ {stats.ingresos.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/salon" className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 rounded-2xl flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-xl flex items-center justify-center transition-colors shrink-0"><LayoutGrid className="w-6 h-6"/></div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase">Atención Salón</h3>
              <p className="text-xs text-slate-400 mt-0.5">Mapa de mesas y Punto de Venta (POS).</p>
            </div>
          </Link>
          
          <Link to="/cocina" className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 rounded-2xl flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-xl flex items-center justify-center transition-colors shrink-0"><ChefHat className="w-6 h-6"/></div>
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase">Monitor Cocina</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tickets de pedidos en tiempo real.</p>
            </div>
          </Link>

          <Link to="/caja" className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all p-5 rounded-2xl flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-600 rounded-xl flex items-center justify-center transition-colors shrink-0"><Calculator className="w-6 h-6"/></div>
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

function UtensilsIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  )
}
