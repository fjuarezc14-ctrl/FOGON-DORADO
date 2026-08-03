const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const inputPath = path.join(__dirname, 'menu-export.json');
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No se encontró el archivo de exportación en: ${inputPath}`);
    console.log('\n💡 Instrucciones:');
    console.log('1. Ejecuta "node dump-menu.js" en el primer servidor para generar el archivo.');
    console.log('2. Copia el archivo "menu-export.json" generado en la carpeta backend/ de este nuevo servidor.');
    console.log('3. Ejecuta de nuevo "node load-menu.js" para cargar el menú.');
    process.exit(1);
  }

  const productos = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`🌱 Iniciando la importación de ${productos.length} productos en el nuevo servidor...`);

  let procesados = 0;

  for (const prod of productos) {
    const { id, creadoEn, ...data } = prod;
    
    await prisma.producto.upsert({
      where: { id: parseInt(id) },
      update: data,
      create: {
        id: parseInt(id),
        ...data
      }
    });
    procesados++;
  }

  console.log(`\n✅ Importación completada con éxito.`);
  console.log(`📊 Productos cargados en la base de datos: ${procesados}`);
}

main()
  .catch(e => {
    console.error('❌ Error al importar el menú:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
