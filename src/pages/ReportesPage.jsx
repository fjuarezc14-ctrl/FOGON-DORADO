import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, XCircle, Users, Truck } from 'lucide-react';
import { api } from '../api';

export default function ReportesPage() {
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

  const fetchContabilidad = async () => {
    try {
      const [data, cancs, mzs] = await Promise.all([
        api.getReporteContable(),
        api.getCancelaciones(),
        api.getReporteMozos(),
      ]);
      setResumen(data);
      setCancelaciones(cancs);
      setMozos(mzs);
    } catch(err) {
      console.error('Error cargando contabilidad:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContabilidad();
  }, []);

  const exportarAExcel = async () => {
    try {
      const [ventas, compras] = await Promise.all([
        api.getResumenVentas(), // standard summaries
        api.getCompras()        // real purchases
      ]);

      const rows = [['TIPO', 'FECHA', 'PROVEEDOR/CLIENTE', 'BASE_IMPONIBLE', 'IGV', 'TOTAL']];
      
      compras.forEach(c => {
        const date = c.creadoEn ? c.creadoEn.split('T')[0] : '';
        rows.push(['COMPRA', date, c.proveedor, c.baseImponible, c.igv, c.total]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute('download', `reporte_contable_fogon_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error al exportar: ' + err.message);
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Panel Contable</h1>
          <p className="text-xs md:text-sm text-slate-500">Resumen tributario del IGV mensual y exportación de libros electrónicos para el contador.</p>
        </div>
        <button 
          onClick={exportarAExcel} 
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" /> Exportar RCE / Ventas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* TARJETA VENTAS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5"/></div>
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider">Ventas (Débito Fiscal)</h2>
            </div>
            <p className="text-3xl font-black font-mono text-slate-900 mb-1">S/ {resumen.ventasTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Total recaudado con boletas y facturas.</p>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-4 mt-6">
            <span>Base Imp: S/ {resumen.ventasBase.toFixed(2)}</span>
            <span className="font-bold text-blue-600">IGV: S/ {resumen.ventasIGV.toFixed(2)}</span>
          </div>
        </div>

        {/* TARJETA COMPRAS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><TrendingDown className="w-5 h-5"/></div>
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider">Compras (Crédito Fiscal)</h2>
            </div>
            <p className="text-3xl font-black font-mono text-slate-900 mb-1">S/ {resumen.comprasTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-400">Gastos validados en el crédito del mes.</p>
          </div>
          <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-4 mt-6">
            <span>Base Imp: S/ {resumen.comprasBase.toFixed(2)}</span>
            <span className="font-bold text-rose-600">IGV: S/ {resumen.comprasIGV.toFixed(2)}</span>
          </div>
        </div>

        {/* TARJETA IGV ESTIMADO */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500 rounded-full opacity-10 blur-xl"></div>
          <div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 bg-slate-800 text-amber-400 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5"/></div>
              <h2 className="font-black text-amber-400 uppercase text-xs tracking-wider">IGV a Pagar (Estimado)</h2>
            </div>
            <p className="text-4xl font-black font-mono text-white mb-1 relative z-10">
              S/ {resumen.igvAPagar.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400">Balance del Débito menos el Crédito Fiscal.</p>
          </div>
          <div className="flex justify-between text-xs text-slate-400 border-t border-slate-800 pt-4 mt-6 relative z-10">
            <span>Periodo Contable</span>
            <span className="font-bold text-amber-400 uppercase">Activo</span>
          </div>
        </div>
      </div>

      {/* RENDIMIENTO POR MOZOS */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mb-6">
        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" /> Rendimiento de Mozos — Hoy
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{mozos.length} mozo{mozos.length !== 1 ? 's' : ''} activos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[400px]">
            <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Mozo</th>
                <th className="px-6 py-4 text-center">Mesas Activas Ahora</th>
                <th className="px-6 py-4 text-center">Mesas Atendidas Hoy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm bg-white">
              {mozos.length > 0 ? mozos.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center font-black text-xs">{m.nombre[0]}</div>
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
                <tr><td colSpan="3" className="text-center py-10 text-slate-400 font-bold uppercase text-xs">Sin actividad de mozos hoy.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PEDIDOS CANCELADOS DEL DÍA */}
      <div className="bg-white rounded-3xl border border-red-200/60 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-red-100 bg-red-50 flex justify-between items-center">
          <h2 className="font-black text-red-700 uppercase text-xs tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> Pedidos Cancelados — Hoy
          </h2>
          <span className="bg-red-100 text-red-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {cancelaciones.length} cancelación{cancelaciones.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-5 py-4">Hora</th>
                <th className="px-5 py-4">Mesa / Delivery</th>
                <th className="px-5 py-4">Cancelado por</th>
                <th className="px-5 py-4">Motivo</th>
                <th className="px-5 py-4">Productos</th>
                <th className="px-5 py-4 text-right">Pérdida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm bg-white">
              {cancelaciones.length > 0 ? cancelaciones.map((c, i) => (
                <tr key={i} className="hover:bg-red-50/50">
                  <td className="px-5 py-4 font-mono text-slate-600 font-bold text-xs">{c.hora}</td>
                  <td className="px-5 py-4">
                    {c.mesa
                      ? <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-black">Mesa {c.mesa}</span>
                      : <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 w-max"><Truck className="w-3 h-3" />{c.codigoPedidosYa || 'Delivery'}</span>
                    }
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-700">{c.canceladoPor}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs italic max-w-[200px] truncate">{c.motivoCancela}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs max-w-[220px] truncate">{c.resumenItems}</td>
                  <td className="px-5 py-4 text-right font-mono font-black text-red-600">- S/ {c.total.toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-12 text-slate-400 font-bold uppercase text-xs">No hay cancelaciones registradas hoy.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {cancelaciones.length > 0 && (
          <div className="p-4 border-t border-red-100 bg-red-50 flex justify-end">
            <span className="font-black text-red-700 text-sm">
              Total pérdida estimada: <span className="font-mono text-lg ml-2">S/ {cancelaciones.reduce((s, c) => s + c.total, 0).toFixed(2)}</span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
