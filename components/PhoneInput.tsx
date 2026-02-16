
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  prefix: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'AR', name: 'Argentina', prefix: '+54', flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia', prefix: '+591', flag: '🇧🇴' },
  { code: 'BR', name: 'Brasil', prefix: '+55', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', prefix: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', prefix: '+57', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', prefix: '+506', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', prefix: '+53', flag: '🇨🇺' },
  { code: 'EC', name: 'Ecuador', prefix: '+593', flag: '🇪🇨' },
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸' },
  { code: 'GT', name: 'Guatemala', prefix: '+502', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', prefix: '+504', flag: '🇭🇳' },
  { code: 'MX', name: 'México', prefix: '+52', flag: '🇲🇽' },
  { code: 'NI', name: 'Nicaragua', prefix: '+505', flag: '🇳🇮' },
  { code: 'PA', name: 'Panamá', prefix: '+507', flag: '🇵🇦' },
  { code: 'PE', name: 'Perú', prefix: '+51', flag: '🇵🇪' },
  { code: 'PY', name: 'Paraguay', prefix: '+595', flag: '🇵🇾' },
  { code: 'SV', name: 'El Salvador', prefix: '+503', flag: '🇸🇻' },
  { code: 'UY', name: 'Uruguay', prefix: '+598', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', prefix: '+58', flag: '🇻🇪' },
  { code: 'US', name: 'Estados Unidos', prefix: '+1', flag: '🇺🇸' },
];

interface PhoneInputProps {
  value: string; // El número local sin el prefijo
  countryCode: string; // ej. "AR"
  onChange: (data: { phoneNumber: string, countryCode: string, fullPhone: string }) => void;
  label?: string;
  required?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ value, countryCode, onChange, label, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedCountry = useMemo(() => 
    COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]
  , [countryCode]);

  const filteredCountries = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.prefix.includes(term) || 
      c.code.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    onChange({
      phoneNumber: numericValue,
      countryCode: selectedCountry.code,
      fullPhone: `${selectedCountry.prefix}${numericValue}`
    });
  };

  const handleSelectCountry = (country: Country) => {
    onChange({
      phoneNumber: value,
      countryCode: country.code,
      fullPhone: `${country.prefix}${value}`
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-2 group relative" ref={dropdownRef}>
      {label && (
        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 group-focus-within:text-black transition-colors">
          {label}
        </label>
      )}
      
      <div className={`flex h-14 bg-white border rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-black ring-4 ring-slate-100' : 'border-[#eaeaea] hover:border-slate-300'}`}>
        {/* Country Picker Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 border-r border-[#eaeaea] bg-slate-50/50 hover:bg-slate-50 transition-colors min-w-[100px] justify-center"
        >
          <span className="text-xl leading-none">{selectedCountry.flag}</span>
          <span className="text-sm font-bold text-slate-900">{selectedCountry.prefix}</span>
          <ChevronDown size={14} className={`text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Number Input */}
        <input
          type="tel"
          value={value}
          onChange={handleNumberChange}
          className="flex-1 bg-transparent px-5 text-base font-bold outline-none placeholder:text-slate-300 text-slate-900"
          placeholder="Número de teléfono"
          required={required}
        />
      </div>

      {/* Country Selection Dropdown */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-3xl shadow-2xl z-[120] animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[320px]">
          <div className="p-3 border-b border-slate-50 sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                autoFocus
                placeholder="Buscar país o prefijo..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-black"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-y-auto no-scrollbar py-2">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors group ${selectedCountry.code === c.code ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl leading-none">{c.flag}</span>
                    <div className="text-left">
                      <p className={`text-sm font-bold leading-tight ${selectedCountry.code === c.code ? 'text-blue-600' : 'text-slate-900'}`}>{c.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{c.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400">{c.prefix}</span>
                    {selectedCountry.code === c.code && <Check size={16} className="text-blue-600" />}
                  </div>
                </button>
              ))
            ) : (
              <div className="py-12 text-center text-slate-300">
                <p className="text-xs font-black uppercase tracking-widest">No se encontraron países</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
