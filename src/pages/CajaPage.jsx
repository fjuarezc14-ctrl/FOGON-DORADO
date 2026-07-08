import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Receipt, X, Banknote, Search, CheckCircle, Clock, Sparkles, CreditCard, Wallet, Truck, PackageCheck, Plus, Calculator, Printer, Gift, Tag, Percent, Check } from 'lucide-react';

import { api } from '../api';

const PRODUCT_OPTIONS_CONFIG = {
  "Combo Criollo (Almuerzo)": {
    steps: [
      { name: "Sopa o Entrada", key: "entrada", options: ["Sopa de Gallina", "Tequeños (3 unds)", "Papa a la Huancaína", "Ensalada Mixta"] },
      { name: "Plato de Fondo", key: "fondo", options: ["Saltado de Carne", "Saltado de Pollo", "Tallarín Saltado Pollo", "Tallarín Saltado Carne", "Chaufa de Pollo", "Chaufa de Carne", "Trucha Frita", "Alitas Fritas", "Milanesa de Pollo", "Chicharrón de Pollo"] },
      { name: "Refresco", key: "refresco", options: ["Chicha Morada", "Maracuyá", "Limonada", "Naranjada"] },
      { name: "Postre", key: "postre", options: ["Gelatina", "Ensalada de frutas", "Porción de helado", "Ninguno"] }
    ]
  },
  "Combo Parrillero (Almuerzo)": {
    steps: [
      { name: "Sopa o Entrada", key: "entrada", options: ["Sopa de Gallina", "Tequeños (3 unds)", "Papa a la Huancaína", "Ensalada Mixta"] },
      { name: "Plato de Fondo", key: "fondo", options: ["Chuleta de cerdo", "Filete de pollo", "Churrasco", "Pechuga"] },
      { name: "Refresco", key: "refresco", options: ["Chicha Morada", "Maracuyá", "Limonada", "Naranjada"] },
      { name: "Postre", key: "postre", options: ["Gelatina", "Ensalada de frutas", "Porción de helado", "Ninguno"] }
    ]
  },
  "Combo Tallarines Verdes (Almuerzo)": {
    steps: [
      { name: "Sopa o Entrada", key: "entrada", options: ["Sopa de Gallina", "Tequeños (3 unds)", "Papa a la Huancaína", "Ensalada Mixta"] },
      { name: "Plato de Fondo", key: "fondo", options: ["Con Pollo Frito", "Con Bisteck", "Con Pechuga", "Con Chuleta", "Con Pollo Deshuesado"] },
      { name: "Refresco", key: "refresco", options: ["Chicha Morada", "Maracuyá", "Limonada", "Naranjada"] },
      { name: "Postre", key: "postre", options: ["Gelatina", "Ensalada de frutas", "Porción de helado", "Ninguno"] }
    ]
  },
  "Combo Junior": {
    steps: [
      { name: "Sopa o Entrada", key: "entrada", options: ["Sopa de Gallina", "Tequeños (3 unds)", "Papa a la Huancaína"] },
      { name: "Plato de Fondo", key: "fondo", options: ["3 unds. de chicharrones de pollo", "1/8 pollo a la brasa", "3 alitas fritas (+ ensalada fruta)"] },
      { name: "Refresco", key: "refresco", options: ["Chicha Morada", "Maracuyá", "Limonada", "Naranjada"] },
      { name: "Postre", key: "postre", options: ["Gelatina", "Ensalada de frutas", "Ninguno"] }
    ]
  }
};

const SINONIMOS = {
  gaseosa: ['cola', 'inca', 'coca', 'refresco', 'sprite', 'fanta', 'gaseosa'],
  bebida: ['chicha', 'limonada', 'gaseosa', 'cerveza', 'pisco', 'trago', 'coctel', 'jugo', 'agua'],
  chela: ['cerveza', 'cristal', 'pilsen', 'cusquena'],
  papas: ['papa', 'patata', 'fritas'],
  carne: ['lomo', 'bife', 'parrilla', 'anticucho', 'res', 'corte'],
  pollo: ['brasa', 'broaster', 'alitas', 'pechuga'],
  piqueo: ['entrada', 'porcion', 'tequenos', 'salchipapa'],
  "1/8": ['octavo', 'octavos', '1/8', 'un octavo'],
  "1/4": ['cuarto', 'cuartos', '1/4', 'un cuarto'],
  "1/2": ['medio', 'medios', '1/2', 'un medio', 'mitad'],
  entero: ['entero', 'completo', 'pollo entero', '1', 'uno']
};

const normalizePhonetic = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // eliminar acentos
    .replace(/[^a-z0-9]/g, " ")      // remover caracteres especiales
    .replace(/ch/g, "x")            // ch -> x
    .replace(/ll/g, "y")            // ll -> y
    .replace(/z/g, "s")             // z -> s
    .replace(/c([ei])/g, "s$1")      // ce, ci -> se, si
    .replace(/h/g, "")              // h muda
    .replace(/b/g, "v")              // b -> v equivalencia
    .replace(/k/g, "c")              // k -> c
    .replace(/q/g, "c")              // q -> c
    .trim();
};

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

const matchProductSemantic = (prod, query) => {
  if (!query) return true;
  const cleanQuery = query.toLowerCase().trim();
  const queryTokens = cleanQuery.split(/\s+/);
  
  const cleanProdName = (prod.nombre || '').toLowerCase();
  const cleanProdCat = (prod.categoria || '').toLowerCase();
  
  const phoneticName = normalizePhonetic(prod.nombre);
  const phoneticCat = normalizePhonetic(prod.categoria);
  
  return queryTokens.every(qToken => {
    if (cleanProdName.includes(qToken) || cleanProdCat.includes(qToken)) return true;
    const phoneticToken = normalizePhonetic(qToken);
    if (phoneticName.includes(phoneticToken) || phoneticCat.includes(phoneticToken)) return true;
    for (const [key, syns] of Object.entries(SINONIMOS)) {
      const tokenMatchesSyn = (key === qToken) || syns.some(syn => syn === qToken || normalizePhonetic(syn) === phoneticToken);
      if (tokenMatchesSyn) {
        const prodHasKeyOrSyn = cleanProdName.includes(key) || syns.some(syn => cleanProdName.includes(syn));
        if (prodHasKeyOrSyn) {
          return true;
        }
      }
    }
    return false;
  });
};

const agruparProductos = (items) => {
  const list = [];
  const tallarines = items.filter(p => p.categoria === 'Tallarines Verdes');
  const otros = items.filter(p => p.categoria !== 'Tallarines Verdes');
  
  if (tallarines.length > 0) {
    const ordenados = [...tallarines].sort((a, b) => a.precio - b.precio);
    list.push({
      id: 'group_tallarines_verdes',
      nombre: 'Tallarines Verdes',
      categoria: 'Tallarines Verdes',
      precioMin: ordenados[0].precio,
      precioMax: ordenados[ordenados.length - 1].precio,
      esAgrupado: true,
      variantes: tallarines,
      tipoStock: 'ilimitado',
      stock: 0,
      activo: true
    });
  }
  
  return [...list, ...otros];
};

