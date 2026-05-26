import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, CheckCircle, PlusCircle, Receipt, X, Edit3, ShoppingBag, User, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../api';

const LIMITE_CANCELACION_MS = 5 * 60 * 1000;

function formatCuentaRegresiva(ms) {
  const seg = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(seg / 60);
  const s = seg % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

// Sintetizador Web Audio API de Campana de Restaurante Premium (G5 -> C6)
function playChimeNotification() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playTone(784, audioCtx.currentTime, 0.6);
    playTone(1046.5, audioCtx.currentTime + 0.12, 0.8);
  } catch (e) {
    console.error('AudioContext bloqueado/no soportado:', e);
  }
}

export default function SalonPage() {
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mesaActual, setMesaActual] = useState(null);
  const [ticketActual, setTicketActual] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [meseroGlobal, setMeseroGlobal] = useState('Carlos');
  const [enviando, setEnviando] = useState(false);
  // Cancelación
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelandoPedido, setCancelandoPedido] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(LIMITE_CANCELACION_MS);

  // Estados de Notificación en Tiempo Real
  const [prevMesas, setPrevMesas] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Cargar mesas desde el API real
  const fetchMesas = useCallback(async () => {
    try {
      const data = await api.getMesas();
      setMesas(data);
    } catch (err) {
      console.error('Error cargando mesas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar productos activos desde el API real
  const fetchProductos = useCallback(async () => {
    try {
      const data = await api.getProductos();
      setProductos(data);
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
    fetchProductos();
    // Sincronización en tiempo real cada 3 segundos
    const interval = setInterval(() => {
      if (!modalOpen) fetchMesas();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMesas, fetchProductos, modalOpen]);

  const abrirModal = (m) => {
    setMesaActual(m);
    if (m.pedidoData?.items?.length > 0) {
      let items = JSON.parse(JSON.stringify(m.pedidoData.items));
      // Cualquier producto ya existente en la mesa se considera comanda histórica
      // para evitar que al agregar items nuevos se reenvíen los antiguos.
      items.forEach(i => i.historial = true);
      setTicketActual(items);
    } else {
      setTicketActual([]);
    }
    setCategoriaActiva('Todos');
    setModalOpen(true);
  };

  const agregarAlTicket = (prod) => {
    let nuevosItems = [...ticketActual];
    const index = nuevosItems.findIndex(t => String(t.id) === String(prod.id) && !t.historial);
    if (index >= 0) {
      nuevosItems[index].cant++;
    } else {
      nuevosItems.push({ id: String(prod.id), nombre: prod.nombre, precio: prod.precio, cant: 1, historial: false });
    }
    setTicketActual(nuevosItems);
  };

  const alterarCantidad = (index, operacion) => {
    let nuevos = [...ticketActual];
    if (nuevos[index].historial) return;
    if (operacion === '+') nuevos[index].cant++;
    else {
      nuevos[index].cant--;
      if (nuevos[index].cant <= 0) nuevos.splice(index, 1);
    }
    setTicketActual(nuevos);
  };

  // Detector de mesas listas para el mesero activo (Sonido + Toast)
  useEffect(() => {
    if (mesas.length === 0) {
      if (prevMesas.length === 0) setPrevMesas(mesas);
      return;
    }
    if (prevMesas.length > 0) {
      const listasNuevas = [];
      mesas.forEach(m => {
        const ant = prevMesas.find(p => p.num === m.num);
        if (ant && ant.estado === 'Cocina' && m.estado === 'Servido') {
          if (m.pedidoData?.mesero === meseroGlobal) {
            listasNuevas.push(m.num);
          }
        }
      });
      if (listasNuevas.length > 0) {
        playChimeNotification();
        listasNuevas.forEach(num => {
          const toastId = Date.now() + Math.random();
          setToasts(prev => [...prev, { id: toastId, mesa: num, mensaje: `🛎️ ¡Mesa ${num} lista para servir!` }]);
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 6000);
        });
      }
    }
    setPrevMesas(mesas);
  }, [mesas, meseroGlobal, prevMesas]);

  // Countdown timer para cancelación
  useEffect(() => {
    if (!modalOpen || !mesaActual?.pedidoData?.pedidoCreadoEn) return;
    const calcular = () => {
      const elapsed = Date.now() - new Date(mesaActual.pedidoData.pedidoCreadoEn).getTime();
      setTiempoRestante(Math.max(0, LIMITE_CANCELACION_MS - elapsed));
    };
    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [modalOpen, mesaActual?.pedidoData?.pedidoCreadoEn]);

  const handleCancelarPedido = async () => {
    if (!cancelMotivo.trim()) { alert('Por favor escribe un motivo para la cancelación.'); return; }
    setCancelandoPedido(true);
    try {
      const pedidoId = mesaActual.pedidoData.pedidoId;
      const result = await api.cancelarPedido(pedidoId, {
        canceladoPor: meseroGlobal,
        motivo: cancelMotivo.trim(),
      });
      if (result.error) throw new Error(result.error);
      setCancelModal(false);
      setModalOpen(false);
      setCancelMotivo('');
      await fetchMesas();
      alert(`✅ Pedido cancelado correctamente. Mesa ${mesaActual.num} liberada.`);
    } catch (err) {
      alert('Error al cancelar: ' + err.message);
    } finally {
      setCancelandoPedido(false);
    }
  };

  const enviarACocina = async () => {
    const nuevosItems = ticketActual.filter(i => !i.historial);
    if (nuevosItems.length === 0) { alert('No has agregado ningún producto nuevo.'); return; }

    setEnviando(true);
    try {
      const totalNuevos = nuevosItems.reduce((acc, val) => acc + (val.cant * val.precio), 0);
      const esAdicional = mesaActual.pedidoData?.items?.length > 0;

      await api.enviarACocina(mesaActual.num, {
        mesero: meseroGlobal,
        items: nuevosItems, // Enviamos UNICAMENTE los nuevos items añadidos
        total: totalNuevos, // Enviamos el total del pedido adicional específico
        adicional: esAdicional,
      });

      setModalOpen(false);
      await fetchMesas();
    } catch (err) {
      alert('Error al enviar a cocina: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const menuFiltrado = categoriaActiva === 'Todos' ? productos : productos.filter(p => p.categoria === categoriaActiva);
  const totalTicket = ticketActual.reduce((acc, item) => acc + (item.cant * item.precio), 0);
  const badgeEstado = mesaActual?.estado === 'Servido' && ticketActual.length > 0
    ? 'text-blue-700 bg-blue-100' : (ticketActual.length > 0 ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100');
  const badgeTexto = mesaActual?.estado === 'Servido' && ticketActual.length > 0
    ? '+ ADICIONAL' : (ticketActual.length > 0 ? 'Editando Pedido' : 'Nueva Orden');

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold">Cargando mesas...</p>
      </div>
    </div>
  );

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Atención en Salón</h1>
          <p className="text-xs md:text-sm text-slate-500">Toca una mesa para tomar, editar o agregar un pedido adicional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-600 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Libre</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-600 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Cocina</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-600 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Servido</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-700 uppercase bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
            Sync BD Activo
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5 pb-20 md:pb-0">
        {mesas.map((m, idx) => {
          let colorBg = 'bg-white hover:bg-emerald-50', colorText = 'text-slate-300', colorBorder = 'border-slate-200', Icon = Receipt;
          if (m.estado === 'Cocina') { colorBg = 'bg-amber-50'; colorText = 'text-amber-500'; colorBorder = 'border-amber-300 shadow-md'; Icon = ChefHat; }
          else if (m.estado === 'Servido') { colorBg = 'bg-blue-50'; colorText = 'text-blue-500'; colorBorder = 'border-blue-300 shadow-md'; Icon = CheckCircle; }

          return (
            <div key={idx} onClick={() => abrirModal(m)} className={`relative rounded-2xl md:rounded-3xl border-2 ${colorBorder} ${colorBg} p-3 md:p-5 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 hover:-translate-y-1 aspect-square md:aspect-auto md:h-40 group`}>
              <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center ${colorText} mb-1 md:mb-2 bg-white shadow-sm border border-slate-100`}>
                <Icon className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-sm md:text-lg uppercase tracking-tight">Mesa {m.num}</h3>
              {m.pedidoData
                ? <p className="font-mono font-black text-sm md:text-lg mt-1 text-slate-800">S/ {m.pedidoData.total.toFixed(2)}</p>
                : <p className="text-[10px] md:text-xs mt-1 text-slate-400 font-medium">Disponible</p>
              }
            </div>
          );
        })}
      </div>

      {modalOpen && mesaActual && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[90vh] max-w-6xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 md:p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500 rounded-lg md:rounded-xl flex items-center justify-center text-slate-900"><Edit3 className="w-4 h-4 md:w-5 md:h-5" /></div>
                <div>
                  <h2 className="font-black text-sm md:text-lg uppercase tracking-tight leading-none">Mesa <span className="text-amber-400 text-lg md:text-xl">{mesaActual.num}</span></h2>
                  <p className="text-[10px] md:text-xs text-slate-400">Punto de Venta</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <select value={meseroGlobal} onChange={(e) => setMeseroGlobal(e.target.value)} className="bg-transparent text-white text-xs font-bold focus:outline-none">
                    <option>Carlos</option><option>María</option><option>Luis</option>
                  </select>
                </div>
                <button onClick={() => setModalOpen(false)} className="bg-slate-800 hover:bg-red-500 text-slate-300 hover:text-white p-2 md:p-2.5 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-slate-50">
              <div className="w-full md:w-3/5 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-slate-200">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar p-3 shrink-0 bg-white shadow-sm z-10">
                  {['Todos', 'Pollos', 'Guarniciones', 'Bebidas'].map(cat => (
                    <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase whitespace-nowrap shadow-sm transition-colors ${categoriaActiva === cat ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'}`}>{cat}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4 p-3 overflow-y-auto custom-scrollbar content-start flex-1">
                  {menuFiltrado.map(prod => (
                    <div key={prod.id} onClick={() => agregarAlTicket(prod)} className="bg-white border border-slate-200 rounded-xl p-3 md:p-4 flex flex-col justify-between cursor-pointer active:bg-slate-50 transition-colors shadow-sm relative overflow-hidden h-24 md:h-28 hover:border-amber-300">
                      <p className="font-bold text-slate-800 text-[10px] md:text-xs uppercase leading-tight pr-4 z-10">{prod.nombre}</p>
                      <p className="font-black font-mono text-emerald-600 text-sm md:text-base z-10">S/ {prod.precio.toFixed(2)}</p>
                      <PlusCircle className="absolute bottom-[-10px] right-[-10px] w-12 h-12 text-slate-100 opacity-50" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-2/5 bg-white flex flex-col min-h-[40vh] md:min-h-0">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-amber-50 shrink-0 flex justify-between items-center">
                  <h3 className="font-black text-amber-800 uppercase text-xs flex items-center gap-2"><Receipt className="w-4 h-4" /> Pedido Actual</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-slate-200 uppercase ${badgeEstado} ${mesaActual?.estado === 'Servido' ? 'animate-pulse' : ''}`}>{badgeTexto}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar bg-slate-50/50">
                  <ul className="space-y-2 md:space-y-3">
                    {ticketActual.length === 0
                      ? <div className="flex flex-col items-center justify-center h-32 opacity-50"><ShoppingBag className="w-8 h-8 mb-2" /><p className="text-center text-slate-500 font-bold text-xs">Aún no hay productos en la mesa.</p></div>
                      : ticketActual.map((item, idx) => {
                          const sub = item.cant * item.precio;
                          if (item.historial) return (
                            <li key={idx} className="bg-slate-50 border border-slate-200 p-2.5 md:p-3 rounded-xl flex items-center justify-between opacity-60 grayscale">
                              <div className="flex-1 pr-2">
                                <p className="font-bold text-slate-500 text-[10px] md:text-xs leading-tight line-through">{item.nombre}</p>
                                <p className="font-mono text-slate-400 font-bold text-xs md:text-sm mt-1">S/ {sub.toFixed(2)}</p>
                              </div>
                              <div className="font-black text-slate-400 text-sm px-3">{item.cant} <span className="text-[10px]">✔</span></div>
                            </li>
                          );
                          return (
                            <li key={idx} className="bg-white border border-slate-200 p-2.5 md:p-3 rounded-xl flex items-center justify-between shadow-sm">
                              <div className="flex-1 pr-2">
                                <p className="font-bold text-slate-800 text-[10px] md:text-xs leading-tight">{item.nombre}</p>
                                <p className="font-mono text-emerald-600 font-bold text-xs md:text-sm mt-1">S/ {sub.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-1 md:gap-2 bg-slate-100 rounded-lg p-1 shrink-0 border border-slate-200">
                                <button onClick={() => alterarCantidad(idx, '-')} className="w-8 h-8 md:w-7 md:h-7 bg-white rounded-md shadow-sm text-slate-600 font-black text-lg leading-none">-</button>
                                <span className="font-bold text-slate-900 w-5 text-center text-sm">{item.cant}</span>
                                <button onClick={() => alterarCantidad(idx, '+')} className="w-8 h-8 md:w-7 md:h-7 bg-white rounded-md shadow-sm text-slate-600 font-black text-lg leading-none">+</button>
                              </div>
                            </li>
                          );
                        })
                    }
                  </ul>
                </div>

                <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="flex justify-between items-end mb-3 md:mb-4 px-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] md:text-xs tracking-widest">Total Mesa</span>
                    <span className="font-black font-mono text-2xl md:text-3xl text-slate-900 leading-none">S/ {totalTicket.toFixed(2)}</span>
                  </div>

                  {/* Botón cancelar pedido (solo si hay pedido en Cocina) */}
                  {mesaActual?.pedidoData && mesaActual.estado === 'Cocina' && (
                    <div className="mb-3">
                      {tiempoRestante > 0 ? (
                        <button
                          onClick={() => setCancelModal(true)}
                          className="w-full py-2.5 bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Cancelar Pedido
                          <span className="ml-1 font-mono bg-red-100 border border-red-200 px-2 py-0.5 rounded-md text-red-600">
                            <Clock className="w-3 h-3 inline mr-1" />{formatCuentaRegresiva(tiempoRestante)}
                          </span>
                        </button>
                      ) : (
                        <div className="w-full py-2.5 bg-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                          <Clock className="w-4 h-4" /> Cancelación · Tiempo agotado
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <button onClick={() => setModalOpen(false)} className="py-3.5 md:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs md:text-sm uppercase tracking-wide transition-colors">Guardar / Salir</button>
                    <button onClick={enviarACocina} disabled={enviando} className="py-3.5 md:py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase tracking-tight rounded-xl text-xs md:text-sm transition-colors shadow-lg shadow-amber-500/30 flex justify-center items-center gap-2 disabled:opacity-50">
                      {enviando ? <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span> : <ChefHat className="w-4 h-4 md:w-5 md:h-5" />}
                      A Cocina
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE CANCELACIÓN */}
      {cancelModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-none">Cancelar Pedido</h3>
                <p className="text-xs text-slate-500 mt-1">Mesa {mesaActual?.num} · Mozo: {meseroGlobal}</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
              <p className="text-xs text-red-700 font-bold">
                ⚠️ Esta acción eliminará el pedido. Si algún insumo ya fue usado, se habrá generado un desperdicio.
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">Motivo de cancelación (obligatorio):</label>
              <textarea
                rows={3}
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ej: Cliente cambió de opinión, se equivocó de mesa..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 resize-none font-medium text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setCancelModal(false); setCancelMotivo(''); }}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm uppercase tracking-wide transition-colors"
              >
                No cancelar
              </button>
              <button
                onClick={handleCancelarPedido}
                disabled={cancelandoPedido || !cancelMotivo.trim()}
                className="py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-sm uppercase tracking-wide transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/20"
              >
                {cancelandoPedido
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  : <><AlertTriangle className="w-4 h-4" /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FLOATING TOASTS NOTIFICATIONS SYSTEM */}
      <div className="fixed bottom-6 right-6 z-[250] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto bg-slate-900 border border-emerald-500/20 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-slide-up relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent"></div>
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-lg animate-bounce shrink-0 shadow-lg shadow-emerald-500/20">
              🛎️
            </div>
            <div className="flex-1 pr-2 relative z-10">
              <h4 className="font-black text-xs text-emerald-400 uppercase tracking-widest leading-none mb-1">¡Pedido Listo!</h4>
              <p className="font-bold text-sm text-slate-100">{t.mensaje}</p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors relative z-10 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
