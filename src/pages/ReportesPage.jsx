import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, XCircle, Users, Truck, Calendar, Search } from 'lucide-react';
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

  const fetchReportes = useCallback(async (desde, hasta) => {
    setFiltrando(true);
    try {
      const [data, cancs, mzs] = await Promise.all([
        api.getReporteContable(desde, hasta),
        api.getCancelaciones(desde, hasta),
        api.getReporteMozos(desde, hasta),
      ]);
      setResumen(data);
      setCancelaciones(cancs || []);
      setMozos(mzs || []);
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
    </section>
  );
}
