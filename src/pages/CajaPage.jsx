import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, X, Banknote, Search, CheckCircle, Clock, Sparkles, CreditCard, Wallet } from 'lucide-react';
import { api } from '../api';

export default function CajaPage() {
  const [mesas, setMesas] = useState([]);
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

  const fetchCajaData = useCallback(async () => {
    try {
      const [mesasData, resumenData] = await Promise.all([
        api.getMesas(),
        api.getResumenVentas(),
      ]);
      setMesas(mesasData);
      setStats({
        atendidas: resumenData.atendidas || 0,
        ingresos: resumenData.ingresos || 0,
      });
    } catch (err) {
      console.error('Error cargando datos de caja:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCajaData();
    const interval = setInterval(() => {
      if (!modalOpen) fetchCajaData();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchCajaData, modalOpen]);

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
        pedidoId: mesaSeleccionada.pedidoData.pedidoId,
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
      alert(`✅ ¡Cobro procesado exitosamente con ${tipoComprobante}! Mesa ${mesaSeleccionada.num} liberada.`);
    } catch (err) {
      alert('Error al procesar cobro: ' + err.message);
    } finally {
      setCobrando(false);
    }
  };

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
          <p className="text-xs md:text-sm text-slate-500">Cierre de mesas, emisión de comprobantes electrónicos RUC/DNI y control del turno.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" /> Cuentas Pendientes por Cobrar
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
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              Listo p/ Cobrar
                            </span>
                          : <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-max">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
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
                        >
                          Cobrar
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="text-center py-16 text-slate-400 font-bold uppercase tracking-wider text-xs">
                        No hay cuentas pendientes por cobrar en este momento.
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
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 transition-all hover:bg-slate-850">
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Mesas Atendidas Hoy</p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-3xl font-black">{stats.atendidas}</p>
              </div>
            </div>
            
            <div className="bg-amber-500 p-5 rounded-2xl relative overflow-hidden text-slate-900 shadow-lg shadow-amber-500/20 transform transition-all hover:scale-[1.02]">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full opacity-20"></div>
              <p className="text-xs font-black uppercase tracking-wider opacity-80">Ingresos del Día (S/)</p>
              <div className="flex items-center gap-3 mt-2 relative z-10">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900"><Banknote className="w-5 h-5" /></div>
                <p className="text-3xl lg:text-4xl font-black font-mono tracking-tighter">S/ {stats.ingresos.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE COBRO */}
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
                  <select 
                    value={tipoComprobante} 
                    onChange={(e) => handleComprobanteChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 font-bold text-slate-800 transition-all text-sm"
                  >
                    <option value="Boleta">Boleta Electrónica (DNI)</option>
                    <option value="Factura">Factura Electrónica (RUC)</option>
                    <option value="Ticket">Ticket Interno (Simple)</option>
                  </select>
                </div>

                {(tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                    <div>
                      <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">
                        {tipoComprobante === 'Factura' ? 'RUC del Cliente' : 'DNI del Cliente'}:
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={numDocumento} 
                          onChange={(e) => setNumDocumento(e.target.value)} 
                          placeholder={tipoComprobante === 'Factura' ? 'Ej. 20404040404' : 'Ej. 70443322'} 
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono" 
                        />
                        <button 
                          onClick={buscarCliente} 
                          disabled={!numDocumento || isBuscando} 
                          className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-amber-500 hover:text-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md"
                        >
                          {isBuscando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Search className="w-4 h-4"/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1 text-[10px] tracking-widest uppercase">Razón Social / Nombres:</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={clienteNombre} 
                        placeholder="Usa el botón de búsqueda..." 
                        className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none" 
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 font-bold mb-2 text-[10px] tracking-widest uppercase">Método de Pago:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Efectivo', icon: Banknote, label: 'Efectivo' },
                      { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta' },
                      { id: 'Yape', icon: Wallet, label: 'Yape / Plin' },
                    ].map(item => {
                      const IconComp = item.icon;
                      const active = metodoPago === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setMetodoPago(item.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${active ? 'bg-amber-500/10 border-amber-500 text-amber-700 font-black' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                          <IconComp className="w-5 h-5 mb-1 shrink-0" />
                          <span className="text-[10px] uppercase font-bold tracking-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* DETALLE TICKET MESA */}
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
              <button 
                onClick={procesarCobroYFacturar} 
                disabled={cobrando}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black uppercase tracking-widest rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {cobrando ? (
                  <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" /> Emitir {tipoComprobante} y Liberar Mesa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
