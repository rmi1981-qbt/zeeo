import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Hexagon, Save, Loader2, MapPin, Eraser, PenTool, CheckCircle, Search } from 'lucide-react';
import { condoService, Condo } from '../services/condoService';
import { useToast } from '../contexts/ToastContext';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = 'DEMO_MAP_ID';

interface MapEditorProps {
    onGeofenceChange: (coords: { lat: number; lng: number }[]) => void;
}

// --- Internal Components ---

const DrawingManager = ({ isDrawing, onPolygonChange }: { isDrawing: boolean, onPolygonChange: (poly: google.maps.Polygon | null) => void }) => {
    const map = useMap();
    const drawing = useMapsLibrary('drawing');
    const [manager, setManager] = useState<google.maps.drawing.DrawingManager | null>(null);
    const activePolygon = useRef<google.maps.Polygon | null>(null);

    // Initialize Manager
    useEffect(() => {
        if (!map || !drawing) return;

        const newManager = new drawing.DrawingManager({
            map,
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                editable: false,
                draggable: false,
                clickable: true,
                fillColor: '#3b82f6',
                strokeColor: '#3b82f6',
                strokeWeight: 2,
                fillOpacity: 0.3,
            }
        });

        setManager(newManager);

        const overlayCompleteListener = google.maps.event.addListener(newManager, 'overlaycomplete', (event: any) => {
            if (event.type === google.maps.drawing.OverlayType.POLYGON) {
                if (activePolygon.current) activePolygon.current.setMap(null);
                const newPoly = event.overlay as google.maps.Polygon;
                activePolygon.current = newPoly;

                newPoly.setEditable(true);
                newPoly.setDraggable(true);

                newManager.setDrawingMode(null);

                const path = newPoly.getPath();
                const triggerUpdate = () => onPolygonChange(newPoly);
                google.maps.event.addListener(path, 'set_at', triggerUpdate);
                google.maps.event.addListener(path, 'insert_at', triggerUpdate);
                google.maps.event.addListener(path, 'remove_at', triggerUpdate);

                triggerUpdate();
            }
        });

        return () => {
            newManager.setMap(null);
            if (activePolygon.current) activePolygon.current.setMap(null);
            google.maps.event.removeListener(overlayCompleteListener);
        };
    }, [map, drawing, onPolygonChange]);

    useEffect(() => {
        if (!manager) return;
        manager.setDrawingMode(isDrawing ? google.maps.drawing.OverlayType.POLYGON : null);
    }, [manager, isDrawing]);

    return null;
};

