const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

const targetPath = 'const distPath = path.join(process.cwd(), "dist");';
const replacePath = 'const distPath = path.join(__dirname, process.env.NODE_ENV === "production" ? "" : "../dist");';

if (code.includes(targetPath)) {
    code = code.replace(targetPath, replacePath);
    console.log("patched distPath");
} else {
    console.log("target distPath not found");
}

fs.writeFileSync('LabPos-main/server.ts', code);
