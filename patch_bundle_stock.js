const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

const target = `              await tx
                .update(products)
                .set({ stockQuantity: newQty, updatedAt: new Date() })
                .where(eq(products.id, parentProd.id));
            }
          }
        }
      }

      // Compute calculations`;

const replacement = `              await tx
                .update(products)
                .set({ stockQuantity: newQty, updatedAt: new Date() })
                .where(eq(products.id, parentProd.id));
              parentProd.stockQuantity = newQty;
            }
          }
        }
      }

      // Compute calculations`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/server.ts', code);
    console.log("Patched bundle stock deduction.");
} else {
    console.log("Not found.");
}
