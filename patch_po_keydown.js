const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `                                placeholder="ค้นหาชื่อสินค้า..."
                                value={poSearchTerm}
                                onChange={(e) => setPoSearchTerm(e.target.value)}
                              />`;

const replacement = `                                placeholder="ค้นหาชื่อสินค้า..."
                                value={poSearchTerm}
                                onChange={(e) => setPoSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const term = convertThaiToEngKeyboard(e.currentTarget.value).trim().toLowerCase();
                                    if (!term) return;
                                    
                                    let matchedUnitId = null;
                                    // 1. Exact Barcode Match
                                    for (const p of productsList) {
                                      const u = p.units?.find((u: any) => u.barcode === term);
                                      if (u) {
                                        matchedUnitId = u.id;
                                        break;
                                      }
                                    }
                                    if (matchedUnitId) {
                                      handleAddPoItem(matchedUnitId.toString());
                                      setPoSearchTerm("");
                                    }
                                  }
                                }}
                              />`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched PO keydown logic");
} else {
    console.log("Not found");
}
