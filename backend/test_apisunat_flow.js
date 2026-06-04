const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function runTest() {
  console.log('🤖 Starting Integration Test for apisunat.pe Billing Flow...');

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

    // Create a dummy product if none exists
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

    // Create item associated with the order
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

    // 3. Make HTTP request to checkout
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

    // Assert checkout response
    if (response.statusCode !== 200 || !response.body.ok) {
      throw new Error(`Checkout failed: ${JSON.stringify(response.body)}`);
    }

    if (response.body.serie !== 'B001' || typeof response.body.numero !== 'number') {
      throw new Error(`Invalid series or number returned: ${response.body.serie}-${response.body.numero}`);
    }

    console.log(`✅ Checkout response asserts passed: Serie=${response.body.serie}, Numero=${response.body.numero}`);

    // 4. Verify DB Venta entry
    console.log('🔍 Querying Venta record in DB...');
    const venta = await prisma.venta.findUnique({
      where: { pedidoId: dummyPedido.id }
    });

    console.log('Venta Record in DB:', JSON.stringify(venta, null, 2));

    if (venta.serie !== 'B001' || venta.numero !== response.body.numero) {
      throw new Error('Database series or number does not match!');
    }

    if (!venta.urlPdf || !venta.urlPdf.includes('apisunat.pe/pdf/ticket/')) {
      throw new Error(`Invalid PDF URL saved: ${venta.urlPdf}`);
    }

    if (!venta.urlXml || !venta.urlXml.includes('apisunat.pe/')) {
      throw new Error(`Invalid XML URL saved: ${venta.urlXml}`);
    }

    if (!venta.estadoSunat.startsWith('ACEPTADO:')) {
      throw new Error(`Invalid state in DB: ${venta.estadoSunat}`);
    }

    console.log('✅ Database assertions passed!');

  } catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    // 5. Clean up dummy records
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
    console.log('🏁 Integration Test Finished.');
  }
}

runTest();
