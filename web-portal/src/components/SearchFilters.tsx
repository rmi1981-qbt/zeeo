import { useState, useEffect } from 'react';
import { type Condo } from '../services/condoService';
import { Search, MapPin, Building, RotateCcw } from 'lucide-react';

interface SearchFiltersProps {
    condos: Condo[];
    onFilterChange: (filtered: Condo[]) => void;
}

export function SearchFilters({ condos, onFilterChange }: SearchFiltersProps) {
    const [searchName, setSearchName] = useState<string>('');
    const [selectedUF, setSelectedUF] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');

    const states = [...new Set(condos.map(c => c.state).filter(Boolean))].sort();
    const cities = selectedUF
        ? [...new Set(condos.filter(c => c.state === selectedUF).map(c => c.city).filter(Boolean))].sort()
        : [];

    useEffect(() => {
        let filtered = condos;
        if (searchName.trim()) {
            filtered = filtered.filter(c => c.name.toLowerCase().includes(searchName.toLowerCase()));
        }
        if (selectedUF) filtered = filtered.filter(c => c.state === selectedUF);
        if (selectedCity) filtered = filtered.filter(c => c.city === selectedCity);
        onFilterChange(filtered);
    }, [searchName, selectedUF, selectedCity, condos, onFilterChange]);

    function handleClear() {
        setSearchName('');
        setSelectedUF('');
        setSelectedCity('');
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm"
                />
            </div>

            <div className="relative flex-1 md:max-w-[180px]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <select
                    value={selectedUF}
                    onChange={(e) => {
                        setSelectedUF(e.target.value);
                        setSelectedCity('');
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm"
                >
                    <option value="">Estado (Todos)</option>
                    {states.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
            </div>

            <div className="relative flex-1 md:max-w-[200px]">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedUF}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="">Cidade (Todas)</option>
                    {cities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
            </div>

            <button
                onClick={handleClear}
                disabled={!searchName && !selectedUF && !selectedCity}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
                <RotateCcw size={16} />
                Limpar
            </button>
        </div>
    );
}
