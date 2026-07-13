const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const target1 = `  const [storePointsToDiscountRatio, setStorePointsToDiscountRatio] = useState("10");
  const [storePointsEarnRatio, setStorePointsEarnRatio] = useState("20");`;

const replace1 = `  const [storePointsToDiscountRatio, setStorePointsToDiscountRatio] = useState("10");
  const [storePointsEarnRatio, setStorePointsEarnRatio] = useState("20");
  const [storeMinPurchaseForPointsRedeem, setStoreMinPurchaseForPointsRedeem] = useState("0");`;

code = code.replace(target1, replace1);

const target2 = `      setStorePointsToDiscountRatio(storeSettingsData.pointsToDiscountRatio || "10");
      setStorePointsEarnRatio(storeSettingsData.pointsEarnRatio || "20");`;

const replace2 = `      setStorePointsToDiscountRatio(storeSettingsData.pointsToDiscountRatio || "10");
      setStorePointsEarnRatio(storeSettingsData.pointsEarnRatio || "20");
      setStoreMinPurchaseForPointsRedeem(storeSettingsData.minPurchaseForPointsRedeem || "0");`;

code = code.replace(target2, replace2);

const target3 = `          pointsToDiscountRatio: storePointsToDiscountRatio,
          pointsEarnRatio: storePointsEarnRatio,`;

const replace3 = `          pointsToDiscountRatio: storePointsToDiscountRatio,
          pointsEarnRatio: storePointsEarnRatio,
          minPurchaseForPointsRedeem: storeMinPurchaseForPointsRedeem,`;

code = code.replace(target3, replace3);

fs.writeFileSync('LabPos-main/src/App.tsx', code);
console.log('patched App.tsx state');
