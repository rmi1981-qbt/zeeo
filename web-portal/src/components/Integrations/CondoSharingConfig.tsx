import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Shield, Building2, Check, X, MapPin } from 'lucide-react';

interface CondoPartner {
    id: string;
    name: string;
    city: string;
    state: string;
    isProvidingToMe: boolean;     // Se eles deixam EU consultar a base deles
    isConsumingFromMe: boolean;  // Se EU deixo eles consultarem minha base
}

const MOCK_CONDOS: CondoPartner[] = [
    { id: 'c1', name: 'Residencial Alphaville I', city: 'São Paulo', state: 'SP', isProvidingToMe: true, isConsumingFromMe: false },
    { id: 'c2', name: 'Condomínio Parque das Árvores', city: 'São Paulo', state: 'SP', isProvidingToMe: false, isConsumingFromMe: true },
    { id: 'c3', name: 'Edifício Central Plaza', city: 'Campinas', state: 'SP', isProvidingToMe: true, isConsumingFromMe: true },
    { id: 'c4', name: 'Vila Nova Conceição Corporate', city: 'São Paulo', state: 'SP', isProvidingToMe: false, isConsumingFromMe: false },
    { id: 'c5', name: 'Condomínio Golden Ville', city: 'Rio de Janeiro', state: 'RJ', isProvidingToMe: false, isConsumingFromMe: false },
];

export const CondoSharingConfig: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [partners, setPartners] = useState<CondoPartner[]>(MOCK_CONDOS);

    const togglePermission = (id: string, field: 'isConsumingFromMe') => {
        setPartners(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: !p[field] } : p
        ));
    };

    const toggleAll = (state: boolean) => {
        setPartners(prev => prev.map(p => {
            // Apply only to filtered if there's a search, else to all
            if (filteredCondos.some(fc => fc.id === p.id)) {
                return { ...p, isConsumingFromMe: state };
            }
            return p;
        }));
    }


    const filteredCondos = partners.filter(c => {
        const matchesName = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.city.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesState = stateFilter ? c.state === stateFilter : true;
        return matchesName && matchesState;
    });

    const states = Array.from(new Set(partners.map(c => c.state))).sort();

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:p-8 mt-8">
            <div className="flex items-start gap-4 mb-8">
                <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl">
                    <Shield className="text-purple-400" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Compartilhamento de Base Biométrica (Rede Zeeo)</h2>
                    <p className="text-slate-400">
                        Fortaleça a validação de acesso ao seu condomínio participando da rede descentralizada.
                        Configure abaixo com quais condomínios você aceita trocar dados de biometria facial para fallback em caso de visitantes/prestadores recorrentes.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou cidade..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                </div>
                <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors md:w-48 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                >
                    <option value="">Todos os Estados</option>
                    {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <button
                        onClick={() => toggleAll(true)}
                        className="px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-medium transition-colors"
                    >
                        Autorizar Todos
                    </button>
                    <button
                        onClick={() => toggleAll(false)}
                        className="px-4 py-3 bg-slate-800/50 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl font-medium transition-colors"
                    >
                        Revogar Todos
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 text-sm text-slate-400">
                            <th className="p-4 font-semibold">Condomínio Parceiro</th>
                            <th className="p-4 font-semibold">Localização</th>
                            <th className="p-4 font-semibold text-center">Eles Autorizam Você?</th>
                            <th className="p-4 font-semibold text-center">Você Autoriza Eles?</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filteredCondos.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    Nenhum condomínio encontrado com esses filtros.
                                </td>
                            </tr>
                        ) : (
                            filteredCondos.map(condo => (
                                <tr key={condo.id} className="hover:bg-slate-900/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                                <Building2 size={18} className="text-slate-400" />
                                            </div>
                                            <span className="font-medium text-slate-200">{condo.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <MapPin size={14} />
                                            {condo.city}, {condo.state}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center">
                                            {condo.isProvidingToMe ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold uppercase">
                                                    <Check size={12} /> Liberado
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-500 rounded-full text-xs font-semibold uppercase">
                                                    <X size={12} /> Bloqueado
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center">
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => togglePermission(condo.id, 'isConsumingFromMe')}
                                                className={`w-12 h-6 rounded-full relative cursor-pointer flex items-center px-1 transition-colors ${condo.isConsumingFromMe ? 'bg-purple-500' : 'bg-slate-700'}`}
                                            >
                                                <motion.div
                                                    layout
                                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                                    animate={{ x: condo.isConsumingFromMe ? 24 : 0 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </motion.button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
