import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, XCircle, Users, Truck, Calendar, Search, Receipt, Printer, X } from 'lucide-react';
import { api } from '../api';


export default function ReportesPage() {
  const getPrimerDiaMes = () => {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  };

  const getHoyString = () => {
    const ahora = new Date();
    const yyyy = ahora.getFullYear();
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const dd = String(ahora.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [fechaDesde, setFechaDesde] = useState(getPrimerDiaMes());
  const [fechaHasta, setFechaHasta] = useState(getHoyString());
  const [resumen, setResumen] = useState({ 
    ventasTotal: 0, 
    ventasBase: 0, 
    ventasIGV: 0, 
    comprasTotal: 0, 
    comprasBase: 0, 
    comprasIGV: 0, 
    igvAPagar: 0 
  });
  const [cancelaciones, setCancelaciones] = useState([]);
  const [mozos, setMozos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtrando, setFiltrando] = useState(false);
  const [ventas, setVentas] = useState([]);
  const [activeComprobante, setActiveComprobante] = useState(null);
  const [sunatModalOpen, setSunatModalOpen] = useState(false);
  const [rotacion, setRotacion] = useState([]);
  const [gerencialModalOpen, setGerencialModalOpen] = useState(false);

  const getChickenEquivalency = (name) => {
    const normalized = name.toLowerCase();
    if (normalized.includes('1/2 pollo') || normalized.includes('medio pollo')) {
      return 0.5;
    }
    if (normalized.includes('1/4 pollo') || normalized.includes('cuarto de pollo') || normalized.includes('cuarto pollo')) {
      return 0.25;
    }
    if (normalized.includes('1/8 pollo') || normalized.includes('octavo de pollo') || normalized.includes('octavo pollo')) {
      return 0.125;
    }
    if (normalized.includes('1 pollo') || normalized.includes('pollo entero') || normalized.includes('un pollo')) {
      return 1.0;
    }
    return 0;
  };


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

  const reimprimirComprobante = (v) => {
    if (!v) return;
    const serie = v.tipoComprobante === 'Factura' ? 'F001' : 'B001';
    const correlativoStr = String(v.id % 10000).padStart(4, '0');
    const totalLetras = numeroALetras(v.total);
    const hashResumen = "gSbTDa" + Math.random().toString(36).substring(2, 8).toUpperCase() + "iIZDyirfA6TBPKJnEI=";
    const rucEmpresa = "R.U.C. N° 20496009259";
    const qrData = `${rucEmpresa}|03|${serie}|${correlativoStr}|${v.igv.toFixed(2)}|${v.total.toFixed(2)}|${v.fecha || new Date(v.createdAt).toLocaleDateString('es-PE')}|${v.tipoComprobante === 'Factura'?'6':'1'}|${v.numDocumento || '00000000'}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrData)}`;

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
      clienteDireccion: v.clienteDireccion || 'Av. Principal 123, Lima',
      items,
      subtotal: v.subtotal,
      igv: v.igv,
      total: v.total,
      totalLetras,
      hashResumen,
      metodoPago: v.metodoPago,
      qrImageUrl,
    });

    setSunatModalOpen(true);
    
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const enviarPorWhatsApp = (v) => {
    if (!v) return;
    const telefono = prompt("Ingresa el número de WhatsApp del cliente (Ej. 999888777):");
    if (!telefono) return;
    
    // Validar celular peruano de 9 dígitos
    const cleanedPhone = telefono.replace(/\D/g, '');
    if (cleanedPhone.length !== 9) {
      alert("Por favor, ingresa un número de celular válido de 9 dígitos.");
      return;
    }
    
    const serie = v.tipoComprobante === 'Factura' ? 'F001' : 'B001';
    const correlativoStr = String(v.id % 10000).padStart(4, '0');
    
    const mensaje = `Estimado cliente *${v.nombreCliente || 'Consumidor Final'}*, le hacemos entrega de su comprobante electrónico *${v.tipoComprobante === 'Factura' ? 'FACTURA' : 'BOLETA'} ${serie}-${correlativoStr}* por un monto total de *S/ ${v.total.toFixed(2)}*.\n\nPuede consultar y descargar su documento ingresando con sus datos en: https://consulta.susii.com\n\n¡Gracias por su preferencia en *El Fogón Dorado*!`;
    
    const waURL = `https://api.whatsapp.com/send?phone=51${cleanedPhone}&text=${encodeURIComponent(mensaje)}`;
    window.open(waURL, '_blank');
  };


  const fetchReportes = useCallback(async (desde, hasta) => {
    setFiltrando(true);
    try {
      const [data, cancs, mzs, vts, rot] = await Promise.all([
        api.getReporteContable(desde, hasta),
        api.getCancelaciones(desde, hasta),
        api.getReporteMozos(desde, hasta),
        api.getHistorialVentas(desde, hasta),
        api.getRotacion(desde, hasta),
      ]);
      setResumen(data);
      setCancelaciones(cancs || []);
      setMozos(mzs || []);
      setVentas(vts || []);
      setRotacion(rot || []);
    } catch(err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
      setFiltrando(false);
    }
  }, []);


  useEffect(() => {
    fetchReportes(fechaDesde, fechaHasta);
  }, []);

  const handleFiltrar = () => {
    if (!fechaDesde || !fechaHasta) {
      alert('Por favor selecciona ambas fechas.');
      return;
    }
    fetchReportes(fechaDesde, fechaHasta);
  };

  const exportarLibroContableRCE = async () => {
    try {
      setFiltrando(true);
      // Obtener el historial real detallado de ventas y compras del periodo seleccionado
      const [ventasData, comprasData] = await Promise.all([
        api.getHistorialVentas(fechaDesde, fechaHasta),
        api.getCompras(fechaDesde, fechaHasta)
      ]);

      const rows = [
        ['REGISTRO TRIBUTARIO (RCE / RVE) - EL FOGÓN DORADO'],
        [`PERIODO: DESDE ${fechaDesde} HASTA ${fechaHasta}`],
        [],
        ['TIPO', 'FECHA EMISION', 'COMPROBANTE', 'NUM DOCUMENTO', 'CLIENTE / PROVEEDOR', 'METODO PAGO', 'BASE IMPONIBLE (S/)', 'IGV (S/)', 'TOTAL (S/)']
      ];

      // Insertar Ventas
      ventasData.forEach(v => {
        const date = v.createdAt ? v.createdAt.split('T')[0] : '';
        rows.push([
          'VENTA',
          date,
          v.tipoComprobante,
          v.numDocumento || 'S/D',
          v.nombreCliente || 'PÚBLICO GENERAL',
          v.metodoPago,
          v.subtotal.toFixed(2),
          v.igv.toFixed(2),
          v.total.toFixed(2)
        ]);
      });

      // Insertar Compras
      comprasData.forEach(c => {
        const date = c.creadoEn ? c.creadoEn.split('T')[0] : '';
        rows.push([
          'COMPRA',
          date,
          c.tipoDocumento || 'Factura',
          c.ruc || 'S/D',
          c.proveedor,
          'Efectivo/Transferencia',
          c.baseImponible.toFixed(2),
          c.igv.toFixed(2),
          c.total.toFixed(2)
        ]);
      });

      // Convertir a CSV compatible con Excel en español (con codificación UTF-8 BOM)
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute('download', `RCE_RVE_FOGON_${fechaDesde}_AL_${fechaHasta}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error al generar libro contable: ' + err.message);
    } finally {
      setFiltrando(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-bold">Cargando reporte contable...</p>
      </div>
    </div>
  );

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50">
      {/* HEADER Y FILTRO DE FECHAS */}
      <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-amber-500"></div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Panel Contable y Auditoría</h1>
          <p className="text-xs md:text-sm text-slate-500">Auditoría tributaria de IGV mensual, mermas de cancelaciones y rendimiento de meseros.</p>
        </div>
        
        {/* Controles del Rango de Fechas */}
        <div className="flex flex-wrap items-end gap-3 sm:gap-4 z-10">
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Desde:</label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={(e) => setFechaDesde(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 transition-all font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Hasta:</label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={(e) => setFechaHasta(e.target.value)} 
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 transition-all font-mono"
            />
          </div>
          <button 
            onClick={handleFiltrar}
            disabled={filtrando}
            className="bg-slate-900 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 h-[38px]"
          >
            {filtrando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Search className="w-4 h-4" />}
            Filtrar
          </button>
          <button 
            onClick={exportarLibroContableRCE} 
            disabled={filtrando}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all active:scale-95 disabled:opacity-50 h-[38px]"
          >
            <Download className="w-4 h-4" /> Exportar RCE / Ventas
          </button>
          <button 
            onClick={() => setGerencialModalOpen(true)}
            disabled={filtrando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all active:scale-95 disabled:opacity-50 h-[38px]"
          >
            <Printer className="w-4 h-4" /> Reporte Gerencial (PDF)
          </button>
        </div>
      </div>

      {/* METRICAS DE BALANCE COMERCIAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* TARJETA VENTAS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:scale-[1.01]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm"><TrendingUp className="w-5 h-5"/></div>
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider">Ventas en Periodo</h2>
            </div>
            <p className="text-3xl font-black font-mono text-slate-900 mb-1">S/ {resumen.ventasTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Impuestos y base imponible acumulados.</p>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-4 mt-6">
            <span>Base Imp: S/ {resumen.ventasBase.toFixed(2)}</span>
            <span className="font-bold text-blue-600">IGV (18%): S/ {resumen.ventasIGV.toFixed(2)}</span>
          </div>
        </div>

        {/* TARJETA COMPRAS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:scale-[1.01]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-sm"><TrendingDown className="w-5 h-5"/></div>
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider">Compras en Periodo</h2>
            </div>
            <p className="text-3xl font-black font-mono text-slate-900 mb-1">S/ {resumen.comprasTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Gastos comerciales y crédito fiscal acumulado.</p>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-4 mt-6">
            <span>Base Imp: S/ {resumen.comprasBase.toFixed(2)}</span>
            <span className="font-bold text-rose-600">IGV (18%): S/ {resumen.comprasIGV.toFixed(2)}</span>
          </div>
        </div>

        {/* TARJETA IGV ESTIMADO */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500 rounded-full opacity-10 blur-xl"></div>
          <div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 bg-slate-800 text-amber-400 rounded-xl flex items-center justify-center shadow-sm border border-slate-800"><DollarSign className="w-5 h-5"/></div>
              <h2 className="font-black text-amber-400 uppercase text-xs tracking-wider">IGV Neto Estimado</h2>
            </div>
            <p className="text-4xl font-black font-mono text-white mb-1 relative z-10">
              S/ {resumen.igvAPagar.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400">Impuestos netos a liquidar (Débito - Crédito).</p>
          </div>
          <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-4 mt-6 relative z-10">
            <span>Periodo Auditoría</span>
            <span className="font-bold text-amber-400 uppercase tracking-widest text-[10px]">Rango Activo</span>
          </div>
        </div>
      </div>

      {/* ROTACIÓN DE PRODUCTOS Y EQUIVALENCIA DE POLLOS */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Rotación de Productos y Consumo de Pollos
            </h2>
            <p className="text-[10px] text-slate-450 mt-0.5">Productos vendidos ordenados por cantidad. Incluye cálculo de equivalencias en pollos enteros.</p>
          </div>
          {(() => {
            const calculateChickenTotal = () => {
              let total = 0;
              rotacion.forEach(item => {
                const equiv = getChickenEquivalency(item.nombre);
                total += item.cantidad * equiv;
              });
              return total;
            };
            return (
              <span className="bg-amber-100 text-amber-900 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                Total Pollos Enteros: {calculateChickenTotal().toFixed(2)}
              </span>
            );
          })()}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-white text-slate-450 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-center">Cantidad Vendida</th>
                <th className="px-6 py-4 text-center">Equivalencia (Pollo Entero)</th>
                <th className="px-6 py-4 text-right">Total (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm bg-white font-bold text-slate-700">
              {rotacion.length > 0 ? rotacion.map((r, i) => {
                const equiv = getChickenEquivalency(r.nombre);
                return (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">{r.nombre}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">{r.categoria}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">
                        {r.cantidad}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {equiv > 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 border border-amber-200 text-amber-700 font-mono">
                          {(equiv * r.cantidad).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-slate-900">
                      S/ {r.total.toFixed(2)}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="5" className="text-center py-12 text-slate-400 font-bold uppercase text-xs">Sin registros de rotación en este rango de fechas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENDIMIENTO POR MOZOS */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" /> Rendimiento de Mozos en el Periodo
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{mozos.length} mozo{mozos.length !== 1 ? 's' : ''} con comanda</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[400px]">
            <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Mozo / Mesero</th>
                <th className="px-6 py-4 text-center">Mesas Activas Ahora</th>
                <th className="px-6 py-4 text-center">Mesas Atendidas y Cobradas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm bg-white font-bold text-slate-700">
              {mozos.length > 0 ? mozos.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center font-black text-xs shrink-0">{m.nombre[0]}</div>
                      <span className="font-bold text-slate-800">{m.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${m.mesasActivas > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                      {m.mesasActivas} mesa{m.mesasActivas !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">
                      {m.mesasAtendidas} atendida{m.mesasAtendidas !== 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="text-center py-12 text-slate-400 font-bold uppercase text-xs">Sin actividad de mozos en este rango de fechas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PEDIDOS CANCELADOS DEL DÍA */}
      <div className="bg-white rounded-3xl border border-red-200/60 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-red-100 bg-red-50 flex justify-between items-center">
          <h2 className="font-black text-red-700 uppercase text-xs tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> Pedidos Cancelados e Incidencias en el Periodo
          </h2>
          <span className="bg-red-100 text-red-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {cancelaciones.length} cancelación{cancelaciones.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-5 py-4">Fecha / Hora</th>
                <th className="px-5 py-4">Mesa / Delivery</th>
                <th className="px-5 py-4">Cancelado por</th>
                <th className="px-5 py-4">Motivo / Explicación</th>
                <th className="px-5 py-4">Detalle Consumo</th>
                <th className="px-5 py-4 text-right">Pérdida Estimada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm bg-white font-bold text-slate-700">
              {cancelaciones.length > 0 ? cancelaciones.map((c, i) => (
                <tr key={i} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-slate-800 text-xs">{c.fecha || 'Hoy'}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{c.hora}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {c.mesa
                      ? <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-black">Mesa {c.mesa}</span>
                      : <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-max"><Truck className="w-3.5 h-3.5" />{c.codigoPedidosYa || 'Delivery'}</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-slate-800">{c.canceladoPor}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs italic max-w-[200px] truncate" title={c.motivoCancela}>{c.motivoCancela}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs max-w-[220px] truncate" title={c.resumenItems}>{c.resumenItems}</td>
                  <td className="px-5 py-4 text-right font-mono font-black text-red-600">- S/ {c.total.toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-12 text-slate-400 font-bold uppercase text-xs">No hay cancelaciones registradas en este rango de fechas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {cancelaciones.length > 0 && (
          <div className="p-5 border-t border-red-100 bg-red-50/50 flex justify-end">
            <span className="font-black text-red-700 text-sm">
              Total Pérdida en Periodo: <span className="font-mono text-xl ml-2">S/ {cancelaciones.reduce((s, c) => s + c.total, 0).toFixed(2)}</span>
            </span>
          </div>
        )}
      </div>


      {/* HISTORIAL Y AUDITORÍA DE COMPROBANTES EMITIDOS */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mt-8 mb-12">
        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-500" /> Registro de Comprobantes Emitidos (RCE)
          </h2>
          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {ventas.length} Comprobante{ventas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">ID / Hora</th>
                <th className="px-6 py-4">Comprobante / Cliente</th>
                <th className="px-6 py-4">Mesa / Delivery</th>
                <th className="px-6 py-4">Método de Pago</th>
                <th className="px-6 py-4">Detalle Items</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm bg-white font-bold text-slate-700">
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
                  <td colSpan="7" className="text-center py-12 text-slate-400 font-bold uppercase text-xs">
                    No se encontraron comprobantes emitidos en este rango de fechas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <div><strong>Dirección:</strong> <span className="uppercase text-[9px] leading-none block mt-0.5">{activeComprobante.clienteDireccion}</span></div>
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
                <span className="uppercase text-[10px] leading-tight block">{activeComprobante.totalLetras}</span>
              </div>
              
              <div className="mb-3">
                <strong>RESUMEN:</strong> <span className="font-mono text-[10px]">{activeComprobante.hashResumen}</span>
              </div>
              
              <div>
                <strong>FORMA DE PAGO:</strong> <span className="uppercase">{activeComprobante.metodoPago === 'Efectivo' ? 'CONTADO' : 'CONTADO (' + activeComprobante.metodoPago + ')'}</span>
              </div>
              
              <div className="flex justify-center my-5">
                <img src={activeComprobante.qrImageUrl} alt="QR Comprobante" style={{ width: '120px', height: '120px' }} className="border p-1 bg-white" />
              </div>
              
              <div className="text-center font-bold" style={{ fontSize: '10px' }}>¡Gracias por su preferencia!</div>
              <div className="text-center text-[9px] leading-tight text-slate-500 mt-1">
                Representación impresa de la Factura electrónica. consulte su documento en https://consulta.susii.com
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase tracking-widest rounded-xl text-xs flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20">
                <Receipt className="w-4 h-4" /> Imprimir 80mm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reporte Gerencial */}
      {gerencialModalOpen && (
        <div id="modal-reporte-gerencial-container" className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
            <div className="bg-slate-950 p-4 text-white flex justify-between items-center shrink-0 no-print">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-500" /> Reporte Gerencial Ejecutivo
              </h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                  <Printer className="w-3.5 h-3.5" /> Imprimir / Guardar PDF
                </button>
                <button onClick={() => setGerencialModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-900 font-sans">
              <div className="text-center border-b pb-6 mb-6">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">El Fogón Dorado</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Reporte de Gestión Gerencial</p>
                <p className="text-xs text-slate-400 mt-2 font-mono">Periodo: {fechaDesde} al {fechaHasta}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Generado el: {new Date().toLocaleString('es-PE')}</p>
              </div>

              <div className="mb-8">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  1. Balance y Resumen Contable (IGV)
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-2xl p-4 bg-slate-50/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ventas</p>
                    <p className="text-xl font-black font-mono text-slate-800 mt-1">S/ {resumen.ventasTotal.toFixed(2)}</p>
                    <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                      <p>Base Imp.: S/ {resumen.ventasBase.toFixed(2)}</p>
                      <p className="font-semibold text-blue-600">IGV (18%): S/ {resumen.ventasIGV.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="border rounded-2xl p-4 bg-slate-50/50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Compras / Gastos</p>
                    <p className="text-xl font-black font-mono text-slate-800 mt-1">S/ {resumen.comprasTotal.toFixed(2)}</p>
                    <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                      <p>Base Imp.: S/ {resumen.comprasBase.toFixed(2)}</p>
                      <p className="font-semibold text-rose-600">IGV (18%): S/ {resumen.comprasIGV.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="border rounded-2xl p-4 bg-slate-900 text-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IGV Neto a Liquidar</p>
                    <p className="text-xl font-black font-mono text-amber-400 mt-1">S/ {resumen.igvAPagar.toFixed(2)}</p>
                    <p className="text-[9px] text-slate-400 mt-2">Diferencia entre débito fiscal de ventas y crédito fiscal de compras.</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  2. Rendimiento de Mozos (Mesas Atendidas)
                </h2>
                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
                      <tr>
                        <th className="px-4 py-3">Nombre Mozo</th>
                        <th className="px-4 py-3 text-center">Mesas Activas</th>
                        <th className="px-4 py-3 text-center">Mesas Atendidas y Cobradas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-medium text-slate-700">
                      {mozos.length > 0 ? mozos.map((m, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-bold text-slate-800">{m.nombre}</td>
                          <td className="px-4 py-3 text-center">{m.mesasActivas}</td>
                          <td className="px-4 py-3 text-center text-emerald-600 font-bold">{m.mesasAtendidas}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="3" className="px-4 py-3 text-center text-slate-400">Sin registros en el periodo</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    3. Top 5 Platos Más Vendidos
                  </h2>
                  <div className="border rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b">
                        <tr>
                          <th className="px-4 py-3">Plato</th>
                          <th className="px-4 py-3 text-center">Cantidad</th>
                          <th className="px-4 py-3 text-right">Recaudado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium text-slate-700">
                        {(() => {
                          const categoriasExcluidas = ['Bebidas y Refrescos', 'Cervezas', 'Bar y Cocteles', 'Postres'];
                          return [...rotacion]
                            .filter(p => !categoriasExcluidas.includes(p.categoria))
                            .sort((a, b) => b.cantidad - a.cantidad)
                            .slice(0, 5)
                            .map((r, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 font-bold text-slate-800">{r.nombre}</td>
                                <td className="px-4 py-3 text-center font-bold text-slate-900">{r.cantidad}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">S/ {r.total.toFixed(2)}</td>
                              </tr>
                            ));
                        })()}
                        {rotacion.length === 0 && (
                          <tr>
                            <td colSpan="3" className="px-4 py-3 text-center text-slate-400">Sin datos de rotación</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b pb-2 mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-700"></span>
                    4. Consumo de Pollos (Equivalencias)
                  </h2>
                  <div className="border rounded-2xl p-4 bg-amber-50/30 flex flex-col justify-between h-[155px]">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consumo Total de Pollos</p>
                      <p className="text-4xl font-black text-amber-800 mt-2 font-mono font-sans">
                        {(() => {
                          let total = 0;
                          rotacion.forEach(item => {
                            const equiv = getChickenEquivalency(item.nombre);
                            total += item.cantidad * equiv;
                          });
                          return total.toFixed(2);
                        })()} <span className="text-lg font-bold">Unidades</span>
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Cálculo en base a las porciones de pollo a la brasa vendidas (1 entero = 1.0, 1/2 = 0.5, 1/4 = 0.25, 1/8 = 0.125).
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-16 flex justify-around text-xs">
                <div className="text-center w-48">
                  <div className="border-b border-slate-350 h-10 mb-2"></div>
                  <p className="font-bold text-slate-700">Firma Administrador</p>
                </div>
                <div className="text-center w-48">
                  <div className="border-b border-slate-355 h-10 mb-2"></div>
                  <p className="font-bold text-slate-700">Firma Propietario</p>
                  <p className="text-[10px] text-slate-400">El Fogón Dorado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          /* Ocultar elementos de navegación y fondos */
          aside, header, #sidebar-menu, #sidebar-backdrop, button, nav, .shrink-0, .no-print {
            display: none !important;
          }
          /* Ocultar el resto del contenido de la página excepto el modal a imprimir */
          main > *:not(section),
          section > *:not(#modal-comprobante-sunat-print-container):not(#modal-reporte-gerencial-container):not(#modal-cierre) {
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
          #modal-reporte-gerencial-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #modal-reporte-gerencial-container > div {
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #modal-reporte-gerencial-container .overflow-y-auto {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}

