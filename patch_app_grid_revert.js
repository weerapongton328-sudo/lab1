const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">`;
const replace1 = `              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 h-full">`;

if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    console.log('reverted grid 1');
}

const target2 = `            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0 overflow-hidden">`;
const replace2 = `            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 h-full overflow-hidden">`;

if (code.includes(target2)) {
    code = code.replace(target2, replace2);
    console.log('reverted grid 2');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
