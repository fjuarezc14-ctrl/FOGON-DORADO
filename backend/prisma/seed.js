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
    await prisma.producto.create({ data: p });
  }

  // 3. Crear las 15 mesas del salón
  for (let i = 1; i <= 15; i++) {
    await prisma.mesa.upsert({
      where: { numero: i },
      update: {},
      create: { numero: i, estado: 'Libre' },
    });
  }

  console.log('✅ Datos iniciales cargados correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
