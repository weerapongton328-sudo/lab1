const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

// 1. /api/orders
code = code.replace(
  /\.where\(eq\(products\.id, p\.id\)\);\s*\/\/\ Log price overrides/g,
  `.where(eq(products.id, p.id));
          p.stockQuantity = newQty;
          // Log price overrides`
);

code = code.replace(
  /\.where\(eq\(products\.id, parentProd\.id\)\);\s*\}\s*\}\s*\}\s*let memberDiscount = 0;/g,
  `.where(eq(products.id, parentProd.id));
                parentProd.stockQuantity = newQty;
            }
          }
        }
      }

      let memberDiscount = 0;`
);

// 2. /api/stock-logs/direct-bulk
code = code.replace(
  /await tx\s*\.update\(productUnits\)\s*\.set\(\{ costPrice: updatedBaseCost, updatedAt: new Date\(\) \}\)\s*\.where\(eq\(productUnits\.id, baseUnit\.id\)\);\s*\}\s*\/\/\ Update product stock\s*await tx\s*\.update\(products\)\s*\.set\(\{ stockQuantity: newStock, updatedAt: new Date\(\) \}\)\s*\.where\(eq\(products\.id, prodIdInt\)\);/g,
  `await tx
            .update(productUnits)
            .set({ costPrice: updatedBaseCost, updatedAt: new Date() })
            .where(eq(productUnits.id, baseUnit.id));
          baseUnit.costPrice = updatedBaseCost;
        }
        // Update product stock
        await tx
          .update(products)
          .set({ stockQuantity: newStock, updatedAt: new Date() })
          .where(eq(products.id, prodIdInt));
        prod.stockQuantity = newStock;`
);

// 3. /api/purchase-orders/:id/receive
code = code.replace(
  /await tx\.update\(productUnits\)\.set\(\{ costPrice: avgCost\.toString\(\), updatedAt: new Date\(\) \}\)\.where\(eq\(productUnits\.id, unit\.id\)\);\s*await tx\.update\(products\)\.set\(\{ stockQuantity: newQty, updatedAt: new Date\(\) \}\)\.where\(eq\(products\.id, prod\.id\)\);/g,
  `await tx.update(productUnits).set({ costPrice: avgCost.toString(), updatedAt: new Date() }).where(eq(productUnits.id, unit.id));
          unit.costPrice = avgCost.toString();
          
          await tx.update(products).set({ stockQuantity: newQty, updatedAt: new Date() }).where(eq(products.id, prod.id));
          prod.stockQuantity = newQty;`
);

fs.writeFileSync('LabPos-main/server.ts', code);
console.log("Patched concurrency state bugs.");
