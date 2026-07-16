const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `  const handleBarcodeChange = (val: string) => {
    setBarcodeSearch(convertThaiToEngKeyboard(val));
  };`;
const replacement1 = `  const handleBarcodeChange = (val: string) => {
    setBarcodeSearch(convertThaiToEngKeyboard(val, true));
  };`;

const target2 = `      const currentValue = convertThaiToEngKeyboard(e.currentTarget.value).trim();`;
const replacement2 = `      const currentValue = convertThaiToEngKeyboard(e.currentTarget.value, true).trim();`;

const target3 = `                                    const term = convertThaiToEngKeyboard(e.currentTarget.value).trim().toLowerCase();`;
const replacement3 = `                                    const term = convertThaiToEngKeyboard(e.currentTarget.value, true).trim().toLowerCase();`;

if (code.includes(target1)) code = code.replace(target1, replacement1);
if (code.includes(target2)) code = code.replace(target2, replacement2);
if (code.includes(target3)) code = code.replaceAll(target3, replacement3);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log("Patched force true");
