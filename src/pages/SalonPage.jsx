import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChefHat, CheckCircle, PlusCircle, Receipt, X, Edit3, ShoppingBag, User, AlertTriangle, Clock, Trash, Lock, Tag, Percent, Link2 } from 'lucide-react';
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

export default function SalonPage({ currentUser }) {
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mesaActual, setMesaActual] = useState(null);
  const [ticketActual, setTicketActual] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [meseroGlobal, setMeseroGlobal] = useState(currentUser?.nombre || 'Carlos');
  const [enviando, setEnviando] = useState(false);
  // Cancelación
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelandoPedido, setCancelandoPedido] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(LIMITE_CANCELACION_MS);

  // Modal de Autorización PIN
  const [authModal, setAuthModal] = useState({ open: false, pin: '', error: '', callback: null, promptText: '' });
  const [supervisorAprobador, setSupervisorAprobador] = useState(null);

  // Estados de Notificación en Tiempo Real
  const prevMesasRef = useRef([]);
  const [toasts, setToasts] = useState([]);
  const [unionDropdownOpen, setUnionDropdownOpen] = useState(false);

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

  // Cargar usuarios para el listado de mozos
  const fetchUsuarios = useCallback(async () => {
    try {
      const data = await api.getUsuarios();
      setUsuarios(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  }, []);

  // Mantener meseroGlobal sincronizado con currentUser si este se carga después
  useEffect(() => {
    if (currentUser?.nombre) {
      setMeseroGlobal(currentUser.nombre);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMesas();
    fetchProductos();
    fetchUsuarios();
    // Sincronización en tiempo real cada 3 segundos (sincroniza mesas y productos para ofertas en vivo)
    const interval = setInterval(() => {
      fetchProductos(); // <-- Traer productos para actualizar ofertas en tiempo real
      if (!modalOpen) {
        fetchMesas();
        fetchUsuarios();
      } else {
        // Si el modal está abierto, seguimos actualizando las mesas en segundo plano
        fetchMesas();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMesas, fetchProductos, fetchUsuarios, modalOpen]);

  const handleUnirMesa = async (numToJoin) => {
    try {
      const res = await api.unirMesa(mesaActual.num, numToJoin);
      if (res.ok) {
        alert(`✅ Mesa ${numToJoin} unida correctamente a la Mesa ${mesaActual.num}.`);
        setUnionDropdownOpen(false);
        fetchMesas();
      } else {
        alert(`❌ Error: ${res.error}`);
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleSepararMesas = async () => {
    if (confirm(`⚠️ ¿Estás seguro de separar todas las mesas unidas a la Mesa ${mesaActual.num}?`)) {
      try {
        const res = await api.separarMesas(mesaActual.num);
        if (res.ok) {
          alert(`✅ Mesas separadas con éxito.`);
          setUnionDropdownOpen(false);
          fetchMesas();
        } else {
          alert(`❌ Error: ${res.error}`);
        }
      } catch (err) {
        alert(`❌ Error: ${err.message}`);
      }
    }
  };

  const abrirModal = (m) => {
    // Si la mesa está unida a otra, informar al usuario y bloquear ingreso
    if (m.estado && m.estado.startsWith("Unida a ")) {
      const mesaPrincipalNum = m.estado.replace("Unida a Mesa ", "");
      alert(`⚠️ Esta mesa está UNIDA a la Mesa ${mesaPrincipalNum}. Todo el consumo y pedidos se registran directamente en la Mesa ${mesaPrincipalNum}.`);
      return;
    }

    const activeMeseroName = currentUser?.nombre || meseroGlobal;

    // Si la mesa está ocupada y el mesero asignado no es el mesero global activo, y el usuario es un Mozo, bloquear acceso
    if (m.pedidoData && m.pedidoData.mesero && m.pedidoData.mesero !== activeMeseroName && currentUser?.rol === 'Mozo') {
      alert(`⚠️ Esta mesa está ocupada y está siendo atendida por el Mozo "${m.pedidoData.mesero}". No puedes ingresar ni realizar modificaciones.`);
      return;
    }
    setMesaActual(m);
    if (m.pedidoData?.items?.length > 0) {
      let items = JSON.parse(JSON.stringify(m.pedidoData.items));
      // Cualquier producto ya existente en la mesa se considera comanda histórica
      // para evitar que al agregar items nuevos se reenvíen los antiguos.
      items.forEach(i => i.yaEnviado = true);
      setTicketActual(items);
    } else {
      setTicketActual([]);
    }
    setCategoriaActiva('Todos');
    setModalOpen(true);
  };

  const agregarAlTicket = (prod) => {
    let nuevosItems = [...ticketActual];
    const index = nuevosItems.findIndex(t => String(t.id) === String(prod.id) && !t.yaEnviado);
    
    // Calcular cuántos ya hay en el ticket activo
    const cantEnTicket = index >= 0 ? nuevosItems[index].cant : 0;
    
    // Si el stock es limitado y ya no queda disponible
    if (prod.tipoStock === 'limitado' && cantEnTicket >= prod.stock) {
      alert(`⚠️ Stock agotado. Solo quedan ${prod.stock} unidades de "${prod.nombre}".`);
      return;
    }
    
    const precioFinal = prod.precioOferta !== null && prod.precioOferta !== undefined ? prod.precioOferta : prod.precio;
    
    if (index >= 0) {
      nuevosItems[index].cant++;
    } else {
      nuevosItems.push({ 
        id: String(prod.id), 
        nombre: prod.nombre, 
        precio: precioFinal, 
        cant: 1, 
        yaEnviado: false, 
        historial: false, 
        notas: '',
        ofertaNombre: prod.ofertaNombre || null,
        precioOriginal: prod.precio
      });
    }
    setTicketActual(nuevosItems);
  };

  const alterarCantidad = (index, operacion) => {
    let nuevos = [...ticketActual];
    if (nuevos[index].yaEnviado) return;
    if (operacion === '+') {
      // Validar stock de nuevo si es limitado
      const prodOriginal = productos.find(p => String(p.id) === String(nuevos[index].id));
      if (prodOriginal && prodOriginal.tipoStock === 'limitado' && nuevos[index].cant >= prodOriginal.stock) {
        alert(`⚠️ Stock agotado. Solo quedan ${prodOriginal.stock} unidades de "${prodOriginal.nombre}".`);
        return;
      }
      nuevos[index].cant++;
    } else {
      nuevos[index].cant--;
      if (nuevos[index].cant <= 0) nuevos.splice(index, 1);
    }
    setTicketActual(nuevos);
  };

  // Detector de mesas listas para el mesero activo (Sonido + Toast)
  useEffect(() => {
    if (mesas.length === 0) {
      if (prevMesasRef.current.length === 0) prevMesasRef.current = mesas;
      return;
    }
    if (prevMesasRef.current.length > 0) {
      const listasNuevas = [];
      const activeMeseroName = currentUser?.nombre || meseroGlobal;
      mesas.forEach(m => {
        const ant = prevMesasRef.current.find(p => p.num === m.num);
        if (ant && ant.estado === 'Cocina' && m.estado === 'Servido') {
          // Si corresponde a mi mesa, o si soy Administrador/Cajero, me alerta
          const esMiMesa = m.pedidoData?.mesero === activeMeseroName || ['Administrador', 'Cajero'].includes(currentUser?.rol);
          if (esMiMesa) {
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
    prevMesasRef.current = mesas;
  }, [mesas, meseroGlobal, currentUser]);

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
      const isForce = tiempoRestante <= 0 || mesaActual.estado === 'Servido';
      const result = await api.cancelarPedido(pedidoId, {
        canceladoPor: supervisorAprobador ? `${supervisorAprobador.nombre} (${supervisorAprobador.rol}) | Mozo: ${meseroGlobal}` : meseroGlobal,
        motivo: cancelMotivo.trim(),
        force: isForce,
      });
      if (result.error) throw new Error(result.error);
      setCancelModal(false);
      setModalOpen(false);
      const mesaNum = mesaActual.num;
      setMesaActual(null);
      setCancelMotivo('');
      await fetchMesas();
      
      if (result.mesaLiberada) {
        alert(`✅ Pedido cancelado correctamente. Mesa ${mesaNum} ha sido liberada.`);
      } else {
        alert(`✅ Pedido adicional cancelado correctamente. La mesa ${mesaNum} sigue activa con consumos previos.`);
      }
    } catch (err) {
      alert('Error al cancelar: ' + err.message);
    } finally {
      setCancelandoPedido(false);
    }
  };

  const handleCancelarItem = async (item, supervisor) => {
    const motivo = prompt(`Escribe el motivo de cancelación para ${item.nombre}:`);
    if (motivo === null) return;
    if (!motivo.trim()) { alert("El motivo de cancelación es obligatorio."); return; }
    
    const cantStr = prompt(`Cantidad a cancelar (Máximo ${item.cant}):`, item.cant.toString());
    if (cantStr === null) return;
    const cant = parseInt(cantStr);
    if (isNaN(cant) || cant <= 0 || cant > item.cant) { alert("Cantidad no válida."); return; }

    const isForce = tiempoRestante <= 0 || mesaActual.estado === 'Servido' || item.historial;

    try {
      const res = await api.cancelarItemPedido(item.pedidoId, {
        productoId: item.id,
        cantidadACancelar: cant,
        motivo: motivo.trim(),
        canceladoPor: supervisor ? `${supervisor.nombre} (${supervisor.rol})` : meseroGlobal,
        force: isForce,
      });
      if (res.error) throw new Error(res.error);
      
      await fetchMesas();
      setModalOpen(false);
      
      if (res.pedidoVacio) {
        if (res.mesaLiberada) {
          alert(`✅ Comanda anulada por completo. Mesa ${mesaActual.num} ahora está LIBRE.`);
        } else {
          alert(`✅ Comanda anulada por completo. La mesa ${mesaActual.num} sigue activa con consumos previos.`);
        }
      } else {
        alert(`✅ Se cancelaron ${cant} unidades de "${item.nombre}" correctamente.`);
      }
    } catch (err) {
      alert("Error al cancelar ítem: " + err.message);
    }
  };

  const handleAuthPinKeyPress = async (num) => {
    let nuevoPin = authModal.pin + num;
    if (nuevoPin.length < 4) {
      setAuthModal(prev => ({ ...prev, pin: nuevoPin, error: '' }));
    } else if (nuevoPin.length === 4) {
      setAuthModal(prev => ({ ...prev, pin: nuevoPin, error: '' }));
      try {
        const res = await api.validateAuth(nuevoPin);
        if (res.error) throw new Error(res.error);
        
        // Autorización exitosa! Ejecutar el callback
        authModal.callback(res);
        setAuthModal({ open: false, pin: '', error: '', callback: null, promptText: '' });
      } catch (err) {
        setAuthModal(prev => ({ ...prev, pin: '', error: err.message || 'Acceso Denegado' }));
      }
    }
  };

  const handleAuthPinBackspace = () => {
    setAuthModal(prev => ({ ...prev, pin: prev.pin.slice(0, -1), error: '' }));
  };

  const requestSupervisorAuth = (promptText, callback) => {
    setAuthModal({
      open: true,
      pin: '',
      error: '',
      callback,
      promptText
    });
  };

  const enviarACocina = async () => {
    const nuevosItems = ticketActual.filter(i => !i.yaEnviado);
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
          if (m.estado === 'Cocina') { 
            colorBg = 'bg-amber-50'; colorText = 'text-amber-500'; colorBorder = 'border-amber-300 shadow-md'; Icon = ChefHat; 
          } else if (m.estado === 'Servido') { 
            colorBg = 'bg-blue-50'; colorText = 'text-blue-500'; colorBorder = 'border-blue-300 shadow-md'; Icon = CheckCircle; 
          } else if (m.estado && m.estado.startsWith("Unida a ")) {
            colorBg = 'bg-slate-50/70 border-dashed opacity-80'; colorText = 'text-slate-400'; colorBorder = 'border-slate-300 border-dashed'; Icon = Link2;
          }

          return (
            <div key={idx} onClick={() => abrirModal(m)} className={`relative rounded-2xl md:rounded-3xl border-2 ${colorBorder} ${colorBg} p-3 md:p-5 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 hover:-translate-y-1 aspect-square md:aspect-auto md:h-40 group`}>
              <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center ${colorText} mb-1 md:mb-2 bg-white shadow-sm border border-slate-100`}>
                <Icon className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-sm md:text-lg uppercase tracking-tight">Mesa {m.num}</h3>
              {m.estado && m.estado.startsWith("Unida a ") ? (
                <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full mt-1.5">
                  🔗 {m.estado}
                </span>
              ) : m.pedidoData ? (
                <div className="flex flex-col items-center">
                  <p className="font-mono font-black text-sm md:text-lg mt-1 text-slate-800">S/ {m.pedidoData.total.toFixed(2)}</p>
                  <span className="text-[8px] md:text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1.5 uppercase truncate max-w-[110px] text-center">
                    👤 {m.pedidoData.mesero}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] md:text-xs mt-1 text-slate-400 font-medium">Disponible</p>
              )}
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
                <button 
                  onClick={() => setUnionDropdownOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-955 font-black text-[10px] md:text-xs px-3 py-2 rounded-xl shadow-md transition-all uppercase tracking-wider"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Unir Mesa
                </button>
                <div className="hidden md:flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <select 
                    disabled={currentUser?.rol === 'Mozo'} 
                    value={meseroGlobal} 
                    onChange={(e) => setMeseroGlobal(e.target.value)} 
                    className="bg-slate-800 text-white text-xs font-bold focus:outline-none disabled:opacity-80 border-0"
                  >
                    {/* Mostrar los usuarios del sistema que tengan roles de atención (Mozo, Cajero, Admin) */}
                    {usuarios.filter(u => u.activo).length === 0 ? (
                      <option value={meseroGlobal} className="bg-slate-800 text-white">{meseroGlobal}</option>
                    ) : (
                      <>
                        {!usuarios.some(u => u.activo && u.nombre === meseroGlobal) && (
                          <option value={meseroGlobal} className="bg-slate-800 text-white">{meseroGlobal}</option>
                        )}
                        {usuarios
                          .filter(u => u.activo && ['Mozo', 'Cajero', 'Administrador'].includes(u.rol))
                          .map(u => (
                            <option key={u.id} value={u.nombre} className="bg-slate-800 text-white">
                              {u.nombre} ({u.rol})
                            </option>
                          ))
                        }
                      </>
                    )}
                  </select>
                </div>
                <button onClick={() => setModalOpen(false)} className="bg-slate-800 hover:bg-red-500 text-slate-300 hover:text-white p-2 md:p-2.5 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-slate-50">
              <div className="w-full md:w-3/5 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-slate-200">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar p-3 shrink-0 bg-white shadow-sm z-10">
                  {['Todos', ...new Set(productos.map(p => p.categoria))].map(cat => (
                    <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase whitespace-nowrap shadow-sm transition-colors ${categoriaActiva === cat ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'}`}>{cat}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4 p-3 overflow-y-auto custom-scrollbar content-start flex-1">
                  {menuFiltrado.map(prod => {
                    const cantEnTicket = ticketActual.filter(t => String(t.id) === String(prod.id) && !t.yaEnviado).reduce((sum, item) => sum + item.cant, 0);
                    const stockDisponible = prod.tipoStock === 'limitado' ? prod.stock - cantEnTicket : Infinity;
                    const agotado = prod.tipoStock === 'limitado' && stockDisponible <= 0;
                    
                    return (
                      <div 
                        key={prod.id} 
                        onClick={() => !agotado && agregarAlTicket(prod)} 
                        className={`bg-white border rounded-xl p-3 md:p-4 flex flex-col justify-between shadow-sm relative overflow-hidden h-24 md:h-28 transition-all ${
                          agotado 
                            ? 'opacity-50 grayscale border-slate-200 cursor-not-allowed bg-slate-50' 
                            : 'cursor-pointer hover:border-amber-300 hover:-translate-y-0.5 active:bg-slate-50'
                        }`}
                      >
                        {prod.precioOferta !== null && prod.precioOferta !== undefined && !agotado && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1 animate-pulse z-15">
                            <Tag className="w-2.5 h-2.5" />
                            {prod.ofertaValor}% OFF
                          </div>
                        )}
                        <div className="z-10 flex flex-col justify-between h-full w-full">
                          <div>
                            <p className="font-bold text-slate-800 text-[10px] md:text-xs uppercase leading-tight pr-4">{prod.nombre}</p>
                            {prod.tipoStock === 'limitado' && (
                              <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded mt-1.5 ${
                                agotado ? 'bg-red-100 text-red-650' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {agotado ? 'AGOTADO' : `STOCK: ${stockDisponible}`}
                              </span>
                            )}
                          </div>
                          {prod.precioOferta !== null && prod.precioOferta !== undefined ? (
                            <div className="flex flex-col items-start leading-none -mt-1">
                              <span className="font-black font-mono text-emerald-600 text-sm md:text-base">S/ {prod.precioOferta.toFixed(2)}</span>
                              <span className="line-through text-slate-400 font-semibold text-[10px] md:text-xs mt-0.5">S/ {prod.precio.toFixed(2)}</span>
                            </div>
                          ) : (
                            <p className="font-black font-mono text-emerald-600 text-sm md:text-base">S/ {prod.precio.toFixed(2)}</p>
                          )}
                        </div>
                        <PlusCircle className="absolute bottom-[-10px] right-[-10px] w-12 h-12 text-slate-100 opacity-50 pointer-events-none" />
                      </div>
                    );
                  })}
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
                          if (item.yaEnviado) {
                            const esCancelable = item.pedidoId === mesaActual.pedidoData?.pedidoId;
                            return (
                              <li key={idx} className="bg-slate-50 border border-slate-200 p-2.5 md:p-3 rounded-xl flex flex-col gap-1.5 opacity-60 grayscale">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 pr-2">
                                    <p className={`font-bold text-[10px] md:text-xs leading-tight ${item.historial ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.nombre}</p>
                                    {(() => {
                                      const prodOriginal = productos.find(p => String(p.id) === String(item.id));
                                      const tieneDescuento = prodOriginal && prodOriginal.precio > item.precio;
                                      return (
                                        <div className="flex items-baseline gap-1.5 mt-1">
                                          {tieneDescuento && (
                                            <span className="line-through text-slate-400 font-semibold text-[10px]">S/ {(item.cant * prodOriginal.precio).toFixed(2)}</span>
                                          )}
                                          <span className="font-mono text-slate-400 font-bold text-xs md:text-sm">S/ {sub.toFixed(2)}</span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="font-black text-slate-400 text-sm px-3">
                                      {item.cant} <span className="text-[10px]">{item.historial ? '✔ Ready' : '⏳ Pendiente'}</span>
                                    </div>
                                    {esCancelable && (
                                      <button 
                                        onClick={() => {
                                          requestSupervisorAuth(`Anular "${item.nombre}"`, (supervisor) => handleCancelarItem(item, supervisor));
                                        }} 
                                        title="Anular o reducir cantidad de este producto"
                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg hover:text-red-700 transition-colors pointer-events-auto shrink-0"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {item.notas && (
                                  <div>
                                    <span className="inline-block bg-amber-50 border border-amber-200/50 text-amber-600 text-[10px] px-2 py-0.5 rounded font-black tracking-wide">📋 NOTA: {item.notas}</span>
                                  </div>
                                )}
                              </li>
                            );
                          }
                          return (
                            <li key={idx} className="bg-white border border-slate-200 p-2.5 md:p-3 rounded-xl flex flex-col gap-2 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 pr-2">
                                  <p className="font-bold text-slate-800 text-[10px] md:text-xs leading-tight">{item.nombre}</p>
                                  {(() => {
                                    const prodOriginal = productos.find(p => String(p.id) === String(item.id));
                                    const tieneDescuento = prodOriginal && prodOriginal.precio > item.precio;
                                    return (
                                      <div className="flex items-baseline gap-1.5 mt-1">
                                        {tieneDescuento && (
                                          <span className="line-through text-slate-400 font-semibold text-[10px]">S/ {(item.cant * prodOriginal.precio).toFixed(2)}</span>
                                        )}
                                        <span className="font-mono text-emerald-600 font-bold text-xs md:text-sm">S/ {sub.toFixed(2)}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-1 md:gap-2 bg-slate-100 rounded-lg p-1 shrink-0 border border-slate-200">
                                  <button onClick={() => alterarCantidad(idx, '-')} className="w-8 h-8 md:w-7 md:h-7 bg-white rounded-md shadow-sm text-slate-600 font-black text-lg leading-none">-</button>
                                  <span className="font-bold text-slate-900 w-5 text-center text-sm">{item.cant}</span>
                                  <button onClick={() => alterarCantidad(idx, '+')} className="w-8 h-8 md:w-7 md:h-7 bg-white rounded-md shadow-sm text-slate-600 font-black text-lg leading-none">+</button>
                                </div>
                              </div>
                              <input 
                                type="text" 
                                placeholder="Especificaciones (ej: sin cebolla)..." 
                                value={item.notas || ''} 
                                onChange={(e) => {
                                  let nuevos = [...ticketActual];
                                  nuevos[idx].notas = e.target.value;
                                  setTicketActual(nuevos);
                                }}
                                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-amber-400 focus:bg-white"
                              />
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

                  {/* Botón cancelar pedido */}
                  {mesaActual?.pedidoData && (
                    <div className="mb-3">
                      {mesaActual.estado === 'Cocina' && tiempoRestante > 0 ? (
                        <button
                          onClick={() => {
                            const algunItemPreparado = ticketActual.some(i => i.yaEnviado && i.historial && i.pedidoId === mesaActual.pedidoData?.pedidoId);
                            if (algunItemPreparado) {
                              alert("⚠️ No puedes realizar una cancelación normal porque algunos platos ya han sido preparados.\n\nPara cancelar platos servidos, usa el botón de 'Anulación Especial (Reclamo)'.");
                              return;
                            }
                            requestSupervisorAuth("Cancelar comanda completa", (supervisor) => {
                              setSupervisorAprobador(supervisor);
                              setCancelModal(true);
                            });
                          }}
                          className="w-full py-2.5 bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Cancelar Pedido
                          <span className="ml-1 font-mono bg-red-100 border border-red-200 px-2 py-0.5 rounded-md text-red-600">
                            <Clock className="w-3 h-3 inline mr-1" />{formatCuentaRegresiva(tiempoRestante)}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            requestSupervisorAuth("Autorizar Anulación Especial / Reclamo", (supervisor) => {
                              setSupervisorAprobador(supervisor);
                              setCancelModal(true);
                            });
                          }}
                          className="w-full py-2.5 bg-rose-900/10 hover:bg-rose-900/20 text-rose-700 border border-rose-350 border-dashed font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4" />
                          Anulación Especial (Reclamo)
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {ticketActual.some(i => !i.yaEnviado) ? (
                      <button 
                        onClick={() => {
                          if (confirm("⚠️ ¿Estás seguro de salir? Se descartarán los platos nuevos que aún no has enviado a la cocina.")) {
                            setModalOpen(false);
                          }
                        }} 
                        className="py-3.5 md:py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black rounded-xl text-xs md:text-sm uppercase tracking-wide transition-colors"
                      >
                        ❌ Descartar y Salir
                      </button>
                    ) : (
                      <button 
                        onClick={() => setModalOpen(false)} 
                        className="py-3.5 md:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs md:text-sm uppercase tracking-wide transition-colors"
                      >
                        Cerrar Ventana
                      </button>
                    )}
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
      {/* MODAL DE AUTORIZACIÓN POR PIN (SUPERVISOR) */}
      {authModal.open && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900 mb-4 shadow-lg shadow-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-black text-white text-base uppercase tracking-tight text-center leading-none">Autorización de Supervisor</h3>
            <p className="text-[10px] text-amber-400 font-mono uppercase tracking-widest text-center mt-2 font-bold bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">Acción: {authModal.promptText}</p>

            {/* Dots */}
            <div className="flex gap-4 my-6">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                    authModal.pin.length > idx 
                      ? 'bg-amber-500 border-amber-500 scale-110 shadow-lg shadow-amber-500/50' 
                      : 'bg-transparent border-slate-700'
                  }`}
                ></div>
              ))}
            </div>

            {/* Error */}
            <div className="h-6 mb-3 text-center">
              {authModal.error && <p className="text-xs text-rose-500 font-bold bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg">{authModal.error}</p>}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num}
                  onClick={() => handleAuthPinKeyPress(num)}
                  className="aspect-square bg-slate-800 hover:bg-slate-700 text-white font-black text-xl rounded-xl border border-slate-800 transition-colors active:scale-95 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setAuthModal({ open: false, pin: '', error: '', callback: null, promptText: '' })}
                className="aspect-square bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 font-bold text-[10px] rounded-xl transition-colors flex items-center justify-center uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleAuthPinKeyPress(0)}
                className="aspect-square bg-slate-800 hover:bg-slate-700 text-white font-black text-xl rounded-xl border border-slate-800 transition-colors active:scale-95 flex items-center justify-center"
              >
                0
              </button>
              <button 
                onClick={handleAuthPinBackspace}
                className="aspect-square bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 font-bold text-[10px] rounded-xl transition-colors flex items-center justify-center uppercase tracking-wider"
              >
                Del
              </button>
            </div>
          </div>
        </div>
      )}
      {/* UNION DE MESAS COMPONENTE DIALOG */}
      {unionDropdownOpen && mesaActual && (
        <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 flex flex-col text-slate-900 animate-fade-in">
            <h3 className="font-black uppercase text-sm border-b border-slate-100 pb-2 mb-3 flex items-center gap-2 text-slate-800"><Link2 className="w-5 h-5 text-amber-500" /> Unir Mesas con Mesa {mesaActual.num}</h3>
            
            {/* List of mesas unidas currently */}
            {mesas.filter(m => m.estado === `Unida a Mesa ${mesaActual.num}`).length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200/50 p-3 rounded-xl">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1">Mesas Unidas Actualmente:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {mesas.filter(m => m.estado === `Unida a Mesa ${mesaActual.num}`).map(m => (
                    <span key={m.num} className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-lg">Mesa {m.num}</span>
                  ))}
                </div>
                <button 
                  onClick={handleSepararMesas}
                  className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-xs uppercase transition-colors"
                >
                  🔓 Separar Todas las Mesas
                </button>
              </div>
            )}
            
            <p className="text-xs text-slate-500 font-bold mb-2">Selecciona una mesa libre para unirla:</p>
            <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1 mb-4">
              {mesas.filter(m => m.estado === 'Libre' && m.num !== mesaActual.num).length === 0 ? (
                <p className="col-span-4 text-center text-xs text-slate-400 py-3">No hay mesas libres disponibles.</p>
              ) : (
                mesas
                  .filter(m => m.estado === 'Libre' && m.num !== mesaActual.num)
                  .map(m => (
                    <button 
                      key={m.num}
                      onClick={() => handleUnirMesa(m.num)}
                      className="bg-slate-55 hover:bg-amber-100 border border-slate-200 text-slate-800 text-xs font-black py-2 rounded-xl transition-colors shadow-sm"
                    >
                      Mesa {m.num}
                    </button>
                  ))
              )}
            </div>
            
            <button 
              onClick={() => setUnionDropdownOpen(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase transition-colors"
            >
              Cerrar Ventana
            </button>
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
