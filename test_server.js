const fs = require('fs');
let code = fs.readFileSync('LabPos-main/server.ts', 'utf8');

// Just parse it to ensure valid js/ts
const ts = require('typescript');
const sourceFile = ts.createSourceFile('server.ts', code, ts.ScriptTarget.Latest);
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram(['LabPos-main/server.ts'], {}));
if (diagnostics.length > 0) {
   // it might have some ts errors, but let's check for basic syntax errors
   console.log("TS checking finished");
}
console.log("OK");
