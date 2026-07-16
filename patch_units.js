const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

const target = `      // For units, we delete old non-existent units and upsert current units
      await tx.delete(productUnits).where(eq(productUnits.productId, productId));

      let updatedUnits = [];
      if (units && Array.isArray(units)) {
        for (const u of units) {
          const [insertedUnit] = await tx
            .insert(productUnits)
            .values({
              productId,
              unitName: u.unitName,
              barcode: u.barcode,
              conversionFactor: parseInt(u.conversionFactor) || 1,
              retailPrice: u.retailPrice.toString(),
              wholesalePrice: u.wholesalePrice.toString(),
              costPrice: (u.costPrice || "0.00").toString(),
            })
            .returning();
          updatedUnits.push(insertedUnit);
        }
      }`;

const replacement = `      // For units, we upsert current units and remove deleted ones if possible
      let updatedUnits = [];
      const currentUnitIds = [];
      if (units && Array.isArray(units)) {
        for (const u of units) {
          if (u.id) {
            const [updatedUnit] = await tx
              .update(productUnits)
              .set({
                unitName: u.unitName,
                barcode: u.barcode,
                conversionFactor: parseInt(u.conversionFactor) || 1,
                retailPrice: u.retailPrice.toString(),
                wholesalePrice: u.wholesalePrice.toString(),
                costPrice: (u.costPrice || "0.00").toString(),
              })
              .where(eq(productUnits.id, u.id))
              .returning();
            if (updatedUnit) {
               updatedUnits.push(updatedUnit);
               currentUnitIds.push(updatedUnit.id);
            }
          } else {
            const [insertedUnit] = await tx
              .insert(productUnits)
              .values({
                productId,
                unitName: u.unitName,
                barcode: u.barcode,
                conversionFactor: parseInt(u.conversionFactor) || 1,
                retailPrice: u.retailPrice.toString(),
                wholesalePrice: u.wholesalePrice.toString(),
                costPrice: (u.costPrice || "0.00").toString(),
              })
              .returning();
            if (insertedUnit) {
               updatedUnits.push(insertedUnit);
               currentUnitIds.push(insertedUnit.id);
            }
          }
        }
      }
      
      // Attempt to delete removed units, ignore errors if referenced
      const existingUnits = await tx.select().from(productUnits).where(eq(productUnits.productId, productId));
      for (const eu of existingUnits) {
          if (!currentUnitIds.includes(eu.id)) {
              try {
                  // We can't use try-catch around a failing tx query easily in postgres without savepoints, 
                  // but we can check if it is referenced in saleItems before deleting to avoid transaction abort.
                  const [inSales] = await tx.select({id: saleItems.id}).from(saleItems).where(eq(saleItems.productUnitId, eu.id)).limit(1);
                  if (!inSales) {
                      await tx.delete(productUnits).where(eq(productUnits.id, eu.id));
                  }
              } catch (e) {
                  console.error("Could not delete unit", eu.id, e);
              }
          }
      }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/server.ts', code);
    console.log("Successfully patched unit update logic.");
} else {
    console.log("Target string not found.");
}