// Search Component using AutocompleteService (Data-only, Custom UI)
const PlaceAutocomplete = ({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.PlaceResult) => void }) => {
    const places = useMapsLibrary('places');
    const [service, setService] = useState<google.maps.places.AutocompleteService | null>(null);
    const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!places) return;
        setService(new places.AutocompleteService());
        setGeocoder(new window.google.maps.Geocoder()); // Geocoder is in main namesapce usually or can be loaded
    }, [places]);

    const handleInput = (val: string) => {
        setInputValue(val);
        if (!val || !service) {
            setPredictions([]);
            setIsOpen(false);
            return;
        }

        service.getPlacePredictions({ input: val, types: ['geocode', 'establishment'] }, (preds, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
                setPredictions(preds.slice(0, 5)); // Limit files
                setIsOpen(true);
            } else {
                setPredictions([]);
                setIsOpen(false);
            }
        });
    };

    const handleSelect = (placeId: string, description: string) => {
        setInputValue(description);
        setIsOpen(false);
        setPredictions([]);

        if (!geocoder) return;

        geocoder.geocode({ placeId }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                // Convert GeocoderResult to PlaceResult-like structure for the parent
                const res = results[0];
                const placeResult: google.maps.places.PlaceResult = {
                    geometry: res.geometry,
                    formatted_address: res.formatted_address,
                    address_components: res.address_components,
                    name: description.split(',')[0] // Approximation
                };
                onPlaceSelect(placeResult);
            }
        });
    };

    return (
        <div className="relative group w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400" size={16} />
                <input
                    value={inputValue}
                    onChange={(e) => handleInput(e.target.value)}
                    placeholder="Buscar endereço do condomínio..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                />
            </div>

            <AnimatePresence>
                {isOpen && predictions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        {predictions.map(pred => (
                            <button
                                key={pred.place_id}
                                onClick={() => handleSelect(pred.place_id, pred.description)}
                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white border-b border-slate-800/50 last:border-0 transition-colors flex items-center gap-3"
                            >
                                <MapPin size={14} className="text-slate-500 flex-shrink-0" />
                                <span className="truncate">{pred.description}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Neighbors Layer
const NeighborsMap = ({ neighbors }: { neighbors: Condo[] }) => {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        const polygons = neighbors.map(n => {
            let path: { lat: number, lng: number }[] = [];
            // Parse GeoJSON from RPC (it comes as object)
            if (n.perimeter && n.perimeter.coordinates && n.perimeter.coordinates[0]) {
                path = n.perimeter.coordinates[0].map((c: any) => ({ lat: c[1], lng: c[0] }));
            }
            return new google.maps.Polygon({
                paths: path,
                strokeColor: '#64748b',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#64748b',
                fillOpacity: 0.1,
                map: map,
                clickable: false
            });
        });
        return () => polygons.forEach(p => p.setMap(null));
    }, [map, neighbors]);
    return null;
};

// --- Main Component ---

const MapEditor: React.FC<MapEditorProps> = ({ onGeofenceChange }) => {
    const { showToast } = useToast();
    const [mapCenter, setMapCenter] = useState({ lat: -23.5505, lng: -46.6333 });
    const [zoom, setZoom] = useState(15);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        zip_code: '',
        address: '',
        number: '',
        neighborhood: '',
        city: '',
        state: ''
    });

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasPolygon, setHasPolygon] = useState(false);
    const [currentPolygon, setCurrentPolygon] = useState<{ lat: number, lng: number }[]>([]);

    // System State
    const [neighbors, setNeighbors] = useState<Condo[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [mapKey, setMapKey] = useState(0);

    useEffect(() => {
        loadNeighbors();
    }, []);

    const loadNeighbors = async () => {
        try {
            const data = await condoService.getCondos();
            if (data) setNeighbors(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        if (!place.geometry || !place.geometry.location) return;

        setMapCenter({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        });
        setZoom(18);

        const getComponent = (type: string) =>
            place.address_components?.find(c => c.types.includes(type))?.long_name || '';

        setFormData(prev => ({
            ...prev,
            address: getComponent('route'),
            number: getComponent('street_number'),
            neighborhood: getComponent('sublocality_level_1') || getComponent('sublocality'),
            city: getComponent('administrative_area_level_2'),
            state: getComponent('administrative_area_level_1'),
            zip_code: getComponent('postal_code'),
            name: prev.name || place.name || ''
        }));
    };

    const handlePolygonChange = useCallback((poly: google.maps.Polygon | null) => {
        if (!poly) {
            setHasPolygon(false);
            setCurrentPolygon([]);
            onGeofenceChange([]);
            return;
        }

        setHasPolygon(true);
        const path = poly.getPath();
        const coords = [];
        for (let i = 0; i < path.getLength(); i++) {
            const xy = path.getAt(i);
            coords.push({ lat: xy.lat(), lng: xy.lng() });
        }
        setCurrentPolygon(coords);
        onGeofenceChange(coords);
    }, [onGeofenceChange]);

    const handleSave = async () => {
        if (!formData.name) {
            showToast({ type: 'warning', title: 'Nome obrigatório', message: 'Dê um nome ao condomínio.' });
            return;
        }
        if (!hasPolygon) {
            showToast({ type: 'warning', title: 'Perímetro incompleto', message: 'Desenhe o perímetro do condomínio.' });
            return;
        }

        setIsSaving(true);
        try {
            await condoService.saveCondo({
                ...formData,
                perimeter: currentPolygon
            });
            showToast({ type: 'success', title: 'Condomínio salvo!', message: 'O cadastro foi realizado com sucesso.' });

            setFormData({ name: '', zip_code: '', address: '', number: '', neighborhood: '', city: '', state: '' });
            setHasPolygon(false);
            setCurrentPolygon([]);
            onGeofenceChange([]);
            setMapKey(prev => prev + 1);
            loadNeighbors();
        } catch (e) {
            console.error(e);
            showToast({ type: 'error', title: 'Erro ao salvar', message: e instanceof Error ? e.message : 'Erro desconhecido' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = () => {
        setHasPolygon(false);
        setCurrentPolygon([]);
        onGeofenceChange([]);
        setIsDrawing(false);
        setMapKey(prev => prev + 1);
    };

    if (!GOOGLE_MAPS_API_KEY) return <div className="p-10 text-center text-white">Missing API Key</div>;

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 p-4 overflow-hidden">

            {/* Sidebar Form */}
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-full lg:w-96 flex flex-col gap-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 overflow-y-auto"
            >
                <div className="flex items-center gap-3 text-blue-400 mb-2">
                    <Hexagon size={24} />
                    <h2 className="text-xl font-bold text-white">Novo Condomínio</h2>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Buscar Endereço</label>
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'drawing', 'geometry']}>
                        <PlaceAutocomplete onPlaceSelect={handlePlaceSelect} />
                    </APIProvider>
                </div>

                <hr className="border-slate-800 my-2" />

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome do Condomínio</label>
                        <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="Ex: Grand Garden" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">CEP</label>
                            <input value={formData.zip_code} onChange={e => setFormData({ ...formData, zip_code: e.target.value })} className="input-field" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Estado (UF)</label>
                            <input value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="input-field" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                        <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="input-field" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Bairro</label>
                        <input value={formData.neighborhood} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="input-field" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Logradouro</label>
                            <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-field" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Número</label>
                            <input value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="input-field" />
                        </div>
                    </div>
                </div>

                <div className="flex-1"></div>

                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasPolygon || !formData.name}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                    Salvar Condomínio
                </button>
            </motion.div>

            {/* Map Area */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative"
            >
                {/* Floating Toolbar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 p-1.5 rounded-xl shadow-2xl flex items-center gap-1">
                    <button
                        onClick={() => setIsDrawing(true)}
                        disabled={hasPolygon}
                        className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${isDrawing ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <PenTool size={16} />
                        <span>Desenhar</span>
                    </button>

                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    <button
                        onClick={() => setIsDrawing(false)}
                        disabled={!isDrawing}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                        title="Parar Desenho"
                    >
                        <CheckCircle size={16} />
                    </button>

                    <button
                        onClick={handleClear}
                        className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                        title="Limpar Mapa"
                    >
                        <Eraser size={16} />
                    </button>
                </div>

                <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['drawing', 'places']}>
                    <Map
                        key={mapKey} // Force reset when needed
                        center={mapCenter}
                        zoom={zoom}
                        onCameraChanged={(ev) => {
                            setMapCenter(ev.detail.center);
                            setZoom(ev.detail.zoom);
                        }}
                        mapId={MAP_ID}
                        disableDefaultUI={false}
                        gestureHandling={'greedy'}
                        className="w-full h-full"
                        style={{ background: '#0f172a' }}
                    >
                        <DrawingManager isDrawing={isDrawing} onPolygonChange={handlePolygonChange} />
                        <NeighborsMap neighbors={neighbors} />
                    </Map>
                </APIProvider>

                {/* Status Footer */}
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-3 flex justify-between items-center text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                        <Info size={14} />
                        <span>Use a busca para encontrar o local e "Desenhar" para marcar a área.</span>
                    </div>
                    <div>
                        {hasPolygon
                            ? <span className="text-green-400 font-bold flex items-center gap-1"><CheckCircle size={12} /> Área Definida</span>
                            : <span className="text-slate-500">Aguardando desenho...</span>
                        }
                    </div>
                </div>
            </motion.div>

            <style>{`
                .input-field {
                    width: 100%;
                    background-color: #020617; /* Slate 950 */
                    border: 1px solid #1e293b; /* Slate 800 */
                    color: white;
                    font-size: 0.875rem;
                    border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-field:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 1px #3b82f6;
                }
            `}</style>
        </div>
    );
};

export default MapEditor;
