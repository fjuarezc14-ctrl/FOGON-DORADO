import React, { useState, useEffect } from 'react';
import { ChefHat, CheckCircle, PlusCircle, Receipt, X, Edit3, ShoppingBag } from 'lucide-react';

export default function SalonPage() {
  const [mesas, setMesas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [mesaActual, setMesaActual] = useState(null);
  const [ticketActual, setTicketActual] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [meseroGlobal, setMeseroGlobal] = useState('Carlos');
  
  const menuDB = [
    { id: 'M01', nombre: '1 Pollo a la Brasa + Papas', precio: 65.00, cat: 'Pollos' },
    { id: 'M02', nombre: '1/2 Pollo a la Brasa + Papas', precio: 35.00, cat: 'Pollos' },
    { id: 'M03', nombre: '1/4 de Pollo a la Brasa', precio: 19.00, cat: 'Pollos' },
    { id: 'M04', nombre: 'Porción de Papas Fritas', precio: 12.00, cat: 'Guarniciones' },
    { id: 'M05', nombre: 'Porción de Arroz Chaufa', precio: 10.00, cat: 'Guarniciones' },
    { id: 'M06', nombre: 'Ensalada Clásica Grande', precio: 14.00, cat: 'Guarniciones' },
    { id: 'M07', nombre: 'Chicha Morada (Jarra)', precio: 12.00, cat: 'Bebidas' },
    { id: 'M08', nombre: 'Inca Kola 1.5L', precio: 12.00, cat: 'Bebidas' },
    { id: 'M09', nombre: 'Limonada (Jarra)', precio: 10.00, cat: 'Bebidas' }
  ];

  useEffect(() => {
    let mesasGuardadas = JSON.parse(localStorage.getItem('polleria_mesas'));
    if (!mesasGuardadas || mesasGuardadas.length === 0) {
      mesasGuardadas = Array.from({length: 15}, (_, i) => ({ num: i + 1, estado: 'Libre', pedidoData: null }));
      localStorage.setItem('polleria_mesas', JSON.stringify(mesasGuardadas));
    }
    setMesas(mesasGuardadas);

    const interval = setInterval(() => {
      const db = JSON.parse(localStorage.getItem('polleria_mesas'));
      if(db && !modalOpen) setMesas(db);
    }, 2000);
    return () => clearInterval(interval);
  }, [modalOpen]);

  const guardarBD = (nuevasMesas) => {
    localStorage.setItem('polleria_mesas', JSON.stringify(nuevasMesas));
    setMesas(nuevasMesas);
  };

  const abrirModal = (m) => {
    setMesaActual(m);
    if(m.pedidoData && m.pedidoData.items && m.pedidoData.items.length > 0) {
      let items = JSON.parse(JSON.stringify(m.pedidoData.items));
      if(m.estado === 'Servido') {
        items.forEach(i => i.historial = true);
      }
      setTicketActual(items);
    } else {
      setTicketActual([]);
    }
    setCategoriaActiva('Todos');
    setModalOpen(true);
  };

  const agregarAlTicket = (prod) => {
    let nuevosItems = [...ticketActual];
    const index = nuevosItems.findIndex(t => t.id === prod.id && !t.historial);
    if(index >= 0) {
      nuevosItems[index].cant++;
    } else {
      nuevosItems.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio, cant: 1, historial: false });
    }
    setTicketActual(nuevosItems);
  };

  const alterarCantidad = (index, operacion) => {
    let nuevos = [...ticketActual];
    if(nuevos[index].historial) return;
    if(operacion === '+') nuevos[index].cant++;
    else {
      nuevos[index].cant--;
      if(nuevos[index].cant <= 0) nuevos.splice(index, 1);
    }
    setTicketActual(nuevos);
  };

  const enviarACocina = () => {
    const hayNuevos = ticketActual.some(i => !i.historial);
    if(!hayNuevos) {
      alert("No has agregado ningún producto nuevo para enviar a cocina.");
      return;
    }
    const total = ticketActual.reduce((acc, val) => acc + (val.cant * val.precio), 0);
    const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const esAdicional = mesaActual.estado === 'Servido';

    const nuevasMesas = mesas.map(m => {
      if(m.num === mesaActual.num) {
        return { ...m, estado: 'Cocina', pedidoData: { mesero: meseroGlobal, items: ticketActual, total, hora, adicional: esAdicional }};
      }
      return m;
    });
    
    guardarBD(nuevasMesas);
    setModalOpen(false);
  };

  const menuFiltrado = categoriaActiva === 'Todos' ? menuDB : menuDB.filter(m => m.cat === categoriaActiva);
  const totalTicket = ticketActual.reduce((acc, item) => acc + (item.cant * item.precio), 0);
  const badgeEstado = mesaActual?.estado === 'Servido' && ticketActual.length > 0 ? "text-blue-700 bg-blue-100" : (ticketActual.length > 0 ? "text-amber-700 bg-amber-100" : "text-emerald-700 bg-emerald-100");
  const badgeTexto = mesaActual?.estado === 'Servido' && ticketActual.length > 0 ? "+ ADICIONAL" : (ticketActual.length > 0 ? "Editando Pedido" : "Nueva Orden");

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Atención en Salón</h1>
          <p className="text-xs md:text-sm text-slate-500">Toca una mesa para tomar, editar o agregar un pedido adicional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-600 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Libre</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-600 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Cocina</div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-600 uppercase bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Servido</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5 pb-20 md:pb-0">
        {mesas.map((m, idx) => {
          let colorBg = 'bg-white hover:bg-emerald-50', colorText = 'text-slate-300', colorBorder = 'border-slate-200', Icon = Receipt;
          if(m.estado === 'Cocina') { colorBg = 'bg-amber-50'; colorText = 'text-amber-500'; colorBorder = 'border-amber-300 shadow-md'; Icon = ChefHat; }
          else if(m.estado === 'Servido') { colorBg = 'bg-blue-50'; colorText = 'text-blue-500'; colorBorder = 'border-blue-300 shadow-md'; Icon = CheckCircle; }

          return (
            <div key={idx} onClick={() => abrirModal(m)} className={`relative rounded-2xl md:rounded-3xl border-2 ${colorBorder} ${colorBg} p-3 md:p-5 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 hover:-translate-y-1 aspect-square md:aspect-auto md:h-40 group`}>
              <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center ${colorText} mb-1 md:mb-2 bg-white shadow-sm border border-slate-100`}>
                <Icon className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-sm md:text-lg uppercase tracking-tight">Mesa {m.num}</h3>
              {m.pedidoData ? (
                <p className="font-mono font-black text-sm md:text-lg mt-1 text-slate-800">S/ {m.pedidoData.total.toFixed(2)}</p>
              ) : (
                <p className="text-[10px] md:text-xs mt-1 text-slate-400 font-medium">Disponible</p>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && mesaActual && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-[95vh] md:h-auto md:max-h-[90vh] max-w-6xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-fade-in">
            <div className="p-3 md:p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500 rounded-lg md:rounded-xl flex items-center justify-center text-slate-900"><Edit3 className="w-4 h-4 md:w-5 md:h-5"/></div>
                <div>
                  <h2 className="font-black text-sm md:text-lg uppercase tracking-tight leading-none">Mesa <span className="text-amber-400 text-lg md:text-xl">{mesaActual.num}</span></h2>
                  <p className="text-[10px] md:text-xs text-slate-400">Punto de Venta</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select value={meseroGlobal} onChange={(e)=>setMeseroGlobal(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-[10px] font-bold rounded-lg px-2 py-1.5 focus:outline-none">
                  <option>Carlos</option><option>María</option><option>Luis</option>
                </select>
                <button onClick={() => setModalOpen(false)} className="bg-slate-800 hover:bg-red-500 hover:text-white text-slate-300 p-2 md:p-2.5 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-slate-50">
              <div className="w-full md:w-3/5 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-slate-200">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar p-3 shrink-0 bg-white shadow-sm z-10">
                  {['Todos', 'Pollos', 'Guarniciones', 'Bebidas'].map(cat => (
                    <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase whitespace-nowrap shadow-sm transition-colors ${categoriaActiva === cat ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4 p-3 overflow-y-auto custom-scrollbar content-start flex-1">
                  {menuFiltrado.map(prod => (
                    <div key={prod.id} onClick={() => agregarAlTicket(prod)} className="bg-white border border-slate-200 rounded-xl p-3 md:p-4 flex flex-col justify-between cursor-pointer active:bg-slate-50 transition-colors shadow-sm relative overflow-hidden h-24 md:h-28">
                      <p className="font-bold text-slate-800 text-[10px] md:text-xs uppercase leading-tight pr-4 z-10">{prod.nombre}</p>
                      <p className="font-black font-mono text-emerald-600 text-sm md:text-base z-10">S/ {prod.precio.toFixed(2)}</p>
                      <PlusCircle className="absolute bottom-[-10px] right-[-10px] w-12 h-12 text-slate-100 opacity-50" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-2/5 bg-white flex flex-col min-h-[40vh] md:min-h-0">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-amber-50 shrink-0 flex justify-between items-center">
                  <h3 className="font-black text-amber-800 uppercase text-xs flex items-center gap-2"><Receipt className="w-4 h-4" /> Pedido Actual</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-slate-200 uppercase ${badgeEstado} ${mesaActual?.estado === 'Servido' ? 'animate-pulse' : ''}`}>{badgeTexto}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar bg-slate-50/50">
                  <ul className="space-y-2 md:space-y-3">
                    {ticketActual.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 opacity-50">
                          <ShoppingBag className="w-8 h-8 mb-2" />
                          <p className="text-center text-slate-500 font-bold text-xs">Aún no hay productos en la mesa.</p>
                      </div>
                    ) : ticketActual.map((item, idx) => {
                      const sub = item.cant * item.precio;
                      if(item.historial) {
                        return (
                          <li key={idx} className="bg-slate-50 border border-slate-200 p-2.5 md:p-3 rounded-xl flex items-center justify-between opacity-60 grayscale">
                            <div className="flex-1 pr-2">
                                <p className="font-bold text-slate-500 text-[10px] md:text-xs leading-tight line-through decoration-slate-300">{item.nombre}</p>
                                <p className="font-mono text-slate-400 font-bold text-xs md:text-sm mt-1">S/ {sub.toFixed(2)}</p>
                            </div>
                            <div className="font-black text-slate-400 text-sm md:text-base px-3">{item.cant} <span className="text-[10px]">✔</span></div>
                          </li>
                        )
                      }
                      return (
                        <li key={idx} className="bg-white border border-slate-200 p-2.5 md:p-3 rounded-xl flex items-center justify-between shadow-sm">
                          <div className="flex-1 pr-2">
                              <p className="font-bold text-slate-800 text-[10px] md:text-xs leading-tight">{item.nombre}</p>
                              <p className="font-mono text-emerald-600 font-bold text-xs md:text-sm mt-1">S/ {sub.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-1 md:gap-2 bg-slate-100 rounded-lg p-1 shrink-0 border border-slate-200">
                              <button onClick={() => alterarCantidad(idx, '-')} className="w-8 h-8 md:w-7 md:h-7 bg-white rounded-md shadow-sm text-slate-600 font-black active:bg-slate-200 text-lg md:text-base leading-none">-</button>
                              <span className="font-bold text-slate-900 w-5 md:w-6 text-center text-sm">{item.cant}</span>
                              <button onClick={() => alterarCantidad(idx, '+')} className="w-8 h-8 md:w-7 md:h-7 bg-white rounded-md shadow-sm text-slate-600 font-black active:bg-slate-200 text-lg md:text-base leading-none">+</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <div className="flex justify-between items-end mb-3 md:mb-4 px-2">
                      <span className="font-bold text-slate-400 uppercase text-[10px] md:text-xs tracking-widest">Total Mesa</span>
                      <span className="font-black font-mono text-2xl md:text-3xl text-slate-900 leading-none">S/ {totalTicket.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <button onClick={() => setModalOpen(false)} className="py-3.5 md:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs md:text-sm uppercase tracking-wide transition-colors">Guardar / Salir</button>
                      <button onClick={enviarACocina} className="py-3.5 md:py-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase tracking-tight rounded-xl text-xs md:text-sm transition-colors shadow-lg shadow-amber-500/30 flex justify-center items-center gap-2">
                          <ChefHat className="w-4 h-4 md:w-5 md:h-5"/> A Cocina
                      </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
