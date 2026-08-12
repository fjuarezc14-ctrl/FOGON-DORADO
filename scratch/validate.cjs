// VALIDATION ONLY — checks every anchor exists before patching. No writes.
const fs = require('fs');
function chk(file, label, needles) {
  const src = fs.readFileSync(file, 'utf8');
  console.log('\n## ' + file + ' :: ' + label);
  for (const n of needles) {
    const idx = src.indexOf(n);
    const ok = idx !== -1;
    console.log((ok ? '  OK  ' : '  MISS') + ' | ' + JSON.stringify(n.substring(0,80)));
    if (ok) {
      const line = src.substring(0, idx).split('\n').length;
      // print the matching line
      const lines = src.split('\n');
      console.log('       -> L' + line + ': ' + lines[line-1].trim().substring(0,100));
    }
  }
}

chk('src/pages/ComprasPage.jsx','ComprasPage', [
  "categoria: '', fechaEmision: '',\n  });",
  "fechaEmision: formCompra.fechaEmision || null,\n      });",
  "setFormCompra({ proveedor: '', ruc: '', tipoDocumento: 'Factura', serieNumero: '', baseImponible: '', igv: '', total: '', categoria: '', fechaEmision: '' });",
  '{/* Monto */}',
]);

chk('src/pages/ReportesPage.jsx','ReportesPage', [
  "const [data, cancs, mzs, vts, rot, cmps] = await Promise.all([",
  "api.getCompras(desde, hasta),",
  "setCompras(cmps || []);",
  "const [rotacion, setRotacion] = useState([]);",
  "{ id: 'consumo', label: '👤 Consumo de Personal (Planilla)' },",
  "{activeTab === 'consumo' && (",
]);

chk('src/pages/CajaPage.jsx','CajaPage', [
  "const [deliveryMetodoPago, setDeliveryMetodoPago] = useState('Efectivo');",
  "metodoPago: tipoDelivery === 'PedidosYa' ? 'PedidosYa' : deliveryMetodoPago,",
  "value={deliveryMetodoPago}",
]);

// CajaPage mesa cobro: find setMetodoPago usage & the payment options array
const cjx = fs.readFileSync('src/pages/CajaPage.jsx','utf8').split('\n');
console.log('\n## CajaPage mesa cobro: search setMetodoPago/metodoPago radio');
let hits=0;
for (let i=0;i<cjx.length;i++){
  if (cjx[i].includes('setMetodoPago(') || cjx[i].includes("id: 'Consumo'") || cjx[i].includes("id: 'Mixto'")) {
    hits++;
    if(hits<=8){ for(let j=Math.max(0,i-2);j<=Math.min(cjx.length-1,i+3);j++)console.log('L'+(j+1)+': '+cjx[j]); console.log('---'); }
  }
}
console.log('  total setMetodoPago/consumo/mixto lines: '+hits);

// SalonPage anchors
chk('src/pages/SalonPage.jsx','SalonPage', [
  "export default function SalonPage",
  "Cancelar Pedido",
]);
const slx = fs.readFileSync('src/pages/SalonPage.jsx','utf8').split('\n');
console.log('\n## SalonPage: search mesa cobro/payment/print context');
for (let i=0;i<slx.length;i++){
  const l=slx[i];
  if (l.includes('Cobrar') || l.includes('method') || l.includes('metodoPago') || l.includes('Imprimir') || l.includes('cobrar')) {
    for(let j=Math.max(0,i-2);j<=Math.min(slx.length-1,i+2);j++)console.log('L'+(j+1)+': '+slx[j]); console.log('---');
  }
}
console.log('\n=== VALIDATION DONE ===');
