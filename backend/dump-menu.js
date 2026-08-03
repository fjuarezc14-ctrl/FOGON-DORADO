const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Iniciando exportación de la carta de productos (menú)...');
  const productos = await prisma.producto.findMany({
    orderBy: { id: 'asc' }
  });
  
  const outputPath = path.join(__dirname, 'menu-export.json');
  fs.writeFileSync(outputPath, JSON.stringify(productos, null, 2), 'utf-8');
  console.log(`\n✅ Exportación completada con éxito.`);
  console.log(`📊 Total de productos exportados: ${productos.length}`);
  console.log(`📄 Archivo de datos guardado en: ${outputPath}`);
  console.log('👉 Copia este archivo "menu-export.json" al nuevo servidor para poder importarlo.');
}

main()
  .catch(e => {
    console.error('❌ Error al exportar la carta:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
