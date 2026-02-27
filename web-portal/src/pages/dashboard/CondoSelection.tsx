import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SearchFilters } from '../../components/SearchFilters';
import { CondoListView } from '../../components/CondoListView';
import { CondoGridView } from '../../components/CondoGridView';
import { CondoMapView } from '../../components/CondoMapView';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { condoService, type Condo } from '../../services/condoService';
import '../../styles/CondoSelector.css';

type ViewMode = 'list' | 'grid' | 'map';

export default function CondoSelector() {
    const { selectCondo } = useAuth();
    const navigate = useNavigate();
    const [condos, setCondos] = useState<Condo[]>([]);
    const [filteredCondos, setFilteredCondos] = useState<Condo[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para o modal de confirmação
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [condoToDelete, setCondoToDelete] = useState<Condo | null>(null);

    // Carregar condos ao montar
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
        navigate('/'); // Redirect to let RoleBasedRedirect route the user
    }

    function handleViewOnMap(condo: Condo) {
        // Mudar para visualização de mapa se não estiver
        if (viewMode !== 'map') {
            setViewMode('map');
        }

        // Filtrar para mostrar apenas este condo
        setFilteredCondos([condo]);

        console.log('Viewing condo on map:', condo);
    }

    function requestDelete(condo: Condo) {
        setCondoToDelete(condo);
        setShowDeleteModal(true);
    }

    async function confirmDelete() {
        if (!condoToDelete) return;

        try {
            await condoService.deleteCondo(condoToDelete.id);

            // Atualizar listas removendo o condo excluído
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
            <div className="condo-selector-loading">
                <div className="spinner"></div>
                <p>Carregando condomínios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="condo-selector-error">
                <div className="error-icon">⚠️</div>
                <h2>Erro ao Carregar</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="condo-selector-page">
            <header className="selector-header">
                <div className="header-content">
                    <h1>Selecione seu Condomínio</h1>
                    <p className="header-subtitle">
                        {condos.length === 0 && 'Nenhum condomínio cadastrado'}
                        {condos.length === 1 && '1 condomínio encontrado'}
                        {condos.length > 1 && `${condos.length} condomínios encontrados`}
                        {filteredCondos.length !== condos.length &&
                            ` (${filteredCondos.length} ${filteredCondos.length === 1 ? 'filtrado' : 'filtrados'})`
                        }
                    </p>
                </div>
            </header>

            {condos.length > 0 && (
                <>
                    <SearchFilters
                        condos={condos}
                        onFilterChange={setFilteredCondos}
                    />

                    <div className="view-toggle">
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Visualização em lista"
                        >
                            <span className="view-icon">📋</span>
                            <span className="view-label">Lista</span>
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Visualização em grade"
                        >
                            <span className="view-icon">🔲</span>
                            <span className="view-label">Grade</span>
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
                            onClick={() => setViewMode('map')}
                            title="Visualização em mapa"
                        >
                            <span className="view-icon">🗺️</span>
                            <span className="view-label">Mapa</span>
                        </button>
                    </div>

                    <div className="view-content">
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
                            <CondoMapView
                                condos={filteredCondos}
                                onViewOnMap={handleViewOnMap}
                            />
                        )}
                    </div>
                </>
            )}

            {condos.length === 0 && (
                <div className="empty-initial">
                    <div className="empty-icon">🏢</div>
                    <h2>Nenhum Condomínio Cadastrado</h2>
                    <p>Cadastre seu primeiro condomínio para começar a gerenciar.</p>
                    <button
                        className="btn-register"
                        onClick={() => window.location.href = '/register-condominium'}
                    >
                        ➕ Cadastrar Condomínio
                    </button>
                </div>
            )}

            {/* Modal de confirmação de exclusão */}
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