export default function CajaPage({ currentUser }) {
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

  // Campos para Delivery Propio y Para Llevar en modal
  const [deliveryTelefono, setDeliveryTelefono] = useState('');
  const [deliveryDireccion, setDeliveryDireccion] = useState('');
  const [deliveryMontoEnvio, setDeliveryMontoEnvio] = useState('');
  const [deliveryConCuanto, setDeliveryConCuanto] = useState('');
  const [deliveryTipoComprobante, setDeliveryTipoComprobante] = useState('Ticket');
  const [deliveryMetodoPago, setDeliveryMetodoPago] = useState('Efectivo');
  const [deliveryClienteNombre, setDeliveryClienteNombre] = useState('');
  const [deliveryNumDocumento, setDeliveryNumDocumento] = useState('');


  // Historial de Ventas y Arqueo/Cierre de Caja
  const [ventas, setVentas] = useState([]);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState(localStorage.getItem('ultimoCierre') || null);

  // Modal PedidosYa y Para Llevar
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [codigoPY, setCodigoPY] = useState('');
  const [cajeroNombre, setCajeroNombre] = useState(currentUser?.nombre || 'María');

  useEffect(() => {
    if (currentUser?.nombre) {
      setCajeroNombre(currentUser.nombre);
    }
  }, [currentUser]);

  const [deliverySearchQuery, setDeliverySearchQuery] = useState('');
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selections, setSelections] = useState({});
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [productosMenu, setProductosMenu] = useState([]);
  const [itemsDelivery, setItemsDelivery] = useState([]);
  const [enviandoDelivery, setEnviandoDelivery] = useState(false);
  const [tipoDelivery, setTipoDelivery] = useState('PedidosYa'); // 'PedidosYa' | 'ParaLlevar'
  const [toasts, setToasts] = useState([]);
  const prevPedidosLlevarRef = useRef([]);
  const historialScrollRef = useRef(null);


  // Campana de Restaurante Premium (G5 -> C6)
  const playChimeNotification = () => {
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
      console.error('AudioContext no soportado:', e);
    }
  };

  const fetchCajaData = useCallback(async () => {
    try {
      const [mesasData, resumenData, llevarData, ventasData, prods] = await Promise.all([
        api.getMesas(),
        api.getResumenVentas(),
        api.getPedidosLlevar(),
        api.getHistorialVentas(),
        api.getProductos(), // <-- Recargar productos dinámicamente para ofertas en vivo
      ]);
      setMesas(mesasData);
      setPedidosLlevar(llevarData);
      setStats({ atendidas: resumenData.atendidas || 0, ingresos: resumenData.ingresos || 0 });
      setVentas(ventasData || []);
      setProductosMenu(prods); // <-- Actualizar el menú con precios de oferta en vivo
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

  // Alerta sonora y visual en tiempo real al estar listos
  useEffect(() => {
    if (pedidosLlevar.length === 0) {
      if (prevPedidosLlevarRef.current.length === 0) prevPedidosLlevarRef.current = pedidosLlevar;
      return;
    }
    if (prevPedidosLlevarRef.current.length > 0) {
      pedidosLlevar.forEach(p => {
        const ant = prevPedidosLlevarRef.current.find(prev => prev.pedidoId === p.pedidoId);
        if (ant && ant.estado === 'Cocina' && p.estado === 'Servido') {
          playChimeNotification();
          const toastId = Date.now() + Math.random();
          setToasts(prev => [...prev, { id: toastId, mensaje: `🛎️ ¡Pedido "${p.codigoPedidosYa}" está LISTO para entregar!` }]);
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 9000);
        }
      });
    }
    prevPedidosLlevarRef.current = pedidosLlevar;
  }, [pedidosLlevar]);

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

  const buscarClienteDelivery = async () => {
    if (!deliveryNumDocumento) return;
    setIsBuscando(true);
    const doc = deliveryNumDocumento.trim();
    
    if (doc === '20613857321') {
      setDeliveryClienteNombre('FIRST FISH S.A.C.');
      setDeliveryDireccion('LT. 05 DPTO. LIMA MZ. J COOP. CAJABAMBA - LIMA LIMA LOS OLIVOS');
      setIsBuscando(false);
      return;
    } else if (doc === '10404040404') {
      setDeliveryClienteNombre('JUAN PEREZ SOTO');
      setDeliveryDireccion('CALLE SAN MARTÍN 109');
      setIsBuscando(false);
      return;
    }

    try {
      const data = await api.consultarCliente(doc);
      const isRUC = doc.length === 11;
      if (isRUC) {
        setDeliveryClienteNombre(data.razonSocial || '');
        setDeliveryDireccion(data.direccion || '');
      } else {
        setDeliveryClienteNombre(data.nombre || '');
        if (data.direccion) setDeliveryDireccion(data.direccion);
      }
    } catch (err) {
      console.error("Error consultando API de DNI/RUC en delivery:", err);
      alert("No se encontró el cliente o error en la consulta.");
    } finally {
      setIsBuscando(false);
    }
  };


  const reimprimirComprobante = (v) => {
    if (!v) return;
    const rucEmpresa = "R.U.C. N° 20496009259";
    
    let serie = v.serie || (v.tipoComprobante === 'Factura' ? 'F001' : (v.tipoComprobante === 'Ticket' ? 'T001' : 'B001'));
    let correlativoStr = String(v.numero || (v.id % 10000)).padStart(4, '0');
    let qrData = `${rucEmpresa}|${v.tipoComprobante === 'Factura' ? '01' : '03'}|${serie}|${correlativoStr}|${v.igv.toFixed(2)}|${v.total.toFixed(2)}|${v.fecha || new Date(v.createdAt).toLocaleDateString('es-PE')}|${v.tipoComprobante === 'Factura'?'6':(v.numDocumento?.length === 8 ? '1' : '0')}|${v.numDocumento || '00000000'}`;
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

    const parsedDelivery = parseDeliveryInfo(v.codigoPedidosYa) || parseDeliveryInfo(v.nombreCliente);
    const cleanDoc = (() => {
      if (v.numDocumento && v.numDocumento.startsWith('DELIVERY -')) return 'S/D';
      return v.numDocumento || 'S/D';
    })();
    const cleanNombre = (() => {
      if (parsedDelivery) return parsedDelivery.nombre;
      if (v.nombreCliente && v.nombreCliente.startsWith('DELIVERY -')) {
        return v.nombreCliente.replace('DELIVERY - ', '');
      }
      return v.nombreCliente || 'Consumidor Final';
    })();

    // Sumar items y agregar servicio de delivery si hay descuadre
    const sumItems = items.reduce((s, i) => s + (i.cant * i.precio), 0);
    const diff = v.total - sumItems;
    if (diff > 0.05 && (v.codigoPedidosYa?.startsWith('DELIVERY -') || v.nombreCliente?.startsWith('DELIVERY -'))) {
      items = [...items, { cant: 1, nombre: 'Servicio de Delivery', precio: diff }];
    }

    setActiveComprobante({
      tipo: v.tipoComprobante,
      serie,
      correlativo: correlativoStr,
      fecha: v.fecha || new Date(v.createdAt).toLocaleDateString('es-PE'),
      hora: v.hora,
      mesaNum: v.mesaNum || (parsedDelivery ? 'Delivery' : 'Llevar'),
      clienteNombre: cleanNombre,
      clienteDoc: cleanDoc,
      clienteDireccion: parsedDelivery ? parsedDelivery.direccion : (v.clienteDireccion || ''),
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
      deliveryInfo: parsedDelivery,
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
    let enlace = 'https://www.sunat.gob.pe';

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

    // Si es Cortesía, requerir PIN de supervisor/cajero
    if (metodoPago === 'Cortesía') {
      const pin = prompt("🔐 AUTORIZACIÓN DE SUPERVISOR:\nIngresa PIN de Administrador o Cajero para autorizar la Cortesía (Costo Cero):");
      if (pin === null) return;
      if (!pin.trim()) { alert("El PIN de autorización es obligatorio."); return; }
      
      try {
        const auth = await api.validateAuth(pin);
        if (auth.error) throw new Error(auth.error);
        alert(`✅ Cortesía autorizada por: ${auth.nombre} (${auth.rol})`);
      } catch (err) {
        alert("Error de Autorización: " + err.message);
        return;
      }
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

      setModalOpen(false);
      setNumDocumento('');
      setClienteNombre('');
      setClienteDireccion('');

      // Desencadenar la visualización e impresión del comprobante
      abrirTicketImpresionDirecto(
        total,
        response,
        tipoComprobante,
        numDocumento || null,
        clienteNombre || 'Consumidor Final',
        clienteDireccion || '',
        mesaSeleccionada.pedidoData.items,
        mesaSeleccionada.num
      );

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
    setDeliverySearchQuery('');
    setDeliveryTelefono('');
    setDeliveryDireccion('');
    setDeliveryMontoEnvio('');
    setDeliveryConCuanto('');
    setDeliveryTipoComprobante('Ticket');
    setDeliveryMetodoPago('Efectivo');
    setDeliveryClienteNombre('');
    setDeliveryNumDocumento('');
    setTipoDelivery('PedidosYa');
    setDeliveryModal(true);
  };

  const getProductSteps = (prod) => {
    if (!prod) return [];
    
    // 1. Variantes de Tallarines Verdes
    if (prod.esAgrupado) {
      const todasLasVariantes = productosMenu.filter(p => p.categoria === 'Tallarines Verdes' && p.activo);
      return [{
        name: "Elige la Variante de Carne",
        key: "producto_variante",
        options: todasLasVariantes.map(v => ({
          label: `${v.nombre.replace('Tallarines Verdes con ', 'Con ').replace('Tallarines Verdes Con ', 'Con ')} (S/ ${v.precio.toFixed(2)})`,
          value: v
        }))
      }];
    }
    
    // 2. Combos configurados
    if (PRODUCT_OPTIONS_CONFIG[prod.nombre]) {
      return PRODUCT_OPTIONS_CONFIG[prod.nombre].steps.map(step => ({
        ...step,
        options: step.options.map(opt => ({ label: opt, value: opt }))
      }));
    }
    
    // 3. Guarniciones genéricas para carnes y pollos
    const requiereGuarnicion = 
      ['Pollos a la Brasa', 'Parrillas y Cortes', 'Parrilladas Mixtas', 'Porciones y Piqueos'].includes(prod.categoria) && 
      !prod.nombre.toLowerCase().includes('solo');
      
    if (requiereGuarnicion) {
      return [{
        name: "Elige la Guarnición",
        key: "guarnicion",
        options: [
          { label: "Papas Fritas", value: "Papas Fritas" },
          { label: "Arroz Chaufa", value: "Arroz Chaufa" },
          { label: "Papa Sancochada", value: "Papa Sancochada" },
          { label: "Choclo Sancochado", value: "Choclo Sancochado" },
          { label: "Sin Guarnición", value: "Sin Guarnición" }
        ]
      }];
    }
    
    return [];
  };

  const agregarItemDelivery = (prod) => {
    const steps = getProductSteps(prod);
    
    // Si requiere opciones, abrir modal
    if (steps.length > 0) {
      setSelectedProduct(prod);
      const initialSelections = {};
      steps.forEach(step => {
        initialSelections[step.key] = step.options[0]?.value; // pre-select first option
      });
      setSelections(initialSelections);
      setCurrentStepIdx(0);
      setAdditionalNotes('');
      setOptionsModalOpen(true);
    } else {
      agregarItemDeliveryDirecto(prod);
    }
  };

  const agregarItemDeliveryDirecto = (prod, notas = null) => {
    const idx = itemsDelivery.findIndex(i => i.id === String(prod.id) && i.notas === notas);
    const cantEnTicket = idx >= 0 ? itemsDelivery[idx].cant : 0;
    
    // Validar stock si es limitado
    if (prod.tipoStock === 'limitado' && cantEnTicket >= prod.stock) {
      alert(`⚠️ Stock agotado. Solo quedan ${prod.stock} unidades de "${prod.nombre}".`);
      return;
    }

    const precioFinal = prod.precioOferta !== null && prod.precioOferta !== undefined ? prod.precioOferta : prod.precio;

    if (idx >= 0) {
      const nuevo = [...itemsDelivery];
      nuevo[idx].cant++;
      setItemsDelivery(nuevo);
    } else {
      setItemsDelivery([...itemsDelivery, { 
        id: String(prod.id), 
        nombre: prod.nombre, 
        precio: precioFinal, 
        cant: 1,
        ofertaNombre: prod.ofertaNombre,
        precioOriginal: prod.precio,
        notas: notas
      }]);
    }
  };

  const alterarItemDelivery = (idx, op) => {
    const nuevo = [...itemsDelivery];
    if (op === '+') {
      const prodOriginal = productosMenu.find(p => String(p.id) === String(nuevo[idx].id));
      if (prodOriginal && prodOriginal.tipoStock === 'limitado' && nuevo[idx].cant >= prodOriginal.stock) {
        alert(`⚠️ Stock agotado. Solo quedan ${prodOriginal.stock} unidades de "${prodOriginal.nombre}".`);
        return;
      }
      nuevo[idx].cant++;
    } else {
      nuevo[idx].cant--;
      if (nuevo[idx].cant <= 0) nuevo.splice(idx, 1);
    }
    setItemsDelivery(nuevo);
  };

  const abrirTicketImpresionDirecto = (total, response, tipoComprobante, numDocumento, clienteNombre, clienteDireccion, items, mesaNum = 'Delivery', deliveryInfo = null) => {
    if (!response) response = {};
    const fecha = new Date().toLocaleDateString('es-PE');
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    
    let serie = response.serie || (tipoComprobante === 'Factura' ? 'F001' : (tipoComprobante === 'Ticket' ? 'T001' : 'B001'));
    let correlativoStr = String(response.numero || 1).padStart(4, '0');
    let subtotal = total / 1.18;
    let igv = total - subtotal;
    let totalLetras = numeroALetras(total);
    let hashResumen = "gSbTDa" + Math.random().toString(36).substring(2, 8).toUpperCase() + "iIZDyirfA6TBPKJnEI=";
    const rucEmpresa = "R.U.C. N° 20496009259";
    let qrData = `${rucEmpresa}|${tipoComprobante === 'Factura' ? '01' : '03'}|${serie}|${correlativoStr}|${igv.toFixed(2)}|${total.toFixed(2)}|${fecha}|${tipoComprobante === 'Factura' ? '6' : (numDocumento?.length === 8 ? '1' : '0')}|${numDocumento || '00000000'}`;
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
      mesaNum,
      clienteNombre: clienteNombre || 'Consumidor Final',
      clienteDoc: numDocumento || 'S/D',
      clienteDireccion: clienteDireccion || '',
      items: items.map(i => ({ cant: i.cant, nombre: i.nombre, precio: i.precio, notas: i.notas })),
      subtotal,
      igv,
      total,
      totalLetras,
      hashResumen,
      metodoPago: response.metodoPago || metodoPago,
      qrImageUrl,
      enlacePdf,
      contingencia,
      deliveryInfo,
      shouldAutoPrint: true,
    });

    setSunatModalOpen(true);
  };

  const enviarDeliveryACocina = async () => {
    if (itemsDelivery.length === 0) { alert('Debes agregar al menos un producto.'); return; }
    
    // Validar datos según el canal seleccionado
    if (tipoDelivery === 'PedidosYa') {
      if (!codigoPY.trim()) {
        alert('El código de PedidosYa es obligatorio.');
        return;
      }
    } else if (tipoDelivery === 'ParaLlevar') {
      if (!codigoPY.trim()) {
        alert('El nombre del cliente o número de ticket es obligatorio.');
        return;
      }
      if (deliveryTipoComprobante === 'Factura') {
        if (!deliveryNumDocumento || deliveryNumDocumento.length !== 11) {
          alert('Para emitir Factura, el RUC debe tener 11 dígitos.');
          return;
        }
        if (!deliveryClienteNombre.trim()) {
          alert('Para emitir Factura, la Razón Social del cliente es obligatoria.');
          return;
        }
      }
    } else if (tipoDelivery === 'DeliveryPropio') {
      if (!deliveryClienteNombre.trim()) {
        alert('El nombre del cliente es obligatorio.');
        return;
      }
      if (!deliveryDireccion.trim()) {
        alert('La dirección del cliente es obligatoria.');
        return;
      }
      if (!deliveryTelefono.trim()) {
        alert('El teléfono del cliente es obligatorio.');
        return;
      }
      if (deliveryTipoComprobante === 'Factura') {
        if (!deliveryNumDocumento || deliveryNumDocumento.length !== 11) {
          alert('Para emitir Factura, el RUC debe tener 11 dígitos.');
          return;
        }
      }
    }

    setEnviandoDelivery(true);
    try {
      const itemsTotal = itemsDelivery.reduce((s, i) => s + i.cant * i.precio, 0);
      const shippingFee = parseFloat(deliveryMontoEnvio || 0);
      const grandTotal = itemsTotal + shippingFee;

      let codigoFormateado = '';
      const vueltoVal = (() => {
        const conC = parseFloat(deliveryConCuanto);
        const tot = itemsTotal + shippingFee;
        return (!isNaN(conC) && conC >= tot) ? (conC - tot).toFixed(2) : '0.00';
      })();

      if (tipoDelivery === 'PedidosYa') {
        codigoFormateado = codigoPY.trim().toUpperCase();
      } else if (tipoDelivery === 'ParaLlevar') {
        codigoFormateado = `LLEVAR - ${codigoPY.trim().toUpperCase()}`;
      } else if (tipoDelivery === 'DeliveryPropio') {
        codigoFormateado = `DELIVERY - ${deliveryClienteNombre.trim().toUpperCase()} | TEL: ${deliveryTelefono.trim()} | DIR: ${deliveryDireccion.trim()} | PAGA: ${deliveryConCuanto || '0.00'} | VUELTO: ${vueltoVal}`;
      }

      const result = await api.crearPedidoLlevar({
        codigoPedidosYa: codigoFormateado,
        cajero: cajeroNombre,
        items: itemsDelivery,
        total: itemsTotal,
        tipoDelivery,
        tipoComprobante: tipoDelivery === 'PedidosYa' ? 'Ticket' : deliveryTipoComprobante,
        metodoPago: tipoDelivery === 'PedidosYa' ? 'PedidosYa' : deliveryMetodoPago,
        numDocumento: tipoDelivery === 'PedidosYa' ? codigoFormateado : (deliveryNumDocumento || 'S/D'),
        nombreCliente: tipoDelivery === 'PedidosYa' ? 'PEDIDOS YA' : (deliveryClienteNombre || 'Consumidor Final'),
        clienteDireccion: tipoDelivery === 'DeliveryPropio' ? deliveryDireccion : (deliveryDireccion || ''),
        montoDelivery: shippingFee,
        telefono: deliveryTelefono || null,
      });

      if (result.error) throw new Error(result.error);

      // Cerrar modal y recargar datos de Caja
      setDeliveryModal(false);
      await fetchCajaData();
      
      // Si es Para Llevar o Delivery Propio con comprobante Boleta o Factura (o Ticket), activamos el ticket de impresión
      if (tipoDelivery !== 'PedidosYa') {
        // Para que en la impresión figuren los items reales del ticket
        const itemsImpresion = [...itemsDelivery];
        if (shippingFee > 0) {
          itemsImpresion.push({
            id: '9999',
            nombre: 'Servicio de Delivery',
            precio: shippingFee,
            cant: 1
          });
        }
        
        const deliveryInfo = tipoDelivery === 'DeliveryPropio' ? {
          nombre: deliveryClienteNombre,
          telefono: deliveryTelefono,
          direccion: deliveryDireccion,
          montoDelivery: shippingFee,
          conCuanto: deliveryConCuanto || '0.00',
          vuelto: vueltoVal,
        } : null;

        abrirTicketImpresionDirecto(
          grandTotal, 
          result.venta, 
          tipoDelivery === 'PedidosYa' ? 'Ticket' : deliveryTipoComprobante, 
          tipoDelivery === 'PedidosYa' ? null : (deliveryNumDocumento || null), 
          tipoDelivery === 'PedidosYa' ? 'PEDIDOS YA' : (deliveryClienteNombre || 'Consumidor Final'), 
          tipoDelivery === 'DeliveryPropio' ? deliveryDireccion : '', 
          itemsImpresion, 
          tipoDelivery === 'DeliveryPropio' ? 'Delivery' : 'Llevar',
          deliveryInfo
        );
      } else {
        alert(`✅ Pedido ${codigoPY.toUpperCase()} enviado a Cocina. Venta registrada.`);
      }
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
          Pedidos
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
                  <Truck className="w-4 h-4 text-blue-500" /> Pedidos Para Llevar y Delivery (POS / PedidosYa)
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
                            {p.codigoPedidosYa?.startsWith('DELIVERY -') ? (
                              <>
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black shadow-sm text-xs shrink-0 font-bold">DEL</div>
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-800 tracking-tight">
                                    {(() => {
                                      const parsed = parseDeliveryInfo(p.codigoPedidosYa);
                                      return parsed ? parsed.nombre : p.codigoPedidosYa.replace('DELIVERY - ', '');
                                    })()}
                                  </span>
                                  {(() => {
                                    const parsed = parseDeliveryInfo(p.codigoPedidosYa);
                                    if (!parsed) return null;
                                    return (
                                      <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 leading-none block">
                                        📞 {parsed.telefono} · 📍 {parsed.direccion.substring(0, 25)}{parsed.direccion.length > 25 ? '...' : ''}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </>
                            ) : p.codigoPedidosYa?.startsWith('LLEVAR -') ? (
                              <>
                                <div className="w-10 h-10 bg-amber-500 text-slate-900 rounded-xl flex items-center justify-center font-black shadow-sm text-xs shrink-0 font-bold">RET</div>
                                <span className="font-black text-slate-800 tracking-tight">{p.codigoPedidosYa.replace('LLEVAR - ', '')}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shadow-sm text-xs shrink-0">PY</div>
                                <span className="font-black text-blue-800 tracking-tight font-mono">{p.codigoPedidosYa}</span>
                              </>
                            )}
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
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm" style={{ overflow: 'clip' }}>
                <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-500" /> Historial de Ventas del Día
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {ventasFiltradas.length} Venta{ventasFiltradas.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Botones de navegación horizontal */}
                <div className="flex justify-end gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <button
                    onClick={() => historialScrollRef.current && (historialScrollRef.current.scrollLeft -= 200)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all flex items-center justify-center text-sm font-black shadow-sm active:scale-95"
                    title="Desplazar izquierda"
                  >◀</button>
                  <button
                    onClick={() => historialScrollRef.current && (historialScrollRef.current.scrollLeft += 200)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all flex items-center justify-center text-sm font-black shadow-sm active:scale-95"
                    title="Desplazar derecha"
                  >▶</button>
                </div>
                <div ref={historialScrollRef} className="table-scroll pb-1">
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
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-800 text-xs">
                                    {v.tipoComprobante} {v.serie ? `${v.serie}-${String(v.numero).padStart(4, '0')}` : `#${v.id}`}
                                  </span>
                                  {v.estadoNubefact === 'PENDIENTE_REINTENTO' && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-200 animate-pulse flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> ⚠️ CONTINGENCIA
                                    </span>
                                  )}
                                  {v.estadoNubefact && v.estadoNubefact.startsWith('ACEPTADO:') && (
                                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> ✅ ENVIADO
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-tight font-medium mt-0.5">
                                  {(() => {
                                    if (v.codigoPedidosYa?.startsWith('DELIVERY -')) {
                                      const parsed = parseDeliveryInfo(v.codigoPedidosYa);
                                      return parsed ? parsed.nombre : v.nombreCliente;
                                    }
                                    if (v.nombreCliente && v.nombreCliente.startsWith('DELIVERY -')) {
                                      const parsed = parseDeliveryInfo(v.nombreCliente);
                                      return parsed ? parsed.nombre : v.nombreCliente.replace('DELIVERY - ', '');
                                    }
                                    return v.nombreCliente || 'Consumidor Final';
                                  })()}
                                </span>
                                {(() => {
                                  const parsed = parseDeliveryInfo(v.codigoPedidosYa) || parseDeliveryInfo(v.nombreCliente);
                                  if (!parsed) return null;
                                  return (
                                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 block leading-none">
                                      📞 {parsed.telefono} · 📍 {parsed.direccion.substring(0, 20)}{parsed.direccion.length > 20 ? '...' : ''}
                                    </span>
                                  );
                                })()}
                              </div>
                           </td>
                           <td className="px-6 py-4">
                            {v.codigoPedidosYa ? (
                              v.codigoPedidosYa.startsWith('DELIVERY -') ? (
                                <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap">
                                  🛵 DEL: {(() => {
                                    const parsed = parseDeliveryInfo(v.codigoPedidosYa);
                                    const name = parsed ? parsed.nombre : v.codigoPedidosYa.replace('DELIVERY - ', '');
                                    const first = name.split(/\s+/)[0] || '';
                                    return first.substring(0, 10);
                                  })()}
                                </span>
                              ) : v.codigoPedidosYa.startsWith('LLEVAR -') ? (
                                <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap">
                                  🛍️ LLEVAR: {(() => {
                                    const name = v.codigoPedidosYa.replace('LLEVAR - ', '');
                                    const first = name.split(/\s+/)[0] || '';
                                    return first.substring(0, 10);
                                  })()}
                                </span>
                              ) : (
                                <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono whitespace-nowrap">
                                  🛵 PY: {v.codigoPedidosYa}
                                </span>
                              )
                            ) : (
                              <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap">
                                🍽️ Mesa {v.mesaNum}
                              </span>
                            )}
                           </td>
                          <td className="px-6 py-4">
                            {(() => {
                              let method = v.metodoPago;
                              if (method === 'PedidosYa' && v.codigoPedidosYa) {
                                if (v.codigoPedidosYa.startsWith('DELIVERY -') || v.codigoPedidosYa.startsWith('LLEVAR -')) {
                                  method = 'Efectivo';
                                }
                              }
                              return (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                                  method === 'Efectivo' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                  method === 'Tarjeta' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  method === 'Yape' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                                  method === 'Cortesía' ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' :
                                  'bg-indigo-50 border-indigo-200 text-indigo-700'
                                }`}>{method}</span>
                              );
                            })()}
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
          const activeCortesias = ventasFiltradas
            .filter(v => v.metodoPago === 'Cortesía')
            .reduce((sum, v) => {
              const itemsVal = v.items?.reduce((s, i) => s + (i.cant * i.precio), 0) || 0;
              return sum + itemsVal;
            }, 0);

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

                {activeCortesias > 0 && (
                  <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-5 rounded-2xl relative overflow-hidden text-purple-200 border border-purple-800 shadow-md">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white rounded-full opacity-10 animate-pulse"></div>
                    <p className="text-xs font-black uppercase tracking-wider opacity-90 text-purple-300">🎁 Valor de Cortesías (S/)</p>
                    <div className="flex items-center gap-3 mt-2 relative z-10">
                      <div className="w-10 h-10 bg-purple-800 rounded-xl flex items-center justify-center text-white"><Gift className="w-5 h-5 text-amber-400" /></div>
                      <p className="text-3xl font-black font-mono tracking-tighter text-white">S/ {activeCortesias.toFixed(2)}</p>
                    </div>
                  </div>
                )}

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
                  <select 
                    value={tipoComprobante} 
                    onChange={(e) => handleComprobanteChange(e.target.value)} 
                    disabled={metodoPago === 'Cortesía'}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 font-bold text-slate-800 transition-all text-sm disabled:opacity-60"
                  >
                    {metodoPago === 'Cortesía' ? (
                      <option value="Ticket">🎁 Ticket de Cortesía (Costo Cero)</option>
                    ) : (
                      <>
                        <option value="Boleta">Boleta Electrónica (DNI)</option>
                        <option value="Factura">Factura Electrónica (RUC)</option>
                        <option value="Ticket">Ticket Interno (Simple)</option>
                      </>
                    )}
                  </select>
                </div>
                {metodoPago !== 'Cortesía' && (tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') && (
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Efectivo', icon: Banknote, label: 'Efectivo' }, 
                      { id: 'Tarjeta', icon: CreditCard, label: 'Tarjeta' }, 
                      { id: 'Yape', icon: Wallet, label: 'Yape / Plin' },
                      { id: 'Cortesía', icon: Gift, label: '🎁 Cortesía' }
                    ].map(item => {
                      const IconComp = item.icon;
                      const active = metodoPago === item.id;
                      return (
                        <button 
                          key={item.id} 
                          type="button"
                          onClick={() => {
                            setMetodoPago(item.id);
                            if (item.id === 'Cortesía') {
                              setTipoComprobante('Ticket');
                            }
                          }} 
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

              <div className="flex flex-col justify-between">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm max-h-[220px] overflow-y-auto custom-scrollbar flex-1 mb-4">
                  <h3 className="text-slate-400 font-black uppercase text-[10px] tracking-wider mb-2 border-b border-slate-100 pb-1 flex justify-between items-center">
                    <span>Detalle del Consumo</span>
                    <span className="text-slate-500">Mesa {mesaSeleccionada.num}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {mesaSeleccionada.pedidoData?.items?.map((item, idx) => {
                      const prodOriginal = productosMenu.find(p => String(p.id) === String(item.id));
                      const tieneDescuento = prodOriginal && prodOriginal.precio > item.precio;
                      return (
                        <li key={idx} className="flex justify-between items-start text-xs border-b border-dashed border-slate-100 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-slate-800 font-medium">
                            <span className="font-black text-slate-900 mr-1.5">{item.cant}x</span>
                            <span className="uppercase">{item.nombre}</span>
                          </span>
                          <span className="font-mono text-slate-600 font-bold shrink-0 flex items-center gap-1.5">
                            {tieneDescuento && (
                              <span className="line-through text-slate-400 font-semibold text-[10px]">S/ {(item.cant * prodOriginal.precio).toFixed(2)}</span>
                            )}
                            <span>S/ {(item.cant * item.precio).toFixed(2)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white">
                  <div className="space-y-2 mb-4 border-b border-slate-800 pb-4">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal (Sin IGV)</span>
                      <span className="font-mono">S/ {metodoPago === 'Cortesía' ? '0.00' : (mesaSeleccionada.pedidoData.total / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>IGV (18%)</span>
                      <span className="font-mono">S/ {metodoPago === 'Cortesía' ? '0.00' : (mesaSeleccionada.pedidoData.total - (mesaSeleccionada.pedidoData.total / 1.18)).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">Monto Total</p>
                      <p className="text-slate-400 text-xs font-medium">Comprobante: {tipoComprobante}</p>
                    </div>
                    <div>
                      {metodoPago === 'Cortesía' && (
                        <div className="text-right mb-1">
                          <span className="text-slate-400 text-[9px] uppercase font-bold">VALOR COMERCIAL: </span>
                          <span className="text-amber-400 text-xs font-mono font-bold">S/ {mesaSeleccionada.pedidoData.total.toFixed(2)}</span>
                        </div>
                      )}
                      <p className="text-3xl font-black text-white font-mono tracking-tighter text-right">
                        <span className="text-lg text-slate-500 mr-1 font-sans">S/</span>{metodoPago === 'Cortesía' ? '0.00' : mesaSeleccionada.pedidoData.total.toFixed(2)}
                      </p>
                    </div>
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
                  <h2 className="font-black text-lg uppercase tracking-tight leading-none">Nuevo Pedido para Llevar / Delivery</h2>
                  <p className="text-xs text-blue-200">Registrar comanda de venta directa o canal externo</p>
                </div>
              </div>
              <button onClick={() => { setDeliveryModal(false); setCodigoPY(''); setItemsDelivery([]); }} className="bg-blue-800 p-2 rounded-xl hover:bg-blue-900 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              {/* Productos */}
              <div className="w-full md:w-3/5 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50">
                <div className="p-4 border-b border-slate-200 bg-white shrink-0 flex flex-col gap-4">
                  {/* Selector de Tipo */}
                  <div>
                    <label className="block text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-1.5">Origen / Tipo de Pedido:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        type="button" 
                        onClick={() => { setTipoDelivery('PedidosYa'); setCodigoPY(''); setDeliveryMontoEnvio(''); }}
                        className={`py-2 px-1 text-[10px] md:text-xs font-black uppercase rounded-xl border-2 transition-all text-center ${tipoDelivery === 'PedidosYa' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        🛵 PedidosYa
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setTipoDelivery('ParaLlevar'); setCodigoPY(''); setDeliveryMontoEnvio(''); }}
                        className={`py-2 px-1 text-[10px] md:text-xs font-black uppercase rounded-xl border-2 transition-all text-center ${tipoDelivery === 'ParaLlevar' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        🛍️ Para Llevar
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setTipoDelivery('DeliveryPropio'); setCodigoPY(''); }}
                        className={`py-2 px-1 text-[10px] md:text-xs font-black uppercase rounded-xl border-2 transition-all text-center ${tipoDelivery === 'DeliveryPropio' ? 'bg-indigo-50 border-indigo-500 text-indigo-750' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        📞 Delivery Fogon
                      </button>
                    </div>
                  </div>

                  {tipoDelivery !== 'DeliveryPropio' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-1">
                          {tipoDelivery === 'PedidosYa' ? 'Código PedidosYa:' : 'Nombre del Cliente / Ticket:'}
                        </label>
                        <input
                          type="text"
                          value={codigoPY}
                          onChange={(e) => setCodigoPY(e.target.value)}
                          placeholder={tipoDelivery === 'PedidosYa' ? 'Ej: FG-4821' : 'Ej: PEDRO o T-12'}
                          className="w-full bg-slate-50 border-2 border-blue-300 focus:border-blue-500 rounded-xl px-3 py-2 font-mono font-black text-slate-900 text-sm focus:outline-none uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-1">Cajero:</label>
                        <div className="w-full bg-slate-150 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 text-sm uppercase">
                          {cajeroNombre}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                      <div className="col-span-2">
                        <label className="block text-slate-550 font-bold text-[9px] tracking-widest uppercase mb-1">Nombre Cliente:</label>
                        <input 
                          type="text" 
                          value={deliveryClienteNombre} 
                          onChange={(e) => setDeliveryClienteNombre(e.target.value)} 
                          placeholder="Ej: Juan Pérez"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-550 font-bold text-[9px] tracking-widest uppercase mb-1">Teléfono:</label>
                        <input 
                          type="text" 
                          value={deliveryTelefono} 
                          onChange={(e) => setDeliveryTelefono(e.target.value)} 
                          placeholder="Ej: 999888777"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-550 font-bold text-[9px] tracking-widest uppercase mb-1">Envío (S/):</label>
                        <input 
                          type="number" 
                          value={deliveryMontoEnvio} 
                          onChange={(e) => setDeliveryMontoEnvio(e.target.value)} 
                          placeholder="0.00"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-slate-550 font-bold text-[9px] tracking-widest uppercase mb-1">Dirección de Entrega:</label>
                        <input 
                          type="text" 
                          value={deliveryDireccion} 
                          onChange={(e) => setDeliveryDireccion(e.target.value)} 
                          placeholder="Ej: Av. Hoyos Rubio Nro. 338"
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Buscador inteligente */}
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Buscar plato (ej: 'cuarto de pollo', 'octavo', 'medio', 'chela')..." 
                      value={deliverySearchQuery}
                      onChange={(e) => setDeliverySearchQuery(e.target.value)}
                      className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm focus:outline-none focus:bg-white font-bold text-slate-800"
                    />
                    {deliverySearchQuery && (
                      <button 
                        type="button"
                        onClick={() => setDeliverySearchQuery('')} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 overflow-y-auto custom-scrollbar content-start flex-1">
                  {(() => {
                    const menuFiltradoPre = productosMenu.filter(p => matchProductSemantic(p, deliverySearchQuery) && p.activo);
                    const menuFiltrado = agruparProductos(menuFiltradoPre);
                    
                    if (menuFiltrado.length === 0) {
                      return <div className="col-span-full text-center text-slate-400 font-medium py-12 text-sm">No se encontraron productos coincidentes.</div>;
                    }
                    
                    return menuFiltrado.map(prod => {
                      const isGroup = prod.esAgrupado;
                      const cantEnTicket = isGroup 
                        ? 0 
                        : itemsDelivery.filter(i => String(i.id) === String(prod.id)).reduce((sum, item) => sum + item.cant, 0);
                      const stockDisponible = prod.tipoStock === 'limitado' ? prod.stock - cantEnTicket : Infinity;
                      const agotado = prod.tipoStock === 'limitado' && stockDisponible <= 0;

                      return (
                        <div 
                          key={prod.id} 
                          onClick={() => !agotado && agregarItemDelivery(prod)} 
                          className={`bg-white border rounded-xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden h-24 transition-all ${
                            agotado 
                              ? 'opacity-50 grayscale border-slate-200 cursor-not-allowed bg-slate-50' 
                              : 'cursor-pointer hover:border-blue-400 hover:-translate-y-0.5 active:bg-slate-50'
                          }`}
                        >
                          {prod.precioOferta !== null && prod.precioOferta !== undefined && !agotado && !isGroup && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-0.5 animate-pulse z-15">
                              <Tag className="w-2 h-2" />
                              {prod.ofertaValor}% OFF
                            </div>
                          )}
                          <div className="z-10 flex flex-col justify-between h-full w-full">
                            <div>
                              <p className="font-bold text-slate-800 text-[10px] uppercase leading-tight pr-4">{prod.nombre}</p>
                              {isGroup && (
                                <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded mt-1.5 bg-blue-100 text-blue-700">
                                  OPCIONES DE CARNE
                                </span>
                              )}
                              {prod.tipoStock === 'limitado' && !isGroup && (
                                <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded mt-1.5 ${
                                  agotado ? 'bg-red-100 text-red-650' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {agotado ? 'AGOTADO' : `STOCK: ${stockDisponible}`}
                                </span>
                              )}
                            </div>
                            {isGroup ? (
                              <p className="font-black font-mono text-blue-600 text-xs md:text-sm">
                                Desde S/ {prod.precioMin.toFixed(2)}
                              </p>
                            ) : (
                              prod.precioOferta !== null && prod.precioOferta !== undefined ? (
                                <div className="flex flex-col items-start leading-none">
                                  <span className="font-black font-mono text-blue-600 text-sm">S/ {prod.precioOferta.toFixed(2)}</span>
                                  <span className="line-through text-slate-400 font-semibold text-[10px] mt-0.5">S/ {prod.precio.toFixed(2)}</span>
                                </div>
                              ) : (
                                <p className="font-black font-mono text-blue-600 text-sm">S/ {prod.precio.toFixed(2)}</p>
                              )
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
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
                    : itemsDelivery.map((item, idx) => {
                        const prodOriginal = productosMenu.find(p => String(p.id) === String(item.id));
                        const tieneDescuento = prodOriginal && prodOriginal.precio > item.precio;
                        return (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-dashed border-slate-100 last:border-0">
                            <div className="flex-1 pr-2">
                              <p className="font-bold text-slate-800 text-xs uppercase leading-tight">{item.nombre}</p>
                              {item.notas && (
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-snug break-all">{item.notas}</p>
                              )}
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                {tieneDescuento && (
                                  <span className="line-through text-slate-400 font-semibold text-xs">S/ {(item.cant * prodOriginal.precio).toFixed(2)}</span>
                                )}
                                <span className="font-mono text-blue-600 font-bold text-sm">S/ {(item.cant * item.precio).toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200 shrink-0">
                              <button type="button" onClick={() => alterarItemDelivery(idx, '-')} className="w-7 h-7 bg-white rounded-md shadow-sm font-black text-slate-600 text-lg leading-none">-</button>
                              <span className="font-bold text-slate-900 w-5 text-center text-sm">{item.cant}</span>
                              <button type="button" onClick={() => alterarItemDelivery(idx, '+')} className="w-7 h-7 bg-white rounded-md shadow-sm font-black text-slate-600 text-lg leading-none">+</button>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
                {/* Formulario de Facturación / Pago para Para Llevar y Delivery Propio */}
                {(tipoDelivery === 'ParaLlevar' || tipoDelivery === 'DeliveryPropio') && (
                  <div className="p-4 bg-slate-50 border-t border-b border-slate-200 space-y-4 shrink-0">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      Facturación y Cobro
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-bold text-[9px] tracking-widest uppercase mb-1">Comprobante:</label>
                        <select 
                          value={deliveryTipoComprobante} 
                          onChange={(e) => {
                            setDeliveryTipoComprobante(e.target.value);
                            setDeliveryNumDocumento('');
                            setDeliveryClienteNombre('');
                          }} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 text-xs focus:outline-none"
                        >
                          <option value="Ticket">Ticket Interno</option>
                          <option value="Boleta">Boleta (DNI)</option>
                          <option value="Factura">Factura (RUC)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold text-[9px] tracking-widest uppercase mb-1">Método Pago:</label>
                        <select 
                          value={deliveryMetodoPago} 
                          onChange={(e) => setDeliveryMetodoPago(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 text-xs focus:outline-none"
                        >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Tarjeta">Tarjeta (Visa/MC)</option>
                          <option value="Yape">Yape / Plin</option>
                        </select>
                      </div>
                    </div>

                    {/* DNI o RUC si es Boleta o Factura */}
                    {(deliveryTipoComprobante === 'Boleta' || deliveryTipoComprobante === 'Factura') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 font-bold text-[9px] tracking-widest uppercase mb-1">
                            {deliveryTipoComprobante === 'Factura' ? 'RUC del Cliente:' : 'DNI del Cliente:'}
                          </label>
                          <div className="flex gap-1.5">
                            <input 
                              type="text" 
                              value={deliveryNumDocumento} 
                              onChange={(e) => setDeliveryNumDocumento(e.target.value)} 
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarClienteDelivery(); } }}
                              placeholder={deliveryTipoComprobante === 'Factura' ? '11 dígitos' : '8 dígitos'}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={buscarClienteDelivery}
                              disabled={isBuscando}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-2.5 rounded-xl text-xs font-black flex items-center justify-center transition-colors shrink-0"
                            >
                              {isBuscando ? (
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                              ) : (
                                <Search className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-slate-500 font-bold text-[9px] tracking-widest uppercase mb-1">
                            {deliveryTipoComprobante === 'Factura' ? 'Razón Social:' : 'Nombre Cliente:'}
                          </label>
                          <input 
                            type="text" 
                            value={deliveryClienteNombre} 
                            onChange={(e) => setDeliveryClienteNombre(e.target.value)} 
                            placeholder="Nombre/Razón Social"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Vuelto / Cancelación en Efectivo */}
                    {deliveryMetodoPago === 'Efectivo' && (
                      <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-inner">
                        <div>
                          <label className="block text-slate-500 font-bold text-[9px] tracking-widest uppercase mb-1">Paga Con (S/):</label>
                          <input 
                            type="number" 
                            value={deliveryConCuanto} 
                            onChange={(e) => setDeliveryConCuanto(e.target.value)} 
                            placeholder="0.00"
                            className="w-full bg-slate-50 border border-slate-250 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-slate-800 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-none">Vuelto:</span>
                          <span className="font-mono font-black text-sm text-emerald-600 mt-1">
                            S/ {(() => {
                              const conC = parseFloat(deliveryConCuanto);
                              const tot = totalDelivery + (tipoDelivery === 'DeliveryPropio' ? parseFloat(deliveryMontoEnvio || 0) : 0);
                              return (!isNaN(conC) && conC >= tot) ? (conC - tot).toFixed(2) : '0.00';
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                  <div className="space-y-1.5 mb-4 border-b border-dashed border-slate-100 pb-3 px-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Productos</span>
                      <span className="font-mono">S/ {totalDelivery.toFixed(2)}</span>
                    </div>
                    {tipoDelivery === 'DeliveryPropio' && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Costo de Envío</span>
                        <span className="font-mono">S/ {parseFloat(deliveryMontoEnvio || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end pt-1">
                      <span className="font-black text-slate-500 uppercase text-[10px] tracking-widest">Total a Pagar</span>
                      <span className="font-black font-mono text-2xl text-blue-700">
                        S/ {(totalDelivery + (tipoDelivery === 'DeliveryPropio' ? parseFloat(deliveryMontoEnvio || 0) : 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={enviarDeliveryACocina}
                    disabled={enviandoDelivery}
                    className={`w-full py-4 text-white font-black uppercase tracking-widest rounded-2xl text-sm transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 ${
                      tipoDelivery === 'ParaLlevar' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                  >
                    {enviandoDelivery ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        {tipoDelivery === 'ParaLlevar' ? <Banknote className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                        {tipoDelivery === 'ParaLlevar' ? 'Cobrar y Enviar a Cocina' : 'Registrar y Enviar a Cocina'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE OPCIONES Y COMBOS (INTERACTIVO PARA DELIVERY) */}
      {optionsModalOpen && selectedProduct && (() => {
        const steps = getProductSteps(selectedProduct);
        if (steps.length === 0) return null;
        
        const currentStep = steps[currentStepIdx];
        const esUltimoPaso = currentStepIdx === steps.length - 1;
        const seleccionActual = selections[currentStep.key];
        
        const handleSelectOption = (val) => {
          setSelections(prev => ({ ...prev, [currentStep.key]: val }));
          
          if (!esUltimoPaso) {
            setTimeout(() => {
              setCurrentStepIdx(prev => prev + 1);
            }, 150);
          }
        };
        
        const handleConfirm = () => {
          if (selectedProduct.esAgrupado) {
            const prodVariante = selections["producto_variante"];
            if (!prodVariante) {
              alert("Por favor, selecciona una opción.");
              return;
            }
            agregarItemDeliveryDirecto(prodVariante, additionalNotes);
          } else {
            const notesArray = [];
            steps.forEach(step => {
              const val = selections[step.key];
              if (val) {
                notesArray.push(`[${step.name}: ${val}]`);
              }
            });
            if (additionalNotes.trim()) {
              notesArray.push(`(Nota: ${additionalNotes.trim()})`);
            }
            const finalNotes = notesArray.join(' · ');
            agregarItemDeliveryDirecto(selectedProduct, finalNotes);
          }
          
          setOptionsModalOpen(false);
          setSelectedProduct(null);
        };
        
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[250] flex items-center justify-center md:p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg md:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[100vh] md:h-auto md:max-h-[90vh] animate-slide-up">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <div>
                  <h3 className="text-white font-black text-base uppercase tracking-tight leading-none">
                    {selectedProduct.esAgrupado ? "Seleccionar Variante" : "Personalizar Plato"}
                  </h3>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">
                    {selectedProduct.nombre}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setOptionsModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                {steps.length > 1 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Paso {currentStepIdx + 1} de {steps.length}</span>
                      <span className="text-amber-400">{currentStep.name}</span>
                    </div>
                    <div className="h-1.5 bg-slate-850 rounded-full overflow-hidden flex border border-slate-800">
                      {steps.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-full flex-1 border-r border-slate-900 last:border-0 transition-all ${
                            idx <= currentStepIdx ? 'bg-amber-500' : 'bg-slate-800'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    {currentStep.name}:
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {currentStep.options.map((opt, oIdx) => {
                      const isSelected = selectedProduct.esAgrupado 
                        ? (seleccionActual && seleccionActual.id === opt.value.id)
                        : (seleccionActual === opt.value);
                        
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(opt.value)}
                          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden min-h-[75px] ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-[0.98]'
                              : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-750 hover:border-slate-600'
                          }`}
                        >
                          <span className="font-black text-xs leading-snug pr-6 uppercase">{opt.label}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-slate-950 absolute top-4 right-4 stroke-[3px]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {esUltimoPaso && (
                  <div className="border-t border-slate-800 pt-5 space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      Especificaciones Especiales / Notas
                    </label>
                    <textarea
                      placeholder="Ejemplo: sin cebolla, papas bien doradas, etc."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl p-4 text-xs font-bold text-slate-100 focus:outline-none focus:bg-slate-950 custom-scrollbar h-20 resize-none"
                    ></textarea>
                  </div>
                )}
              </div>
              
              <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex justify-between gap-3 shrink-0">
                <button
                  onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentStepIdx === 0}
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    currentStepIdx === 0
                      ? 'bg-slate-850 text-slate-600 border border-slate-850 opacity-40 cursor-not-allowed shadow-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  Atrás
                </button>
                
                {esUltimoPaso ? (
                  <button
                    onClick={handleConfirm}
                    disabled={!seleccionActual}
                    className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg ${
                      seleccionActual
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 shadow-emerald-500/20'
                        : 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Agregar Pedido
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStepIdx(prev => prev + 1)}
                    disabled={!seleccionActual}
                    className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg ${
                      seleccionActual
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                        : 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed shadow-none'
                    }`}
                  >
                    Siguiente
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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

        const totalCortesias = ventasFiltradas
          .filter(v => v.metodoPago === 'Cortesía')
          .reduce((sum, v) => {
            const itemsVal = v.items?.reduce((s, i) => s + (i.cant * i.precio), 0) || 0;
            return sum + itemsVal;
          }, 0);

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
                  {totalCortesias > 0 && (
                    <div className="flex justify-between font-bold text-amber-700 border-t border-dashed border-amber-250 pt-2">
                      <span>🎁 CORTESÍAS (VALOR):</span>
                      <span className="font-black text-amber-900">S/ {totalCortesias.toFixed(2)}</span>
                    </div>
                  )}
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
                <Receipt className="w-5 h-5 text-amber-500" /> {activeComprobante.metodoPago === 'Cortesía' ? '🎁 TICKET DE CORTESÍA 🎁' : (activeComprobante.tipo === 'Factura' ? 'FACTURA ELECTRÓNICA' : (activeComprobante.tipo === 'Ticket' ? 'TICKET DE VENTA' : 'BOLETA ELECTRÓNICA'))}
              </h3>
              <button onClick={() => setSunatModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div id="comprobante-sunat-ticket-print" className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-900 font-mono text-xs leading-relaxed">
              {activeComprobante.contingencia && activeComprobante.metodoPago !== 'Cortesía' && (
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


              
              <div className="text-center font-bold mb-1" style={{ fontSize: '11px' }}>{activeComprobante.metodoPago === 'Cortesía' ? '🎁 CORTESÍA / CONSUMO INTERNO 🎁' : (activeComprobante.tipo === 'Factura' ? 'FACTURA ELECTRÓNICA' : (activeComprobante.tipo === 'Ticket' ? 'TICKET DE VENTA' : 'BOLETA ELECTRÓNICA'))}</div>
              <div className="text-center font-bold mb-3" style={{ fontSize: '13px' }}>{activeComprobante.metodoPago === 'Cortesía' ? `COR-00${activeComprobante.mesaNum}` : `${activeComprobante.serie}-${activeComprobante.correlativo}`}</div>
              
              <div className="flex justify-between border-t border-b border-dashed border-slate-300 py-1.5 mb-2 font-bold">
                <span>{activeComprobante.fecha} {activeComprobante.hora}</span>
                <span>Mesa {activeComprobante.mesaNum}</span>
              </div>
              
              <div className="space-y-1 mb-3">
                <div><strong>Cliente:</strong> <span className="uppercase">{activeComprobante.clienteNombre}</span></div>
                {activeComprobante.metodoPago !== 'Cortesía' && (
                  <div><strong>{activeComprobante.tipo === 'Factura' ? 'RUC' : 'DNI'}:</strong> <span>{activeComprobante.clienteDoc}</span></div>
                )}
                {activeComprobante.clienteDireccion && (
                  <div><strong>Dirección:</strong> <span className="uppercase text-[9px] leading-none block mt-0.5">{activeComprobante.clienteDireccion}</span></div>
                )}
                <div><strong>Items:</strong> <span>{activeComprobante.items.length}</span></div>
              </div>

              {/* Box de Datos de Despacho para Delivery */}
              {activeComprobante.deliveryInfo && (
                <div style={{ border: '1px dashed black', padding: '6px', margin: '8px 0', fontSize: '10px', lineHeight: '1.3' }} className="space-y-1 bg-slate-50 rounded-lg">
                  <div className="text-center font-bold uppercase mb-1" style={{ fontSize: '11px' }}>🛵 DATOS DE DESPACHO / DELIVERY 🛵</div>
                  <div><strong>DIRECCIÓN:</strong> <span className="uppercase font-bold">{activeComprobante.deliveryInfo.direccion}</span></div>
                  <div className="flex justify-between">
                    <div><strong>TELÉFONO:</strong> <span>{activeComprobante.deliveryInfo.telefono}</span></div>
                    <div><strong>ENVÍO:</strong> <span>S/ {parseFloat(activeComprobante.deliveryInfo.montoDelivery || 0).toFixed(2)}</span></div>
                  </div>
                  {activeComprobante.deliveryInfo.conCuanto && parseFloat(activeComprobante.deliveryInfo.conCuanto) > 0 && (
                    <div className="border-t border-slate-300 pt-1 mt-1 flex justify-between font-bold">
                      <div><strong>PAGA CON:</strong> <span>S/ {parseFloat(activeComprobante.deliveryInfo.conCuanto).toFixed(2)}</span></div>
                      <div><strong>VUELTO:</strong> <span className="text-emerald-700">S/ {parseFloat(activeComprobante.deliveryInfo.vuelto).toFixed(2)}</span></div>
                    </div>
                  )}
                </div>
              )}
              
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
                  <div key={idx} className="flex flex-col mb-1.5">
                    <div className="flex items-start">
                      <span className="w-16 shrink-0">{item.cant.toFixed(2)} NIU</span>
                      <span className="flex-1 uppercase">{item.nombre}</span>
                      <span className="w-16 text-right shrink-0">{item.precio.toFixed(2)}</span>
                      <span className="w-20 text-right shrink-0">{subTotalItem.toFixed(2)}</span>
                    </div>
                    {item.notas && (
                      <div className="pl-16 text-[9px] text-slate-500 font-bold leading-tight uppercase text-left break-all">
                        {item.notas}
                      </div>
                    )}
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
                <span className="uppercase text-[10px] leading-tight block">{activeComprobante.metodoPago === 'Cortesía' ? 'CERO CON 00/100 SOLES (ATENCIÓN GRATUITA)' : activeComprobante.totalLetras}</span>
              </div>
              
              {activeComprobante.metodoPago !== 'Cortesía' && (
                <div className="mb-3">
                  <strong>RESUMEN:</strong> <span className="font-mono text-[10px]">{activeComprobante.hashResumen}</span>
                </div>
              )}
              
              <div>
                <strong>FORMA DE PAGO:</strong> <span className="uppercase">{activeComprobante.metodoPago === 'Efectivo' ? 'CONTADO' : (activeComprobante.metodoPago === 'Cortesía' ? 'CORTESÍA / CONSUMO INTERNO' : 'CONTADO (' + activeComprobante.metodoPago + ')')}</span>
              </div>
              
              {activeComprobante.metodoPago !== 'Cortesía' ? (
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
              ) : (
                <div style={{ display: 'none' }}>
                  <img 
                    src={activeComprobante.qrImageUrl} 
                    alt="QR Comprobante" 
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
              )}

              
              <div className="text-center font-bold mt-4" style={{ fontSize: '10px' }}>¡Gracias por su preferencia!</div>
              <div className="text-center text-[9px] leading-tight text-slate-500 mt-1">
                {activeComprobante.metodoPago === 'Cortesía' ? 'TICKET DE CONSUMO INTERNO AUTORIZADO' : 'Representación impresa del comprobante electrónico. Consulte su validez en el portal de la SUNAT.'}
              </div>


              {activeComprobante.enlacePdf && activeComprobante.metodoPago !== 'Cortesía' && (
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


      {/* FLOATING TOASTS NOTIFICATIONS SYSTEM FOR CAJA */}
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
