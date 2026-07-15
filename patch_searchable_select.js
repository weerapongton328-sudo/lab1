const fs = require('fs');
let code = fs.readFileSync('LabPos-main/src/App.tsx', 'utf8');

const componentCode = `
const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  className 
}: { 
  options: { label: string; value: string; searchText?: string }[], 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string, 
  className?: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      const selected = options.find(o => o.value === value);
      setSearchTerm(selected ? selected.label : "");
    }
  }, [value, isOpen, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(o => 
      o.label.toLowerCase().includes(term) || 
      (o.searchText && o.searchText.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If there's an exact match for a barcode or label, pick it
      const term = searchTerm.toLowerCase();
      const exactMatch = filteredOptions.find(o => 
        (o.searchText && o.searchText.toLowerCase().split(" ").includes(term)) ||
        o.label.toLowerCase() === term
      ) || (filteredOptions.length === 1 ? filteredOptions[0] : null);
      
      if (exactMatch) {
        onChange(exactMatch.value);
        setSearchTerm(exactMatch.label);
        setIsOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        className={className}
        placeholder={placeholder}
        value={isOpen ? searchTerm : (options.find(o => o.value === value)?.label || "")}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={(e) => {
          setSearchTerm("");
          setIsOpen(true);
          e.target.select();
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <li
                key={option.value}
                className="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-slate-800 text-sm border-b border-slate-50 last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(option.value);
                  setSearchTerm(option.label);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-500 text-sm text-center">ไม่พบข้อมูล</li>
          )}
        </ul>
      )}
    </div>
  );
};

`;

if (!code.includes('SearchableSelect = ({')) {
    code = code.replace('export default function App() {', componentCode + 'export default function App() {');
    fs.writeFileSync('LabPos-main/src/App.tsx', code);
    console.log('Injected SearchableSelect component');
} else {
    console.log('SearchableSelect already exists');
}
