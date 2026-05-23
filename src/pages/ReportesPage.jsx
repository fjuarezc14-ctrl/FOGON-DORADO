import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  const fetchContabilidad = async () => {
    try {
      const data = await api.getReporteContable();
      setResumen(data);
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
    </section>
  );
}
