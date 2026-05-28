import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, X, Banknote, Search, CheckCircle, Clock, Sparkles, CreditCard, Wallet, Truck, PackageCheck, Plus, Calculator, Printer } from 'lucide-react';

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
  const [activeComprobante, setActiveComprobante] = useState(null);
  const [sunatModalOpen, setSunatModalOpen] = useState(false);


  // Historial de Ventas y Arqueo/Cierre de Caja
  const [ventas, setVentas] = useState([]);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState(localStorage.getItem('ultimoCierre') || null);

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

  const numeroALetras = (num) => {
    const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    let entero = Math.floor(num);
    let decimales = Math.round((num - entero) * 100);
    let decimalStr = decimales < 10 ? "0" + decimales : decimales;

    if (entero === 0) return "CERO CON " + decimalStr + "/100 SOLES";
    if (entero === 100) return "CIEN CON " + decimalStr + "/100 SOLES";

    let letras = "";

    if (entero >= 100) {
      let c = Math.floor(entero / 100);
      letras += centenas[c] + " ";
      entero %= 100;
    }

    if (entero >= 10 && entero <= 19) {
      letras += especiales[entero - 10] + " ";
    } else if (entero >= 20 || entero > 0) {
      let d = Math.floor(entero / 10);
      let u = entero % 10;
      if (d > 0) {
        letras += decenas[d];
        if (u > 0) letras += " Y ";
      }
      if (u > 0) {
        letras += unidades[u];
      }
      letras += " ";
    }

    return letras.trim() + " CON " + decimalStr + "/100 SOLES";
  };

  const handleDocumentoChange = (val) => {
    setNumDocumento(val);
    const cleaned = val.trim();
    if (cleaned === '20613857321') {
      setClienteNombre('FIRST FISH S.A.C.');
      setClienteDireccion('LT. 05 DPTO. LIMA MZ. J COOP. CAJABAMBA - LIMA LIMA LOS OLIVOS');
      setTipoComprobante('Factura');
    } else if (cleaned === '10404040404') {
      setClienteNombre('JUAN PEREZ SOTO');
      setClienteDireccion('CALLE SAN MARTÍN 109');
      setTipoComprobante('Boleta');
    }
  };

  const buscarCliente = async () => {
    if (!numDocumento) return;
    setIsBuscando(true);
    const doc = numDocumento.trim();
    
    // Fallbacks locales rápidos de prueba en desarrollo
    if (doc === '20613857321') {
      setClienteNombre('FIRST FISH S.A.C.');
      setClienteDireccion('LT. 05 DPTO. LIMA MZ. J COOP. CAJABAMBA - LIMA LIMA LOS OLIVOS');
      setTipoComprobante('Factura');
      setIsBuscando(false);
      return;
    } else if (doc === '10404040404') {
      setClienteNombre('JUAN PEREZ SOTO');
      setClienteDireccion('CALLE SAN MARTÍN 109');
      setTipoComprobante('Boleta');
      setIsBuscando(false);
      return;
    }

    try {
      const data = await api.consultarCliente(doc);
      const isRUC = doc.length === 11;
      if (isRUC) {
        setClienteNombre(data.razonSocial || '');
        setClienteDireccion(data.direccion || '');
        setTipoComprobante('Factura');
      } else {
        setClienteNombre(data.nombre || '');
        setClienteDireccion(data.direccion || '');
        setTipoComprobante('Boleta');
      }
    } catch (err) {
      console.error("Error consultando API de DNI/RUC:", err);
      // Mantener campos vacíos en caso de error para permitir escritura manual limpia
      setClienteNombre('');
      setClienteDireccion('');
    }
 finally {
      setIsBuscando(false);
    }
  };


  const reimprimirComprobante = (v) => {
    if (!v) return;
    const rucEmpresa = "R.U.C. N° 20496009259";
    
    let serie = v.tipoComprobante === 'Factura' ? 'F001' : 'B001';
    let correlativoStr = String(v.id % 10000).padStart(4, '0');
    let qrData = `${rucEmpresa}|03|${serie}|${correlativoStr}|${v.igv.toFixed(2)}|${v.total.toFixed(2)}|${v.fecha || new Date(v.createdAt).toLocaleDateString('es-PE')}|${v.tipoComprobante === 'Factura'?'6':'1'}|${v.numDocumento || '00000000'}`;
    let hashResumen = "gSbTDa" + Math.random().toString(36).substring(2, 8).toUpperCase() + "iIZDyirfA6TBPKJnEI=";
    let enlacePdf = null;
    let contingencia = v.estadoNubefact === 'PENDIENTE_REINTENTO';


    if (v.estadoNubefact && v.estadoNubefact.startsWith('ACEPTADO:')) {
      try {
        const responseData = JSON.parse(v.estadoNubefact.substring(9));
        serie = responseData.serie || serie;
        correlativoStr = String(responseData.numero || correlativoStr).padStart(4, '0');
        if (responseData.cadena_para_codigo_qr) {
          qrData = responseData.cadena_para_codigo_qr;
        }
        if (responseData.key) {
          hashResumen = responseData.key;
        }
        enlacePdf = responseData.enlace_del_pdf || null;
      } catch (err) {
        console.error("Error parsing Nubefact response:", err);
      }
    }

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrData)}`;
    const totalLetras = numeroALetras(v.total);

    // Reconstruir items si vienen del backend o parsear de itemsResumen
    let items = v.items || [];
    if (items.length === 0 && v.itemsResumen) {
      items = v.itemsResumen.split(', ').map(str => {
        const match = str.match(/^(\d+)x\s+(.+)$/);
        if (match) {
          const cant = parseInt(match[1]);
          const nombre = match[2];
          const precio = v.total / cant; // fallback estimate
          return { cant, nombre, precio };
        }
        return { cant: 1, nombre: str, precio: v.total };
      });
    }

    setActiveComprobante({
      tipo: v.tipoComprobante,
      serie,
      correlativo: correlativoStr,
      fecha: v.fecha || new Date(v.createdAt).toLocaleDateString('es-PE'),
      hora: v.hora,
      mesaNum: v.mesaNum || 'Delivery',
      clienteNombre: v.nombreCliente || 'Consumidor Final',
      clienteDoc: v.numDocumento || 'S/D',
      clienteDireccion: v.clienteDireccion || '',
      items,
      subtotal: v.subtotal,
      igv: v.igv,
      total: v.total,
      totalLetras,
      hashResumen,
      metodoPago: v.metodoPago,
      qrImageUrl,
      enlacePdf,
      contingencia,
      shouldAutoPrint: true,
    });

    setSunatModalOpen(true);
  };



  const enviarPorWhatsApp = (v) => {
    if (!v) return;
    const telefono = prompt("Ingresa el número de WhatsApp del cliente (Ej. 999888777):");
    if (!telefono) return;
    
    // Validar formato básico peruano (9 dígitos)
    const cleanedPhone = telefono.replace(/\D/g, '');
    if (cleanedPhone.length !== 9) {
      alert("Por favor, ingresa un número de celular válido de 9 dígitos.");
      return;
    }
    
    let serie = v.tipoComprobante === 'Factura' ? 'F001' : 'B001';
    let correlativoStr = String(v.id % 10000).padStart(4, '0');
    let enlace = 'https://www.nubefact.com/buscar';

    if (v.estadoNubefact && v.estadoNubefact.startsWith('ACEPTADO:')) {
      try {
        const responseData = JSON.parse(v.estadoNubefact.substring(9));
        serie = responseData.serie || serie;
        correlativoStr = String(responseData.numero || correlativoStr).padStart(4, '0');
        enlace = responseData.enlace_del_pdf || responseData.enlace || enlace;
      } catch (err) {
        console.error("Error parsing Nubefact response for WhatsApp:", err);
      }
    }
    
    const mensaje = `Estimado cliente *${v.nombreCliente || 'Consumidor Final'}*, le hacemos entrega de su comprobante electrónico *${v.tipoComprobante === 'Factura' ? 'FACTURA' : 'BOLETA'} ${serie}-${correlativoStr}* por un monto total de *S/ ${v.total.toFixed(2)}*.\n\nPuede consultar y descargar su documento oficial desde aquí:\n${enlace}\n\n¡Gracias por su preferencia en *Pollería El Fogón Dorado*!`;
    
    const waURL = `https://api.whatsapp.com/send?phone=51${cleanedPhone}&text=${encodeURIComponent(mensaje)}`;
    window.open(waURL, '_blank');
  };






  const handleComprobanteChange = (val) => {
    setTipoComprobante(val);
    setNumDocumento('');
    setClienteNombre('');
    setClienteDireccion('');
  };

  const procesarCobroYFacturar = async () => {
    if (!mesaSeleccionada || !mesaSeleccionada.pedidoData) return;
    if (tipoComprobante === 'Factura' && !clienteNombre) {
      alert('Por favor, busca y valida el RUC del cliente antes de cobrar.');
      return;
    }
    setCobrando(true);
    try {
      const total = mesaSeleccionada.pedidoData.total;
      const response = await api.cobrar({
        pedidoIds: mesaSeleccionada.pedidoData.pedidoIds,
        tipoComprobante,
        numDocumento: numDocumento || null,
        nombreCliente: clienteNombre || 'PÚBLICO GENERAL',
        total,
        metodoPago,
        clienteDireccion: clienteDireccion || '',
      });

      // Incrementar correlativo SUNAT
      const keyCorrelativo = tipoComprobante === 'Factura' ? 'polleria_factura_correlativo' : 'polleria_boleta_correlativo';
      const correlativoActual = parseInt(localStorage.getItem(keyCorrelativo) || '1');
      localStorage.setItem(keyCorrelativo, String(correlativoActual + 1));

      // Guardar en activeComprobante
      const fecha = new Date().toLocaleDateString('es-PE');
      const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      
      let serie = tipoComprobante === 'Factura' ? 'F001' : 'B001';
      let correlativoStr = String(correlativoActual).padStart(4, '0');
      let subtotal = total / 1.18;
      let igv = total - subtotal;
      let totalLetras = numeroALetras(total);
      let hashResumen = "gSbTDa" + Math.random().toString(36).substring(2, 8).toUpperCase() + "iIZDyirfA6TBPKJnEI=";
      const rucEmpresa = "R.U.C. N° 20496009259";
      let qrData = `${rucEmpresa}|03|${serie}|${correlativoStr}|${igv.toFixed(2)}|${total.toFixed(2)}|${fecha}|${tipoComprobante === 'Factura'?'6':'1'}|${numDocumento || '00000000'}`;
      let enlacePdf = null;

      let contingencia = response.contingencia || false;

      // Extraer datos oficiales devueltos por la API de Nubefact
      if (response.estadoNubefact && response.estadoNubefact.startsWith('ACEPTADO:')) {
        try {
          const responseData = JSON.parse(response.estadoNubefact.substring(9));
          serie = responseData.serie || serie;
          correlativoStr = String(responseData.numero || correlativoStr).padStart(4, '0');
          if (responseData.cadena_para_codigo_qr) {
            qrData = responseData.cadena_para_codigo_qr;
          }
          if (responseData.key) {
            hashResumen = responseData.key;
          }
          enlacePdf = responseData.enlace_del_pdf || null;
        } catch (err) {
          console.error("Error parsing Nubefact response:", err);
        }
      }

      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrData)}`;

      setActiveComprobante({
        tipo: tipoComprobante,
        serie,
        correlativo: correlativoStr,
        fecha,
        hora,
        mesaNum: mesaSeleccionada.num,
        clienteNombre: clienteNombre || 'Consumidor Final',
        clienteDoc: numDocumento || 'S/D',
        clienteDireccion: clienteDireccion || '',
        items: mesaSeleccionada.pedidoData.items,
        subtotal,
        igv,
        total,
        totalLetras,
        hashResumen,
        metodoPago,
        qrImageUrl,
        enlacePdf,
        contingencia,
        shouldAutoPrint: true,
      });

      setModalOpen(false);
      setNumDocumento('');
      setClienteNombre('');
      setClienteDireccion('');
      setSunatModalOpen(true);

      await fetchCajaData();
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
          {(() => {
            const ventasFiltradas = ultimoCierre 
              ? ventas.filter(v => new Date(v.createdAt) > new Date(ultimoCierre))
              : ventas;

            return (
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-500" /> Historial de Ventas del Día
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {ventasFiltradas.length} Venta{ventasFiltradas.length !== 1 ? 's' : ''}
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
                        <th className="px-6 py-4 text-center">Acción</th>

                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm bg-white">
                      {ventasFiltradas.length > 0 ? ventasFiltradas.map(v => (
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
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => reimprimirComprobante(v)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                title="Reimprimir Comprobante Susii 80mm"
                              >
                                <Printer className="w-3.5 h-3.5" /> Reimprimir
                              </button>
                              <button
                                onClick={() => enviarPorWhatsApp(v)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                title="Enviar Comprobante por WhatsApp"
                              >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.161.001 6.136 1.23 8.375 3.466 2.238 2.237 3.467 5.21 3.466 8.373-.003 6.535-5.328 11.86-11.859 11.86-2.007-.001-3.98-.51-5.753-1.48L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.269 0 9.557-4.287 9.559-9.556.001-2.553-.99-4.955-2.792-6.758-1.802-1.802-4.199-2.793-6.753-2.794-5.27 0-9.559 4.287-9.56 9.559-.001 1.625.434 3.208 1.262 4.622L1.51 21.054l4.137-1.9zm12.135-6.843c-.268-.134-1.583-.78-1.828-.87-.247-.09-.427-.134-.607.134-.18.267-.697.87-.852 1.047-.156.178-.311.201-.579.067-.268-.134-1.132-.418-2.156-1.332-.796-.71-1.335-1.586-1.492-1.853-.156-.268-.017-.413.117-.547.12-.12.268-.312.401-.468.134-.156.179-.268.268-.446.09-.178.045-.335-.022-.469-.067-.134-.607-1.462-.832-2.002-.22-.53-.442-.457-.607-.466-.156-.008-.337-.008-.518-.008-.18 0-.473.067-.72.337-.247.268-.943.922-.943 2.248s.965 2.604 1.1 2.784c.134.18 1.9 2.901 4.6 4.068.643.277 1.143.443 1.534.568.646.205 1.233.176 1.697.107.518-.077 1.583-.647 1.807-1.272.223-.624.223-1.159.156-1.272-.069-.112-.249-.18-.517-.313z" />
                                </svg> WhatsApp
                              </button>
                            </div>
                          </td>
                        </tr>


                      )) : (
                        <tr>
                          <td colSpan="6" className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider text-xs">
                            Aún no se han registrado ventas hoy en este turno.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

        {/* RESUMEN LATERAL */}
        {(() => {
          const ventasFiltradas = ultimoCierre 
            ? ventas.filter(v => new Date(v.createdAt) > new Date(ultimoCierre))
            : ventas;
          const activeAtendidas = ventasFiltradas.length;
          const activeIngresos = ventasFiltradas.reduce((s, v) => s + v.total, 0);

          return (
            <div className="bg-slate-900 rounded-3xl shadow-xl p-6 text-white flex flex-col sticky top-4">
              <h2 className="font-black uppercase text-xs tracking-widest mb-6 text-amber-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Resumen del Turno
              </h2>
              <div className="space-y-4 flex-1">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Mesas Atendidas Hoy</p>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-3xl font-black">{activeAtendidas}</p>
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
                    <p className="text-3xl lg:text-4xl font-black font-mono tracking-tighter">S/ {activeIngresos.toFixed(2)}</p>
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
          );
        })()}
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
                        <input type="text" value={numDocumento} onChange={(e) => handleDocumentoChange(e.target.value)} placeholder={tipoComprobante === 'Factura' ? 'Ej. 20496009259' : 'Ej. 70443322'} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-mono" />

                        <button onClick={buscarCliente} disabled={!numDocumento || isBuscando} className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-amber-500 hover:text-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 shadow-md">
                          {isBuscando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1 text-[10px] tracking-widest uppercase">Razón Social / Nombres:</label>
                      <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Consumidor Final" className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-bold mb-1 text-[10px] tracking-widest uppercase">Dirección del Cliente:</label>
                      <input type="text" value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} placeholder="Opcional (Ej. Av. Hoyos Rubio Nro. 338)" className="w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
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
        // Consolidación reactiva de montos del turno actual
        const ventasFiltradas = ultimoCierre 
          ? ventas.filter(v => new Date(v.createdAt) > new Date(ultimoCierre))
          : ventas;

        const totalEfectivo = ventasFiltradas.filter(v => v.metodoPago === 'Efectivo').reduce((s, v) => s + v.total, 0);
        const totalTarjeta = ventasFiltradas.filter(v => v.metodoPago === 'Tarjeta').reduce((s, v) => s + v.total, 0);
        const totalYape = ventasFiltradas.filter(v => v.metodoPago === 'Yape').reduce((s, v) => s + v.total, 0);
        const totalPedidosYa = ventasFiltradas.filter(v => v.metodoPago === 'PedidosYa').reduce((s, v) => s + v.total, 0);
        const totalCalculado = totalEfectivo + totalTarjeta + totalYape + totalPedidosYa;

        return (
          <div id="modal-cierre" className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-up relative">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Calculator className="w-6 h-6 shrink-0" />
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight leading-none">Arqueo y Cierre</h3>
                </div>
                <button onClick={() => setCierreModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>
 
              {/* Vista del ticket térmico */}
              <div id="cierre-imprimible" className="bg-amber-50/70 border-2 border-dashed border-amber-200 rounded-2xl p-5 font-mono text-slate-800 text-xs shadow-sm mb-6 flex flex-col">
                <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-4">
                  <h4 className="font-black text-sm text-slate-900 uppercase">NUEVO FOGÓN DORADO E.I.R.L.</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Av. Hoyos Rubio Nro. 338 · RUC: 20496009259</p>
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
                    const nowISO = new Date().toISOString();
                    localStorage.setItem('ultimoCierre', nowISO);
                    setUltimoCierre(nowISO);
                    alert(`✅ ¡Cierre de Turno exitoso!\n\nSe consolidó un total de S/ ${totalCalculado.toFixed(2)} en ventas.\nEl turno ha sido archivado e inicializado.`);
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

      {/* SUNAT Comprobante Susii Style Modal */}
      {sunatModalOpen && activeComprobante && (
        <div id="modal-comprobante-sunat-print-container" className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
            <div className="bg-slate-950 p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" /> {activeComprobante.tipo === 'Factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA'}
              </h3>
              <button onClick={() => setSunatModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div id="comprobante-sunat-ticket-print" className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-900 font-mono text-xs leading-relaxed">
              {activeComprobante.contingencia && (
                <div className="bg-amber-100 text-amber-900 border-2 border-dashed border-amber-400 p-2 rounded-lg text-center mb-3 font-bold text-[9px] uppercase tracking-tight no-print">
                  ⚠️ TICKET DE CONTROL INTERNO<br />
                  Emisión electrónica pendiente por contingencia
                </div>
              )}
              
              <div className="text-center font-bold" style={{ fontSize: '14px', marginBottom: '2px' }}>Nuevo Fogón Dorado E.I.R.L.</div>
              <div className="text-center text-[10px] leading-tight mb-2">
                Av. Hoyos Rubio Nro. 338, Pueblo Nuevo, Cajamarca<br />
                R.U.C. N° 20496009259
              </div>


              
              <div className="text-center font-bold mb-1" style={{ fontSize: '11px' }}>{activeComprobante.tipo === 'Factura' ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA'}</div>
              <div className="text-center font-bold mb-3" style={{ fontSize: '13px' }}>{activeComprobante.serie}-{activeComprobante.correlativo}</div>
              
              <div className="flex justify-between border-t border-b border-dashed border-slate-300 py-1.5 mb-2 font-bold">
                <span>{activeComprobante.fecha} {activeComprobante.hora}</span>
                <span>Mesa {activeComprobante.mesaNum}</span>
              </div>
              
              <div className="space-y-1 mb-3">
                <div><strong>Cliente:</strong> <span className="uppercase">{activeComprobante.clienteNombre}</span></div>
                <div><strong>{activeComprobante.tipo === 'Factura' ? 'RUC' : 'DNI'}:</strong> <span>{activeComprobante.clienteDoc}</span></div>
                {activeComprobante.clienteDireccion && (
                  <div><strong>Dirección:</strong> <span className="uppercase text-[9px] leading-none block mt-0.5">{activeComprobante.clienteDireccion}</span></div>
                )}
                <div><strong>Items:</strong> <span>{activeComprobante.items.length}</span></div>
              </div>
              
              <hr style={{ border: '0', borderTop: '1px dashed black', margin: '10px 0' }} />
              
              {/* Items Table Header */}
              <div className="flex font-bold border-b border-dashed border-slate-350 pb-1 mb-1">
                <span className="w-16 shrink-0">Cant.</span>
                <span className="flex-1">DESCRIPCIÓN</span>
                <span className="w-16 text-right shrink-0">P.Unit</span>
                <span className="w-20 text-right shrink-0">TOTAL</span>
              </div>
              
              {activeComprobante.items.map((item, idx) => {
                const subTotalItem = item.cant * item.precio;
                return (
                  <div key={idx} className="flex items-start mb-1">
                    <span className="w-16 shrink-0">{item.cant.toFixed(2)} NIU</span>
                    <span className="flex-1 uppercase">{item.nombre}</span>
                    <span className="w-16 text-right shrink-0">{item.precio.toFixed(2)}</span>
                    <span className="w-20 text-right shrink-0">{subTotalItem.toFixed(2)}</span>
                  </div>
                );
              })}
              
              <hr style={{ border: '0', borderTop: '1px dashed black', margin: '10px 0' }} />
              
              <div className="space-y-1 text-right font-bold" style={{ fontSize: '11px' }}>
                <div className="flex justify-between"><span>SUBTOTAL</span> <span>S/ {activeComprobante.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>I.G.V (18%)</span> <span>S/ {activeComprobante.igv.toFixed(2)}</span></div>
                <div className="flex justify-between" style={{ fontSize: '12px', fontWeight: '900' }}><span>TOTAL</span> <span>S/ {activeComprobante.total.toFixed(2)}</span></div>
              </div>
              
              <hr style={{ border: '0', borderTop: '1px dashed black', margin: '10px 0' }} />
              
              <div className="mb-4">
                <strong className="block text-[10px]">IMPORTE EN LETRAS:</strong>
                <span className="uppercase text-[10px] leading-tight block">{activeComprobante.totalLetras}</span>
              </div>
              
              <div className="mb-3">
                <strong>RESUMEN:</strong> <span className="font-mono text-[10px]">{activeComprobante.hashResumen}</span>
              </div>
              
              <div>
                <strong>FORMA DE PAGO:</strong> <span className="uppercase">{activeComprobante.metodoPago === 'Efectivo' ? 'CONTADO' : 'CONTADO (' + activeComprobante.metodoPago + ')'}</span>
              </div>
              
              <div className="flex justify-center my-5">
                <img 
                  src={activeComprobante.qrImageUrl} 
                  alt="QR Comprobante" 
                  style={{ width: '120px', height: '120px' }} 
                  className="border p-1 bg-white"
                  onLoad={() => {
                    if (activeComprobante.shouldAutoPrint) {
                      setTimeout(() => {
                        window.print();
                      }, 200);
                      activeComprobante.shouldAutoPrint = false; // Evitar disparar de nuevo al recargar
                    }
                  }}
                />
              </div>

              
              <div className="text-center font-bold" style={{ fontSize: '10px' }}>¡Gracias por su preferencia!</div>
              <div className="text-center text-[9px] leading-tight text-slate-500 mt-1">
                Representación impresa de la Factura electrónica. Consulte su documento en: https://www.nubefact.com/buscar
              </div>


              {activeComprobante.enlacePdf && (
                <div className="text-center text-[10px] mt-4 font-bold no-print pt-2 border-t border-slate-100">
                  <a href={activeComprobante.enlacePdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 flex items-center justify-center gap-1.5">
                    📄 Descargar Comprobante SUNAT (PDF)
                  </a>
                </div>
              )}
            </div>

            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase tracking-widest rounded-xl text-xs flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20">
                <Receipt className="w-4 h-4" /> Imprimir 80mm
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          /* Ocultar elementos de navegación y fondos */
          aside, header, #sidebar-menu, #sidebar-backdrop, button, nav, .shrink-0 {
            display: none !important;
          }
          /* Ocultar el resto del contenido de la página excepto el modal a imprimir */
          main > *:not(section),
          section > *:not(#modal-comprobante-sunat-print-container):not(#modal-cierre) {
            display: none !important;
          }
          /* Garantizar que el body y contenedores no tengan alturas fijas o desbordamientos */
          html, body, #root, main, section {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
            width: auto !important;
          }
          /* Formatear el contenedor del ticket en 80mm en la esquina superior izquierda */
          #modal-comprobante-sunat-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            height: auto !important;
            display: block !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #modal-comprobante-sunat-print-container > div {
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: 80mm !important;
            width: 80mm !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #modal-comprobante-sunat-print-container div.bg-slate-950, 
          #modal-comprobante-sunat-print-container div.shrink-0 {
            display: none !important;
          }
          #comprobante-sunat-ticket-print {
            width: 80mm !important;
            padding: 10px !important;
            margin: 0 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            color: black !important;
          }
          
          /* Cierre de Caja en impresión */
          #modal-cierre {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            height: auto !important;
            display: block !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #modal-cierre > div {
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: 80mm !important;
            width: 80mm !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #modal-cierre div.bg-slate-950, 
          #modal-cierre div.shrink-0 {
            display: none !important;
          }
          #cierre-imprimible {
            width: 80mm !important;
            padding: 10px !important;
            margin: 0 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            color: black !important;
          }
        }
      `}</style>


    </section>

  );
}
