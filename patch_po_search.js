const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `                              {poSearchTerm && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                                  {productsList
                                    .filter(p => p.name.toLowerCase().includes(poSearchTerm.toLowerCase()))
                                    .map(p => (`;

const replacement = `                              {poSearchTerm && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                                  {productsList
                                    .filter(p => p.name.toLowerCase().includes(poSearchTerm.toLowerCase()) || p.units?.some((u: any) => u.barcode?.includes(poSearchTerm)))
                                    .map(p => (`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched PO barcode scanner logic");
} else {
    console.log("Not found");
}
