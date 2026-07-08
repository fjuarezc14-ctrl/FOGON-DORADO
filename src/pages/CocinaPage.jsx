import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCheck, CheckCircle2, User, Truck } from 'lucide-react';
import { api } from '../api';

const parseDeliveryInfo = (code) => {
  if (!code || !code.startsWith('DELIVERY -')) return null;
  const parts = code.split(' | ');
  const namePart = parts[0] ? parts[0].replace('DELIVERY - ', '') : '';
  const telPart = parts[1] ? parts[1].replace('TEL: ', '') : '';
  const dirPart = parts[2] ? parts[2].replace('DIR: ', '') : '';
  const pagaPart = parts[3] ? parts[3].replace('PAGA: ', '') : '';
  const vueltoPart = parts[4] ? parts[4].replace('VUELTO: ', '') : '';
  
  return {
    nombre: namePart,
    telefono: telPart,
    direccion: dirPart,
    conCuanto: pagaPart,
    vuelto: vueltoPart,
  };
};

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState([]);
  const [horaLocal, setHoraLocal] = useState('');

  const fetchPedidos = useCallback(async () => {
    try {
      const data = await api.getPedidosCocina();
      setPedidos(data);
    } catch (err) {
      console.error('Error cargando cocina:', err);
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

  const marcarListo = async (pedidoId) => {
    try {
      await api.prepararPedido(pedidoId, 'cocina');
      await fetchPedidos();
    } catch (err) {
      alert('Error al marcar listo: ' + err.message);
    }
  };

  const marcarItemListo = async (itemId) => {
    try {
      await api.prepararItem(itemId);
      await fetchPedidos();
    } catch (err) {
      alert('Error al marcar listo el plato: ' + err.message);
    }
  };

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
            <p className="text-xs md:text-sm text-slate-400">
              Solo items de cocina · Las bebidas se sirven desde barra.
            </p>
          </div>
          <div className="text-white flex items-center gap-2 font-bold text-sm bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 shadow-md">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{horaLocal || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 items-start pb-10">
          {pedidos.length === 0
            ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <p className="text-white text-xl font-bold uppercase tracking-widest">Sin pedidos pendientes</p>
                <p className="text-slate-400 mt-2">La cocina está al día.</p>
              </div>
            )
            : pedidos.map((p) => {
              const esDelivery = p.tipoEntrega === 'llevar' || p.tipoEntrega === 'delivery' || !!p.codigoPedidosYa;
              return (
                <div
                  key={p.pedidoId}
                  className={`rounded-t-xl rounded-b shadow-2xl flex flex-col transform transition-all hover:-translate-y-1 relative`}
                  style={{ minHeight: '300px' }}
                >
                  {/* Header del ticket */}
                  <div className={`p-3 text-center shrink-0 border-b-4 relative ${esDelivery ? 'bg-blue-500 border-blue-700 text-white' : 'bg-amber-400 border-amber-500 text-slate-900'}`}>
                    {p.adicional && !esDelivery && (
                      <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-lg rotate-12 animate-pulse border-2 border-white tracking-widest z-10">
                        ¡ADICIONAL!
                      </div>
                    )}
                    {esDelivery ? (
                      <>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Truck className="w-5 h-5" />
                          <span className="font-black text-sm uppercase tracking-widest">
                            {p.codigoPedidosYa?.startsWith('DELIVERY -') ? 'Delivery' : 'Para Llevar'}
                          </span>
                        </div>
                        <h2 className="font-black text-2xl uppercase tracking-tight leading-none">
                          {(() => {
                            if (p.codigoPedidosYa?.startsWith('DELIVERY -')) {
                              const parsed = parseDeliveryInfo(p.codigoPedidosYa);
                              return parsed ? parsed.nombre : p.codigoPedidosYa.replace('DELIVERY - ', '');
                            } else if (p.codigoPedidosYa?.startsWith('LLEVAR -')) {
                              return p.codigoPedidosYa.replace('LLEVAR - ', '');
                            }
                            return p.codigoPedidosYa || 'DELIVERY';
                          })()}
                        </h2>
                      </>
                    ) : (
                      <h2 className="font-black text-3xl uppercase tracking-tighter leading-none">
                        Mesa {p.mesaNum}
                      </h2>
                    )}
                  </div>

                  {/* Info del pedido */}
                  <div className="p-3 flex justify-between items-center text-xs font-black text-slate-500 border-b-2 border-slate-900 shrink-0 bg-slate-50">
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      {p.mesero}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {p.hora}
                    </span>
                  </div>

                  {/* Detalles de entrega para Delivery */}
                  {(() => {
                    const parsed = parseDeliveryInfo(p.codigoPedidosYa);
                    if (!parsed) return null;
                    return (
                      <div className="p-2.5 bg-blue-50 border-b border-blue-200 text-[10px] font-bold text-blue-900 uppercase leading-snug shrink-0 text-left">
                        <div className="truncate">📞 {parsed.telefono}</div>
                        <div className="truncate mt-0.5">📍 {parsed.direccion}</div>
                      </div>
                    );
                  })()}

                  {/* Items (solo cocina, sin bebidas) */}
                  <div className="p-4 flex-1 bg-white min-h-[150px]">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex flex-col py-2 border-b border-dashed border-slate-200 last:border-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <span className="font-black text-lg mr-3 text-slate-900 w-6 text-center shrink-0">
                              {item.cant}
                            </span>
                            <span className="flex-1 text-slate-800 font-bold text-sm leading-snug pt-0.5 uppercase">
                              {item.nombre}
                            </span>
                          </div>
                          <button
                            onClick={() => marcarItemListo(item.id)}
                            className="p-1.5 hover:bg-emerald-500 hover:text-white rounded-lg text-slate-450 border border-slate-200 hover:border-emerald-500 transition-all active:scale-90 ml-2 shrink-0"
                            title="Marcar este plato como Listo"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                        {item.notas && (
                          <div className="ml-9 mt-1">
                            <span className="inline-block bg-slate-900 border border-slate-700/50 text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded font-black tracking-wide uppercase">📋 NOTA: {item.notas}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Botón listo */}
                  <div className="p-4 bg-slate-50 shrink-0 pb-6 border-t-2 border-dashed border-slate-300">
                    <button
                      onClick={() => marcarListo(p.pedidoId)}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCheck className="w-5 h-5" />
                      {esDelivery ? 'Listo para Recoger' : 'Listo · Servir'}
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
