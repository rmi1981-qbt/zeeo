import { useNavigate } from 'react-router-dom';
import { type Condo } from '../services/condoService';
import { Building2, Search, MapPin, Edit2, Map, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface CondoGridViewProps {
    condos: Condo[];
    onSelect: (condo: Condo) => void;
    onViewOnMap: (condo: Condo) => void;
    onDelete: (condo: Condo) => void;
}

export function CondoGridView({ condos, onSelect, onViewOnMap, onDelete }: CondoGridViewProps) {
    const navigate = useNavigate();

    function handleEdit(condo: Condo) {
        navigate(`/condominium-settings?id=${condo.id}`);
    }

    if (condos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-2xl border border-slate-700/50 mt-4 backdrop-blur-sm w-full">
                <Search size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Nenhum condomínio encontrado</h3>
                <p className="text-slate-400">Tente ajustar seus filtros de busca para encontrar o que procura.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
            {condos.map((condo, index) => (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    key={condo.id} 
                    className="flex flex-col bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden hover:border-primary-500/50 hover:-translate-y-1 transition-all shadow-xl group"
                >
                    <div className="p-6 flex-1 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-900/50 to-slate-800 flex items-center justify-center border border-primary-500/20 shadow-inner mb-4 group-hover:border-primary-500/50 transition-colors">
                            <Building2 size={36} className="text-primary-400 group-hover:text-primary-300 transition-colors" />
                        </div>
                        
                        <h2 className="text-xl font-bold text-slate-100 group-hover:text-white transition-colors line-clamp-2 min-h-[56px] flex items-center justify-center">{condo.name}</h2>
                        
                        <div className="mt-4 flex flex-col gap-2 items-center w-full pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-1.5 text-sm text-slate-400">
                                <MapPin size={14} className="text-slate-500 shrink-0" />
                                <span className="truncate">
                                    {condo.city && condo.state ? `${condo.city}/${condo.state}` : 'Localização não informada'}
                                </span>
                            </div>
                            
                            {condo.neighborhood && (
                                <p className="text-xs text-slate-500 truncate w-full">{condo.neighborhood}</p>
                            )}
                            
                            {condo.address && (
                                <p className="text-xs text-slate-500 truncate w-full">
                                    {condo.address}{condo.number && `, ${condo.number}`}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex flex-col gap-3">
                        <button
                            onClick={() => onSelect(condo)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/20 transition-all text-sm"
                            title="Acessar painel principal do condomínio"
                        >
                            Acessar Painel <ArrowRight size={16} />
                        </button>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleEdit(condo)}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium"
                            >
                                <Edit2 size={14} /> Editar
                            </button>
                            <button
                                onClick={() => onViewOnMap(condo)}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-primary-400 transition-all text-xs font-medium"
                            >
                                <Map size={14} /> Mapa
                            </button>
                            <button
                                onClick={() => onDelete(condo)}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 transition-all text-xs font-medium"
                            >
                                <Trash2 size={14} /> Excluir
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
