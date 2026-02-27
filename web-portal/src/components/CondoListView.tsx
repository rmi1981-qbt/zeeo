
import { useNavigate } from 'react-router-dom';
import { type Condo } from '../services/condoService';
import '../styles/CondoListView.css';

interface CondoListViewProps {
    condos: Condo[];
    onSelect: (condo: Condo) => void;
    onViewOnMap: (condo: Condo) => void;
    onDelete: (condo: Condo) => void;
}

export function CondoListView({ condos, onSelect, onViewOnMap, onDelete }: CondoListViewProps) {
    const navigate = useNavigate();

    function handleEdit(condo: Condo) {
        // Navegar para página de edição
        navigate(`/condominium-settings?id=${condo.id}`);
    }

    return (
        <div className="condo-list">
            {condos.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏢</div>
                    <h3>Nenhum condomínio encontrado</h3>
                    <p>Tente ajustar os filtros ou limpar a busca</p>
                </div>
            ) : (
                condos.map(condo => (
                    <div key={condo.id} className="condo-list-item">
                        <div className="condo-icon">🏢</div>
                        <div className="condo-info">
                            <h3>{condo.name}</h3>
                            <p className="address">
                                {condo.address && `${condo.address}`}
                                {condo.number && `, ${condo.number}`}
                            </p>
                            <p className="location">
                                {condo.neighborhood && `${condo.neighborhood} - `}
                                {condo.city && `${condo.city}`}
                                {condo.state && `/${condo.state}`}
                            </p>
                            {condo.zip_code && (
                                <p className="zip">CEP: {condo.zip_code}</p>
                            )}
                        </div>
                        <div className="condo-actions">
                            <button
                                className="btn-primary"
                                onClick={() => onSelect(condo)}
                                title="Acessar painel do condomínio"
                                style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.25rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Acessar Painel
                            </button>
                            <button
                                className="btn-edit"
                                onClick={() => handleEdit(condo)}
                                title="Editar condomínio"
                            >
                                Editar
                            </button>
                            <button
                                className="btn-view-map"
                                onClick={() => onViewOnMap(condo)}
                                title="Visualizar no mapa"
                            >
                                Ver no Mapa
                            </button>
                            <button
                                className="btn-delete"
                                onClick={() => onDelete(condo)}
                                title="Excluir condomínio"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
