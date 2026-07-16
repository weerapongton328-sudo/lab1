const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

const target = `          await tx.update(products)
            .set({ 
              stockQuantity: newQty, 
              updatedAt: new Date() 
            })
            .where(eq(products.id, prod.id));`;

const replacement = `          await tx.update(products)
            .set({ 
              stockQuantity: newQty, 
              updatedAt: new Date() 
            })
            .where(eq(products.id, prod.id));
          prod.stockQuantity = newQty;`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/server.ts', code);
    console.log("Patched PO memory stock update");
} else {
    console.log("Not found");
}
