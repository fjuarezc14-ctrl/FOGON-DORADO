import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCheck, CheckCircle2, User } from 'lucide-react';
import { api } from '../api';

export default function CocinaPage() {
  const [mesas, setMesas] = useState([]);
  const [horaLocal, setHoraLocal] = useState('');

  const fetchMesas = useCallback(async () => {
    try {
      const data = await api.getMesas();
      setMesas(data);
    } catch (err) {
      console.error('Error cargando cocina:', err);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
    const interval = setInterval(() => {
      fetchMesas();
      setHoraLocal(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMesas]);

  const despacharPedido = async (num) => {
    try {
      await api.despacharMesa(num);
      await fetchMesas();
    } catch (err) {
      alert('Error al despachar: ' + err.message);
    }
  };

  const mesasCocina = mesas.filter(m => m.estado === 'Cocina' && m.pedidoData);

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full bg-slate-900">
      <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 md:px-8 z-10 shrink-0 text-white">
        <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm font-medium">
          <span>Operaciones</span>
          <span className="text-white font-bold">Monitor de Preparación</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Sincronización en Vivo · BD
          </div>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Pedidos en Cola</h1>
            <p className="text-xs md:text-sm text-slate-400">Tickets sincronizados directamente desde la Base de Datos.</p>
          </div>
          <div className="text-white flex items-center gap-2 font-bold text-sm bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 shadow-md">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{horaLocal || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-start pb-10">
          {mesasCocina.length === 0
            ? <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <p className="text-white text-xl font-bold uppercase tracking-widest">Sin pedidos pendientes</p>
                <p className="text-slate-400 mt-2">La cocina está al día.</p>
              </div>
            : mesasCocina.map((m, idx) => {
                const itemsParaCocina = m.pedidoData.items.filter(item => !item.historial);
                if (itemsParaCocina.length === 0) return null;

                return (
                  <div key={idx} className="bg-white rounded-t-xl rounded-b shadow-2xl flex flex-col overflow-hidden transform transition-all hover:-translate-y-1 relative" style={{ minHeight: '300px' }}>
                    <div className="bg-amber-400 p-3 text-center text-slate-900 shrink-0 border-b-4 border-amber-500 relative">
                      {m.pedidoData.adicional && (
                        <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-lg rotate-12 animate-pulse border-2 border-white tracking-widest z-10">¡ADICIONAL!</div>
                      )}
                      <h2 className="font-black text-3xl uppercase tracking-tighter leading-none">Mesa {m.num}</h2>
                    </div>

                    <div className="p-3 flex justify-between items-center text-xs font-black text-slate-500 border-b-2 border-slate-900 shrink-0 bg-slate-50">
                      <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> {m.pedidoData.mesero}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {m.pedidoData.hora}</span>
                    </div>

                    <div className="p-4 flex-1 bg-white min-h-[150px]">
                      {itemsParaCocina.map((item, i) => (
                        <div key={i} className="flex items-start py-2 border-b border-dashed border-slate-300 last:border-0">
                          <span className="font-black text-lg mr-3 text-slate-900 w-6 text-center shrink-0">{item.cant}</span>
                          <span className="flex-1 text-slate-800 font-bold text-sm leading-snug pt-0.5 uppercase">{item.nombre}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-slate-50 mt-2 shrink-0 pb-6 border-t-2 border-dashed border-slate-300">
                      <button onClick={() => despacharPedido(m.num)} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm">
                        <CheckCheck className="w-5 h-5" /> Listo
                      </button>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </section>
    </div>
  );
}
