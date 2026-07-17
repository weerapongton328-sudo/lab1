const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `  const triggerAutoPrint = () => {
    setTimeout(() => {
      window.print();
    }, 0); // หน่วงเวลา 0ms ให้ DOM Render ใบเสร็จ
  };`;

const replacement = `  const printViaIframe = () => {
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

    pri.document.open();
    pri.document.write('<!DOCTYPE html><html><head><title>Print Receipt</title>');
    
    // ดึง Style ของ Tailwind จากหน้าจอหลักเข้าไปใน Iframe เพื่อไม่ให้ UI เพี้ยน
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((s) => {
      pri.document.write(s.outerHTML);
    });

    // เขียน CSS พื้นฐานเพิ่มเพื่อรีดความเร็วและบังคับโชว์ Layout
    pri.document.write('<style>');
    pri.document.write('body { margin: 0; padding: 0; background: white !important; }');
    pri.document.write('#' + targetElement.id + ' { display: block !important; visibility: visible !important; position: static !important; width: 100% !important; margin: 0 !important; }');
    pri.document.write('</style>');

    pri.document.write('</head><body>');
    pri.document.write(targetElement.outerHTML);
    pri.document.write('</body></html>');
    pri.document.close();

    // หน่วงเวลาเล็กน้อยเพื่อให้ CSS ใน Iframe โหลดเสร็จก่อนสั่งพิมพ์
    setTimeout(() => {
      pri.focus();
      pri.print();
      // ลบ Iframe ทิ้งหลังใช้งานเพื่อคืนหน่วยความจำ
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  const triggerAutoPrint = () => {
    setTimeout(() => {
      printViaIframe();
    }, 0); // หน่วงเวลาให้ DOM Render ใบเสร็จ ก่อนดึงเข้า Iframe
  };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('LabPos-main/src/App.tsx', code);
  console.log("Patched triggerAutoPrint with printViaIframe successfully.");
} else {
  console.log("Could not find triggerAutoPrint target block.");
}
