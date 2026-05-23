// Configuración central del API
// Si estamos en producción se usará la URL del servidor real
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  // Mesas
  getMesas: () => fetch(`${API_BASE}/api/mesas`).then(r => r.json()),
  enviarACocina: (num, body) => fetch(`${API_BASE}/api/mesas/${num}/pedido`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json()),
  despacharMesa: (num) => fetch(`${API_BASE}/api/mesas/${num}/despachar`, { method: 'PATCH' }).then(r => r.json()),

  // Productos
  getProductos: () => fetch(`${API_BASE}/api/productos`).then(r => r.json()),
  crearProducto: (body) => fetch(`${API_BASE}/api/productos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json()),
  editarProducto: (id, body) => fetch(`${API_BASE}/api/productos/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json()),
  eliminarProducto: (id) => fetch(`${API_BASE}/api/productos/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Usuarios
  getUsuarios: () => fetch(`${API_BASE}/api/usuarios`).then(r => r.json()),
  crearUsuario: (body) => fetch(`${API_BASE}/api/usuarios`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json()),
  eliminarUsuario: (id) => fetch(`${API_BASE}/api/usuarios/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Ventas
  cobrar: (body) => fetch(`${API_BASE}/api/ventas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json()),
  getResumenVentas: () => fetch(`${API_BASE}/api/ventas/resumen`).then(r => r.json()),

  // Compras
  getCompras: () => fetch(`${API_BASE}/api/compras`).then(r => r.json()),
  crearCompra: (body) => fetch(`${API_BASE}/api/compras`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json()),

  // Reportes
  getReporteContable: () => fetch(`${API_BASE}/api/reportes/contable`).then(r => r.json()),
};
