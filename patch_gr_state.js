const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target = `  const [grSearchPoNumber, setGrSearchPoNumber] = useState<string>("");`;
const replacement = `  const [grSearchPoNumber, setGrSearchPoNumber] = useState<string>("");
  const [grBarcodeScan, setGrBarcodeScan] = useState<string>("");`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched state");
} else {
    console.log("Not found");
}

const target2 = `                                placeholder="สแกนบาร์โค้ดเพื่อรับของ..."
                                value={grSearchPoNumber}
                                onChange={(e) => setGrSearchPoNumber(e.target.value)}`;

const replacement2 = `                                placeholder="สแกนบาร์โค้ดเพื่อรับของ..."
                                value={grBarcodeScan}
                                onChange={(e) => setGrBarcodeScan(e.target.value)}`;

if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched input");
} else {
    console.log("Not found input");
}

const target3 = `                                    setGrSearchPoNumber("");
                                  }
                                }}
                              />`;

const replacement3 = `                                    setGrBarcodeScan("");
                                  }
                                }}
                              />`;

if (code.includes(target3)) {
    code = code.replace(target3, replacement3);
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log("Patched input clear");
} else {
    console.log("Not found clear");
}
