import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCheck, CheckCircle2, User, Truck, XCircle, AlertTriangle } from 'lucide-react';
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
  const [cancelaciones, setCancelaciones] = useState([]);

  const fetchPedidos = useCallback(async () => {
    try {
      const data = await api.getPedidosCocina();
      setPedidos(data);
    } catch (err) {
      console.error('Error cargando cocina:', err);
    }
  }, []);

  const fetchCancelaciones = useCallback(async () => {
    try {
      const data = await api.getCancelacionesCocina();
      if (Array.isArray(data)) setCancelaciones(data);
    } catch (err) {
      console.error('Error cargando cancelaciones:', err);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    fetchCancelaciones();
    const tick = () => {
      fetchPedidos();
      fetchCancelaciones();
      setHoraLocal(new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      }));
    };
    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, [fetchPedidos, fetchCancelaciones]);

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

  const dismissCancelacion = async (id) => {
    try {
      await api.dismissCancelacionCocina(id);
      setCancelaciones(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      // Si falla la red, lo quitamos localmente igual para no bloquear al cocinero
      setCancelaciones(prev => prev.filter(c => c.id !== id));
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

      {/* ═══════════════════════════════════════════════════
          ALERTAS DE CANCELACIÓN PERSISTENTES
          (permanecen hasta que el cocinero presione "Entendido")
      ═══════════════════════════════════════════════════ */}
      {cancelaciones.length > 0 && (
        <div className="bg-red-950 border-b-4 border-red-600 px-4 py-3 space-y-3 shrink-0 z-20">
          {cancelaciones.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-4 bg-red-900/80 border border-red-500 rounded-2xl p-4 shadow-2xl"
              style={{ animation: 'pulse 1.5s ease-in-out 3' }}
            >
              <div className="shrink-0 mt-0.5">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-red-200 font-black text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  PEDIDO CANCELADO — {c.mesaInfo}
                </p>
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                  Cancelado por: {c.canceladoPor} · {new Date(c.canceladoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {c.items.map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-red-800 border border-red-600 text-red-100 font-black text-xs px-3 py-1.5 rounded-xl">
                      <span className="text-red-300">{item.cantidad}×</span>
                      {item.nombre}
                      <span className="text-red-400 font-mono">S/ {parseFloat(item.precio || 0).toFixed(2)}</span>
                      {item.notas && <span className="text-red-300 italic">· {item.notas}</span>}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => dismissCancelacion(c.id)}
                className="shrink-0 px-4 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg border border-red-400"
              >
                ✓ Entendido
              </button>
            </div>
          ))}
        </div>
      )}

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
                            {p.codigoPedidosYa?.startsWith('DELIVERY -') ? '📞 Delivery Fogón'
                              : p.codigoPedidosYa?.startsWith('LLEVAR -') ? '🛍️ Para Llevar / Retiro'
                              : '🛵 PedidosYa'}
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

                  {/* Items (solo cocina, sin bebidas) */}
                  <div className="p-4 flex-1 bg-white min-h-[150px]">
                    {p.items.map((item, i) => (
                      <div key={i} className="flex flex-col py-2 border-b border-dashed border-slate-200 last:border-0">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start flex-1 min-w-0">
                            <span className="font-black text-lg mr-3 text-slate-900 w-6 text-center shrink-0">
                              {item.cant}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="block text-slate-800 font-bold text-sm leading-snug pt-0.5 uppercase">
                                {item.nombre}
                              </span>
                              {/* Precio del ítem — ayuda a identificar la porción */}
                              <span className="inline-block mt-0.5 bg-slate-100 border border-slate-200 text-slate-500 font-black text-[10px] px-2 py-0.5 rounded-lg font-mono">
                                S/ {parseFloat(item.precio || 0).toFixed(2)}
                              </span>
                            </div>
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
                          <div className="ml-9 mt-1.5">
                            <span className="inline-block bg-amber-500 border border-amber-650 text-slate-950 font-bold text-xs md:text-sm px-2.5 py-1 rounded-xl shadow-sm uppercase tracking-wide">
                              📋 NOTA: {item.notas}
                            </span>
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
