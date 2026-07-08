const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const LIMITE_CANCELACION_MS = 5 * 60 * 1000; // 5 minutos

// Categorías que van a la BARRA (el resto va a COCINA)
const BARRA_CATEGORIAS = [
  'Bebidas y Refrescos',
  'Cervezas',
  'Bar y Cocteles',
  'Postres',
];

app.use(cors());
app.use(express.json());

// ============================================================
// ESTADO DEL SERVIDOR
// ============================================================
app.get('/api/status', (req, res) => {
  res.json({ ok: true, mensaje: '🚀 Fogón Dorado Backend v3 funcionando al 100%' });
});

// ============================================================
// CONSULTA RUC/DNI SEGURA (APIsNetPe / Decolecta)
// ============================================================
app.get('/api/clientes/consulta/:doc', async (req, res) => {
  const { doc } = req.params;
  const cleaned = doc.trim();
  
  // Fallbacks rápidos locales para pruebas rápidas en desarrollo
  if (cleaned === '20613857321') {
    return res.json({
      razonSocial: 'FIRST FISH S.A.C.',
      direccion: 'LT. 05 DPTO. LIMA MZ. J COOP. CAJABAMBA - LIMA LIMA LOS OLIVOS',
      tipo: 'Factura'
    });
  } else if (cleaned === '10404040404') {
    return res.json({
      nombre: 'JUAN PEREZ SOTO',
      direccion: 'CALLE SAN MARTÍN 109',
      tipo: 'Boleta'
    });
  }

  const token = process.env.APIS_NET_PE_TOKEN;

  // Si no hay token configurado, proveemos fallbacks dinámicos inteligentes para simulación
  if (!token || token.includes('tu_token') || token === '') {
    const esRuc = cleaned.length === 11;
    if (esRuc) {
      return res.json({
        razonSocial: `DISTRIBUIDORA Y RESTAURANTE ${cleaned} S.A.C. (MOCK)`,
        direccion: `AV. LOS PIONEROS N° ${cleaned.substring(4,7)}, LIMA LIMA LOS OLIVOS`,
        tipo: 'Factura'
      });
    } else {
      return res.json({
        nombre: `CLIENTE DE PRUEBA ${cleaned} (MOCK)`,
        direccion: `CALLE PRINCIPAL N° ${cleaned.substring(3,6)}`,
        tipo: 'Boleta'
      });
    }
  }

  try {
    const isRUC = cleaned.length === 11;
    const apiURL = isRUC 
      ? `https://api.decolecta.com/v1/sunat/ruc?numero=${cleaned}` 
      : `https://api.decolecta.com/v1/reniec/dni?numero=${cleaned}`;
    
    const response = await fetch(apiURL, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Referer': 'https://apis.net.pe/',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      // Mapear al formato consistente que espera el frontend
      if (isRUC) {
        return res.json({
          razonSocial: data.razon_social || '',
          direccion: data.direccion || '',
          tipo: 'Factura'
        });
      } else {
        return res.json({
          nombre: data.full_name || `${data.first_name || ''} ${data.first_last_name || ''} ${data.second_last_name || ''}`.trim() || '',
          direccion: '', // DNI de RENIEC no devuelve dirección de forma pública
          tipo: 'Boleta'
        });
      }
    } else {
      const errorText = await response.text();
      console.warn(`[Proxy Decolecta] Error de respuesta de API (${response.status}): ${errorText}`);
      throw new Error(`API responded with status ${response.status}`);
    }
  } catch (err) {
    console.error("Error en proxy de consulta RUC/DNI:", err);
    const esRuc = cleaned.length === 11;
    res.json({
      razonSocial: '',
      nombre: '',
      direccion: '',
      tipo: esRuc ? 'Factura' : 'Boleta'
    });
  }
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
          itemId: i.id,
          nombre: i.nombre,
          precio: i.precio,
          cant: i.cantidad,
          historial: i.historial,
          entregado: i.entregado,
          categoria: i.producto?.categoria || '',
          pedidoId: p.id,
          notas: i.notas || null,
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

// POST /api/mesas → Crear una nueva mesa
app.post('/api/mesas', async (req, res) => {
  const { numero } = req.body;
  const num = parseInt(numero);

  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'El número de mesa debe ser un número entero positivo.' });
  }

  try {
    const existe = await prisma.mesa.findUnique({ where: { numero: num } });
    if (existe) {
      return res.status(400).json({ error: 'El número de mesa ya está en uso.' });
    }

    const nuevaMesa = await prisma.mesa.create({
      data: { numero: num, estado: 'Libre' }
    });
    res.json(nuevaMesa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mesas/:numero → Modificar el número de una mesa
app.put('/api/mesas/:numero', async (req, res) => {
  const numeroActual = parseInt(req.params.numero);
  const { nuevoNumero } = req.body;
  const nuevoNum = parseInt(nuevoNumero);

  if (isNaN(nuevoNum) || nuevoNum <= 0) {
    return res.status(400).json({ error: 'El nuevo número de mesa debe ser un número entero positivo.' });
  }

  try {
    const mesa = await prisma.mesa.findUnique({
      where: { numero: numeroActual },
      include: { Pedidos: { where: { estado: { in: ['Cocina', 'Servido'] } } } }
    });

    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada.' });

    if (mesa.estado !== 'Libre' || mesa.Pedidos.length > 0) {
      return res.status(400).json({ error: 'No se puede modificar el número de una mesa con comandas activas.' });
    }

    if (numeroActual !== nuevoNum) {
      const existe = await prisma.mesa.findUnique({ where: { numero: nuevoNum } });
      if (existe) {
        return res.status(400).json({ error: 'El nuevo número de mesa ya está en uso.' });
      }
    }

    const mesaActualizada = await prisma.mesa.update({
      where: { numero: numeroActual },
      data: { numero: nuevoNum }
    });
    res.json(mesaActualizada);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mesas/:numero → Eliminar una mesa
app.delete('/api/mesas/:numero', async (req, res) => {
  const numero = parseInt(req.params.numero);

  try {
    const mesa = await prisma.mesa.findUnique({
      where: { numero },
      include: { Pedidos: { where: { estado: { in: ['Cocina', 'Servido'] } } } }
    });

    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada.' });

    if (mesa.estado !== 'Libre' || mesa.Pedidos.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una mesa con comandas activas.' });
    }

    await prisma.mesa.delete({ where: { numero } });
    res.json({ ok: true, mensaje: `Mesa ${numero} eliminada correctamente.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mesas/:num/unir → Unir una mesa a otra principal
app.post('/api/mesas/:num/unir', async (req, res) => {
  try {
    const numPrincipal = parseInt(req.params.num);
    const { numeroMesaAUnir } = req.body;

    if (!numeroMesaAUnir) {
      return res.status(400).json({ error: 'Debe especificar el número de mesa a unir.' });
    }

    const numUnir = parseInt(numeroMesaAUnir);

    // Buscar ambas mesas
    const mesaPrincipal = await prisma.mesa.findUnique({ where: { numero: numPrincipal } });
    const mesaAUnir = await prisma.mesa.findUnique({ where: { numero: numUnir } });

    if (!mesaPrincipal || !mesaAUnir) {
      return res.status(404).json({ error: 'Mesa principal o mesa a unir no encontrada.' });
    }

    if (mesaAUnir.estado !== 'Libre') {
      return res.status(400).json({ error: `La mesa ${numUnir} no está libre (estado: ${mesaAUnir.estado}).` });
    }

    // Unir mesa (cambiar estado a "Unida a Mesa X")
    await prisma.mesa.update({
      where: { id: mesaAUnir.id },
      data: { estado: `Unida a Mesa ${numPrincipal}` },
    });

    res.json({ ok: true, mensaje: `Mesa ${numUnir} unida con éxito a Mesa ${numPrincipal}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mesas/:num/separar → Separar todas las mesas unidas a esta
app.post('/api/mesas/:num/separar', async (req, res) => {
  try {
    const numPrincipal = parseInt(req.params.num);

    // Liberar todas las mesas unidas a esta mesa principal
    await prisma.mesa.updateMany({
      where: { estado: `Unida a Mesa ${numPrincipal}` },
      data: { estado: 'Libre' },
    });

    res.json({ ok: true, mensaje: `Mesas unidas a la Mesa ${numPrincipal} han sido separadas.` });
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

    // Control de concurrencia: Evitar comandas adicionales en mesas que ya fueron cobradas/liberadas
    if (adicional) {
      const activeCount = await prisma.pedido.count({
        where: { mesaId: mesa.id, estado: { in: ['Cocina', 'Servido'] } }
      });
      if (activeCount === 0) {
        return res.status(400).json({ 
          error: 'Esta mesa ya ha sido cobrada y liberada por caja. Por favor, vuelve a abrir la mesa antes de comandar.' 
        });
      }
    }

    const itemsNuevos = items.filter(i => !i.historial);

    const pedido = await prisma.pedido.create({
      data: {
        mesaId: parseInt(mesa.id),
        mesero: String(mesero),
        total: parseFloat(total),
        adicional: adicional || false,
        estado: 'Cocina',
        items: {
          create: itemsNuevos.map(i => ({
            productoId: parseInt(i.id),
            nombre: String(i.nombre),
            precio: parseFloat(i.precio),
            cantidad: parseInt(i.cant),
            historial: false,
            notas: i.notas ? String(i.notas) : null,
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
        .filter(i => !i.historial && !BARRA_CATEGORIAS.includes(i.producto?.categoria))
        .map(i => ({
          id: i.id,
          nombre: i.nombre,
          cant: i.cantidad,
          categoria: i.producto?.categoria || '',
          notas: i.notas || null,
        })),
    })).filter(p => p.items.length > 0); // Ocultar si solo tiene bebidas

    res.json(formateados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pedidos/barra → Todos los pedidos con bebidas pendientes en Cocina
app.get('/api/pedidos/barra', async (req, res) => {
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
      // Barra solo ve items de categorías de barra que no se han despachado (historial === false)
      items: p.items
        .filter(i => !i.historial && BARRA_CATEGORIAS.includes(i.producto?.categoria))
        .map(i => ({
          nombre: i.nombre,
          cant: i.cantidad,
          categoria: i.producto?.categoria || '',
          notas: i.notas || null,
        })),
    })).filter(p => p.items.length > 0);

    res.json(formateados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pedidos/items/:itemId/preparar → Cocinero o Barman marca listo un item de cocina/barra de forma individual
app.patch('/api/pedidos/items/:itemId/preparar', async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  try {
    const item = await prisma.itemPedido.update({
      where: { id: itemId },
      data: { historial: true },
      include: { pedido: { include: { items: true } } },
    });

    const todosListos = item.pedido.items.every(i => i.historial === true);
    if (todosListos) {
      const ped = await prisma.pedido.update({
        where: { id: item.pedidoId },
        data: { estado: 'Servido' },
        include: { mesa: true },
      });

      if (ped.mesaId && ped.tipoEntrega === 'salon') {
        const enCocina = await prisma.pedido.count({
          where: { mesaId: ped.mesaId, estado: 'Cocina' },
        });
        if (enCocina === 0) {
          await prisma.mesa.update({
            where: { id: ped.mesaId },
            data: { estado: 'Servido' },
          });
        }
      }
    }

    res.json({ ok: true, todosListos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pedidos/:id/preparar → Cocinero o Barman marca listo su sección
app.patch('/api/pedidos/:id/preparar', async (req, res) => {
  const id = parseInt(req.params.id);
  const { seccion } = req.body; // "cocina" o "barra"

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { items: { include: { producto: true } } },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Filtrar los items que corresponden a la sección
    const itemsAActualizar = pedido.items.filter(i => {
      const esItemBarra = BARRA_CATEGORIAS.includes(i.producto?.categoria);
      if (seccion === 'barra') return esItemBarra;
      if (seccion === 'cocina') return !esItemBarra;
      return false;
    });

    // Marcar items como historial
    await prisma.itemPedido.updateMany({
      where: { id: { in: itemsAActualizar.map(item => item.id) } },
      data: { historial: true },
    });

    // Volver a consultar para validar si todos los items del pedido ya están listos
    const pedidoActualizado = await prisma.pedido.findUnique({
      where: { id },
      include: { items: true },
    });

    const todosListos = pedidoActualizado.items.every(i => i.historial === true);
    if (todosListos) {
      const ped = await prisma.pedido.update({
        where: { id },
        data: { estado: 'Servido' },
        include: { mesa: true },
      });

      // Si es pedido de salón, verificar si la mesa puede pasar a Servido
      if (ped.mesaId && ped.tipoEntrega === 'salon') {
        const enCocina = await prisma.pedido.count({
          where: { mesaId: ped.mesaId, estado: 'Cocina' },
        });
        if (enCocina === 0) {
          await prisma.mesa.update({
            where: { id: ped.mesaId },
            data: { estado: 'Servido' },
          });
        }
      }
    }

    res.json({ ok: true, todosListos });
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

// PATCH /api/pedidos/items/:itemId/entregar → Mozo marca un plato de cocina como entregado en la mesa
app.patch('/api/pedidos/items/:itemId/entregar', async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  try {
    await prisma.itemPedido.update({
      where: { id: itemId },
      data: { entregado: true },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pedidos/:id/entregar-todo → Mozo marca todos los platos listos de cocina del pedido como entregados
app.patch('/api/pedidos/:id/entregar-todo', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: { items: { include: { producto: true } } },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Filtrar items que son de Cocina (no barra) y están listos (historial: true) pero no entregados
    const itemsAActualizar = pedido.items.filter(i => 
      i.historial && 
      !i.entregado && 
      !BARRA_CATEGORIAS.includes(i.producto?.categoria)
    );

    if (itemsAActualizar.length > 0) {
      await prisma.itemPedido.updateMany({
        where: { id: { in: itemsAActualizar.map(item => item.id) } },
        data: { entregado: true },
      });
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
  const { canceladoPor, motivo, force } = req.body;

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true } },
        mesa: true,
      },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });

    // Si no es una cancelación forzada por supervisor, aplicar filtros normales
    if (!force) {
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

    let mesaLiberada = false;
    let nuevoEstadoMesa = 'Libre';

    // Liberar mesa si no quedan pedidos activos o actualizar su estado
    if (pedido.mesaId) {
      const activos = await prisma.pedido.findMany({
        where: { mesaId: pedido.mesaId, estado: { in: ['Cocina', 'Servido'] } },
      });
      
      if (activos.length === 0) {
        await prisma.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: 'Libre' },
        });
        mesaLiberada = true;
      } else {
        // Si hay al menos un pedido activo en Cocina, la mesa debe quedarse en Cocina.
        // Si todos los activos están en Servido, pasa a Servido (Azul).
        const hayEnCocina = activos.some(p => p.estado === 'Cocina');
        nuevoEstadoMesa = hayEnCocina ? 'Cocina' : 'Servido';
        
        await prisma.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: nuevoEstadoMesa },
        });
      }
    }

    res.json({ ok: true, mesaLiberada, nuevoEstadoMesa });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/pedidos/:id/cancelar-item', async (req, res) => {
  const id = parseInt(req.params.id);
  const { productoId, cantidadACancelar, motivo, canceladoPor, force } = req.body;

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        items: { include: { producto: true } },
        mesa: true,
      },
    });

    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });

    // Si no es una cancelación forzada por supervisor, aplicar filtros normales
    if (!force) {
      if (pedido.estado !== 'Cocina') {
        return res.status(400).json({
          error: 'Este pedido ya no puede modificarse. Solo se cancelan ítems de pedidos en estado "Cocina".',
        });
      }

      const elapsed = Date.now() - new Date(pedido.createdAt).getTime();
      if (elapsed > LIMITE_CANCELACION_MS) {
        return res.status(400).json({
          error: 'El tiempo límite de 5 minutos para cancelar ha expirado. Consulta con el administrador.',
        });
      }
    }

    const item = force 
      ? pedido.items.find(i => String(i.productoId) === String(productoId))
      : pedido.items.find(i => String(i.productoId) === String(productoId) && !i.historial);
      
    if (!item) return res.status(404).json({ error: 'El ítem seleccionado no se encuentra en la comanda activa.' });

    if (cantidadACancelar > item.cantidad) {
      return res.status(400).json({ error: 'La cantidad a cancelar supera la cantidad pedida.' });
    }

    // Calcular nueva cantidad
    const nuevaCantidad = item.cantidad - cantidadACancelar;

    // Restaurar stock
    if (item.producto.tipoStock === 'limitado') {
      await prisma.producto.update({
        where: { id: item.productoId },
        data: { stock: { increment: cantidadACancelar } },
      });
    }

    const esUltimoItem = pedido.items.length === 1 && cantidadACancelar === item.cantidad;

    // Declarar en el scope externo para que esté disponible en el res.json final
    let itemsRestantes = [];

    if (esUltimoItem) {
      // Treat as a complete cancelation of the comanda!
      await prisma.pedido.update({
        where: { id },
        data: {
          estado: 'Cancelado',
          canceladoPor: canceladoPor || 'Sin especificar',
          motivoCancela: motivo || 'Cancelación completa de ítems',
          canceladoEn: new Date(),
        },
      });
      // itemsRestantes queda [] — el pedido se canceló por completo
    } else {
      if (nuevaCantidad === 0) {
        // Eliminar el ítem del pedido
        await prisma.itemPedido.delete({ where: { id: item.id } });
      } else {
        // Actualizar cantidad
        await prisma.itemPedido.update({
          where: { id: item.id },
          data: { cantidad: nuevaCantidad },
        });
      }

      // Recalcular total del pedido
      itemsRestantes = await prisma.itemPedido.findMany({
        where: { pedidoId: id },
      });

      const nuevoTotal = itemsRestantes.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);

      if (itemsRestantes.length === 0) {
        // Fallback: Si no quedan ítems, cancelamos todo el pedido
        await prisma.pedido.update({
          where: { id },
          data: {
            estado: 'Cancelado',
            canceladoPor: canceladoPor || 'Sin especificar',
            motivoCancela: motivo || 'Cancelación completa de ítems',
            canceladoEn: new Date(),
            total: 0,
          },
        });
      } else {
        // Actualizar total
        await prisma.pedido.update({
          where: { id },
          data: { total: nuevoTotal },
        });
      }
    }

    let mesaLiberada = false;
    let nuevoEstadoMesa = 'Libre';

    if (pedido.mesaId) {
      const activos = await prisma.pedido.findMany({
        where: { mesaId: pedido.mesaId, estado: { in: ['Cocina', 'Servido'] } },
      });

      if (activos.length === 0) {
        const mObj = await prisma.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: 'Libre' },
        });
        // Liberar automáticamente las mesas que estaban unidas a esta
        await prisma.mesa.updateMany({
          where: { estado: `Unida a Mesa ${mObj.numero}` },
          data: { estado: 'Libre' },
        });
        mesaLiberada = true;
      } else {
        const hayEnCocina = activos.some(p => p.estado === 'Cocina');
        nuevoEstadoMesa = hayEnCocina ? 'Cocina' : 'Servido';
        await prisma.mesa.update({
          where: { id: pedido.mesaId },
          data: { estado: nuevoEstadoMesa },
        });
      }
    }

    res.json({ ok: true, mesaLiberada, nuevoEstadoMesa, pedidoVacio: itemsRestantes.length === 0 });
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
        mesero: String(cajero),
        total: parseFloat(total),
        estado: 'Cocina',
        tipoEntrega: 'llevar',
        codigoPedidosYa: codigoPedidosYa ? String(codigoPedidosYa) : null,
        items: {
          create: items.map(i => ({
            productoId: parseInt(i.id),
            nombre: String(i.nombre),
            precio: parseFloat(i.precio),
            cantidad: parseInt(i.cant),
            historial: false,
            notas: i.notas ? String(i.notas) : null,
          })),
        },
      },
    });

    // Descontar stock limitado
    for (const item of items) {
      await prisma.producto.updateMany({
        where: { id: parseInt(item.id), tipoStock: 'limitado' },
        data: { stock: { decrement: parseInt(item.cant) } },
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
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });

    // Obtener todas las ofertas activas (y que estén en su rango de fecha si se especificó)
    const ahora = new Date();
    const ofertasActivas = await prisma.oferta.findMany({
      where: {
        activa: true,
        OR: [
          { fechaInicio: null },
          { fechaInicio: { lte: ahora } }
        ],
        AND: [
          { OR: [
            { fechaFin: null },
            { fechaFin: { gte: ahora } }
          ]}
        ]
      }
    });

    // Enriquecer cada producto con precioOferta si hay oferta activa para su categoría
    const productosEnriquecidos = productos.map(p => {
      const oferta = ofertasActivas.find(o => o.categorias.includes(p.categoria));
      if (oferta) {
        let precioOferta;
        if (oferta.tipoDescuento === 'porcentaje') {
          precioOferta = parseFloat((p.precio * (1 - oferta.valorDescuento / 100)).toFixed(2));
        } else {
          precioOferta = parseFloat((p.precio - oferta.valorDescuento).toFixed(2));
        }
        return { 
          ...p, 
          precioOferta: Math.max(0, precioOferta),
          ofertaNombre: oferta.nombre,
          ofertaTipo: oferta.tipoDescuento,
          ofertaValor: oferta.valorDescuento,
        };
      }
      return { ...p, precioOferta: null, ofertaNombre: null };
    });

    res.json(productosEnriquecidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, categoria, precio, tipoStock, stock } = req.body;
    const prod = await prisma.producto.create({
      data: {
        nombre: String(nombre),
        categoria: String(categoria),
        precio: parseFloat(precio),
        tipoStock: tipoStock ? String(tipoStock) : 'ilimitado',
        stock: stock ? parseInt(stock) : 0,
      }
    });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  try {
    const data = {};
    if (req.body.nombre !== undefined) data.nombre = String(req.body.nombre);
    if (req.body.categoria !== undefined) data.categoria = String(req.body.categoria);
    if (req.body.precio !== undefined) data.precio = parseFloat(req.body.precio);
    if (req.body.tipoStock !== undefined) data.tipoStock = String(req.body.tipoStock);
    if (req.body.stock !== undefined) data.stock = parseInt(req.body.stock);
    if (req.body.activo !== undefined) data.activo = Boolean(req.body.activo);

    const prod = await prisma.producto.update({
      where: { id: parseInt(req.params.id) },
      data,
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
// OFERTAS POR TEMPORADA
// ============================================================

// GET /api/ofertas → Listar todas las ofertas
app.get('/api/ofertas', async (req, res) => {
  try {
    const ofertas = await prisma.oferta.findMany({ orderBy: { creadoEn: 'desc' } });
    res.json(ofertas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ofertas → Crear nueva oferta (solo Admin)
app.post('/api/ofertas', async (req, res) => {
  try {
    const { nombre, descripcion, tipoDescuento, valorDescuento, categorias, activa, fechaInicio, fechaFin, creadoPor } = req.body;
    if (!nombre || !tipoDescuento || valorDescuento == null || !categorias || !creadoPor) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, tipoDescuento, valorDescuento, categorias, creadoPor' });
    }
    const oferta = await prisma.oferta.create({
      data: {
        nombre: String(nombre),
        descripcion: descripcion ? String(descripcion) : null,
        tipoDescuento: String(tipoDescuento),
        valorDescuento: parseFloat(valorDescuento),
        categorias: Array.isArray(categorias) ? categorias.map(String) : [],
        activa: Boolean(activa),
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        creadoPor: String(creadoPor),
      }
    });
    res.json(oferta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ofertas/:id → Editar oferta
app.put('/api/ofertas/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = {};
    if (req.body.nombre !== undefined) data.nombre = String(req.body.nombre);
    if (req.body.descripcion !== undefined) data.descripcion = req.body.descripcion ? String(req.body.descripcion) : null;
    if (req.body.tipoDescuento !== undefined) data.tipoDescuento = String(req.body.tipoDescuento);
    if (req.body.valorDescuento !== undefined) data.valorDescuento = parseFloat(req.body.valorDescuento);
    if (req.body.categorias !== undefined) data.categorias = Array.isArray(req.body.categorias) ? req.body.categorias.map(String) : [];
    if (req.body.fechaInicio !== undefined) data.fechaInicio = req.body.fechaInicio ? new Date(req.body.fechaInicio) : null;
    if (req.body.fechaFin !== undefined) data.fechaFin = req.body.fechaFin ? new Date(req.body.fechaFin) : null;
    const oferta = await prisma.oferta.update({ where: { id }, data });
    res.json(oferta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ofertas/:id/activar → Activar o desactivar oferta
app.patch('/api/ofertas/:id/activar', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { activa } = req.body;
    const oferta = await prisma.oferta.update({
      where: { id },
      data: { activa: Boolean(activa) }
    });
    res.json({ ok: true, activa: oferta.activa, nombre: oferta.nombre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ofertas/:id → Eliminar oferta
app.delete('/api/ofertas/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.oferta.delete({ where: { id } });
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
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    // Validar PIN único
    const duplicate = await prisma.usuario.findFirst({
      where: { pin: String(req.body.pin), activo: true }
    });
    if (duplicate) {
      return res.status(400).json({ error: 'Este PIN ya está asignado a otro empleado. Elige uno diferente.' });
    }

    const { nombre, rol, pin, permisos } = req.body;
    const user = await prisma.usuario.create({
      data: {
        nombre: String(nombre),
        rol: String(rol),
        pin: String(pin),
        permisos: Array.isArray(permisos) ? permisos.map(String) : [],
      }
    });
    const { pin: userPin, ...seguro } = user;
    res.json(seguro);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    if (req.body.pin) {
      const duplicate = await prisma.usuario.findFirst({
        where: { pin: String(req.body.pin), activo: true, id: { not: id } }
      });
      if (duplicate) {
        return res.status(400).json({ error: 'Este PIN ya está asignado a otro empleado. Elige uno diferente.' });
      }
    }

    const data = {};
    if (req.body.nombre !== undefined) data.nombre = String(req.body.nombre);
    if (req.body.rol !== undefined) data.rol = String(req.body.rol);
    if (req.body.pin !== undefined) data.pin = String(req.body.pin);
    if (req.body.permisos !== undefined) data.permisos = Array.isArray(req.body.permisos) ? req.body.permisos.map(String) : [];
    if (req.body.activo !== undefined) data.activo = Boolean(req.body.activo);

    const user = await prisma.usuario.update({
      where: { id },
      data
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios/login', async (req, res) => {
  const { pin } = req.body;
  try {
    const user = await prisma.usuario.findFirst({
      where: { pin, activo: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'PIN incorrecto. Inténtalo de nuevo.' });
    }
    const { pin: userPin, ...safeUser } = user;
    res.json({ ok: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios/validate-auth', async (req, res) => {
  const { pin } = req.body;
  try {
    const user = await prisma.usuario.findFirst({
      where: { pin, activo: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'PIN incorrecto.' });
    }
    // Solo Administrador o Cajero pueden autorizar cancelaciones/cortesías
    const rolesAutorizados = ['Administrador', 'Cajero'];
    if (!rolesAutorizados.includes(user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere PIN de Administrador o Cajero.' });
    }
    res.json({ ok: true, nombre: user.nombre, rol: user.rol });
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
  const { pedidoId, pedidoIds, tipoComprobante, numDocumento, nombreCliente, total, metodoPago, clienteDireccion, ofertaDescripcion, descuentoAplicado } = req.body;
  const idsAPagar = pedidoIds || [pedidoId];
  const idPrincipal = idsAPagar[idsAPagar.length - 1]; // El más reciente como venta principal

  try {
    const finalTotal = metodoPago === 'Cortesía' ? 0.00 : total;
    const subtotal = parseFloat((finalTotal / 1.18).toFixed(2));
    const igv = parseFloat((finalTotal - subtotal).toFixed(2));

    // Mover todos los items de los otros pedidos adicionales al pedido principal para que se consoliden en el detalle de la venta
    if (idsAPagar.length > 1) {
      const otrosIds = idsAPagar.filter(id => id !== idPrincipal);
      await prisma.itemPedido.updateMany({
        where: { pedidoId: { in: otrosIds } },
        data: { pedidoId: idPrincipal },
      });
    }

    // Calcular correlativo para apisunat.pe si es Boleta o Factura
    let serie = null;
    let numero = null;
    if (tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') {
      const ultimaVenta = await prisma.venta.findFirst({
        where: { tipoComprobante, numero: { not: null } },
        orderBy: { numero: 'desc' }
      });
      serie = tipoComprobante === 'Factura' ? 'F001' : 'B001';
      numero = ultimaVenta ? (ultimaVenta.numero + 1) : 1;
    }

    // Crear Venta principal (inicialmente PENDIENTE si es factura/boleta)
    const initEstadoSunat = (tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') ? 'PENDIENTE' : 'NO_APLICA';

    const venta = await prisma.venta.create({
      data: { 
        pedidoId: idPrincipal, 
        tipoComprobante, 
        numDocumento, 
        nombreCliente: metodoPago === 'Cortesía' ? (nombreCliente || 'CONSUMO PERSONAL / CORTESÍA') : nombreCliente, 
        total: finalTotal, 
        igv, 
        subtotal, 
        metodoPago,
        estadoNubefact: initEstadoSunat,
        estadoSunat: initEstadoSunat,
        serie,
        numero,
        ofertaDescripcion: ofertaDescripcion ? String(ofertaDescripcion) : null,
        descuentoAplicado: descuentoAplicado ? parseFloat(descuentoAplicado) : 0,
      },
    });

    // Marcar TODOS los pedidos de la mesa como Cobrado
    await prisma.pedido.updateMany({
      where: { id: { in: idsAPagar } },
      data: { estado: 'Cobrado' },
    });

    // Liberar la mesa
    const pedidoPrincipal = await prisma.pedido.findUnique({ where: { id: idsAPagar[0] } });
    if (pedidoPrincipal?.mesaId) {
      const mObj = await prisma.mesa.update({
        where: { id: pedidoPrincipal.mesaId },
        data: { estado: 'Libre' },
      });
      // Liberar automáticamente las mesas que estaban unidas a esta
      await prisma.mesa.updateMany({
        where: { estado: `Unida a Mesa ${mObj.numero}` },
        data: { estado: 'Libre' },
      });
    }

    // Si es Boleta o Factura, intentamos enviar a apisunat.pe
    if (tipoComprobante === 'Boleta' || tipoComprobante === 'Factura') {
      try {
        const pedidoConItems = await prisma.pedido.findUnique({
          where: { id: idPrincipal },
          include: { items: true }
        });

        // Llamar a apisunat.pe
        const response = await enviarAApisunat({ ...venta, clienteDireccion }, pedidoConItems.items);
        
        // Mapear respuesta para compatibilidad con el front
        const mappedData = {
          serie: venta.serie,
          numero: venta.numero,
          key: response.payload?.hash || '',
          enlace_del_pdf: response.payload?.pdf?.ticket || response.payload?.pdf?.a4 || '',
          cadena_para_codigo_qr: `20496009259|${venta.tipoComprobante === 'Factura' ? '01' : '03'}|${venta.serie}|${String(venta.numero).padStart(4, '0')}|${venta.igv.toFixed(2)}|${venta.total.toFixed(2)}|${new Intl.DateTimeFormat('es-PE', {timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(venta.createdAt))}|${venta.tipoComprobante === 'Factura' ? '6' : (venta.numDocumento?.length === 8 ? '1' : '0')}|${venta.numDocumento || '00000000'}|${response.payload?.hash || ''}`
        };

        const strAceptado = `ACEPTADO:${JSON.stringify(mappedData)}`;

        // Si tiene éxito, actualizamos a ACEPTADO y guardamos la respuesta
        const ventaActualizada = await prisma.venta.update({
          where: { id: venta.id },
          data: { 
            estadoNubefact: strAceptado,
            estadoSunat: strAceptado,
            urlPdf: mappedData.enlace_del_pdf,
            urlXml: response.payload?.xml || null
          }
        });

        return res.json({ 
          ok: true, 
          ventaId: venta.id, 
          estadoNubefact: ventaActualizada.estadoSunat,
          serie: venta.serie,
          numero: venta.numero
        });
      } catch (sunatErr) {
        console.error("⚠️ Error al facturar con apisunat.pe. Entrando en modo contingencia (Offline-First):", sunatErr.message);

        // Guardar estado de contingencia
        const ventaActualizada = await prisma.venta.update({
          where: { id: venta.id },
          data: { 
            estadoNubefact: 'PENDIENTE_REINTENTO',
            estadoSunat: 'PENDIENTE_REINTENTO'
          }
        });

        // Retornamos éxito al POS para liberar la mesa sin trabas e indicando contingencia
        return res.json({ 
          ok: true, 
          ventaId: venta.id, 
          estadoNubefact: ventaActualizada.estadoSunat,
          serie: venta.serie,
          numero: venta.numero,
          contingencia: true,
          mensaje: "Comprobante emitido en contingencia. El envío a la SUNAT se completará automáticamente en segundo plano."
        });
      }
    }

    res.json({ ok: true, ventaId: venta.id, estadoNubefact: initEstadoSunat, serie: null, numero: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/ventas → Historial detallado de las ventas del día o rango de fechas (hora Perú)
app.get('/api/ventas', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let filtroFecha = {};
    if (desde && hasta) {
      filtroFecha = { gte: new Date(desde + 'T00:00:00.000-05:00'), lte: new Date(hasta + 'T23:59:59.999-05:00') };
    } else {
      const ahora = new Date();
      const hoyPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      hoyPeru.setHours(0, 0, 0, 0);
      const inicioUTC = new Date(hoyPeru.getTime() + 5 * 60 * 60 * 1000);
      filtroFecha = { gte: inicioUTC };
    }

    const ventas = await prisma.venta.findMany({
      where: { createdAt: filtroFecha },
      include: {
        pedido: {
          include: {
            items: true,
            mesa: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formateadas = ventas.map(v => ({
      id: v.id,
      pedidoId: v.pedidoId,
      tipoComprobante: v.tipoComprobante,
      numDocumento: v.numDocumento,
      nombreCliente: v.nombreCliente,
      total: v.total,
      igv: v.igv,
      subtotal: v.subtotal,
      metodoPago: v.metodoPago,
      hora: v.createdAt.toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      }),
      mesaNum: v.pedido?.mesa?.numero || null,
      codigoPedidosYa: v.pedido?.codigoPedidosYa || null,
      tipoEntrega: v.pedido?.tipoEntrega || 'salon',
      createdAt: v.createdAt.toISOString(),
      estadoNubefact: v.estadoNubefact,
      serie: v.serie,
      numero: v.numero,
      itemsResumen: v.pedido?.items?.map(i => `${i.cantidad}x ${i.nombre}`).join(', ') || '',

      items: v.pedido?.items?.map(i => ({
        nombre: i.nombre,
        cant: i.cantidad,
        precio: i.precio
      })) || [],
    }));

    res.json(formateadas);
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
  const { desde, hasta } = req.query;
  try {
    let filtroFecha = {};
    if (desde && hasta) {
      filtroFecha = { gte: new Date(desde + 'T00:00:00.000-05:00'), lte: new Date(hasta + 'T23:59:59.999-05:00') };
    } else {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      filtroFecha = { gte: inicioMes };
    }
    const compras = await prisma.compra.findMany({
      where: { creadoEn: filtroFecha },
      orderBy: { creadoEn: 'desc' },
    });
    res.json(compras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compras/stats → KPIs del mes actual
app.get('/api/compras/stats', async (req, res) => {
  try {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const compras = await prisma.compra.findMany({
      where: { creadoEn: { gte: inicioMes } },
    });

    const totalGastado = compras.reduce((s, c) => s + c.total, 0);
    const totalIGV = compras.reduce((s, c) => s + c.igv, 0);
    const numFacturas = compras.length;

    // Top proveedor
    const porProveedor = {};
    compras.forEach(c => {
      porProveedor[c.proveedor] = (porProveedor[c.proveedor] || 0) + c.total;
    });
    const topProveedor = Object.entries(porProveedor).sort((a, b) => b[1] - a[1])[0];

    // Breakdown por categoría
    const porCategoria = {};
    compras.forEach(c => {
      const cat = c.categoria || 'Sin Categoría';
      porCategoria[cat] = (porCategoria[cat] || 0) + c.total;
    });

    res.json({
      totalGastado,
      totalIGV,
      numFacturas,
      topProveedor: topProveedor ? { nombre: topProveedor[0], total: topProveedor[1] } : null,
      porCategoria,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compras/sincronizar-sunat → Proxy seguro a apisunat.pe
// Modo demo: si APISUNAT_TOKEN no está configurado, retorna datos de ejemplo reales.
app.post('/api/compras/sincronizar-sunat', async (req, res) => {
  const { periodo, fechaInicio, fechaFin } = req.body;
  const token = process.env.APISUNAT_TOKEN;
  const MODO_DEMO = !token || token.includes('tu_token') || token === '';

  // Datos de demo basados en la respuesta real de la documentación oficial de apisunat.pe
  const DEMO_ITEMS = [
    {
      emisor: { ruc: '10061488176', razon_social: 'AGUILA ULLOA EFRAIN VICTOR' },
      detalle: {
        tipo_comprobante: '01', nombre_comprobante: 'Factura Electrónica',
        serie: 'E001', numero: '88', fecha_emision: '2025-12-01', estado_comprobante: 'Aceptado',
      },
      totales: { total_grav_oner: '438.98', total_igv: '79.02', monto_total_general: '518.00' },
      url_descarga: {
        pdf: 'https://apisunat.pe/rce/document/pdf/10061488176-01-E001-88',
        xml: 'https://apisunat.pe/rce/document/xml/10061488176-01-E001-88',
      },
    },
    {
      emisor: { ruc: '10080275973', razon_social: 'REYES MARIÑOS DE ZEGARRA YSABEL' },
      detalle: {
        tipo_comprobante: '01', nombre_comprobante: 'Factura Electrónica',
        serie: 'FF01', numero: '693', fecha_emision: '2025-12-01', estado_comprobante: 'Aceptado',
      },
      totales: { total_grav_oner: '667.46', total_igv: '120.14', monto_total_general: '787.60' },
      url_descarga: {
        pdf: 'https://apisunat.pe/rce/document/pdf/10080275973-01-FF01-693',
        xml: 'https://apisunat.pe/rce/document/xml/10080275973-01-FF01-693',
      },
    },
    {
      emisor: { ruc: '20601245789', razon_social: 'DISTRIBUIDORA ALIMENTOS & INSUMOS S.A.C.' },
      detalle: {
        tipo_comprobante: '01', nombre_comprobante: 'Factura Electrónica',
        serie: 'F001', numero: '2145', fecha_emision: '2025-12-03', estado_comprobante: 'Aceptado',
      },
      totales: { total_grav_oner: '1186.44', total_igv: '213.56', monto_total_general: '1400.00' },
      url_descarga: {
        pdf: 'https://apisunat.pe/rce/document/pdf/20601245789-01-F001-2145',
        xml: 'https://apisunat.pe/rce/document/xml/20601245789-01-F001-2145',
      },
    },
    {
      emisor: { ruc: '20100128056', razon_social: 'BACKUS Y JOHNSTON S.A.A.' },
      detalle: {
        tipo_comprobante: '01', nombre_comprobante: 'Factura Electrónica',
        serie: 'F001', numero: '98443', fecha_emision: '2025-12-05', estado_comprobante: 'Aceptado',
      },
      totales: { total_grav_oner: '423.73', total_igv: '76.27', monto_total_general: '500.00' },
      url_descarga: {
        pdf: 'https://apisunat.pe/rce/document/pdf/20100128056-01-F001-98443',
        xml: 'https://apisunat.pe/rce/document/xml/20100128056-01-F001-98443',
      },
    },
  ];

  try {
    let itemsParaProcesar = [];

    if (MODO_DEMO) {
      itemsParaProcesar = DEMO_ITEMS;
    } else {
      // Llamada real a apisunat.pe con paginación
      const params = new URLSearchParams();
      if (periodo) params.set('period', periodo);
      if (fechaInicio) params.set('start_date', fechaInicio);
      if (fechaFin) params.set('end_date', fechaFin);
      params.set('page', '1');

      const resp = await fetch(`https://dev.apisunat.pe/api/v1/sunat/rce?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
      });

      if (!resp.ok) {
        const txt = await resp.text();
        return res.status(resp.status).json({ error: `apisunat.pe respondió con ${resp.status}: ${txt}` });
      }

      const data = await resp.json();
      itemsParaProcesar = (data.payload?.items) || [];
    }

    // Mapear tipo_comprobante a nombre legible
    const TIPOS = { '01': 'Factura', '03': 'Boleta', '07': 'Nota de Crédito', '08': 'Nota de Débito' };

    let importadas = 0;
    let duplicadas = 0;

    for (const item of itemsParaProcesar) {
      const serieNumero = `${item.detalle.serie}-${item.detalle.numero}`;

      // Verificar duplicado por serieNumero + RUC del emisor
      const existe = await prisma.compra.findFirst({
        where: { serieNumero, ruc: item.emisor.ruc },
      });

      if (existe) {
        duplicadas++;
        continue;
      }

      const baseImponible = parseFloat(item.totales.total_grav_oner || 0);
      const igv = parseFloat(item.totales.total_igv || 0);
      const total = parseFloat(item.totales.monto_total_general || 0);
      const tipoDoc = TIPOS[item.detalle.tipo_comprobante] || 'Factura';
      const fechaEmision = item.detalle.fecha_emision ? new Date(item.detalle.fecha_emision + 'T00:00:00.000-05:00') : null;

      await prisma.compra.create({
        data: {
          proveedor: item.emisor.razon_social,
          ruc: item.emisor.ruc,
          tipoDocumento: tipoDoc,
          serieNumero,
          baseImponible,
          igv,
          total,
          origenCarga: MODO_DEMO ? 'demo' : 'sunat',
          fechaEmision,
          urlPdf: item.url_descarga?.pdf || null,
          urlXml: item.url_descarga?.xml || null,
        },
      });

      importadas++;
    }

    res.json({
      ok: true,
      modoDemo: MODO_DEMO,
      importadas,
      duplicadas,
      total: importadas + duplicadas,
      mensaje: MODO_DEMO
        ? `✅ MODO DEMO: ${importadas} facturas de ejemplo importadas desde la documentación de apisunat.pe. (${duplicadas} ya existían)`
        : `✅ ${importadas} facturas importadas desde SUNAT. (${duplicadas} ya existían)`,
    });
  } catch (err) {
    console.error('[Sync SUNAT]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/compras', async (req, res) => {
  try {
    const { proveedor, ruc, tipoDocumento, serieNumero, baseImponible, igv, total, xmlData, origenCarga, categoria, fechaEmision } = req.body;
    const compra = await prisma.compra.create({
      data: {
        proveedor: String(proveedor),
        ruc: ruc ? String(ruc) : null,
        tipoDocumento: tipoDocumento ? String(tipoDocumento) : 'Factura',
        serieNumero: serieNumero ? String(serieNumero) : null,
        baseImponible: parseFloat(baseImponible),
        igv: parseFloat(igv),
        total: parseFloat(total),
        xmlData: xmlData ? String(xmlData) : null,
        origenCarga: origenCarga ? String(origenCarga) : 'manual',
        categoria: categoria ? String(categoria) : null,
        fechaEmision: fechaEmision ? new Date(fechaEmision) : null,
      }
    });
    res.json(compra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/compras/:id/categoria → Actualizar categoría de una compra
app.patch('/api/compras/:id/categoria', async (req, res) => {
  const { id } = req.params;
  const { categoria } = req.body;
  try {
    const compra = await prisma.compra.update({
      where: { id: parseInt(id) },
      data: { categoria: categoria ? String(categoria) : null },
    });
    res.json(compra);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REPORTES
// ============================================================

// GET /api/reportes/cancelaciones → Pedidos cancelados del día o rango de fechas
app.get('/api/reportes/cancelaciones', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let filtroFecha = {};
    if (desde && hasta) {
      filtroFecha = { gte: new Date(desde + 'T00:00:00.000-05:00'), lte: new Date(hasta + 'T23:59:59.999-05:00') };
    } else {
      const ahora = new Date();
      const hoyPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      hoyPeru.setHours(0, 0, 0, 0);
      const inicioUTC = new Date(hoyPeru.getTime() + 5 * 60 * 60 * 1000);
      filtroFecha = { gte: inicioUTC };
    }

    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'Cancelado', canceladoEn: filtroFecha },
      include: { items: true, mesa: true },
      orderBy: { canceladoEn: 'desc' },
    });

    const formateados = pedidos.map(p => ({
      id: p.id,
      hora: p.canceladoEn?.toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      }),
      fecha: p.canceladoEn?.toLocaleDateString('es-PE'),
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

// GET /api/reportes/mozos → Estadísticas por mozo por rango de fechas
app.get('/api/reportes/mozos', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let filtroFecha = {};
    if (desde && hasta) {
      filtroFecha = { gte: new Date(desde + 'T00:00:00.000-05:00'), lte: new Date(hasta + 'T23:59:59.999-05:00') };
    } else {
      const ahora = new Date();
      const hoyPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      hoyPeru.setHours(0, 0, 0, 0);
      const inicioUTC = new Date(hoyPeru.getTime() + 5 * 60 * 60 * 1000);
      filtroFecha = { gte: inicioUTC };
    }

    const pedidos = await prisma.pedido.findMany({
      where: {
        createdAt: filtroFecha,
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

// GET /api/reportes/contable → Ventas y compras por rango de fechas
app.get('/api/reportes/contable', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let filtroFecha = {};
    if (desde && hasta) {
      filtroFecha = { gte: new Date(desde + 'T00:00:00.000-05:00'), lte: new Date(hasta + 'T23:59:59.999-05:00') };
    } else {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      filtroFecha = { gte: inicioMes };
    }

    const [ventas, compras] = await Promise.all([
      prisma.venta.findMany({ where: { createdAt: filtroFecha } }),
      prisma.compra.findMany({ where: { creadoEn: filtroFecha } }),
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

// GET /api/reportes/rotacion → Cantidad vendida de cada producto por rango de fechas
app.get('/api/reportes/rotacion', async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    let filtroFecha = {};
    if (desde && hasta) {
      filtroFecha = { gte: new Date(desde + 'T00:00:00.000-05:00'), lte: new Date(hasta + 'T23:59:59.999-05:00') };
    } else {
      const ahora = new Date();
      const hoyPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      hoyPeru.setHours(0, 0, 0, 0);
      const inicioUTC = new Date(hoyPeru.getTime() + 5 * 60 * 60 * 1000);
      filtroFecha = { gte: inicioUTC };
    }

    const pedidos = await prisma.pedido.findMany({
      where: {
        estado: 'Cobrado',
        createdAt: filtroFecha
      },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      }
    });

    const rotacion = {};
    for (const p of pedidos) {
      for (const item of p.items) {
        const prodId = item.productoId;
        if (!rotacion[prodId]) {
          rotacion[prodId] = {
            id: prodId,
            nombre: item.nombre,
            categoria: item.producto?.categoria || 'Sin categoría',
            cantidad: 0,
            precio: item.precio,
            total: 0
          };
        }
        rotacion[prodId].cantidad += item.cantidad;
        rotacion[prodId].total += item.cantidad * item.precio;
      }
    }

    const resultado = Object.values(rotacion).sort((a, b) => b.cantidad - a.cantidad);
    res.json(resultado);
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


// HELPERS E INTEGRACIÓN APISUNAT.PE (SUNAT PSE)
// ============================================================

async function enviarAApisunat(venta, items) {
  // Simular caída de red si está activa la variable de entorno
  if (process.env.APISUNAT_SIMULATE_OUTAGE === 'true') {
    throw new Error('Outage Simulator Active: apisunat.pe server is simulated down.');
  }

  const token = process.env.APISUNAT_TOKEN;
  const url = process.env.APISUNAT_API_URL || 'https://sandbox.apisunat.pe/api/v3/documents';
  const MODO_DEMO = !token || token.includes('tu_token') || token === '';

  const serie = venta.tipoComprobante === 'Factura' ? 'F001' : 'B001';

  // Identificación del cliente (1 = DNI, 6 = RUC, 0 = Sin Documento)
  let clienteTipoDoc = "1";
  let clienteNumDoc = venta.numDocumento || "00000000";
  let clienteDenominacion = venta.nombreCliente || "PÚBLICO GENERAL";

  if (venta.numDocumento && venta.numDocumento.length === 11) {
    clienteTipoDoc = "6";
  } else if (!venta.numDocumento || venta.numDocumento === '00000000' || venta.numDocumento === '0') {
    clienteTipoDoc = "0";
    clienteNumDoc = "00000000";
    clienteDenominacion = "PÚBLICO GENERAL";
  }

  // En MODO DEMO simulamos una respuesta exitosa localmente
  if (MODO_DEMO) {
    const rucEmpresa = "20496009259";
    const numeroStr = String(venta.numero || 1);
    const tipoCompNum = venta.tipoComprobante === 'Factura' ? '01' : '03';
    return {
      success: true,
      message: "El comprobante fue enviado y aceptado por SUNAT (DEMO).",
      payload: {
        estado: "ACEPTADO",
        hash: "demo_hash_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        xml: `https://apisunat.pe/${rucEmpresa}-${tipoCompNum}-${serie}-${numeroStr}.xml`,
        cdr: `https://apisunat.pe/R-${rucEmpresa}-${tipoCompNum}-${serie}-${numeroStr}.xml`,
        pdf: {
          ticket: `https://apisunat.pe/pdf/ticket/${rucEmpresa}-${tipoCompNum}-${serie}-${numeroStr}`,
          a4: `https://apisunat.pe/pdf/a4/${rucEmpresa}-${tipoCompNum}-${serie}-${numeroStr}`
        }
      }
    };
  }

  // Formatear items para apisunat.pe
  const formattedItems = items.map((item) => {
    const totalItem = item.precio * item.cantidad;
    const subtotalItem = totalItem / 1.18;
    
    return {
      unidad_de_medida: "NIU",
      descripcion: item.nombre,
      cantidad: String(item.cantidad),
      valor_unitario: (subtotalItem / item.cantidad).toFixed(6), // Recomienda 6 decimales
      porcentaje_igv: "18",
      codigo_tipo_afectacion_igv: "10", // Gravado - Operación Onerosa
      nombre_tributo: "IGV"
    };
  });

  const payload = {
    documento: venta.tipoComprobante === 'Factura' ? 'factura' : 'boleta',
    serie: serie,
    numero: venta.numero, // Debe ser entero
    fecha_de_emision: (() => {
      const dateLima = new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      const [day, month, year] = dateLima.split('/');
      return `${year}-${month}-${day}`;
    })(),
    moneda: "PEN",
    tipo_operacion: "0101",
    cliente_tipo_de_documento: clienteTipoDoc,
    cliente_numero_de_documento: clienteNumDoc,
    cliente_denominacion: clienteDenominacion,
    cliente_direccion: venta.clienteDireccion || "",
    items: formattedItems,
    total: venta.total.toFixed(2)
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    let parsedError;
    try {
      parsedError = JSON.parse(errorText);
    } catch (e) {}
    const errMsg = parsedError?.message || errorText;
    throw new Error(`apisunat.pe Error (${response.status}): ${errMsg}`);
  }

  return await response.json();
}


// ============================================================
// APISUNAT — ENDPOINTS DE DIAGNÓSTICO Y REINTENTO MANUAL
// ============================================================

// GET /api/sunat/pendientes → Ver todas las ventas con problemas
app.get('/api/sunat/pendientes', async (req, res) => {
  try {
    const pendientes = await prisma.venta.findMany({
      where: {
        OR: [
          { estadoSunat: { startsWith: 'PENDIENTE' } },
          { estadoSunat: { startsWith: 'ERROR' } },
        ],
        tipoComprobante: { in: ['Boleta', 'Factura'] }
      },
      select: {
        id: true,
        createdAt: true,
        tipoComprobante: true,
        total: true,
        nombreCliente: true,
        numDocumento: true,
        estadoSunat: true,
        pedidoId: true,
        serie: true,
        numero: true
      },
      orderBy: { createdAt: 'desc' }
    });
    // Mapeamos temporalmente estadoSunat como estadoNubefact para compatibilidad con el front
    const mapped = pendientes.map(p => ({
      ...p,
      estadoNubefact: p.estadoSunat
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sunat/reintentar/:id → Forzar reintento manual de una venta específica
app.post('/api/sunat/reintentar/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const venta = await prisma.venta.findUnique({
      where: { id },
      include: { pedido: { include: { items: true } } }
    });
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada.' });

    console.log(`[SUNAT Manual] 🔄 Reintento manual forzado para Venta #${id}...`);

    // Asignar serie y correlativo si no los tiene
    if (!venta.serie || !venta.numero) {
      const ultimaVenta = await prisma.venta.findFirst({
        where: { tipoComprobante: venta.tipoComprobante, numero: { not: null } },
        orderBy: { numero: 'desc' }
      });
      venta.serie = venta.tipoComprobante === 'Factura' ? 'F001' : 'B001';
      venta.numero = ultimaVenta ? (ultimaVenta.numero + 1) : 1;

      await prisma.venta.update({
        where: { id: venta.id },
        data: { serie: venta.serie, numero: venta.numero }
      });
    }

    const response = await enviarAApisunat(venta, venta.pedido.items);

    const mappedData = {
      serie: venta.serie,
      numero: venta.numero,
      key: response.payload?.hash || '',
      enlace_del_pdf: response.payload?.pdf?.ticket || response.payload?.pdf?.a4 || '',
      cadena_para_codigo_qr: `20496009259|${venta.tipoComprobante === 'Factura' ? '01' : '03'}|${venta.serie}|${String(venta.numero).padStart(4, '0')}|${venta.igv.toFixed(2)}|${venta.total.toFixed(2)}|${new Intl.DateTimeFormat('es-PE', {timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(venta.createdAt))}|${venta.tipoComprobante === 'Factura' ? '6' : (venta.numDocumento?.length === 8 ? '1' : '0')}|${venta.numDocumento || '00000000'}|${response.payload?.hash || ''}`
    };

    const updated = await prisma.venta.update({
      where: { id },
      data: {
        estadoSunat: `ACEPTADO:${JSON.stringify(mappedData)}`,
        urlPdf: mappedData.enlace_del_pdf,
        urlXml: response.payload?.xml || null
      }
    });

    console.log(`[SUNAT Manual] ✅ Venta #${id} ACEPTADA por apisunat.pe.`);
    res.json({ ok: true, estadoNubefact: updated.estadoSunat }); // Retornamos mapeado como estadoNubefact para el front
  } catch (err) {
    const errorMsg = err.message.substring(0, 500);
    await prisma.venta.update({
      where: { id },
      data: { estadoSunat: `ERROR:${errorMsg}` }
    }).catch(() => {});

    console.error(`[SUNAT Manual] ❌ Fallo reintento manual Venta #${id}:`, err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/sunat/reintentar-todos → Forzar reintento de TODAS las ventas pendientes
app.post('/api/sunat/reintentar-todos', async (req, res) => {
  try {
    await procesarVentasPendientes();
    res.json({ ok: true, mensaje: 'Reintento masivo ejecutado. Revisa los logs de SUNAT.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// WORKER DE REINTENTO AUTOMÁTICO (OFFLINE CONTINGENCY)
// ============================================================

async function procesarVentasPendientes() {
  try {
    const pendientes = await prisma.venta.findMany({
      where: {
        estadoSunat: 'PENDIENTE_REINTENTO',
        tipoComprobante: { in: ['Boleta', 'Factura'] }
      },
      include: {
        pedido: {
          include: { items: true }
        }
      }
    });

    if (pendientes.length === 0) return;

    console.log(`[Worker SUNAT] 🔍 Se encontraron ${pendientes.length} ventas en contingencia por reintentar.`);

    for (const venta of pendientes) {
      try {
        console.log(`[Worker SUNAT] 🔄 Reintentando envío de Venta #${venta.id}...`);

        if (!venta.serie || !venta.numero) {
          const ultimaVenta = await prisma.venta.findFirst({
            where: { tipoComprobante: venta.tipoComprobante, numero: { not: null } },
            orderBy: { numero: 'desc' }
          });
          venta.serie = venta.tipoComprobante === 'Factura' ? 'F001' : 'B001';
          venta.numero = ultimaVenta ? (ultimaVenta.numero + 1) : 1;

          await prisma.venta.update({
            where: { id: venta.id },
            data: { serie: venta.serie, numero: venta.numero }
          });
        }

        const response = await enviarAApisunat(venta, venta.pedido.items);
        
        const mappedData = {
          serie: venta.serie,
          numero: venta.numero,
          key: response.payload?.hash || '',
          enlace_del_pdf: response.payload?.pdf?.ticket || response.payload?.pdf?.a4 || '',
          cadena_para_codigo_qr: `20496009259|${venta.tipoComprobante === 'Factura' ? '01' : '03'}|${venta.serie}|${String(venta.numero).padStart(4, '0')}|${venta.igv.toFixed(2)}|${venta.total.toFixed(2)}|${new Intl.DateTimeFormat('es-PE', {timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(venta.createdAt))}|${venta.tipoComprobante === 'Factura' ? '6' : (venta.numDocumento?.length === 8 ? '1' : '0')}|${venta.numDocumento || '00000000'}|${response.payload?.hash || ''}`
        };

        await prisma.venta.update({
          where: { id: venta.id },
          data: {
            estadoSunat: `ACEPTADO:${JSON.stringify(mappedData)}`,
            urlPdf: mappedData.enlace_del_pdf,
            urlXml: response.payload?.xml || null
          }
        });
        
        console.log(`[Worker SUNAT] ✅ Venta #${venta.id} enviada y ACEPTADA por apisunat.pe.`);
      } catch (err) {
        const errorMsg = err.message.substring(0, 500);
        await prisma.venta.update({
          where: { id: venta.id },
          data: { estadoSunat: `ERROR:${errorMsg}` }
        }).catch(() => {});

        console.error(`[Worker SUNAT] ❌ Intento fallido para Venta #${venta.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[Worker SUNAT] ❌ Error crítico en el worker:", err.message);
  }
}

// Iniciar worker de reintentos cada 5 minutos (300000ms)
setInterval(procesarVentasPendientes, 300000);

