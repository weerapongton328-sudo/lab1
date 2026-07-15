const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const targetFilter = `              {(() => {
                const filteredList = productsList.filter(p => {
                  const isSearchMatched = backendProductSearch === "" || p.name.toLowerCase().includes(backendProductSearch.toLowerCase()) || p.units?.some(u => u.barcode.includes(backendProductSearch));
                  const isCategoryMatched = selectedCategoryFilter === "" || p.category === selectedCategoryFilter;
                  return isSearchMatched && isCategoryMatched;
                });
                const totalPages = Math.ceil(filteredList.length / productsPerPage);`;

const replaceFilter = `              {(() => {
                const filteredList = useMemo(() => productsList.filter(p => {
                  const isSearchMatched = backendProductSearch === "" || p.name.toLowerCase().includes(backendProductSearch.toLowerCase()) || p.units?.some(u => u.barcode.includes(backendProductSearch));
                  const isCategoryMatched = selectedCategoryFilter === "" || p.category === selectedCategoryFilter;
                  return isSearchMatched && isCategoryMatched;
                }), [productsList, backendProductSearch, selectedCategoryFilter]);
                const totalPages = Math.ceil(filteredList.length / productsPerPage);`;

if (code.includes(targetFilter)) {
    code = code.replace(targetFilter, replaceFilter);
    console.log("patched products filter with useMemo");
} else {
    console.log("target products filter not found");
}

fs.writeFileSync('LabPos-main/src/App.tsx', code);
