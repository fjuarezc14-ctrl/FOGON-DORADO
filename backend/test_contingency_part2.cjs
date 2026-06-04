const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

async function runTest() {
  const pedidoId = parseInt(process.argv[2]);
  if (!pedidoId) {
    console.error('❌ Missing Pedido ID argument!');
    process.exit(1);
  }

  console.log(`🤖 Running Contingency Test Part 2 for Pedido ID: ${pedidoId}...`);

  try {
    // 1. Force retry todos
    const retryRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost', port: 3000, path: '/api/sunat/reintentar-todos', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });

    console.log('📥 Reintentar response:', JSON.stringify(retryRes));

    // Wait 2 seconds for worker to process
    console.log('⏳ Waiting 2 seconds for background worker sync...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Query Venta in DB and assert ACEPTADO
    const venta = await prisma.venta.findUnique({
      where: { pedidoId }
    });

    console.log('Venta Record in DB after sync retry:', JSON.stringify(venta, null, 2));

    if (!venta.estadoSunat.startsWith('ACEPTADO:')) {
      throw new Error(`Expected DB state to be ACEPTADO, got: ${venta.estadoSunat}`);
    }
    if (!venta.urlPdf || !venta.urlXml) {
      throw new Error('PDF or XML URL not saved after successful sync retry!');
    }

    console.log('✅ Part 2 SUCCESS! Sync completed and Venta is accepted.');
  } catch (err) {
    console.error('❌ PART 2 FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up database...');
    try {
      const pedido = await prisma.pedido.findUnique({
        where: { id: pedidoId }
      });
      await prisma.venta.deleteMany({ where: { pedidoId } }).catch(() => {});
      await prisma.itemPedido.deleteMany({ where: { pedidoId } }).catch(() => {});
      await prisma.pedido.delete({ where: { id: pedidoId } }).catch(() => {});
      if (pedido && pedido.mesaId) {
        await prisma.mesa.delete({ where: { id: pedido.mesaId } }).catch(() => {});
      }
      console.log('🧹 Cleanup complete!');
    } catch (cleanupErr) {
      console.error('⚠️ Cleanup failed:', cleanupErr.message);
    }
    prisma.$disconnect();
  }
}

runTest();
