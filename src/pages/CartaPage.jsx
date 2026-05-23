import React, { useState, useEffect } from 'react';
import { PlusCircle, Utensils, CupSoda, AlertCircle, Trash2, BookOpen, Save, X } from 'lucide-react';

export default function CartaPage() {
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProd, setEditProd] = useState({ id: '', nombre: '', categoria: 'Pollos', precio: '', tipoStock: 'ilimitado', stock: '' });

  const productosDefault = [
    { id: 1, nombre: "1 Pollo Entero", categoria: "Pollos", precio: 65.00, tipoStock: "ilimitado", stock: 0 },
    { id: 2, nombre: "1/2 Pollo", categoria: "Pollos", precio: 35.00, tipoStock: "ilimitado", stock: 0 },
    { id: 3, nombre: "1/4 de Pollo", categoria: "Pollos", precio: 18.00, tipoStock: "ilimitado", stock: 0 },
    { id: 4, nombre: "Inca Kola 1L", categoria: "Bebidas", precio: 12.00, tipoStock: "limitado", stock: 5 },
    { id: 5, nombre: "Chicha Morada Jarra", categoria: "Bebidas", precio: 10.00, tipoStock: "limitado", stock: 0 },
    { id: 6, nombre: "Porción de Papas", categoria: "Guarniciones", precio: 8.00, tipoStock: "ilimitado", stock: 0 }
  ];

  useEffect(() => {
    const fetchProductos = () => {
      let inventario = JSON.parse(localStorage.getItem('polleria_productos'));
      if (!inventario || inventario.length === 0) {
        inventario = productosDefault;
        localStorage.setItem('polleria_productos', JSON.stringify(inventario));
      }
      setProductos(inventario);
    };
    fetchProductos();
  }, []);

  const productosFiltrados = categoriaActiva === 'Todos' ? productos : productos.filter(p => p.categoria === categoriaActiva);

  const abrirModal = (p = null) => {
    if(p) {
      setEditProd(p);
    } else {
      setEditProd({ id: '', nombre: '', categoria: 'Pollos', precio: '', tipoStock: 'ilimitado', stock: '' });
    }
    setModalOpen(true);
  };

  const guardarProducto = () => {
    const precio = parseFloat(editProd.precio);
    if (!editProd.nombre || isNaN(precio)) {
      alert('Ingresa un nombre y un precio válido.');
      return;
    }
    
    let inventario = [...productos];
    if (editProd.id) {
      const idx = inventario.findIndex(x => x.id === editProd.id);
      if (idx > -1) {
        inventario[idx] = { ...editProd, precio, stock: parseInt(editProd.stock) || 0 };
      }
    } else {
      const nuevoId = inventario.length > 0 ? Math.max(...inventario.map(u => u.id)) + 1 : 1;
      inventario.push({ ...editProd, id: nuevoId, precio, stock: parseInt(editProd.stock) || 0 });
    }
    
    localStorage.setItem('polleria_productos', JSON.stringify(inventario));
    setProductos(inventario);
    setModalOpen(false);
  };

  const eliminarProducto = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto de la carta?')) {
      const inventario = productos.filter(p => p.id !== id);
      localStorage.setItem('polleria_productos', JSON.stringify(inventario));
      setProductos(inventario);
    }
  };

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Menú y Productos</h1>
          <p className="text-xs md:text-sm text-slate-500">Administra los platos, precios y controla el stock de bebidas.</p>
        </div>
        <button onClick={() => abrirModal()} className="bg-amber-500 text-slate-900 px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
          <PlusCircle className="w-5 h-5"/> Agregar Producto
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar mb-4">
        {['Todos', 'Pollos', 'Bebidas', 'Guarniciones'].map(cat => (
          <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap shadow-sm transition-colors ${categoriaActiva === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {cat === 'Pollos' ? 'Pollos a la Brasa' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {productosFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-10 text-slate-400 font-medium">No hay productos en esta categoría.</div>
        ) : productosFiltrados.map(p => {
          let Icon = Utensils, colorIco = 'text-amber-500', bgIco = 'bg-amber-100';
          if(p.categoria === 'Bebidas') { Icon = CupSoda; colorIco = 'text-blue-500'; bgIco = 'bg-blue-100'; }
          if(p.categoria === 'Guarniciones') { Icon = Utensils; colorIco = 'text-emerald-500'; bgIco = 'bg-emerald-100'; }

          const isAgotado = p.tipoStock === 'limitado' && p.stock <= 0;

          return (
            <div key={p.id} className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-4 relative overflow-hidden transition-all hover:shadow-md ${isAgotado ? 'opacity-75 grayscale-[50%]' : ''}`}>
              {isAgotado && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
                  <span className="bg-red-600 text-white font-black px-4 py-2 rounded-xl uppercase tracking-widest text-sm shadow-xl rotate-[-10deg] border-2 border-white">AGOTADO</span>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-3 relative z-0">
                  <div className={`w-12 h-12 rounded-2xl ${bgIco} flex items-center justify-center ${colorIco}`}>
                      <Icon className="w-6 h-6"/>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{p.categoria}</p>
                      {p.tipoStock === 'ilimitado' ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md uppercase">Disponible</span>
                      ) : isAgotado ? (
                        <span className="text-[10px] font-black text-white bg-red-500 px-2 py-1 rounded-md uppercase flex items-center gap-1 animate-pulse"><AlertCircle className="w-3 h-3"/> Agotado</span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md uppercase">Stock: {p.stock}</span>
                      )}
                  </div>
              </div>
              
              <div className="relative z-0">
                  <h3 className="font-black text-slate-800 text-lg leading-tight mb-1 truncate" title={p.nombre}>{p.nombre}</h3>
                  <p className="text-2xl font-black text-amber-500 font-mono tracking-tighter">S/ {parseFloat(p.precio).toFixed(2)}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 relative z-20">
                  <button onClick={() => abrirModal(p)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-xl transition-colors">Editar</button>
                  <button onClick={() => eliminarProducto(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4"/>
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-fade-in">
              <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                  <h3 className="font-black flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-500"/> <span>{editProd.id ? 'Editar Producto' : 'Registrar Producto'}</span></h3>
                  <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nombre del Producto</label>
                      <input type="text" value={editProd.nombre} onChange={e => setEditProd({...editProd, nombre: e.target.value})} placeholder="Ej. 1/4 de Pollo + Papas" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"/>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Categoría</label>
                          <select value={editProd.categoria} onChange={e => setEditProd({...editProd, categoria: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white">
                              <option value="Pollos">Pollos a la Brasa</option>
                              <option value="Bebidas">Bebidas</option>
                              <option value="Guarniciones">Guarniciones</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Precio (S/)</label>
                          <input type="number" value={editProd.precio} onChange={e => setEditProd({...editProd, precio: e.target.value})} placeholder="0.00" step="0.50" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 font-mono"/>
                      </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-2">Control de Stock</label>
                      <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-slate-600 font-medium">¿Llevar control?</span>
                          <select value={editProd.tipoStock} onChange={e => setEditProd({...editProd, tipoStock: e.target.value})} className="border border-slate-300 rounded-lg text-sm p-1 bg-white focus:outline-none">
                              <option value="ilimitado">No (Ilimitado)</option>
                              <option value="limitado">Sí (Limitado)</option>
                          </select>
                      </div>
                      {editProd.tipoStock === 'limitado' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cantidad Disponible</label>
                            <input type="number" value={editProd.stock} onChange={e => setEditProd({...editProd, stock: e.target.value})} placeholder="Ej. 24" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 font-mono"/>
                        </div>
                      )}
                  </div>
              </div>
              
              <div className="bg-slate-50 p-5 border-t border-slate-100 flex justify-end gap-3">
                  <button onClick={() => setModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                  <button onClick={guardarProducto} className="px-5 py-2 text-sm font-black text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-colors flex items-center gap-2">
                      <Save className="w-4 h-4"/> Guardar
                  </button>
              </div>
          </div>
        </div>
      )}
    </section>
  );
}
