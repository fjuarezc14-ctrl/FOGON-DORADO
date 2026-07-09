const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lastVentas = await prisma.venta.findMany({
    take: 15,
    orderBy: { id: 'desc' },
    select: {
      id: true,
      tipoComprobante: true,
      nombreCliente: true,
      numDocumento: true,
      total: true,
      metodoPago: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(lastVentas, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
