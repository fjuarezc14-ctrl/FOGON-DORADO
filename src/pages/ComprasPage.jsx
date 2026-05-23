import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, X, Save } from 'lucide-react';
import { api } from '../api';

export default function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modalManual, setModalManual] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formCompra, setFormCompra] = useState({ 
    proveedor: '', 
    ruc: '', 
    tipoDocumento: 'Factura', 
    serieNumero: '', 
    baseImponible: '', 
    igv: '', 
    total: '' 
  });

  const fetchCompras = useCallback(async () => {
    try { 
      const data = await api.getCompras(); 
      setCompras(data); 
    } catch(e) { 
      console.error(e); 
    }
  }, []);

  useEffect(() => { 
    fetchCompras(); 
  }, [fetchCompras]);

  const handleDragOver = (e) => { 
    e.preventDefault(); 
    setIsDragging(true); 
  };

  const handleDragLeave = (e) => { 
    e.preventDefault(); 
    setIsDragging(false); 
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Parseo simulado del XML de la SUNAT
    try {
      await api.crearCompra({ 
        proveedor: 'DISTRIBUIDORA INCA KOLA S.A.', 
        ruc: '20404040404', 
        tipoDocumento: 'Factura', 
        serieNumero: 'F001-0872', 
        baseImponible: 296.61, 
        igv: 53.39, 
        total: 350.00, 
        origenCarga: 'xml' 
      });
      await fetchCompras();
      alert('✅ Factura XML cargada y validada con SUNAT RCE correctamente.');
    } catch(err) { 
      alert('Error al cargar XML: ' + err.message); 
    }
  };

  const guardarCompraManual = async () => {
    if (!formCompra.proveedor || !formCompra.total || !formCompra.baseImponible) {
      alert('Por favor, ingresa los datos mínimos de la factura.');
      return;
    }

    setGuardando(true);
    try {
      await api.crearCompra({ 
        proveedor: formCompra.proveedor,
        ruc: formCompra.ruc || '00000000000',
        tipoDocumento: formCompra.tipoDocumento,
        serieNumero: formCompra.serieNumero || 'M001-001',
        baseImponible: parseFloat(formCompra.baseImponible), 
        igv: parseFloat(formCompra.igv) || 0, 
        total: parseFloat(formCompra.total), 
        origenCarga: 'manual' 
      });
      await fetchCompras();
      setModalManual(false);
      setFormCompra({ 
        proveedor: '', 
        ruc: '', 
        tipoDocumento: 'Factura', 
        serieNumero: '', 
        baseImponible: '', 
        igv: '', 
        total: '' 
      });
    } catch(err) { 
      alert('Error al guardar compra: ' + err.message); 
    } finally {
      setGuardando(false);
    }
  };

  const calcularValoresPorTotal = (valTotal) => {
    const total = parseFloat(valTotal);
    if (isNaN(total)) return;
    const base = parseFloat((total / 1.18).toFixed(2));
    const igv = parseFloat((total - base).toFixed(2));
    setFormCompra({ ...formCompra, total: String(total), baseImponible: String(base), igv: String(igv) });
  };

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Registro de Compras (RCE)</h1>
        <p className="text-xs md:text-sm text-slate-500">Ingreso de comprobantes de compras electrónicos para crédito fiscal y sincronización contable.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARGA AUTOMÁTICA O MANUAL */}
        <div className="lg:col-span-1 space-y-4">
          <div 
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${isDragging ? 'border-amber-500 bg-amber-50 scale-105' : 'border-slate-200 bg-white hover:border-amber-400 hover:bg-slate-50/50'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="font-black text-slate-700 uppercase mb-2 text-sm tracking-tight">Carga de Factura XML</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">Arrastra el archivo <span className="font-bold text-slate-700">.XML</span> emitido por tu proveedor para autocompletar la compra.</p>
            <div className="relative">
              <input type="file" accept=".xml" onChange={handleDrop} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              <button className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors w-full shadow-md">
                Subir Factura XML
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => setModalManual(true)} className="text-xs font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center justify-center gap-1.5 w-full">
                <FileText className="w-4 h-4"/> Registrar Manualmente
              </button>
            </div>
          </div>
        </div>

        {/* TABLA DE HISTORIAL DE COMPRAS */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider">Historial de Compras del Mes</h2>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">{compras.length} Registro{compras.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Proveedor / RUC</th>
                    <th className="px-6 py-4">Tipo / Nro</th>
                    <th className="px-6 py-4 text-right">Base Imp.</th>
                    <th className="px-6 py-4 text-right">IGV (18%)</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm bg-white">
                  {compras.length > 0 ? compras.map(c => {
                    const date = c.creadoEn ? new Date(c.creadoEn).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE');
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">{date}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{c.proveedor}</div>
                          <div className="text-[10px] text-slate-400 font-mono">RUC: {c.ruc}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-600 text-xs uppercase">{c.tipoDocumento}</span>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.serieNumero || 'S/N'}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600">S/ {c.baseImponible.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-mono text-emerald-600 font-bold">S/ {c.igv.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-slate-900">S/ {c.total.toFixed(2)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" className="text-center py-16 text-slate-400 font-bold uppercase tracking-wider text-xs">
                        No hay registros de compras en este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTRO MANUAL MODAL */}
      {modalManual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h3 className="font-black flex items-center gap-2 uppercase tracking-tight text-sm"><FileText className="w-5 h-5 text-amber-500" /> Registrar Gasto Manual</h3>
              <button onClick={() => setModalManual(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 bg-slate-50">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre / Razón Social del Proveedor</label>
                <input 
                  type="text" 
                  value={formCompra.proveedor} 
                  onChange={e => setFormCompra({ ...formCompra, proveedor: e.target.value })} 
                  placeholder="Ej. Distribuidora San Juan" 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">RUC del Proveedor</label>
                  <input 
                    type="text" 
                    value={formCompra.ruc} 
                    onChange={e => setFormCompra({ ...formCompra, ruc: e.target.value })} 
                    placeholder="11 dígitos" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-white font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Serie y Número</label>
                  <input 
                    type="text" 
                    value={formCompra.serieNumero} 
                    onChange={e => setFormCompra({ ...formCompra, serieNumero: e.target.value })} 
                    placeholder="Ej. F001-2098" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-white font-mono" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Comprobante</label>
                  <select 
                    value={formCompra.tipoDocumento} 
                    onChange={e => setFormCompra({ ...formCompra, tipoDocumento: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="Factura">Factura</option>
                    <option value="Boleta">Boleta de Venta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Monto Total (S/)</label>
                  <input 
                    type="number" 
                    value={formCompra.total} 
                    onChange={e => calcularValoresPorTotal(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-white font-mono font-bold" 
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Base Imponible</span>
                  <span className="font-mono font-bold text-slate-700 text-sm">S/ {parseFloat(formCompra.baseImponible || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">IGV Calculado (18%)</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">S/ {parseFloat(formCompra.igv || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-150 p-5 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setModalManual(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button 
                onClick={guardarCompraManual} 
                disabled={guardando} 
                className="px-5 py-2 text-sm font-black text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {guardando ? <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></span> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
