const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function runTest() {
  console.log('🤖 Running Contingency Test Part 1 (Under Outage)...');

  let dummyMesa, dummyPedido, dummyItem;
  try {
    dummyMesa = await prisma.mesa.create({ data: { numero: 99, estado: 'Cocina' } });
    let product = await prisma.producto.findFirst();
    dummyPedido = await prisma.pedido.create({
      data: { mesaId: dummyMesa.id, mesero: 'Test Mozo', estado: 'Cocina', total: 33.00, tipoEntrega: 'salon' }
    });
    dummyItem = await prisma.itemPedido.create({
      data: { pedidoId: dummyPedido.id, productoId: product.id, nombre: product.nombre, precio: product.precio, cantidad: 1 }
    });

    const postData = JSON.stringify({
      pedidoIds: [dummyPedido.id],
      tipoComprobante: 'Boleta',
      numDocumento: '10404040404',
      nombreCliente: 'JUAN PEREZ SOTO',
      total: 33.00,
      metodoPago: 'Efectivo',
      clienteDireccion: 'CALLE SAN MARTÍN 109'
    });

    const response = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost', port: 3000, path: '/api/ventas', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log(`📥 Status: ${response.statusCode}, State: ${response.body.estadoNubefact}`);

    if (response.body.estadoNubefact !== 'PENDIENTE_REINTENTO') {
      throw new Error(`Expected PENDIENTE_REINTENTO, got: ${response.body.estadoNubefact}`);
    }

    const venta = await prisma.venta.findUnique({ where: { pedidoId: dummyPedido.id } });
    if (venta.estadoSunat !== 'PENDIENTE_REINTENTO') {
      throw new Error(`DB state not PENDIENTE_REINTENTO, got: ${venta.estadoSunat}`);
    }

    console.log(`✅ Part 1 SUCCESS. Created Pedido ID: ${dummyPedido.id}`);
  } catch (err) {
    console.error('❌ PART 1 FAILED:', err.message);
    process.exitCode = 1;
    // Cleanup if failed
    if (dummyPedido) await prisma.venta.deleteMany({ where: { pedidoId: dummyPedido.id } });
    if (dummyItem) await prisma.itemPedido.delete({ where: { id: dummyItem.id } }).catch(() => {});
    if (dummyPedido) await prisma.pedido.delete({ where: { id: dummyPedido.id } }).catch(() => {});
    if (dummyMesa) await prisma.mesa.delete({ where: { id: dummyMesa.id } }).catch(() => {});
  } finally {
    prisma.$disconnect();
  }
}

runTest();
