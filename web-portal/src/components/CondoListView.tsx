import { useNavigate } from 'react-router-dom';
import { type Condo } from '../services/condoService';
import { Building2, MapPin, Search, Edit2, Map, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
// import '../styles/CondoListView.css'; // Removed old CSS

interface CondoListViewProps {
    condos: Condo[];
    onSelect: (condo: Condo) => void;
    onViewOnMap: (condo: Condo) => void;
    onDelete: (condo: Condo) => void;
}

export function CondoListView({ condos, onSelect, onViewOnMap, onDelete }: CondoListViewProps) {
    const navigate = useNavigate();

    function handleEdit(condo: Condo) {
        navigate(`/condominium-settings?id=${condo.id}`);
    }

    if (condos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-2xl border border-slate-700/50 mt-4 backdrop-blur-sm">
                <Search size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhum condomínio encontrado</h3>
                <p className="text-slate-400">Tente ajustar seus filtros de busca para encontrar o que procura.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 mt-4">
            {condos.map((condo, index) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={condo.id} 
                    className="flex flex-col md:flex-row items-center justify-between p-5 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl hover:border-primary-500/50 hover:bg-slate-800/80 transition-all shadow-lg group gap-6"
                >
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-900/50 to-slate-800 flex items-center justify-center border border-primary-500/20 shadow-inner shrink-0 group-hover:border-primary-500/50 transition-colors">
                            <Building2 size={28} className="text-primary-400 group-hover:text-primary-300 transition-colors" />
                        </div>
                        
                        <div className="flex flex-col">
                            <h3 className="text-xl font-bold text-slate-100 group-hover:text-white transition-colors">{condo.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400">
                                <div className="flex items-center gap-1">
                                    <MapPin size={14} className="text-slate-500" />
                                    <span>
                                        {condo.city && condo.state ? `${condo.city}/${condo.state}` : 'Localização não informada'}
                                    </span>
                                </div>
                                {condo.neighborhood && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span>{condo.neighborhood}</span>
                                    </>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                {condo.address && `${condo.address}`}
                                {condo.number && `, ${condo.number}`}
                                {condo.zip_code && ` - CEP: ${condo.zip_code}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <button
                            onClick={() => onSelect(condo)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all shrink-0"
                            title="Acessar painel do condomínio"
                        >
                            Acessar <ArrowRight size={18} />
                        </button>
                        
                        <button
                            onClick={() => handleEdit(condo)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all shrink-0"
                            title="Editar condomínio"
                        >
                            <Edit2 size={18} />
                        </button>
                        
                        <button
                            onClick={() => onViewOnMap(condo)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-primary-400 transition-all shrink-0"
                            title="Visualizar no mapa"
                        >
                            <Map size={18} />
                        </button>
                        
                        <button
                            onClick={() => onDelete(condo)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-500 transition-all shrink-0"
                            title="Excluir condomínio"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
