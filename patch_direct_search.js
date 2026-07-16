const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const term = convertThaiToEngKeyboard(e.currentTarget.value).trim().toLowerCase();
                                    if (!term) return;
                                    const filtered = productsList.filter(p => p.name.toLowerCase().includes(term) || p.units?.some((u: any) => u.barcode?.includes(term)));
                                    if (filtered.length === 1) {
                                      const p = filtered[0];
                                      const matchedUnit = p.units?.find((u: any) => u.barcode?.includes(term));`;

const replacement = `                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const term = convertThaiToEngKeyboard(e.currentTarget.value).trim().toLowerCase();
                                    if (!term) return;
                                    
                                    // 1. Exact Barcode Match
                                    let matchedProduct = null;
                                    let matchedUnit = null;
                                    for (const p of productsList) {
                                      const u = p.units?.find((u: any) => u.barcode === term);
                                      if (u) {
                                        matchedProduct = p;
                                        matchedUnit = u;
                                        break;
                                      }
                                    }
                                    
                                    if (!matchedProduct) {
                                      // 2. Fallback to includes
                                      const filtered = productsList.filter(p => p.name.toLowerCase().includes(term) || p.units?.some((u: any) => u.barcode?.includes(term)));
                                      if (filtered.length === 1) {
                                        matchedProduct = filtered[0];
                                        matchedUnit = matchedProduct.units?.find((u: any) => u.barcode?.includes(term));
                                      }
                                    }

                                    if (matchedProduct) {
                                      const p = matchedProduct;`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched direct stock in barcode scanner logic");
} else {
    console.log("Not found");
}
