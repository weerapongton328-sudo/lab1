const fs = require('fs');
let css = fs.readFileSync('LabPos-main/src/index.css', 'utf8');

const target1 = `  /* Thermal Print Layout (80mm) */
  body[data-print-size="thermal"] #thermal-print-layout,
  body[data-print-size="thermal"] #thermal-print-layout-bill {
    display: block !important;
    width: 80mm;
    margin: 0;
    background: white !important;
    color: black !important;
    box-shadow: none !important;
  }`;

const replacement1 = `  /* Thermal Print Layout (80mm) */
  body[data-print-size="thermal"] #thermal-print-layout,
  body[data-print-size="thermal"] #thermal-print-layout-bill {
    display: block !important;
    width: 80mm;
    margin: 0;
    padding: 0;
    background: white !important;
    color: black !important;
    box-shadow: none !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
  }`;

css = css.replace(target1, replacement1);

const target2 = `  body[data-paper-width="58mm"][data-print-size="thermal"] #thermal-print-layout,
  body[data-paper-width="58mm"][data-print-size="thermal"] #thermal-print-layout-bill,
  body[data-paper-width="58mm"]:not([data-print-size]) #thermal-print-layout,
  body[data-paper-width="58mm"]:not([data-print-size]) #thermal-print-layout-bill {
    width: 58mm !important;
  }`;

const replacement2 = `  body[data-paper-width="58mm"][data-print-size="thermal"] #thermal-print-layout,
  body[data-paper-width="58mm"][data-print-size="thermal"] #thermal-print-layout-bill,
  body[data-paper-width="58mm"]:not([data-print-size]) #thermal-print-layout,
  body[data-paper-width="58mm"]:not([data-print-size]) #thermal-print-layout-bill {
    width: 58mm !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
  }`;

css = css.replace(target2, replacement2);

const target3 = `  body * {
    visibility: hidden !important;
  }`;

const replacement3 = `  body * {
    visibility: hidden !important;
    -webkit-print-color-adjust: exact !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }`;

css = css.replace(target3, replacement3);

fs.writeFileSync('LabPos-main/src/index.css', css);
console.log("CSS patched");
