import { useState, useEffect } from 'react';
import { type Condo } from '../services/condoService';
import '../styles/SearchFilters.css';

interface SearchFiltersProps {
    condos: Condo[];
    onFilterChange: (filtered: Condo[]) => void;
}

export function SearchFilters({ condos, onFilterChange }: SearchFiltersProps) {
    const [searchName, setSearchName] = useState<string>('');
    const [selectedUF, setSelectedUF] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');

    // Extrair UFs únicas
    const states = [...new Set(condos.map(c => c.state).filter(Boolean))].sort();

    // Extrair municípios da UF selecionada
    const cities = selectedUF
        ? [...new Set(condos.filter(c => c.state === selectedUF).map(c => c.city).filter(Boolean))].sort()
        : [];

    // Filtrar condos quando qualquer filtro muda
    useEffect(() => {
        let filtered = condos;

        // Filtro por nome (case-insensitive)
        if (searchName.trim()) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchName.toLowerCase())
            );
        }

        // Filtro por UF
        if (selectedUF) {
            filtered = filtered.filter(c => c.state === selectedUF);
        }

        // Filtro por município
        if (selectedCity) {
            filtered = filtered.filter(c => c.city === selectedCity);
        }

        onFilterChange(filtered);
    }, [searchName, selectedUF, selectedCity, condos, onFilterChange]);

    function handleClear() {
        setSearchName('');
        setSelectedUF('');
        setSelectedCity('');
    }

    return (
        <div className="search-filters">
            <div className="filter-group">
                <label htmlFor="search-name">Buscar por nome</label>
                <input
                    id="search-name"
                    type="text"
                    placeholder="Digite o nome do condomínio..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="filter-input"
                />
            </div>

            <div className="filter-group">
                <label htmlFor="filter-uf">Estado (UF)</label>
                <select
                    id="filter-uf"
                    value={selectedUF}
                    onChange={(e) => {
                        setSelectedUF(e.target.value);
                        setSelectedCity(''); // Reset cidade ao mudar UF
                    }}
                    className="filter-select"
                >
                    <option value="">Todos os Estados</option>
                    {states.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <label htmlFor="filter-city">Município</label>
                <select
                    id="filter-city"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedUF}
                    className="filter-select"
                >
                    <option value="">Todos os Municípios</option>
                    {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleClear}
                className="clear-filters-btn"
                disabled={!searchName && !selectedUF && !selectedCity}
            >
                🔄 Limpar Filtros
            </button>
        </div>
    );
}
