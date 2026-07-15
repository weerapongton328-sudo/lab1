const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

code = code.replace(/setTimeout\(\(\) => \{\n\s*window\.print\(\);\n\s*\}, 15\); \/\/ หน่วงเวลา 15ms ให้ DOM Render ใบเสร็จ/g, 
\`setTimeout(() => {
      window.print();
    }, 0); // เปลี่ยนเป็น 0ms ตามที่ผู้ใช้ต้องการ\`);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
