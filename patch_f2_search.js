const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `const filteredProducts = productsList.filter(p => p.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || p.units.some(u => u.barcode.includes(modalSearchQuery))).slice(0, 50);`;
const replacement1 = `const filteredProducts = productsList.filter(p => p.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || p.units?.some((u: any) => u.barcode?.includes(modalSearchQuery))).slice(0, 50);`;

code = code.replace(target1, replacement1);

const target2 = `                .filter(p => p.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || p.units.some(u => u.barcode.includes(modalSearchQuery)))`;
const replacement2 = `                .filter(p => p.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || p.units?.some((u: any) => u.barcode?.includes(modalSearchQuery)))`;

code = code.replace(target2, replacement2);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log("Patched F2 modal search");
