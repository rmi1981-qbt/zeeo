import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { unitService, Unit, UnitCreate } from '../../services/unitService';
import { condoService } from '../../services/condoService';
import { Plus, Edit2, Trash2, MapPin, Loader2, Home } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { APIProvider, Map, AdvancedMarker, useMap, MapMouseEvent } from '@vis.gl/react-google-maps';
import PlaceSearchBox from '../../components/PlaceSearchBox';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Inner component to handle map bounds and panning
function MapController({ units, condoLat, condoLng, searchLocation }: { 
    units: Unit[], 
    condoLat?: number, 
    condoLng?: number,
    searchLocation?: {lat: number, lng: number} | null
}) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        
        if (searchLocation) {
            map.panTo(searchLocation);
            map.setZoom(19);
        } else if (units.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            let hasValidCoords = false;
            units.forEach(u => {
                if (u.lat && u.lng) {
                    bounds.extend({ lat: Number(u.lat), lng: Number(u.lng) });
                    hasValidCoords = true;
                }
            });
            if (hasValidCoords) {
                map.fitBounds(bounds);
                // Don't zoom in too much if only 1 unit
                const listener = google.maps.event.addListener(map, "idle", function () { 
                    if (map.getZoom() && map.getZoom()! > 18) map.setZoom(18); 
                    google.maps.event.removeListener(listener); 
                });
            } else if (condoLat && condoLng) {
                map.panTo({ lat: condoLat, lng: condoLng });
                map.setZoom(17);
            }
        } else if (condoLat && condoLng) {
            map.panTo({ lat: condoLat, lng: condoLng });
            map.setZoom(17);
        }
    }, [map, units, condoLat, condoLng, searchLocation]);

    return null;
}

