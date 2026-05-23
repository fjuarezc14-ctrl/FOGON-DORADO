import React, { useState, useEffect } from 'react';
import { UserPlus, X, Trash2, LayoutDashboard, LayoutGrid, ChefHat, Calculator, PieChart, UsersRound, Save } from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [newUser, setNewUser] = useState({
    nombre: '',
    rol: '',
    pin: '',
    permisos: []
  });

  const usuarioAdminDefault = [{
    id: 1,
    nombre: 'Admin Principal',
    rol: 'Administrador',
    pin: '1234',
    permisos: ['Dashboard', 'Salon', 'Cocina', 'Caja', 'Reportes', 'Usuarios']
  }];

  useEffect(() => {
    let db = JSON.parse(localStorage.getItem('polleria_usuarios'));
    if (!db || db.length === 0) {
      db = usuarioAdminDefault;
      localStorage.setItem('polleria_usuarios', JSON.stringify(db));
    }
    setUsuarios(db);
  }, []);

  const handleRolChange = (rol) => {
    let permisos = [];
    if (rol === 'Administrador') {
      permisos = ['Dashboard', 'Salon', 'Cocina', 'Caja', 'Reportes', 'Usuarios'];
    } else if (rol === 'Mozo') {
      permisos = ['Salon'];
    } else if (rol === 'Cocinero') {
      permisos = ['Cocina'];
    } else if (rol === 'Cajero') {
      permisos = ['Dashboard', 'Salon', 'Caja'];
    }
    setNewUser({ ...newUser, rol, permisos });
  };

  const handlePermisoToggle = (permiso) => {
    const current = newUser.permisos;
    if (current.includes(permiso)) {
      setNewUser({ ...newUser, permisos: current.filter(p => p !== permiso) });
    } else {
      setNewUser({ ...newUser, permisos: [...current, permiso] });
    }
  };

  const abrirModal = () => {
    setNewUser({ nombre: '', rol: '', pin: '', permisos: [] });
    setModalOpen(true);
  };

  const guardarUsuario = () => {
    if (!newUser.nombre || !newUser.rol || !newUser.pin || newUser.permisos.length === 0) {
      alert('Por favor completa todos los campos y asigna al menos un permiso.');
      return;
    }

    let inventario = [...usuarios];
    const nuevoId = inventario.length > 0 ? Math.max(...inventario.map(u => u.id)) + 1 : 1;
    
    const usuarioAGuardar = { ...newUser, id: nuevoId };
    inventario.push(usuarioAGuardar);
    
    localStorage.setItem('polleria_usuarios', JSON.stringify(inventario));
    setUsuarios(inventario);
    setModalOpen(false);
  };

  const eliminarUsuario = (id) => {
    const userToDel = usuarios.find(u => u.id === id);
    if(userToDel.rol === 'Administrador' && usuarios.filter(u => u.rol === 'Administrador').length === 1) {
      alert("¡No puedes eliminar al único Administrador del sistema!");
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      const remaining = usuarios.filter(u => u.id !== id);
      localStorage.setItem('polleria_usuarios', JSON.stringify(remaining));
      setUsuarios(remaining);
    }
  };

  const permisosDisponibles = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'Salon', icon: LayoutGrid, label: 'Salón/Mesas' },
    { id: 'Cocina', icon: ChefHat, label: 'Cocina' },
    { id: 'Caja', icon: Calculator, label: 'Caja/Cobros' },
    { id: 'Reportes', icon: PieChart, label: 'Reportes' },
    { id: 'Usuarios', icon: UsersRound, label: 'Usuarios' },
  ];

  return (
    <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Gestión de Usuarios</h1>
          <p className="text-xs md:text-sm text-slate-500">Crea cuentas, asigna roles y controla qué puede ver cada empleado.</p>
        </div>
        
        <button onClick={abrirModal} className="bg-amber-500 text-slate-900 px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
          <UserPlus className="w-5 h-5"/> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4 text-center">Rol</th>
                <th className="px-6 py-4">Módulos Permitidos</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {usuarios.map(u => {
                let colorRol = 'bg-slate-100 text-slate-600 border-slate-200';
                if (u.rol === 'Administrador') colorRol = 'bg-amber-100 text-amber-800 border-amber-200';
                if (u.rol === 'Mozo') colorRol = 'bg-blue-100 text-blue-800 border-blue-200';
                if (u.rol === 'Cocinero') colorRol = 'bg-red-100 text-red-800 border-red-200';
                if (u.rol === 'Cajero') colorRol = 'bg-emerald-100 text-emerald-800 border-emerald-200';

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                              {u.nombre.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                              <p className="font-bold text-slate-800">{u.nombre}</p>
                              <p className="text-xs text-slate-400 font-mono">PIN: ****</p>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className={`border px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${colorRol}`}>
                            {u.rol}
                        </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs flex-wrap">
                        {u.permisos.map(p => (
                          <span key={p} className="inline-block bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase mr-1 mb-1">
                            {p}
                          </span>
                        ))}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button onClick={() => eliminarUsuario(u.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                            <Trash2 className="w-5 h-5"/>
                        </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-fade-in">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                <h3 className="font-black flex items-center gap-2"><UserPlus className="w-5 h-5 text-amber-500"/> Registrar Empleado</h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nombre completo</label>
                        <input type="text" value={newUser.nombre} onChange={e=>setNewUser({...newUser, nombre: e.target.value})} placeholder="Ej. Juan Pérez" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"/>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Rol Asignado</label>
                        <select value={newUser.rol} onChange={(e) => handleRolChange(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white">
                            <option value="">Selecciona un rol...</option>
                            <option value="Administrador">Administrador</option>
                            <option value="Cajero">Cajero / Recepción</option>
                            <option value="Mozo">Mozo / Mesero</option>
                            <option value="Cocinero">Jefe de Cocina</option>
                        </select>
                    </div>
                </div>
                
                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">PIN de Acceso (4 dígitos)</label>
                    <input type="password" value={newUser.pin} onChange={e=>setNewUser({...newUser, pin: e.target.value})} placeholder="****" className="w-full sm:w-1/2 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 font-mono" maxLength="4"/>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-4">Permisos de Acceso al Menú</label>
                    <div className="grid grid-cols-2 gap-3">
                        {permisosDisponibles.map(p => {
                          const Icon = p.icon;
                          const isChecked = newUser.permisos.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                <input type="checkbox" checked={isChecked} onChange={() => handlePermisoToggle(p.id)} className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 cursor-pointer"/>
                                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Icon className="w-4 h-4 text-slate-400"/> {p.label}</span>
                            </label>
                          );
                        })}
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-50 p-5 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button onClick={guardarUsuario} className="px-5 py-2 text-sm font-black text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4"/> Guardar
                </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
