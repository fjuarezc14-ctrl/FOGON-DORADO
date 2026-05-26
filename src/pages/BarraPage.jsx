import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCheck, CheckCircle2, User, Truck, GlassWater } from 'lucide-react';
import { api } from '../api';

export default function BarraPage() {
  const [pedidos, setPedidos] = useState([]);
  const [horaLocal, setHoraLocal] = useState('');

  const fetchPedidos = useCallback(async () => {
    try {
      const data = await api.getPedidosBarra();
      setPedidos(data);
    } catch (err) {
      console.error('Error cargando barra:', err);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    const tick = () => {
      fetchPedidos();
      setHoraLocal(new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      }));
    };
    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const marcarListoBarra = async (pedidoId) => {
    try {
      await api.prepararPedido(pedidoId, 'barra');
      await fetchPedidos();
    } catch (err) {
      alert('Error al despachar bebidas: ' + err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden w-full bg-slate-950">
      {/* Header con gradiente índigo/morado */}
      <header className="h-16 bg-slate-900 border-b border-indigo-950/60 flex items-center justify-between px-4 md:px-8 z-10 shrink-0 text-white">
        <div className="hidden sm:flex items-center gap-2 text-indigo-300 text-sm font-medium">
          <GlassWater className="w-4 h-4 text-purple-400" />
          <span>Operaciones</span>
          <span className="text-white font-bold">Monitor de Barra (Bebidas)</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Sincronización en Vivo · Barra
          </div>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              Bebidas por Preparar
            </h1>
            <p className="text-xs md:text-sm text-indigo-300">
              Solo tragos, refrescos y cervezas · Las comidas van al monitor de cocina.
            </p>
          </div>
          <div className="text-white flex items-center gap-2 font-bold text-sm bg-slate-900 px-4 py-2 rounded-xl border border-indigo-950 shadow-md">
            <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>{horaLocal || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-start pb-10">
          {pedidos.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-60">
              <div className="w-20 h-20 bg-indigo-950/40 rounded-full border-2 border-dashed border-indigo-500/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-white text-xl font-black uppercase tracking-widest">Sin bebidas pendientes</p>
              <p className="text-indigo-400 mt-2 text-sm">La barra está al día. ¡Salud!</p>
            </div>
          ) : (
            pedidos.map((p) => {
              const esDelivery = p.tipoEntrega === 'llevar';
              return (
                <div
                  key={p.pedidoId}
                  className="bg-slate-900 border border-indigo-950/60 rounded-t-2xl rounded-b shadow-2xl flex flex-col overflow-hidden transform transition-all hover:scale-[1.02] relative"
                  style={{ minHeight: '280px' }}
                >
                  {/* Header del Ticket */}
                  <div className={`p-4 text-center shrink-0 border-b-4 relative ${esDelivery ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-purple-600 border-purple-700 text-white'}`}>
                    {p.adicional && !esDelivery && (
                      <div className="absolute -top-3 -right-3 bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg rotate-12 animate-pulse border border-white tracking-widest z-10">
                        + ADICIONAL
                      </div>
                    )}
                    {esDelivery ? (
                      <>
                        <div className="flex items-center justify-center gap-1.5 mb-0.5">
                          <Truck className="w-4 h-4 text-indigo-200" />
                          <span className="font-bold text-[10px] uppercase tracking-widest text-indigo-100">Delivery</span>
                        </div>
                        <h2 className="font-black text-2xl uppercase tracking-tighter leading-none">
                          {p.codigoPedidosYa || 'DELIVERY'}
                        </h2>
                      </>
                    ) : (
                      <h2 className="font-black text-2xl uppercase tracking-tighter leading-none">
                        Mesa {p.mesaNum}
                      </h2>
                    )}
                  </div>

                  {/* Info del ticket (Mozo / Hora) */}
                  <div className="px-4 py-2 flex justify-between items-center text-[10px] font-black text-indigo-300 border-b border-indigo-950/60 shrink-0 bg-slate-900/60">
                    <span className="flex items-center gap-1.5 uppercase">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      {p.mesero}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {p.hora}
                    </span>
                  </div>

                  {/* Detalle de Bebidas */}
                  <div className="p-4 flex-1 bg-slate-900/40 min-h-[120px]">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex items-start py-2.5 border-b border-indigo-950/30 last:border-0">
                        <span className="font-mono font-black text-base mr-3 text-purple-400 w-5 text-center shrink-0">
                          {item.cant}
                        </span>
                        <span className="flex-1 text-slate-100 font-bold text-sm leading-snug pt-0.5 uppercase tracking-wide">
                          {item.nombre}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Botón despachar bebidas */}
                  <div className="p-4 bg-slate-900 shrink-0 border-t border-indigo-950/40">
                    <button
                      onClick={() => marcarListoBarra(p.pedidoId)}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 text-xs"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Listo · Despachar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
