// Configuración central del API
const API_BASE = import.meta.env.VITE_API_URL || '';

export const api = {
  // Mesas (salón)
  getMesas: () => fetch(`${API_BASE}/api/mesas`).then(r => r.json()),
  enviarACocina: (num, body) => fetch(`${API_BASE}/api/mesas/${num}/pedido`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),

  // Cocina (unificado: salón + delivery)
  getPedidosCocina: () => fetch(`${API_BASE}/api/pedidos/cocina`).then(r => r.json()),
  getPedidosBarra: () => fetch(`${API_BASE}/api/pedidos/barra`).then(r => r.json()),
  prepararPedido: (id, seccion) => fetch(`${API_BASE}/api/pedidos/${id}/preparar`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seccion }),
  }).then(r => r.json()),
  servirPedido: (id) => fetch(`${API_BASE}/api/pedidos/${id}/servir`, { method: 'PATCH' }).then(r => r.json()),

  // Cancelación de pedidos (mozo)
  cancelarPedido: (id, body) => fetch(`${API_BASE}/api/pedidos/${id}/cancelar`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),
  cancelarItemPedido: (id, body) => fetch(`${API_BASE}/api/pedidos/${id}/cancelar-item`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),

  // Delivery / PedidosYa
  crearPedidoLlevar: (body) => fetch(`${API_BASE}/api/pedidos/llevar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),
  getPedidosLlevar: () => fetch(`${API_BASE}/api/pedidos/llevar`).then(r => r.json()),
  confirmarEntrega: (id) => fetch(`${API_BASE}/api/pedidos/${id}/entregar`, { method: 'PATCH' }).then(r => r.json()),

  // Productos
  getProductos: () => fetch(`${API_BASE}/api/productos`).then(r => r.json()),
  crearProducto: (body) => fetch(`${API_BASE}/api/productos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),
  editarProducto: (id, body) => fetch(`${API_BASE}/api/productos/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),
  eliminarProducto: (id) => fetch(`${API_BASE}/api/productos/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Usuarios
  getUsuarios: () => fetch(`${API_BASE}/api/usuarios`).then(r => r.json()),
  crearUsuario: (body) => fetch(`${API_BASE}/api/usuarios`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),
  eliminarUsuario: (id) => fetch(`${API_BASE}/api/usuarios/${id}`, { method: 'DELETE' }).then(r => r.json()),
  editarUsuario: (id, body) => fetch(`${API_BASE}/api/usuarios/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),
  login: (pin) => fetch(`${API_BASE}/api/usuarios/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
  }).then(r => r.json()),
  validateAuth: (pin) => fetch(`${API_BASE}/api/usuarios/validate-auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
  }).then(r => r.json()),

  // Ventas (acepta pedidoIds array)
  cobrar: (body) => fetch(`${API_BASE}/api/ventas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),
  getResumenVentas: () => fetch(`${API_BASE}/api/ventas/resumen`).then(r => r.json()),
  getHistorialVentas: (desde, hasta) => fetch(`${API_BASE}/api/ventas${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ''}`).then(r => r.json()),

  // Compras
  getCompras: (desde, hasta) => fetch(`${API_BASE}/api/compras${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ''}`).then(r => r.json()),
  crearCompra: (body) => fetch(`${API_BASE}/api/compras`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.json()),

  // Reportes
  getReporteContable: (desde, hasta) => fetch(`${API_BASE}/api/reportes/contable${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ''}`).then(r => r.json()),
  getCancelaciones: (desde, hasta) => fetch(`${API_BASE}/api/reportes/cancelaciones${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ''}`).then(r => r.json()),
  getReporteMozos: (desde, hasta) => fetch(`${API_BASE}/api/reportes/mozos${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ''}`).then(r => r.json()),

  // Consulta DNI/RUC segura
  consultarCliente: (doc) => fetch(`${API_BASE}/api/clientes/consulta/${doc}`).then(r => r.json()),

  // Nubefact — Diagnóstico y reintentos manuales
  getNubefactPendientes: () => fetch(`${API_BASE}/api/nubefact/pendientes`).then(r => r.json()),
  reintentarNubefact: (id) => fetch(`${API_BASE}/api/nubefact/reintentar/${id}`, { method: 'POST' }).then(r => r.json()),
  reintentarTodosNubefact: () => fetch(`${API_BASE}/api/nubefact/reintentar-todos`, { method: 'POST' }).then(r => r.json()),
};

