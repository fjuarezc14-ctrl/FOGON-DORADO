// Script de seed (datos iniciales) para que la BD no empiece vacía
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos iniciales...');

  // 1. Crear usuario administrador por defecto
  await prisma.usuario.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'Admin Principal',
      rol: 'Administrador',
      pin: '1234',
      permisos: ['Dashboard', 'Salon', 'Cocina', 'Caja', 'Reportes', 'Usuarios'],
    },
  });

  // 2. Crear productos del menú base
  const productosBase = [
    { nombre: '1 Pollo Entero + Papas', categoria: 'Pollos', precio: 65.00, tipoStock: 'ilimitado', stock: 0 },
    { nombre: '1/2 Pollo + Papas', categoria: 'Pollos', precio: 35.00, tipoStock: 'ilimitado', stock: 0 },
    { nombre: '1/4 de Pollo', categoria: 'Pollos', precio: 19.00, tipoStock: 'ilimitado', stock: 0 },
    { nombre: 'Porción de Papas Fritas', categoria: 'Guarniciones', precio: 12.00, tipoStock: 'ilimitado', stock: 0 },
    { nombre: 'Porción de Arroz Chaufa', categoria: 'Guarniciones', precio: 10.00, tipoStock: 'ilimitado', stock: 0 },
    { nombre: 'Ensalada Clásica Grande', categoria: 'Guarniciones', precio: 14.00, tipoStock: 'ilimitado', stock: 0 },
    { nombre: 'Chicha Morada (Jarra)', categoria: 'Bebidas', precio: 12.00, tipoStock: 'limitado', stock: 10 },
    { nombre: 'Inca Kola 1.5L', categoria: 'Bebidas', precio: 12.00, tipoStock: 'limitado', stock: 24 },
    { nombre: 'Limonada (Jarra)', categoria: 'Bebidas', precio: 10.00, tipoStock: 'limitado', stock: 10 },
  ];

  for (const p of productosBase) {
    const existe = await prisma.producto.findFirst({
      where: { nombre: p.nombre, activo: true }
    });
    if (!existe) {
      await prisma.producto.create({ data: p });
      console.log(`+ Creado producto base: ${p.nombre}`);
    } else {
      console.log(`~ Producto base ya existe: ${p.nombre}`);
    }
  }

  // 3. Crear las 15 mesas del salón
  for (let i = 1; i <= 15; i++) {
    await prisma.mesa.upsert({
      where: { numero: i },
      update: {},
      create: { numero: i, estado: 'Libre' },
    });
  }

  // 4. Limpiar duplicados históricos de productos de forma segura
  console.log('🧹 Detectando y limpiando productos duplicados de forma segura...');
  const todosProductos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: { id: 'asc' }
  });
  
  const nombresVistos = new Set();
  let desactivados = 0;
  
  for (const p of todosProductos) {
    if (nombresVistos.has(p.nombre)) {
      await prisma.producto.update({
        where: { id: p.id },
        data: { activo: false }
      });
      desactivados++;
    } else {
      nombresVistos.add(p.nombre);
    }
  }

  console.log(`✅ Se desactivaron y limpiaron ${desactivados} productos duplicados.`);
  console.log('✅ Datos iniciales cargados y auditados correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
