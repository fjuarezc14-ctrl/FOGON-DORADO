const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const LIMITE_CANCELACION_MS = 5 * 60 * 1000; // 5 minutos

app.use(cors());
app.use(express.json());

// ============================================================
// ESTADO DEL SERVIDOR
// ============================================================
app.get('/api/status', (req, res) => {
  res.json({ ok: true, mensaje: '🚀 Fogón Dorado Backend v3 funcionando al 100%' });
});

// ============================================================
// MESAS — Consolidado con todos los pedidos activos
// ============================================================

app.get('/api/mesas', async (req, res) => {
  try {
    const mesas = await prisma.mesa.findMany({
      orderBy: { numero: 'asc' },
      include: {
        Pedidos: {
          where: { estado: { in: ['Cocina', 'Servido'] } },
          orderBy: { createdAt: 'asc' },
          include: {
            items: {
              include: { producto: { select: { categoria: true } } },
            },
          },
        },
      },
    });

    const formateadas = mesas.map(m => {
      const pedidosActivos = m.Pedidos;
      if (pedidosActivos.length === 0) {
        return { num: m.numero, estado: m.estado, pedidoData: null };
      }

      // Consolidar items de TODOS los pedidos activos (fix bug adicional)
      const todosLosItems = pedidosActivos.flatMap(p =>
        p.items.map(i => ({
          id: String(i.productoId),
          nombre: i.nombre,
          precio: i.precio,
          cant: i.cantidad,
          historial: i.historial,
          categoria: i.producto?.categoria || '',
        }))
      );

      const totalConsolidado = pedidosActivos.reduce((sum, p) => sum + p.total, 0);
      const pedidoIds = pedidosActivos.map(p => p.id);
      const primerPedido = pedidosActivos[0];
      const ultimoPedido = pedidosActivos[pedidosActivos.length - 1];

      return {
        num: m.numero,
        estado: m.estado,
        pedidoData: {
          pedidoIds,
          pedidoId: ultimoPedido.id,
          mesero: primerPedido.mesero,
          total: totalConsolidado,
          hora: primerPedido.createdAt.toLocaleTimeString('es-PE', {
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
          }),
          pedidoCreadoEn: ultimoPedido.createdAt.toISOString(),
          adicional: pedidosActivos.length > 1,
          items: todosLosItems,
        },
      };
    });

    res.json(formateadas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mesas/:num/pedido → Enviar a cocina (con descuento de stock)
app.post('/api/mesas/:num/pedido', async (req, res) => {
  const { num } = req.params;
  const { mesero, items, total, adicional } = req.body;

  try {
    const mesa = await prisma.mesa.findUnique({ where: { numero: parseInt(num) } });
    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });

    const itemsNuevos = items.filter(i => !i.historial);

    const pedido = await prisma.pedido.create({
      data: {
        mesaId: mesa.id,
        mesero,
        total,
        adicional: adicional || false,
        estado: 'Cocina',
        items: {
          create: itemsNuevos.map(i => ({
            productoId: parseInt(i.id),
            nombre: i.nombre,
            precio: i.precio,
            cantidad: i.cant,
            historial: false,
          })),
        },
      },
    });

    // Descontar stock de productos limitados
    for (const item of itemsNuevos) {
      await prisma.producto.updateMany({
        where: { id: parseInt(item.id), tipoStock: 'limitado' },
        data: { stock: { decrement: item.cant } },
      });
    }

    await prisma.mesa.update({
      where: { id: mesa.id },
      data: { estado: 'Cocina' },
    });

    res.json({ ok: true, pedidoId: pedido.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// COCINA — Endpoint unificado (salon + delivery)
// ============================================================

// GET /api/pedidos/cocina → Todos los pedidos en Cocina para el monitor
app.get('/api/pedidos/cocina', async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'Cocina' },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: { producto: { select: { categoria: true } } },
        },
        mesa: true,
      },
    });

    const formateados = pedidos.map(p => ({
      pedidoId: p.id,
      mesaNum: p.mesa?.numero || null,
      tipoEntrega: p.tipoEntrega,
      codigoPedidosYa: p.codigoPedidosYa,
      mesero: p.mesero,
      adicional: p.adicional,
      hora: p.createdAt.toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      }),
      // Filtrar bebidas: cocina solo ve lo que prepara
      items: p.items
        .filter(i => !i.historial && i.producto?.categoria !== 'Bebidas')
        .map(i => ({
          nombre: i.nombre,
          cant: i.cantidad,
          categoria: i.producto?.categoria || '',
        })),
    })).filter(p => p.items.length > 0); // Ocultar si solo tiene bebidas

    res.json(formateados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pedidos/:id/servir → Cocinero marca como Listo
app.patch('/api/pedidos/:id/servir', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Marcar items como historial
    await prisma.itemPedido.updateMany({
      where: { pedidoId: id },
      data: { historial: true },
    });

    const pedido = await prisma.pedido.update({
      where: { id },
      data: { estado: 'Servido' },
      include: { mesa: true },
    });

    // Si es pedido de salón, verificar si la mesa puede pasar a Servido
    if (pedido.mesaId && pedido.tipoEntrega === 'salon') {
      const enCocina = await prisma.pedido.count({
        where: { mesaId: pedido.mesaId, estado: 'Cocina' },
      });
      if (enCocina === 0) {
        await prisma.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: 'Servido' },
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CANCELACIÓN DE PEDIDOS (Solo Mozo, límite 5 min)
// ============================================================

app.patch('/api/pedidos/:id/cancelar', async (req, res) => {
  const id = parseInt(req.params.id);
  const { canceladoPor, motivo } = req.body;

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true } },
        mesa: true,
      },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });

    if (pedido.estado !== 'Cocina') {
      return res.status(400).json({
        error: 'Este pedido ya no puede cancelarse. Solo se cancelan pedidos en estado "Cocina".',
      });
    }

    const elapsed = Date.now() - new Date(pedido.createdAt).getTime();
    if (elapsed > LIMITE_CANCELACION_MS) {
      return res.status(400).json({
        error: 'El tiempo límite de 5 minutos para cancelar ha expirado. Consulta con el administrador.',
      });
    }

    // Cancelar el pedido
    await prisma.pedido.update({
      where: { id },
      data: {
        estado: 'Cancelado',
        canceladoPor: canceladoPor || 'Sin especificar',
        motivoCancela: motivo || 'Sin motivo',
        canceladoEn: new Date(),
      },
    });

    // Restaurar stock de productos limitados
    for (const item of pedido.items) {
      if (item.producto.tipoStock === 'limitado') {
        await prisma.producto.update({
          where: { id: item.productoId },
          data: { stock: { increment: item.cantidad } },
        });
      }
    }

    // Liberar mesa si no quedan pedidos activos
    if (pedido.mesaId) {
      const activos = await prisma.pedido.count({
        where: { mesaId: pedido.mesaId, estado: { in: ['Cocina', 'Servido'] } },
      });
      if (activos === 0) {
        await prisma.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: 'Libre' },
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELIVERY / PEDIDOS YA
// ============================================================

// POST /api/pedidos/llevar → Crear pedido de delivery (pago ya procesado en POS)
app.post('/api/pedidos/llevar', async (req, res) => {
  const { codigoPedidosYa, cajero, items, total } = req.body;

  try {
    const pedido = await prisma.pedido.create({
      data: {
        mesaId: null,
        mesero: cajero,
        total,
        estado: 'Cocina',
        tipoEntrega: 'llevar',
        codigoPedidosYa,
        items: {
          create: items.map(i => ({
            productoId: parseInt(i.id),
            nombre: i.nombre,
            precio: i.precio,
            cantidad: i.cant,
            historial: false,
          })),
        },
      },
    });

    // Descontar stock limitado
    for (const item of items) {
      await prisma.producto.updateMany({
        where: { id: parseInt(item.id), tipoStock: 'limitado' },
        data: { stock: { decrement: item.cant } },
      });
    }

    // Registrar venta inmediatamente (pago externo ya confirmado)
    const subtotal = parseFloat((total / 1.18).toFixed(2));
    const igv = parseFloat((total - subtotal).toFixed(2));
    await prisma.venta.create({
      data: {
        pedidoId: pedido.id,
        tipoComprobante: 'Ticket',
        nombreCliente: 'PEDIDOS YA',
        numDocumento: codigoPedidosYa,
        total,
        igv,
        subtotal,
        metodoPago: 'PedidosYa',
      },
    });

    res.json({ ok: true, pedidoId: pedido.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pedidos/llevar → Pedidos de delivery activos para CajaPage
app.get('/api/pedidos/llevar', async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: { tipoEntrega: 'llevar', estado: { in: ['Cocina', 'Servido'] } },
      orderBy: { createdAt: 'asc' },
      include: { items: true },
    });

    const formateados = pedidos.map(p => ({
      pedidoId: p.id,
      codigoPedidosYa: p.codigoPedidosYa,
      cajero: p.mesero,
      estado: p.estado,
      total: p.total,
      hora: p.createdAt.toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      }),
      items: p.items.map(i => ({ nombre: i.nombre, cant: i.cantidad, precio: i.precio })),
    }));

    res.json(formateados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pedidos/:id/entregar → Caja confirma entrega del delivery
app.patch('/api/pedidos/:id/entregar', async (req, res) => {
  try {
    await prisma.pedido.update({
      where: { id: parseInt(req.params.id) },
      data: { estado: 'Cobrado' },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PRODUCTOS (CARTA)
// ============================================================

app.get('/api/productos', async (req, res) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: { categoria: 'asc' },
    });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const prod = await prisma.producto.create({ data: req.body });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  try {
    const prod = await prisma.producto.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    await prisma.producto.update({
      where: { id: parseInt(req.params.id) },
      data: { activo: false },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// USUARIOS
// ============================================================

app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({ where: { activo: true } });
    const seguros = usuarios.map(({ pin, ...u }) => u);
    res.json(seguros);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const user = await prisma.usuario.create({ data: req.body });
    const { pin, ...seguro } = user;
    res.json(seguro);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const admins = await prisma.usuario.count({ where: { rol: 'Administrador', activo: true } });
    const target = await prisma.usuario.findUnique({ where: { id } });
    if (target.rol === 'Administrador' && admins <= 1) {
      return res.status(400).json({ error: '¡No puedes eliminar al único Administrador!' });
    }
    await prisma.usuario.update({ where: { id }, data: { activo: false } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CAJA / VENTAS
// ============================================================

// POST /api/ventas → Cobrar mesa (acepta pedidoIds array o pedidoId simple)
app.post('/api/ventas', async (req, res) => {
  const { pedidoId, pedidoIds, tipoComprobante, numDocumento, nombreCliente, total, metodoPago } = req.body;
  const idsAPagar = pedidoIds || [pedidoId];
  const idPrincipal = idsAPagar[idsAPagar.length - 1]; // El más reciente como venta principal

  try {
    const subtotal = parseFloat((total / 1.18).toFixed(2));
    const igv = parseFloat((total - subtotal).toFixed(2));

    // Crear Venta principal
    const venta = await prisma.venta.create({
      data: { pedidoId: idPrincipal, tipoComprobante, numDocumento, nombreCliente, total, igv, subtotal, metodoPago },
    });

    // Marcar TODOS los pedidos de la mesa como Cobrado
    await prisma.pedido.updateMany({
      where: { id: { in: idsAPagar } },
      data: { estado: 'Cobrado' },
    });

    // Liberar la mesa
    const pedidoPrincipal = await prisma.pedido.findUnique({ where: { id: idsAPagar[0] } });
    if (pedidoPrincipal?.mesaId) {
      await prisma.mesa.update({
        where: { id: pedidoPrincipal.mesaId },
        data: { estado: 'Libre' },
      });
    }

    res.json({ ok: true, ventaId: venta.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ventas/resumen → Estadísticas del día (hora Perú)
app.get('/api/ventas/resumen', async (req, res) => {
  try {
    // Inicio del día en UTC-5
    const ahora = new Date();
    const hoyPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    hoyPeru.setHours(0, 0, 0, 0);
    const inicioUTC = new Date(hoyPeru.getTime() + 5 * 60 * 60 * 1000);

    const ventas = await prisma.venta.findMany({
      where: { createdAt: { gte: inicioUTC } },
    });

    const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
    const totalIGVVentas = ventas.reduce((s, v) => s + v.igv, 0);
    const atendidas = ventas.length;

    res.json({ atendidas, ingresos: totalVentas, igvVentas: totalIGVVentas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// COMPRAS (RCE)
// ============================================================

app.get('/api/compras', async (req, res) => {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const compras = await prisma.compra.findMany({
      where: { creadoEn: { gte: inicioMes } },
      orderBy: { creadoEn: 'desc' },
    });
    res.json(compras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/compras', async (req, res) => {
  try {
    const compra = await prisma.compra.create({ data: req.body });
    res.json(compra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REPORTES
// ============================================================

// GET /api/reportes/cancelaciones → Pedidos cancelados del día
app.get('/api/reportes/cancelaciones', async (req, res) => {
  try {
    const ahora = new Date();
    const hoyPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    hoyPeru.setHours(0, 0, 0, 0);
    const inicioUTC = new Date(hoyPeru.getTime() + 5 * 60 * 60 * 1000);

    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'Cancelado', canceladoEn: { gte: inicioUTC } },
      include: { items: true, mesa: true },
      orderBy: { canceladoEn: 'desc' },
    });

    const formateados = pedidos.map(p => ({
      id: p.id,
      hora: p.canceladoEn?.toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      }),
      mesa: p.mesa?.numero || null,
      codigoPedidosYa: p.codigoPedidosYa,
      canceladoPor: p.canceladoPor,
      motivoCancela: p.motivoCancela,
      total: p.total,
      resumenItems: p.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', '),
    }));

    res.json(formateados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/mozos → Estadísticas por mozo del día
app.get('/api/reportes/mozos', async (req, res) => {
  try {
    const ahora = new Date();
    const hoyPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    hoyPeru.setHours(0, 0, 0, 0);
    const inicioUTC = new Date(hoyPeru.getTime() + 5 * 60 * 60 * 1000);

    const pedidos = await prisma.pedido.findMany({
      where: {
        createdAt: { gte: inicioUTC },
        tipoEntrega: 'salon',
        estado: { not: 'Cancelado' },
      },
      select: { mesero: true, estado: true },
    });

    const mozos = {};
    for (const p of pedidos) {
      if (!mozos[p.mesero]) mozos[p.mesero] = { activas: 0, atendidas: 0 };
      if (p.estado === 'Cocina' || p.estado === 'Servido') mozos[p.mesero].activas++;
      if (p.estado === 'Cobrado') mozos[p.mesero].atendidas++;
    }

    const resultado = Object.entries(mozos).map(([nombre, stats]) => ({
      nombre,
      mesasActivas: stats.activas,
      mesasAtendidas: stats.atendidas,
    })).sort((a, b) => b.mesasAtendidas - a.mesasAtendidas);

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reportes/contable
app.get('/api/reportes/contable', async (req, res) => {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [ventas, compras] = await Promise.all([
      prisma.venta.findMany({ where: { createdAt: { gte: inicioMes } } }),
      prisma.compra.findMany({ where: { creadoEn: { gte: inicioMes } } }),
    ]);

    const ventasTotal = ventas.reduce((s, v) => s + v.total, 0);
    const ventasIGV = ventas.reduce((s, v) => s + v.igv, 0);
    const ventasBase = ventas.reduce((s, v) => s + v.subtotal, 0);
    const comprasTotal = compras.reduce((s, c) => s + c.total, 0);
    const comprasIGV = compras.reduce((s, c) => s + c.igv, 0);
    const comprasBase = compras.reduce((s, c) => s + c.baseImponible, 0);

    res.json({
      ventasTotal, ventasIGV, ventasBase,
      comprasTotal, comprasIGV, comprasBase,
      igvAPagar: ventasIGV - comprasIGV,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// INICIO DEL SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Fogón Dorado v3 corriendo en http://localhost:${PORT}`);
});
