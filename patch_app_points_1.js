const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetState = `  const [storeBillRoundingMode, setStoreBillRoundingMode] = useState<"none" | "floor" | "ceil" | "round" | "round_025">("none");`;
const replaceState = `  const [storeEnablePointSystem, setStoreEnablePointSystem] = useState(true);
  const [storeBillRoundingMode, setStoreBillRoundingMode] = useState<"none" | "floor" | "ceil" | "round" | "round_025">("none");`;

if (code.includes(targetState)) {
    code = code.replace(targetState, replaceState);
    console.log('patched state');
}

const targetSync = `      setStoreEnableBillPayment(storeSettingsData.enableBillPayment !== false);`;
const replaceSync = `      setStoreEnableBillPayment(storeSettingsData.enableBillPayment !== false);
      setStoreEnablePointSystem(storeSettingsData.enablePointSystem !== false);`;

if (code.includes(targetSync)) {
    code = code.replace(targetSync, replaceSync);
    console.log('patched sync');
}

const targetSave = `          enableBillPayment: storeEnableBillPayment,`;
const replaceSave = `          enablePointSystem: storeEnablePointSystem,
          enableBillPayment: storeEnableBillPayment,`;

if (code.includes(targetSave)) {
    code = code.replace(targetSave, replaceSave);
    console.log('patched save');
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
