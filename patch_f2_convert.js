const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `                onChange={(e) => {
                  setModalSearchQuery(e.target.value);
                  setModalSearchFocusedProductIndex(0);
                  setModalSearchFocusedUnitIndex(0);
                }}`;
const replacement = `                onChange={(e) => {
                  setModalSearchQuery(convertThaiToEngKeyboard(e.target.value));
                  setModalSearchFocusedProductIndex(0);
                  setModalSearchFocusedUnitIndex(0);
                }}`;

code = code.replace(target, replacement);
fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log("Patched F2 query convert");
