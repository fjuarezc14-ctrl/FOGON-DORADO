import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, X, Save, RefreshCw, Download, Tag, ExternalLink, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { api } from '../api';

const CATEGORIAS = [
  'Insumos y Alimentos',
  'Bebidas',
  'Gas y Carbón',
  'Limpieza e Higiene',
  'Personal',
  'Otros',
];

const COLORES_CATEGORIA = {
  'Insumos y Alimentos': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', bar: 'bg-amber-500' },
  'Bebidas':             { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200',   bar: 'bg-blue-500' },
  'Gas y Carbón':        { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', bar: 'bg-orange-500' },
  'Limpieza e Higiene':  { bg: 'bg-emerald-100',text: 'text-emerald-800',border: 'border-emerald-200',bar: 'bg-emerald-500' },
  'Personal':            { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', bar: 'bg-purple-500' },
  'Otros':               { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200',  bar: 'bg-slate-400' },
  'Sin Categoría':       { bg: 'bg-slate-100',  text: 'text-slate-400',  border: 'border-slate-200',  bar: 'bg-slate-300' },
};

const ORIGEN_BADGE = {
  sunat:  { label: 'SUNAT', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
  demo:   { label: 'DEMO',  cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  manual: { label: 'Manual',cls: 'bg-slate-100 border-slate-200 text-slate-600' },
  xml:    { label: 'XML',   cls: 'bg-violet-50 border-violet-200 text-violet-700' },
};

export default function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [modalManual, setModalManual] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editCatId, setEditCatId] = useState(null);

  const hoy = new Date();
  const [periodoMes, setPeriodoMes] = useState(
    `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, '0')}`
  );

  const [formCompra, setFormCompra] = useState({
    proveedor: '', ruc: '', tipoDocumento: 'Factura', serieNumero: '',
    baseImponible: '', igv: '', total: '', categoria: '', fechaEmision: '',
    metodoPago: 'Efectivo',
    montoEfectivoMixto: '', montoTarjetaMixto: '', montoCreditoMixto: '',
  });

  const [apiStatus, setApiStatus] = useState({ modoDemo: true, apisunatActivo: false });

  const showToast = (msg, tipo = 'ok') => {
    setToastMsg({ msg, tipo });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const fetchTodo = useCallback(async () => {
    try {
      const [cs, st, stApi] = await Promise.all([
        api.getCompras(),
        api.getComprasStats(),
        api.getStatus().catch(() => null)
      ]);
      setCompras(cs);
      setStats(st);
      if (stApi && stApi.ok) {
        setApiStatus({ modoDemo: stApi.modoDemo, apisunatActivo: stApi.apisunatActivo });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { fetchTodo(); }, [fetchTodo]);

  // ── SINCRONIZAR CON SUNAT ───────────────────────────────────────────────
  const sincronizarConSunat = async () => {
    setSincronizando(true);
    try {
      const result = await api.sincronizarSunat({ periodo: periodoMes });
      setUltimaSync(new Date());
      await fetchTodo();
      showToast(result.mensaje || '✅ Sincronización completada', result.modoDemo ? 'demo' : 'ok');
    } catch (err) {
      showToast('❌ Error al sincronizar: ' + err.message, 'error');
    } finally {
      setSincronizando(false);
    }
  };

  // ── GUARDAR MANUAL ──────────────────────────────────────────────────────
  const guardarCompraManual = async () => {
    if (!formCompra.proveedor || !formCompra.total) {
      showToast('Por favor ingresa el proveedor y el monto total.', 'error');
      return;
    }
    setGuardando(true);
    try {
      await api.crearCompra({
        proveedor: formCompra.proveedor,
        ruc: formCompra.ruc || '00000000000',
        tipoDocumento: formCompra.tipoDocumento,
        serieNumero: formCompra.serieNumero || null,
        baseImponible: parseFloat(formCompra.baseImponible) || 0,
        igv: parseFloat(formCompra.igv) || 0,
        total: parseFloat(formCompra.total),
        origenCarga: 'manual',
        categoria: formCompra.categoria || null,
        fechaEmision: formCompra.fechaEmision || null,
        metodoPago: formCompra.metodoPago || 'Efectivo',
        montoEfectivo:  formCompra.metodoPago === 'Mixto' ? (parseFloat(formCompra.montoEfectivoMixto) || 0) : null,
        montoTarjeta:   formCompra.metodoPago === 'Mixto' ? (parseFloat(formCompra.montoTarjetaMixto)  || 0) : null,
        montoCredito:   formCompra.metodoPago === 'Mixto' ? (parseFloat(formCompra.montoCreditoMixto)  || 0) :
                        formCompra.metodoPago === 'Crédito' ? parseFloat(formCompra.total) : null,
      });
      await fetchTodo();
      setModalManual(false);
      setFormCompra({ proveedor: '', ruc: '', tipoDocumento: 'Factura', serieNumero: '', baseImponible: '', igv: '', total: '', categoria: '', fechaEmision: '', metodoPago: 'Efectivo', montoEfectivoMixto: '', montoTarjetaMixto: '', montoCreditoMixto: '' });
      showToast('✅ Compra registrada correctamente.');
    } catch (err) {
      showToast('❌ Error al guardar: ' + err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const calcularPorTotal = (valTotal) => {
    const total = parseFloat(valTotal);
    if (isNaN(total)) return;
    const base = parseFloat((total / 1.105).toFixed(2));
    const igv = parseFloat((total - base).toFixed(2));
    setFormCompra(f => ({ ...f, total: String(total), baseImponible: String(base), igv: String(igv) }));
  };

  // ── ACTUALIZAR CATEGORÍA INLINE ─────────────────────────────────────────
  const actualizarCategoria = async (id, categoria) => {
    try {
      await api.actualizarCategoriaCompra(id, categoria);
      setCompras(prev => prev.map(c => c.id === id ? { ...c, categoria } : c));
      // Refrescar stats
      const st = await api.getComprasStats();
      setStats(st);
      setEditCatId(null);
    } catch (err) {
      showToast('Error al actualizar categoría', 'error');
    }
  };

  // ── EXPORTAR CSV SIRE ───────────────────────────────────────────────────
  const exportarCSV = () => {
    if (compras.length === 0) { showToast('No hay compras para exportar.', 'error'); return; }
    const encabezado = ['Periodo', 'Nro Correlativo', 'Fecha Emisión', 'Tipo Comprobante', 'Serie-Número', 'RUC Proveedor', 'Razón Social', 'Moneda', 'Base Imponible', 'IGV (10.5%)', 'Total', 'Categoría Interna', 'Origen'];
    const filas = compras.map((c, i) => {
      const fechaEm = c.fechaEmision ? new Date(c.fechaEmision).toLocaleDateString('es-PE') : new Date(c.creadoEn).toLocaleDateString('es-PE');
      return [
        periodoMes,
        String(i + 1).padStart(4, '0'),
        fechaEm,
        c.tipoDocumento,
        c.serieNumero || 'S/N',
        c.ruc || '',
        `"${c.proveedor}"`,
        'PEN',
        c.baseImponible.toFixed(2),
        c.igv.toFixed(2),
        c.total.toFixed(2),
        c.categoria || 'Sin Categoría',
        c.origenCarga,
      ].join(',');
    });
    const csv = '\uFEFF' + [encabezado.join(','), ...filas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RCE_Compras_${periodoMes}_FOGON.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ CSV exportado. Compatible con SIRE / Siscont / Concar.');
  };

  // ── RENDER HELPERS ──────────────────────────────────────────────────────
  const totalBreakdown = stats ? Object.values(stats.porCategoria).reduce((a, b) => a + b, 0) : 0;

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50 relative">

      {/* TOAST */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-[300] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm animate-slide-up border ${
          toastMsg.tipo === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          toastMsg.tipo === 'demo'  ? 'bg-amber-50 border-amber-200 text-amber-900' :
          'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {toastMsg.tipo === 'error'
            ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            : <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />}
          <p className="text-sm font-semibold leading-snug">{toastMsg.msg}</p>
          <button onClick={() => setToastMsg(null)} className="ml-2 shrink-0 opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
          Compras y Gastos
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Registro de facturas de compras, sincronización con SUNAT y exportación contable para SIRE.
        </p>
      </div>

      {/* BARRA DE ACCIONES */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-4 md:p-5 mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-amber-500 rounded-l-3xl" />
        
        {/* Selector de periodo */}
        <div className="flex flex-col gap-1 ml-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Periodo SUNAT</label>
          <input
            type="month"
            value={`${periodoMes.slice(0,4)}-${periodoMes.slice(4)}`}
            onChange={e => setPeriodoMes(e.target.value.replace('-', ''))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-400 font-mono"
          />
        </div>

        {/* Badge modo demo / token status */}
        <div className="hidden md:flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado API</span>
          {apiStatus.apisunatActivo ? (
            <span className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API CONECTADO — apisunat.pe Activo 🚀
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              MODO DEMO — Sin token apisunat.pe
            </span>
          )}
        </div>

        {ultimaSync && (
          <div className="hidden md:flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Última Sync</span>
            <span className="text-xs font-bold text-slate-500">{ultimaSync.toLocaleTimeString('es-PE')}</span>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <button
            onClick={sincronizarConSunat}
            disabled={sincronizando}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar con SUNAT'}
          </button>
          <button
            onClick={() => setModalManual(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" /> Registrar Manual
          </button>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/10 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Exportar CSV (SIRE)
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Gastado (Mes)</p>
          <p className="text-2xl font-black font-mono text-slate-900 mt-2">
            S/ {stats ? stats.totalGastado.toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crédito Fiscal IGV</p>
          <p className="text-2xl font-black font-mono text-emerald-600 mt-2">
            S/ {stats ? stats.totalIGV.toFixed(2) : '0.00'}
          </p>
          <p className="text-[9px] text-slate-400 mt-1">Deducible del IGV a pagar</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facturas Registradas</p>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats ? stats.numFacturas : 0}</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex flex-col justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor Principal</p>
          <p className="text-sm font-black text-slate-800 mt-2 leading-snug line-clamp-2">
            {stats?.topProveedor?.nombre || '—'}
          </p>
          {stats?.topProveedor && (
            <p className="text-xs font-mono text-slate-500 mt-1">S/ {stats.topProveedor.total.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* BREAKDOWN POR CATEGORÍA */}
      {stats && Object.keys(stats.porCategoria).length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 md:p-6 mb-6">
          <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider mb-5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" /> Distribución de Gastos por Categoría
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.porCategoria)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, monto]) => {
                const pct = totalBreakdown > 0 ? (monto / totalBreakdown) * 100 : 0;
                const colores = COLORES_CATEGORIA[cat] || COLORES_CATEGORIA['Sin Categoría'];
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full ${colores.bg} ${colores.text} border ${colores.border}`}>{cat}</span>
                      <span className="font-mono text-slate-700">S/ {monto.toFixed(2)} <span className="text-slate-400">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${colores.bar} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TABLA DE COMPRAS */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="font-black text-slate-700 uppercase text-xs tracking-wider">
            Historial de Compras del Mes
          </h2>
          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
            {compras.length} Registro{compras.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cargando ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[780px]">
              <thead className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Fecha Emisión</th>
                  <th className="px-5 py-4">Proveedor / RUC</th>
                  <th className="px-5 py-4">Comprobante</th>
                  <th className="px-5 py-4">Categoría</th>
                  <th className="px-5 py-4 text-right">Base Imp.</th>
                  <th className="px-5 py-4 text-right">IGV</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4 text-center">Pago</th>
                  <th className="px-5 py-4 text-center">Origen</th>
                  <th className="px-5 py-4 text-center">Docs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm bg-white">
                {compras.length > 0 ? compras.map(c => {
                  const fechaEm = c.fechaEmision
                    ? new Date(c.fechaEmision).toLocaleDateString('es-PE')
                    : new Date(c.creadoEn).toLocaleDateString('es-PE');
                  const origen = ORIGEN_BADGE[c.origenCarga] || ORIGEN_BADGE['manual'];
                  const colores = COLORES_CATEGORIA[c.categoria] || COLORES_CATEGORIA['Sin Categoría'];

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-xs">{fechaEm}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800 text-xs leading-tight">{c.proveedor}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">RUC: {c.ruc || 'S/D'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-600 text-xs">{c.tipoDocumento}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.serieNumero || 'S/N'}</div>
                      </td>

                      {/* CATEGORÍA EDITABLE */}
                      <td className="px-5 py-3.5">
                        {editCatId === c.id ? (
                          <div className="relative">
                            <select
                              autoFocus
                              defaultValue={c.categoria || ''}
                              onBlur={e => {
                                if (e.target.value !== c.categoria) {
                                  actualizarCategoria(c.id, e.target.value || null);
                                } else {
                                  setEditCatId(null);
                                }
                              }}
                              onChange={e => actualizarCategoria(c.id, e.target.value || null)}
                              className="border border-blue-300 rounded-lg px-2 py-1 text-xs font-bold bg-white focus:outline-none focus:border-blue-500 w-full"
                            >
                              <option value="">Sin categoría</option>
                              {CATEGORIAS.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditCatId(c.id)}
                            title="Click para editar categoría"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all hover:opacity-80 ${colores.bg} ${colores.text} ${colores.border}`}
                          >
                            {c.categoria || 'Sin categoría'}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono text-slate-600 text-xs">S/ {c.baseImponible.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-600 font-bold text-xs">S/ {c.igv.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900">S/ {c.total.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {c.metodoPago || 'Efectivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${origen.cls}`}>
                          {origen.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {c.urlPdf && (
                            <a
                              href={c.urlPdf}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver PDF"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {c.urlXml && (
                            <a
                              href={c.urlXml}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver XML"
                              className="p-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-lg transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {!c.urlPdf && !c.urlXml && (
                            <span className="text-slate-300 text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="9" className="text-center py-16 text-slate-400">
                      <RefreshCw className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="font-black uppercase text-xs tracking-wider mb-1">No hay compras registradas</p>
                      <p className="text-xs">Pulsa <strong>"Sincronizar con SUNAT"</strong> para importar automáticamente las facturas del período.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pie: leyenda de modos */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" />SUNAT = importado automáticamente</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />DEMO = datos de prueba de apisunat.pe</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />Manual = ingresado por el administrador</span>
        </div>
      </div>


      {/* MODAL REGISTRO MANUAL */}
      {modalManual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
              <h3 className="font-black flex items-center gap-2 uppercase tracking-tight text-sm">
                <FileText className="w-5 h-5 text-amber-500" /> Registrar Compra / Gasto
              </h3>
              <button onClick={() => setModalManual(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-slate-50 max-h-[80vh] overflow-y-auto">

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Proveedor / Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formCompra.proveedor}
                    onChange={e => setFormCompra(f => ({ ...f, proveedor: e.target.value }))}
                    placeholder="Ej. Distribuidora San Juan S.A.C."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">RUC</label>
                  <input
                    type="text" maxLength={11}
                    value={formCompra.ruc}
                    onChange={e => setFormCompra(f => ({ ...f, ruc: e.target.value }))}
                    placeholder="11 dígitos"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fecha de Emisión</label>
                  <input
                    type="date"
                    value={formCompra.fechaEmision}
                    onChange={e => setFormCompra(f => ({ ...f, fechaEmision: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Tipo Comprobante</label>
                  <select
                    value={formCompra.tipoDocumento}
                    onChange={e => setFormCompra(f => ({ ...f, tipoDocumento: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
                  >
                    <option>Factura</option>
                    <option>Boleta de Venta</option>
                    <option>Nota de Crédito</option>
                    <option>Nota de Débito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Serie y Número</label>
                  <input
                    type="text"
                    value={formCompra.serieNumero}
                    onChange={e => setFormCompra(f => ({ ...f, serieNumero: e.target.value }))}
                    placeholder="Ej. F001-2098"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white font-mono"
                  />
                </div>

                {/* Categoría */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Categoría de Gasto</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS.map(cat => {
                      const activa = formCompra.categoria === cat;
                      const colores = COLORES_CATEGORIA[cat];
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormCompra(f => ({ ...f, categoria: activa ? '' : cat }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
                            activa ? `${colores.bg} ${colores.text} ${colores.border} scale-105 shadow-sm` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Monto */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Monto Total (S/) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={formCompra.total}
                    onChange={e => calcularPorTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white font-mono font-bold text-lg"
                  />
                </div>

                {/* Método de Pago */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Método de Pago *</label>
                  <select
                    value={formCompra.metodoPago}
                    onChange={e => setFormCompra(f => ({ ...f, metodoPago: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-450 bg-white font-bold text-slate-800 h-[46px]"
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Tarjeta">💳 Tarjeta</option>
                    <option value="Yape">📱 Yape / Plin</option>
                    <option value="Crédito">👥 Crédito</option>
                    <option value="Mixto">🔄 Mixto</option>
                  </select>
                </div>

                {/* Desglose Mixto */}
                {formCompra.metodoPago === 'Mixto' && (() => {
                  const total = parseFloat(formCompra.total) || 0;
                  const efec = parseFloat(formCompra.montoEfectivoMixto) || 0;
                  const tarj = parseFloat(formCompra.montoTarjetaMixto) || 0;
                  const cred = parseFloat(formCompra.montoCreditoMixto) || 0;
                  const sumado = efec + tarj + cred;
                  const diferencia = total - sumado;
                  return (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-black text-blue-700 uppercase tracking-wide">Desglose Pago Mixto</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">💵 Efectivo</label>
                          <input type="number" min="0" step="0.01"
                            value={formCompra.montoEfectivoMixto}
                            onChange={e => setFormCompra(f => ({ ...f, montoEfectivoMixto: e.target.value }))}
                            placeholder="0.00"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">💳 Tarjeta</label>
                          <input type="number" min="0" step="0.01"
                            value={formCompra.montoTarjetaMixto}
                            onChange={e => setFormCompra(f => ({ ...f, montoTarjetaMixto: e.target.value }))}
                            placeholder="0.00"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">📋 Crédito</label>
                          <input type="number" min="0" step="0.01"
                            value={formCompra.montoCreditoMixto}
                            onChange={e => setFormCompra(f => ({ ...f, montoCreditoMixto: e.target.value }))}
                            placeholder="0.00"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400 bg-white"
                          />
                        </div>
                      </div>
                      <div className={`flex items-center justify-between text-xs font-black px-3 py-2 rounded-xl ${
                        Math.abs(diferencia) < 0.01 ? 'bg-emerald-100 text-emerald-700' :
                        diferencia > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        <span>Suma ingresada: S/ {sumado.toFixed(2)}</span>
                        <span>
                          {Math.abs(diferencia) < 0.01 ? '✅ Cuadrado' :
                           diferencia > 0 ? `Falta: S/ ${diferencia.toFixed(2)}` :
                           `Excede en: S/ ${Math.abs(diferencia).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Descomposición calculada */}
                <div className="col-span-2 bg-white p-4 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Base Imponible (sin IGV)</span>
                    <span className="font-mono font-bold text-slate-700">S/ {parseFloat(formCompra.baseImponible || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">IGV Calculado (10.5%)</span>
                    <span className="font-mono font-bold text-emerald-600">S/ {parseFloat(formCompra.igv || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModalManual(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardarCompraManual}
                disabled={guardando}
                className="px-6 py-2 text-sm font-black text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {guardando ? <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Compra
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
