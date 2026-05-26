import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, X, Banknote, Search, CheckCircle, Clock, Sparkles, CreditCard, Wallet, Truck, PackageCheck, Plus, Calculator } from 'lucide-react';
import { api } from '../api';

export default function CajaPage() {
  const [mesas, setMesas] = useState([]);
  const [pedidosLlevar, setPedidosLlevar] = useState([]);
  const [stats, setStats] = useState({ atendidas: 0, ingresos: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [tipoComprobante, setTipoComprobante] = useState('Boleta');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [numDocumento, setNumDocumento] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [isBuscando, setIsBuscando] = useState(false);
  const [cobrando, setCobrando] = useState(false);

  // Historial de Ventas y Arqueo/Cierre de Caja
  const [ventas, setVentas] = useState([]);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);

  // Modal PedidosYa
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [codigoPY, setCodigoPY] = useState('');
  const [cajeroNombre, setCajeroNombre] = useState('María');
  const [productosMenu, setProductosMenu] = useState([]);
  const [itemsDelivery, setItemsDelivery] = useState([]);
  const [enviandoDelivery, setEnviandoDelivery] = useState(false);

  const fetchCajaData = useCallback(async () => {
    try {
      const [mesasData, resumenData, llevarData, ventasData] = await Promise.all([
        api.getMesas(),
        api.getResumenVentas(),
        api.getPedidosLlevar(),
        api.getHistorialVentas(),
      ]);
      setMesas(mesasData);
      setPedidosLlevar(llevarData);
      setStats({ atendidas: resumenData.atendidas || 0, ingresos: resumenData.ingresos || 0 });
      setVentas(ventasData || []);
    } catch (err) {
      console.error('Error cargando datos de caja:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCajaData();
    const interval = setInterval(() => {
      if (!modalOpen && !deliveryModal && !cierreModalOpen) fetchCajaData();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchCajaData, modalOpen, deliveryModal, cierreModalOpen]);

  const mesasPendientes = mesas.filter(m => m.estado !== 'Libre' && m.pedidoData);

  const buscarCliente = () => {
    if (!numDocumento) return;
    setIsBuscando(true);
    setTimeout(() => {
      if (tipoComprobante === 'Factura') {
        setClienteNombre('DISTRIBUIDORA Y RESTAURANTE FOGÓN S.A.C.');
        setClienteDireccion('AV. LOS PIONEROS 432, LIMA');
      } else {
        setClienteNombre('JUAN ALBERTO MENDOZA PÉREZ');
        setClienteDireccion('CALLE SAN MARTÍN 109');
      }
      setIsBuscando(false);
    }, 800);
  };

  const handleComprobanteChange = (val) => {
    setTipoComprobante(val);
    setNumDocumento('');
    setClienteNombre('');
    setClienteDireccion('');
  };

  const procesarCobroYFacturar = async () => {
    if (!mesaSeleccionada || !mesaSeleccionada.pedidoData) return;
    if ((tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') && !clienteNombre) {
      alert('Por favor, busca y valida el documento del cliente antes de cobrar.');
      return;
    }
    setCobrando(true);
    try {
      const total = mesaSeleccionada.pedidoData.total;
      await api.cobrar({
        pedidoIds: mesaSeleccionada.pedidoData.pedidoIds,
        tipoComprobante,
        numDocumento: numDocumento || null,
        nombreCliente: clienteNombre || 'PÚBLICO GENERAL',
        total,
        metodoPago,
      });
      setModalOpen(false);
      setNumDocumento('');
      setClienteNombre('');
      setClienteDireccion('');
      await fetchCajaData();
      alert(`✅ ¡Cobro procesado! Mesa ${mesaSeleccionada.num} liberada.`);
    } catch (err) {
      alert('Error al procesar cobro: ' + err.message);
    } finally {
      setCobrando(false);
    }
  };

  const confirmarEntregaDelivery = async (pedidoId, codigo) => {
    if (!confirm(`¿Confirmas la entrega del pedido ${codigo}?`)) return;
    try {
      await api.confirmarEntrega(pedidoId);
      await fetchCajaData();
      alert(`✅ Entrega del pedido ${codigo} confirmada.`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // --- Modal PedidosYa ---
  const abrirDeliveryModal = async () => {
    if (productosMenu.length === 0) {
      const prods = await api.getProductos();
      setProductosMenu(prods);
    }
    setItemsDelivery([]);
    setCodigoPY('');
    setDeliveryModal(true);
  };

  const agregarItemDelivery = (prod) => {
    const idx = itemsDelivery.findIndex(i => i.id === String(prod.id));
    if (idx >= 0) {
      const nuevo = [...itemsDelivery];
      nuevo[idx].cant++;
      setItemsDelivery(nuevo);
    } else {
      setItemsDelivery([...itemsDelivery, { id: String(prod.id), nombre: prod.nombre, precio: prod.precio, cant: 1 }]);
    }
  };

  const alterarItemDelivery = (idx, op) => {
    const nuevo = [...itemsDelivery];
    if (op === '+') nuevo[idx].cant++;
    else {
      nuevo[idx].cant--;
      if (nuevo[idx].cant <= 0) nuevo.splice(idx, 1);
    }
    setItemsDelivery(nuevo);
  };

  const enviarDeliveryACocina = async () => {
    if (!codigoPY.trim()) { alert('El código de PedidosYa es obligatorio.'); return; }
    if (itemsDelivery.length === 0) { alert('Debes agregar al menos un producto.'); return; }
    setEnviandoDelivery(true);
    try {
      const total = itemsDelivery.reduce((s, i) => s + i.cant * i.precio, 0);
      const result = await api.crearPedidoLlevar({
        codigoPedidosYa: codigoPY.trim().toUpperCase(),
        cajero: cajeroNombre,
        items: itemsDelivery,
        total,
      });
      if (result.error) throw new Error(result.error);
      setDeliveryModal(false);
      await fetchCajaData();
      alert(`✅ Pedido ${codigoPY.toUpperCase()} enviado a Cocina. Venta registrada.`);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setEnviandoDelivery(false);
    }
  };

  const totalDelivery = itemsDelivery.reduce((s, i) => s + i.cant * i.precio, 0);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold">Cargando cuentas de caja...</p>
      </div>
    </div>
  );

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Caja y Facturación</h1>
          <p className="text-xs md:text-sm text-slate-500">Cierre de mesas, pedidos de delivery y control del turno.</p>
        </div>
        <button
          onClick={abrirDeliveryModal}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <Truck className="w-4 h-4" />
          Pedido PedidosYa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">

          {/* MESAS DEL SALÓN */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" /> Mesas Pendientes por Cobrar
              </h2>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                {mesasPendientes.length} Mesa{mesasPendientes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Mesa</th>
                    <th className="px-6 py-4">Mesero / Hora</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm bg-white">
                  {mesasPendientes.length > 0 ? mesasPendientes.map(m => (
                    <tr key={m.num} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center font-black shadow-sm">{m.num}</div>
                          <span className="font-black text-slate-800 uppercase tracking-tight">Mesa {m.num}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-sm">{m.pedidoData?.mesero}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {m.pedidoData?.hora}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {m.estado === 'Servido'
                          ? <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-max">
                              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                              Listo p/ Cobrar
                            </span>
                          : <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-max">
                              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span></span>
                              En Preparación
                            </span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-slate-900 text-lg md:text-xl tracking-tight">
                        S/ {m.pedidoData?.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => { setMesaSeleccionada(m); setModalOpen(true); }}
                          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md group-hover:scale-105 active:scale-95 group-hover:bg-amber-500 group-hover:text-slate-900"
                        >Cobrar</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider text-xs">No hay mesas pendientes por cobrar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PEDIDOS DE DELIVERY */}
          {pedidosLlevar.length > 0 && (
            <div className="bg-white rounded-3xl border border-blue-200 shadow-sm overflow-hidden">
              <div className="p-4 md:p-5 border-b border-blue-100 bg-blue-50 flex justify-between items-center">
                <h2 className="font-black text-blue-700 uppercase text-xs tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-500" /> Pedidos Para Llevar (PedidosYa)
                </h2>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {pedidosLlevar.length} Pedido{pedidosLlevar.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Cajero / Hora</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Total</th>
                      <th className="px-6 py-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm bg-white">
                    {pedidosLlevar.map(p => (
                      <tr key={p.pedidoId} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shadow-sm text-xs">PY</div>
                            <span className="font-black text-blue-800 tracking-tight font-mono">{p.codigoPedidosYa}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 text-sm block">{p.cajero}</span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{p.hora}</span>
                        </td>
                        <td className="px-6 py-4">
                          {p.estado === 'Servido'
                            ? <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1.5 w-max">
                                <PackageCheck className="w-3.5 h-3.5" /> Listo p/ Entregar
                              </span>
                            : <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 text-[10px] font-black uppercase flex items-center gap-1.5 w-max">
                                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span></span>
                                En Cocina
                              </span>
                          }
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-slate-900 text-lg">
                          S/ {p.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.estado === 'Servido' ? (
                            <button
                              onClick={() => confirmarEntregaDelivery(p.pedidoId, p.codigoPedidosYa)}
                              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md hover:bg-blue-700 active:scale-95"
                            >Confirmar Entrega</button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Esperando...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HISTORIAL DE VENTAS DEL DÍA */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" /> Historial de Ventas del Día
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                {ventas.length} Venta{ventas.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[650px]">
                <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">ID / Hora</th>
                    <th className="px-6 py-4">Comprobante / Cliente</th>
                    <th className="px-6 py-4">Origen / Mesa</th>
                    <th className="px-6 py-4">Método de Pago</th>
                    <th className="px-6 py-4">Detalle</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm bg-white">
                  {ventas.length > 0 ? ventas.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-slate-900">#VT-{v.id}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{v.hora}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs">{v.tipoComprobante} ({v.numDocumento || 'S/D'})</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-tight font-medium mt-0.5">{v.nombreCliente}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {v.tipoEntrega === 'llevar' ? (
                          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono">
                            🛵 PY: {v.codigoPedidosYa}
                          </span>
                        ) : (
                          <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                            🍽️ Mesa {v.mesaNum}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                          v.metodoPago === 'Efectivo' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          v.metodoPago === 'Tarjeta' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          v.metodoPago === 'Yape' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                          'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`}>{v.metodoPago}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-xs font-bold text-slate-500 uppercase" title={v.itemsResumen}>
                        {v.itemsResumen}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-black text-slate-900 text-base">
                        S/ {v.total.toFixed(2)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider text-xs">
                        Aún no se han registrado ventas hoy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RESUMEN LATERAL */}
        <div className="bg-slate-900 rounded-3xl shadow-xl p-6 text-white flex flex-col sticky top-4">
          <h2 className="font-black uppercase text-xs tracking-widest mb-6 text-amber-400 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Resumen del Turno
          </h2>
          <div className="space-y-4 flex-1">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Mesas Atendidas Hoy</p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-3xl font-black">{stats.atendidas}</p>
              </div>
            </div>
            <div className="bg-blue-800 p-5 rounded-2xl border border-blue-700">
              <p className="text-xs text-blue-300 font-black uppercase tracking-widest">Delivery Activos</p>
              <p className="text-3xl font-black mt-2">{pedidosLlevar.length}</p>
            </div>
            <div className="bg-amber-500 p-5 rounded-2xl relative overflow-hidden text-slate-900 shadow-lg shadow-amber-500/20">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full opacity-20"></div>
              <p className="text-xs font-black uppercase tracking-wider opacity-80">Ingresos del Día (S/)</p>
              <div className="flex items-center gap-3 mt-2 relative z-10">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900"><Banknote className="w-5 h-5" /></div>
                <p className="text-3xl lg:text-4xl font-black font-mono tracking-tighter">S/ {stats.ingresos.toFixed(2)}</p>
              </div>
            </div>

            {/* BOTÓN CIERRE DE CAJA TURNO */}
            <button
              onClick={() => setCierreModalOpen(true)}
              className="w-full py-4 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-purple-950/40 transition-all active:scale-95 flex items-center justify-center gap-2 border border-purple-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              Cierre de Caja (Turno)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE COBRO (MESAS) */}
      {modalOpen && mesaSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[95vh] max-w-3xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 md:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-900"><Banknote className="w-5 h-5" /></div>
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tight leading-none">Cobro Mesa <span className="text-emerald-400">{mesaSeleccionada.num}</span></h2>
                  <p className="text-xs text-slate-400">Emisión de Facturación Electrónica</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1 grid md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">Tipo de Comprobante:</label>
                  <select value={tipoComprobante} onChange={(e) => handleComprobanteChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 font-bold text-slate-800 transition-all text-sm">
                    <option value="Boleta">Boleta Electrónica (DNI)</option>
                    <option value="Factura">Factura Electrónica (RUC)</option>
                    <option value="Ticket">Ticket Interno (Simple)</option>
                  </select>
                </div>
                {(tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                    <div>
                      <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">{tipoComprobante === 'Factura' ? 'RUC del Cliente' : 'DNI del Cliente'}:</label>
                      <div className="flex gap-2">
                        <input type="text" value={numDocumento} onChange={(e) => setNumDocumento(e.target.value)} placeholder={tipoComprobante === 'Factura' ? 'Ej. 20404040404' : 'Ej. 70443322'} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono" />
                        <button onClick={buscarCliente} disabled={!numDocumento || isBuscando} className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-amber-500 hover:text-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md">
                          {isBuscando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1 text-[10px] tracking-widest uppercase">Razón Social / Nombres:</label>
                      <input type="text" readOnly value={clienteNombre} placeholder="Usa el botón de búsqueda..." className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">Método de Pago:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ id: 'Efectivo', icon: Banknote, label: 'Efectivo' }, { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta' }, { id: 'Yape', icon: Wallet, label: 'Yape / Plin' }].map(item => {
                      const IconComp = item.icon;
                      const active = metodoPago === item.id;
                      return (
                        <button key={item.id} onClick={() => setMetodoPago(item.id)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${active ? 'bg-amber-500/10 border-amber-500 text-amber-700 font-black' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
                          <IconComp className="w-5 h-5 mb-1 shrink-0" />
                          <span className="text-[10px] uppercase font-bold tracking-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm max-h-[220px] overflow-y-auto custom-scrollbar flex-1 mb-4">
                  <h3 className="text-slate-400 font-black uppercase text-[10px] tracking-wider mb-2 border-b border-slate-100 pb-1 flex justify-between items-center">
                    <span>Detalle del Consumo</span>
                    <span className="text-slate-500">Mesa {mesaSeleccionada.num}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {mesaSeleccionada.pedidoData?.items?.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-start text-xs border-b border-dashed border-slate-100 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-slate-800 font-medium">
                          <span className="font-black text-slate-900 mr-1.5">{item.cant}x</span>
                          <span className="uppercase">{item.nombre}</span>
                        </span>
                        <span className="font-mono text-slate-600 font-bold shrink-0">S/ {(item.cant * item.precio).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white">
                  <div className="space-y-2 mb-4 border-b border-slate-800 pb-4">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal (Sin IGV)</span>
                      <span className="font-mono">S/ {(mesaSeleccionada.pedidoData.total / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>IGV (18%)</span>
                      <span className="font-mono">S/ {(mesaSeleccionada.pedidoData.total - (mesaSeleccionada.pedidoData.total / 1.18)).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">Monto Total</p>
                      <p className="text-slate-400 text-xs font-medium">Comprobante: {tipoComprobante}</p>
                    </div>
                    <p className="text-3xl font-black text-white font-mono tracking-tighter">
                      <span className="text-lg text-slate-500 mr-1 font-sans">S/</span>{mesaSeleccionada.pedidoData.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
              <button onClick={procesarCobroYFacturar} disabled={cobrando} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black uppercase tracking-widest rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 disabled:opacity-50">
                {cobrando ? <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span> : <><CheckCircle className="w-5 h-5" /> Emitir {tipoComprobante} y Liberar Mesa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEDIDOS YA */}
      {deliveryModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[95vh] max-w-4xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            <div className="p-4 md:p-5 bg-blue-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5" /></div>
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tight leading-none">Nuevo Pedido PedidosYa</h2>
                  <p className="text-xs text-blue-200">Pago ya procesado en POS externo · Solo registrar y enviar a cocina</p>
                </div>
              </div>
              <button onClick={() => setDeliveryModal(false)} className="bg-blue-800 p-2 rounded-xl hover:bg-blue-900 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              {/* Productos */}
              <div className="w-full md:w-3/5 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50">
                <div className="p-4 border-b border-slate-200 bg-white shrink-0 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-1">Código PedidosYa:</label>
                    <input
                      type="text"
                      value={codigoPY}
                      onChange={(e) => setCodigoPY(e.target.value)}
                      placeholder="Ej: FG-4821"
                      className="w-full bg-slate-50 border-2 border-blue-300 focus:border-blue-500 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-sm focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-1">Cajero:</label>
                    <select value={cajeroNombre} onChange={(e) => setCajeroNombre(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 text-sm focus:outline-none">
                      <option>María</option><option>Carlos</option><option>Luis</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 overflow-y-auto custom-scrollbar content-start flex-1">
                  {productosMenu.map(prod => (
                    <div key={prod.id} onClick={() => agregarItemDelivery(prod)} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between cursor-pointer hover:border-blue-400 transition-colors shadow-sm h-24">
                      <p className="font-bold text-slate-800 text-[10px] uppercase leading-tight">{prod.nombre}</p>
                      <p className="font-black font-mono text-blue-600 text-sm">S/ {prod.precio.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ticket delivery */}
              <div className="w-full md:w-2/5 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-blue-50 shrink-0">
                  <h3 className="font-black text-blue-700 uppercase text-xs flex items-center gap-2"><Truck className="w-4 h-4" /> Detalle del Pedido</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {itemsDelivery.length === 0
                    ? <p className="text-center text-slate-400 text-xs font-medium py-8">Toca un producto para agregarlo</p>
                    : itemsDelivery.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-dashed border-slate-100 last:border-0">
                        <div>
                          <p className="font-bold text-slate-800 text-xs uppercase">{item.nombre}</p>
                          <p className="font-mono text-blue-600 font-bold text-sm">S/ {(item.cant * item.precio).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
                          <button onClick={() => alterarItemDelivery(idx, '-')} className="w-7 h-7 bg-white rounded-md shadow-sm font-black text-slate-600 text-lg leading-none">-</button>
                          <span className="font-bold text-slate-900 w-5 text-center text-sm">{item.cant}</span>
                          <button onClick={() => alterarItemDelivery(idx, '+')} className="w-7 h-7 bg-white rounded-md shadow-sm font-black text-slate-600 text-lg leading-none">+</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                  <div className="flex justify-between items-end mb-4 px-1">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Total Pedido</span>
                    <span className="font-black font-mono text-2xl text-slate-900">S/ {totalDelivery.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={enviarDeliveryACocina}
                    disabled={enviandoDelivery}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl text-sm transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {enviandoDelivery
                      ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      : <><Truck className="w-5 h-5" /> Registrar y Enviar a Cocina</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CIERRE DE CAJA (ARQUEO DE TURNO) */}
      {cierreModalOpen && (() => {
        // Consolidación reactiva de montos
        const totalEfectivo = ventas.filter(v => v.metodoPago === 'Efectivo').reduce((s, v) => s + v.total, 0);
        const totalTarjeta = ventas.filter(v => v.metodoPago === 'Tarjeta').reduce((s, v) => s + v.total, 0);
        const totalYape = ventas.filter(v => v.metodoPago === 'Yape').reduce((s, v) => s + v.total, 0);
        const totalPedidosYa = ventas.filter(v => v.metodoPago === 'PedidosYa').reduce((s, v) => s + v.total, 0);
        const totalCalculado = totalEfectivo + totalTarjeta + totalYape + totalPedidosYa;

        return (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up relative">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Calculator className="w-6 h-6 shrink-0" />
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-none">Arqueo y Cierre</h3>
                </div>
                <button onClick={() => setCierreModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>

              {/* Vista del ticket térmico */}
              <div className="bg-amber-50/70 border-2 border-dashed border-amber-200 rounded-2xl p-5 font-mono text-slate-800 text-xs shadow-sm mb-6 flex flex-col">
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-4">
                  <h4 className="font-black text-sm text-slate-900 uppercase">EL FOGÓN DORADO</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Av. Los Pioneros 432 · RUC: 20404040404</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">CIERRE DE TURNO · ARQUEO DIARIO</p>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 mb-4 text-slate-600 font-bold">
                  <div className="flex justify-between"><span>FECHA:</span><span>{new Date().toLocaleDateString('es-PE')}</span></div>
                  <div className="flex justify-between"><span>HORA IMP:</span><span>{new Date().toLocaleTimeString('es-PE')}</span></div>
                  <div className="flex justify-between"><span>CAJERO:</span><span className="uppercase">{cajeroNombre}</span></div>
                  <div className="flex justify-between"><span>ESTADO:</span><span className="text-emerald-700">DESPACHADO</span></div>
                </div>

                <div className="space-y-3 mb-4 border-b border-dashed border-slate-300 pb-3">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>💵 EFECTIVO:</span>
                    <span className="font-black text-slate-900">S/ {totalEfectivo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>💳 TARJETA POS:</span>
                    <span className="font-black text-slate-900">S/ {totalTarjeta.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>📱 YAPE / PLIN:</span>
                    <span className="font-black text-slate-900">S/ {totalYape.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>🛵 PEDIDOS YA (POS):</span>
                    <span className="font-black text-slate-900">S/ {totalPedidosYa.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm font-black text-slate-900 uppercase">
                  <span>💰 TOTAL CAJA:</span>
                  <span className="text-base text-emerald-700">S/ {totalCalculado.toFixed(2)}</span>
                </div>

                <div className="text-center text-[9px] text-slate-400 font-bold mt-6 border-t border-dashed border-slate-200 pt-3">
                  *** Fin del Reporte de Turno ***
                </div>
              </div>

              {/* Acciones */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-widest transition-colors flex justify-center items-center gap-1.5"
                >
                  Imprimir Ticket
                </button>
                <button
                  onClick={() => {
                    alert(`✅ ¡Cierre de Turno exitoso!\n\nSe consolidó un total de S/ ${totalCalculado.toFixed(2)} en ventas.\nEl turno ha sido archivado.`);
                    setCierreModalOpen(false);
                  }}
                  className="py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                >
                  Cerrar Turno
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
