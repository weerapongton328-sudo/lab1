const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetRegex = /const printViaIframe = \(\) => \{[\s\S]*?const triggerAutoPrint = \(\) => \{/m;

const replacement = `const printViaIframe = () => {
    // หา Layout ที่กำลังเปิดใช้อยู่
    const layouts = [
      'thermal-print-layout', 
      'thermal-print-layout-bill', 
      'a4-print-layout', 
      'label-print-layout'
    ];
    
    let targetElement = null;
    for (const id of layouts) {
      const el = document.getElementById(id);
      if (el && window.getComputedStyle(el).display !== 'none') {
        targetElement = el;
        break;
      }
    }

    if (!targetElement) {
      window.print(); // Fallback กลับไปใช้คำสั่งเดิมถ้าหาไม่เจอ
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const pri = iframe.contentWindow;
    if (!pri) {
      window.print();
      return;
    }

    let stylesHTML = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => {
      stylesHTML += s.outerHTML;
    });

    const execPrint = () => {
      if (iframe.dataset.printed) return;
      iframe.dataset.printed = 'true';
      pri.focus();
      pri.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    iframe.onload = execPrint;

    pri.document.open();
    pri.document.write(\`<!DOCTYPE html><html><head><title>Print</title>\${stylesHTML}<style>@page { size: auto; margin: 0mm; } body { margin: 0; padding: 0; background: white !important; font-family: "Tahoma", sans-serif; -webkit-print-color-adjust: exact; } #\${targetElement.id} { display: block !important; visibility: visible !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; } body > :not(#\${targetElement.id}) { display: none !important; }</style></head><body>\${targetElement.outerHTML}</body></html>\`);
    pri.document.close();

    // หน่วงเวลาสั้นมากๆ (50ms) เพื่อให้ CSS โหลดทัน แต่ไม่ทำให้ผู้ใช้รู้สึกว่าช้า
    setTimeout(execPrint, 50);
  };

  const triggerAutoPrint = () => {`;

if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched printViaIframe for extreme speed.");
} else {
    console.log("Could not find the target block to patch.");
}
