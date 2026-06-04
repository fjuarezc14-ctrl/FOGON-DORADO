const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function runTest() {
  console.log('🤖 Starting Integration Test for apisunat.pe Offline Contingency Flow...');

  let dummyMesa, dummyPedido, dummyItem;
  try {
    // 1. Create a dummy mesa
    dummyMesa = await prisma.mesa.create({
      data: {
        numero: 99,
        estado: 'Cocina'
      }
    });
    console.log(`✅ Created dummy Mesa #${dummyMesa.numero}`);

    // Create a dummy product
    let product = await prisma.producto.findFirst();
    if (!product) {
      product = await prisma.producto.create({
        data: {
          nombre: 'Pechuga Especial Test',
          categoria: 'Pollos a la Brasa',
          precio: 33.00
        }
      });
    }

    // 2. Create a dummy order
    dummyPedido = await prisma.pedido.create({
      data: {
        mesaId: dummyMesa.id,
        mesero: 'Test Mozo',
        estado: 'Cocina',
        total: 33.00,
        tipoEntrega: 'salon'
      }
    });

    dummyItem = await prisma.itemPedido.create({
      data: {
        pedidoId: dummyPedido.id,
        productoId: product.id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad: 1
      }
    });
    console.log(`✅ Created dummy Pedido #${dummyPedido.id} with items`);

    // 3. Activate simulated outage in environment
    process.env.APISUNAT_SIMULATE_OUTAGE = 'true';
    console.log('🔌 APISUNAT_SIMULATE_OUTAGE activated to simulate API failure.');

    // 4. Make HTTP request to checkout
    const postData = JSON.stringify({
      pedidoIds: [dummyPedido.id],
      tipoComprobante: 'Boleta',
      numDocumento: '10404040404',
      nombreCliente: 'JUAN PEREZ SOTO',
      total: 33.00,
      metodoPago: 'Efectivo',
      clienteDireccion: 'CALLE SAN MARTÍN 109'
    });

    console.log('🚀 Sending POST /api/ventas (checkout)...');
    const response = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/ventas',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log(`📥 Received Status: ${response.statusCode}`);
    console.log('📥 Received Body:', JSON.stringify(response.body, null, 2));

    // Assert checkout response in contingency
    if (response.statusCode !== 200 || !response.body.ok) {
      throw new Error(`Checkout failed: ${JSON.stringify(response.body)}`);
    }

    if (response.body.estadoNubefact !== 'PENDIENTE_REINTENTO') {
      throw new Error(`Expected state PENDIENTE_REINTENTO, got: ${response.body.estadoNubefact}`);
    }

    console.log('✅ Checkout responded with PENDIENTE_REINTENTO (Contingency active) successfully!');

    // Verify DB entry is PENDIENTE_REINTENTO
    let venta = await prisma.venta.findUnique({
      where: { pedidoId: dummyPedido.id }
    });
    if (venta.estadoSunat !== 'PENDIENTE_REINTENTO') {
      throw new Error(`Expected DB state PENDIENTE_REINTENTO, got: ${venta.estadoSunat}`);
    }
    console.log('✅ Venta state successfully saved as PENDIENTE_REINTENTO in database.');

    // 5. Deactivate simulated outage
    process.env.APISUNAT_SIMULATE_OUTAGE = 'false';
    console.log('🔌 APISUNAT_SIMULATE_OUTAGE deactivated.');

    // 6. Force retry all pending
    console.log('🚀 Sending POST /api/sunat/reintentar-todos...');
    const retryResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/sunat/reintentar-todos',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.end();
    });

    console.log('📥 Retry Response:', JSON.stringify(retryResponse.body, null, 2));

    // Wait 1.5 seconds for background worker to finish processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 7. Verify DB entry is now ACEPTADO
    venta = await prisma.venta.findUnique({
      where: { pedidoId: dummyPedido.id }
    });

    console.log('Venta Record in DB after retry:', JSON.stringify(venta, null, 2));

    if (!venta.estadoSunat.startsWith('ACEPTADO:')) {
      throw new Error(`Expected DB state ACEPTADO after retry, got: ${venta.estadoSunat}`);
    }

    if (!venta.urlPdf || !venta.urlXml) {
      throw new Error('PDF or XML URL not saved after successful sync!');
    }

    console.log('✅ Background sync verified: Venta is now ACEPTADA and URLs are saved!');

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    // 8. Clean up
    console.log('🧹 Cleaning up database...');
    try {
      if (dummyPedido) {
        await prisma.venta.deleteMany({ where: { pedidoId: dummyPedido.id } }).catch(() => {});
      }
      if (dummyItem) {
        await prisma.itemPedido.delete({ where: { id: dummyItem.id } }).catch(() => {});
      }
      if (dummyPedido) {
        await prisma.pedido.delete({ where: { id: dummyPedido.id } }).catch(() => {});
      }
      if (dummyMesa) {
        await prisma.mesa.delete({ where: { id: dummyMesa.id } }).catch(() => {});
      }
      console.log('🧹 Clean up complete!');
    } catch (cleanupErr) {
      console.error('⚠️ Cleanup failed:', cleanupErr.message);
    }
    prisma.$disconnect();
    console.log('🏁 Contingency Integration Test Finished.');
  }
}

runTest();
