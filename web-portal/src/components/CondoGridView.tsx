import React from 'react';
import { useNavigate } from 'react-router-dom';
import { type Condo } from '../services/condoService';
import '../styles/CondoGridView.css';

interface CondoGridViewProps {
    condos: Condo[];
    onViewOnMap: (condo: Condo) => void;
    onDelete: (condo: Condo) => void;
}

export function CondoGridView({ condos, onViewOnMap, onDelete }: CondoGridViewProps) {
    const navigate = useNavigate();

    function handleEdit(condo: Condo) {
        navigate(`/condominium-settings?id=${condo.id}`);
    }

    return (
        <div className="condo-grid">
            {condos.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏢</div>
                    <h3>Nenhum condomínio encontrado</h3>
                    <p>Tente ajustar os filtros ou limpar a busca</p>
                </div>
            ) : (
                condos.map(condo => (
                    <div key={condo.id} className="condo-card">
                        <div className="card-icon">
                            <div className="icon-circle">🏢</div>
                        </div>
                        <h2 className="card-title">{condo.name}</h2>
                        <div className="card-info">
                            <p className="location">
                                📍 {condo.city}/{condo.state}
                            </p>
                            {condo.neighborhood && (
                                <p className="neighborhood">{condo.neighborhood}</p>
                            )}
                            {condo.address && (
                                <p className="address">
                                    {condo.address}{condo.number && `, ${condo.number}`}
                                </p>
                            )}
                        </div>
                        <div className="card-actions">
                            <button
                                className="btn-card-edit"
                                onClick={() => handleEdit(condo)}
                            >
                                Editar
                            </button>
                            <button
                                className="btn-card-map"
                                onClick={() => onViewOnMap(condo)}
                            >
                                Ver no Mapa
                            </button>
                            <button
                                className="btn-card-delete"
                                onClick={() => onDelete(condo)}
                                title="Excluir condomínio"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
