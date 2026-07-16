const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `units: editingProduct.tempUnits.map(u => ({
          unitName: u.unitName,
          barcode: u.barcode && u.barcode.trim() ? u.barcode.trim() : generateAutoBarcode(),
          conversionFactor: parseInt(u.conversionFactor) || 1,
          retailPrice: u.retailPrice || "0",
          wholesalePrice: u.wholesalePrice || "0",
          costPrice: u.costPrice || "0"
        }))`;

const replacement = `units: editingProduct.tempUnits.map(u => ({
          id: u.id,
          unitName: u.unitName,
          barcode: u.barcode && u.barcode.trim() ? u.barcode.trim() : generateAutoBarcode(),
          conversionFactor: parseInt(u.conversionFactor) || 1,
          retailPrice: u.retailPrice || "0",
          wholesalePrice: u.wholesalePrice || "0",
          costPrice: u.costPrice || "0"
        }))`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched units mapping in App.tsx");
} else {
    console.log("Target string not found.");
}