export default function UnitManagement() {
    const { selectedCondo } = useAuth();
    const { showToast } = useToast();
    
    // Data State
    const [units, setUnits] = useState<Unit[]>([]);
    const [condoLat, setCondoLat] = useState<number | undefined>();
    const [condoLng, setCondoLng] = useState<number | undefined>();
    const [loading, setLoading] = useState(true);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [formData, setFormData] = useState<UnitCreate>({ block: '', number: '', label: '', lat: undefined, lng: undefined });
    const [saving, setSaving] = useState(false);
    const [searchLocation, setSearchLocation] = useState<{lat: number, lng: number} | null>(null);

    // Load Data
    const loadData = useCallback(async () => {
        if (!selectedCondo) return;
        setLoading(true);
        try {
            const [fetchedUnits, condoData] = await Promise.all([
                unitService.getUnits(selectedCondo),
                condoService.getCondo(selectedCondo)
            ]);
            setUnits(fetchedUnits);
            if (condoData.lat && condoData.lng) {
                setCondoLat(condoData.lat);
                setCondoLng(condoData.lng);
            }
        } catch (error) {
            console.error(error);
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar unidades' });
        } finally {
            setLoading(false);
        }
    }, [selectedCondo, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleMapClick = (e: MapMouseEvent) => {
        if (!isFormOpen) return;
        if (e.detail.latLng) {
            setFormData(prev => ({
                ...prev,
                lat: e.detail.latLng!.lat,
                lng: e.detail.latLng!.lng
            }));
            showToast({ type: 'info', title: 'Localização definida', message: 'Coordenadas atualizadas no formulário' });
        }
    };

    const openCreateForm = () => {
        setEditingUnit(null);
        setFormData({ block: '', number: '', label: '', lat: undefined, lng: undefined });
        setSearchLocation(null);
        setIsFormOpen(true);
    };

    const openEditForm = (unit: Unit) => {
        setEditingUnit(unit);
        setFormData({
            block: unit.block || '',
            number: unit.number || '',
            label: unit.label || '',
            lat: unit.lat,
            lng: unit.lng
        });
        setSearchLocation(null);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingUnit(null);
        setSearchLocation(null);
    };

    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        if (!isFormOpen) return;
        if (place.geometry?.location) {
            const loc = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            };
            setFormData(prev => ({
                ...prev,
                lat: loc.lat,
                lng: loc.lng
            }));
            setSearchLocation(loc);
            showToast({ type: 'success', title: 'Local Encontrado', message: 'Pin movido para o endereço pesquisado.' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCondo) return;
        if (!formData.number && !formData.label) {
            showToast({ type: 'error', title: 'Erro', message: 'Preencha o número ou a identificação da unidade' });
            return;
        }

        setSaving(true);
        try {
            if (editingUnit) {
                await unitService.updateUnit(selectedCondo, editingUnit.id, formData);
                showToast({ type: 'success', title: 'Sucesso', message: 'Unidade atualizada' });
            } else {
                await unitService.createUnit(selectedCondo, formData);
                showToast({ type: 'success', title: 'Sucesso', message: 'Unidade cadastrada' });
            }
            closeForm();
            loadData();
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao salvar unidade' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (unit: Unit) => {
        if (!selectedCondo) return;
        if (!confirm(`Tem certeza que deseja remover a unidade ${unit.label || unit.number}?`)) return;

        try {
            await unitService.deleteUnit(selectedCondo, unit.id);
            setUnits(prev => prev.filter(u => u.id !== unit.id));
            showToast({ type: 'success', title: 'Removida', message: 'Unidade excluída com sucesso' });
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao excluir unidade' });
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker', 'places', 'geocoding']}>
            <div className="flex flex-col h-full bg-slate-950 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Home className="text-blue-400" />
                        Gestão de Unidades
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Gerencie as residências e lotes do condomínio.</p>
                </div>
                {!isFormOpen && (
                    <button
                        onClick={openCreateForm}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus size={18} /> Nova Unidade
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                
                {/* Lateral Esquerda - Lista ou Form */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 min-h-0 overflow-hidden bg-slate-900 border border-slate-800 rounded-xl">
                    
                    {isFormOpen ? (
                        // Form
                        <div className="p-6 overflow-y-auto">
                            <h2 className="text-lg font-semibold text-white mb-4">
                                {editingUnit ? 'Editar Unidade' : 'Novas Unidade'}
                            </h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Buscar Endereço / Local no Mapa</label>
                                    <PlaceSearchBox onPlaceSelect={handlePlaceSelect} />
                                    <p className="text-xs text-slate-500 mt-1">Busque para preencher coordenadas automaticamente.</p>
                                </div>
                                <hr className="border-slate-800" />
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Bloco / Torre <span className="text-slate-600">(Opcional)</span></label>
                                    <input
                                        type="text"
                                        value={formData.block || ''}
                                        onChange={e => setFormData({ ...formData, block: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: A, 1, Ipê"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Número</label>
                                    <input
                                        type="text"
                                        value={formData.number || ''}
                                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: 101, 45B"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Identificação / Label</label>
                                    <input
                                        type="text"
                                        value={formData.label || ''}
                                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: Bloco A - 101"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Como será exibido no sistema.</p>
                                </div>
                                
                                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                        <MapPin size={16} className="text-blue-400" /> Localização no Mapa
                                    </label>
                                    {formData.lat && formData.lng ? (
                                        <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                                            Fixada: {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                            Clique no mapa ao lado para definir o local exato da unidade.
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={closeForm}
                                        disabled={saving}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg font-medium transition-colors flex items-center justify-center"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={18} /> : 'Salvar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        // List
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="p-4 border-b border-slate-800 bg-slate-900">
                                <h2 className="font-semibold text-white">Unidades Cadastradas ({units.length})</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {units.length === 0 ? (
                                    <div className="text-center p-6 text-slate-500">
                                        Nenhuma unidade encontrada. Adicione para começar.
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {units.map(unit => (
                                            <div key={unit.id} className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-lg transition-colors group">
                                                <div>
                                                    <div className="font-medium text-slate-200">
                                                        {unit.label || `${unit.block ? unit.block + ' - ' : ''}${unit.number}`}
                                                    </div>
                                                    {(unit.lat && unit.lng) ? (
                                                        <div className="text-xs text-blue-400 flex items-center gap-1 mt-0.5">
                                                            <MapPin size={10} /> Mapeada
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            Sem localização
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => openEditForm(unit)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(unit)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Lateral Direita - Mapa */}
                <div className="hidden lg:block lg:w-2/3 h-full min-h-[400px] border border-slate-800 rounded-xl overflow-hidden relative shadow-2xl">
                    <Map
                        defaultCenter={{ lat: condoLat || -23.5505, lng: condoLng || -46.6333 }}
                        defaultZoom={17}
                        mapId="DEMO_MAP_ID"
                        disableDefaultUI={true}
                        gestureHandling={'greedy'}
                        className="w-full h-full"
                        style={{ background: '#0f172a' }}
                        onClick={(e) => {
                            if (isFormOpen) {
                                // @ts-ignore
                                handleMapClick(e);
                            }
                        }}
                    >
                        <MapController 
                            units={units}
                            condoLat={condoLat}
                            condoLng={condoLng}
                            searchLocation={searchLocation}
                        />

                        {units.map(unit => (
                            unit.lat && unit.lng && (
                                <AdvancedMarker
                                    key={unit.id}
                                    position={{ lat: Number(unit.lat), lng: Number(unit.lng) }}
                                    title={unit.label || unit.number}
                                >
                                    <div className={`p-2 rounded-full shadow-lg border-2 ${editingUnit?.id === unit.id ? 'bg-blue-500 border-white scale-110 z-10' : 'bg-slate-800 border-slate-600'} transition-transform`}>
                                        <Home size={14} className="text-white" />
                                    </div>
                                </AdvancedMarker>
                            )
                        ))}
                    </Map>
                    
                    {/* Map overlay hint */}
                    {isFormOpen && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-none animate-pulse z-10">
                            <MapPin size={16} />
                            Clique no mapa para definir a posição da unidade
                        </div>
                    )}
                </div>
            </div>
        </div>
        </APIProvider>
    );
}
