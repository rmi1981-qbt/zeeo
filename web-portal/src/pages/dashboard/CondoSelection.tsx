import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SearchFilters } from '../../components/SearchFilters';
import { CondoListView } from '../../components/CondoListView';
import { CondoGridView } from '../../components/CondoGridView';
import { CondoMapView } from '../../components/CondoMapView';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { condoService, type Condo } from '../../services/condoService';
import { motion } from 'framer-motion';
import { Building2, List, Grid3X3, Map, Plus, AlertTriangle, Loader2 } from 'lucide-react';

type ViewMode = 'list' | 'grid' | 'map';

export default function CondoSelector() {
    const { selectCondo } = useAuth();
    const navigate = useNavigate();
    const [condos, setCondos] = useState<Condo[]>([]);
    const [filteredCondos, setFilteredCondos] = useState<Condo[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [condoToDelete, setCondoToDelete] = useState<Condo | null>(null);

    useEffect(() => {
        async function loadCondos() {
            try {
                setLoading(true);
                setError(null);
                const data = await condoService.getCondos();
                setCondos(data);
                setFilteredCondos(data);
            } catch (err) {
                console.error('Error loading condos:', err);
                setError('Erro ao carregar condomínios. Tente novamente.');
            } finally {
                setLoading(false);
            }
        }

        loadCondos();
    }, []);

    function handleSelectCondo(condo: Condo) {
        selectCondo(condo.id);
        navigate('/');
    }

    function handleViewOnMap(condo: Condo) {
        if (viewMode !== 'map') {
            setViewMode('map');
        }
        setFilteredCondos([condo]);
    }

    function requestDelete(condo: Condo) {
        setCondoToDelete(condo);
        setShowDeleteModal(true);
    }

    async function confirmDelete() {
        if (!condoToDelete) return;

        try {
            await condoService.deleteCondo(condoToDelete.id);
            const updatedCondos = condos.filter(c => c.id !== condoToDelete.id);
            setCondos(updatedCondos);
            setFilteredCondos(updatedCondos);
            setShowDeleteModal(false);
            setCondoToDelete(null);
        } catch (err) {
            console.error('Error deleting condo:', err);
            alert(`Erro ao excluir condomínio: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
            setShowDeleteModal(false);
            setCondoToDelete(null);
        }
    }

    function cancelDelete() {
        setShowDeleteModal(false);
        setCondoToDelete(null);
    }

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-950 min-h-screen">
                <Loader2 className="animate-spin text-primary-500 mb-4" size={48} />
                <p className="text-slate-400 font-medium">Carregando condomínios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-950 min-h-screen">
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-8 max-w-md w-full text-center">
                    <AlertTriangle className="text-rose-500 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-white mb-2">Erro ao Carregar</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors border border-slate-700 hover:border-slate-600"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative bg-slate-950 min-h-screen">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                    <div>
                        <motion.h1 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight"
                        >
                            Meus <span className="text-primary-400">Condomínios</span>
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-slate-400 max-w-2xl"
                        >
                            {condos.length === 0 ? 'Nenhum condomínio cadastrado' : 
                             condos.length === 1 ? '1 condomínio encontrado' : 
                             `${condos.length} condomínios encontrados`}
                            
                            {filteredCondos.length !== condos.length &&
                                ` (${filteredCondos.length} ${filteredCondos.length === 1 ? 'filtrado' : 'filtrados'})`
                            }
                        </motion.p>
                    </div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <button
                            onClick={() => navigate('/condo-setup')}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-[0_0_20px_rgba(var(--primary-500),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-500),0.5)] transition-all whitespace-nowrap"
                        >
                            <Plus size={20} />
                            Novo Condomínio
                        </button>
                    </motion.div>
                </header>

                {condos.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Filters and View Toggles */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-xl">
                            <div className="flex-1">
                                <SearchFilters condos={condos} onFilterChange={setFilteredCondos} />
                            </div>

                            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
                                <button
                                    className={`flex items-center justify-center p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    onClick={() => setViewMode('list')}
                                    title="Visualização em lista"
                                >
                                    <List size={20} />
                                </button>
                                <button
                                    className={`flex items-center justify-center p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Visualização em grade"
                                >
                                    <Grid3X3 size={20} />
                                </button>
                                <button
                                    className={`flex items-center justify-center p-2.5 rounded-lg transition-all ${viewMode === 'map' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    onClick={() => setViewMode('map')}
                                    title="Visualização no mapa"
                                >
                                    <Map size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="min-h-[400px]">
                            {viewMode === 'list' && (
                                <CondoListView
                                    condos={filteredCondos}
                                    onSelect={handleSelectCondo}
                                    onViewOnMap={handleViewOnMap}
                                    onDelete={requestDelete}
                                />
                            )}

                            {viewMode === 'grid' && (
                                <CondoGridView
                                    condos={filteredCondos}
                                    onSelect={handleSelectCondo}
                                    onViewOnMap={handleViewOnMap}
                                    onDelete={requestDelete}
                                />
                            )}

                            {viewMode === 'map' && (
                                <div className="h-[600px] rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
                                    <CondoMapView
                                        condos={filteredCondos}
                                        onViewOnMap={handleViewOnMap}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {condos.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-12 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 text-center shadow-2xl flex flex-col items-center"
                    >
                        <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center border border-primary-500/20 mb-6">
                            <Building2 size={48} className="text-primary-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Nenhum Condomínio Cadastrado</h2>
                        <p className="text-slate-400 mb-8 max-w-md">Cadastre seu primeiro condomínio para começar a gerenciar acessos, integrações e portões virtuais.</p>
                        <button
                            onClick={() => navigate('/condo-setup')}
                            className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-[0_0_20px_rgba(var(--primary-500),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-500),0.5)] transition-all"
                        >
                            <Plus size={24} />
                            Cadastrar Condomínio
                        </button>
                    </motion.div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteModal}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja excluir o condomínio "${condoToDelete?.name}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
            />
        </div>
    );
}
