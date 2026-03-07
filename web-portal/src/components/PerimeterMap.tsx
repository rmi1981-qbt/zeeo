import { useState, useEffect } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary, ControlPosition, MapControl, AdvancedMarker } from '@vis.gl/react-google-maps';
import { PenTool, Eraser, CheckCircle, Info, Undo, DoorOpen, Plus } from 'lucide-react';
import PlaceSearchBox from './PlaceSearchBox';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = 'DEMO_MAP_ID';

import { Gate } from '../services/condoService';

interface PerimeterMapProps {
    initialCenter: { lat: number; lng: number };
    initialPolygon?: { lat: number; lng: number }[];
    initialGates?: Gate[];
    onPolygonChange: (polygon: { lat: number; lng: number }[]) => void;
    onGateAdd?: (gate: Omit<Gate, 'id' | 'created_at' | 'condo_id'>) => Promise<void>;
    onGateUpdate?: (gate: Gate) => Promise<void>;
    onGateDelete?: (gateId: string) => Promise<void>;
    readOnly?: boolean;
}

export default function PerimeterMap({ initialCenter, initialPolygon, initialGates = [], onPolygonChange, onGateAdd, onGateUpdate, onGateDelete, readOnly = false }: PerimeterMapProps) {
    return (
        <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-700">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['geometry', 'places', 'marker']}>
                <InternalMap
                    initialCenter={initialCenter}
                    initialPolygon={initialPolygon}
                    initialGates={initialGates}
                    onPolygonChange={onPolygonChange}
                    onGateAdd={onGateAdd}
                    onGateUpdate={onGateUpdate}
                    onGateDelete={onGateDelete}
                    readOnly={readOnly}
                />
            </APIProvider>
        </div>
    );
}

function InternalMap({ initialCenter, initialPolygon, initialGates, onPolygonChange, onGateAdd, onGateUpdate, readOnly = false }: PerimeterMapProps) {
    const map = useMap();
    const markerLib = useMapsLibrary('marker');

    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);
    const [tempPolyline, setTempPolyline] = useState<google.maps.Polyline | null>(null);
    const [finalPolygon, setFinalPolygon] = useState<google.maps.Polygon | null>(null);
    const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);

    // Gates State
    // We rely on parent to update initialGates for persistence. 
    // But for drag responsiveness, we might need local state? 
    // Let's use local state synced with props.
    const [gates, setGates] = useState<Gate[]>(initialGates || []);
    const [addingGate, setAddingGate] = useState(false);

    // Sync initial gates
    useEffect(() => {
        if (initialGates) setGates(initialGates);
    }, [initialGates]);

    // ... (handlePlaceSelect) ...
    // Handle place selection from search box
    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        if (!map) return;

        if (place.geometry?.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else if (place.geometry?.location) {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }
    };

    // ... (useEffect for center) ...
    // --- Map Centering Logic ---
    // Update map center when initialCenter prop changes
    useEffect(() => {
        if (map && initialCenter) {
            map.panTo(initialCenter);
        }
    }, [map, initialCenter]);

    // ... (useEffect for polygon) ...
    // --- Polygon State Sync ---
    // 1. Handle Initial Polygon from props
    useEffect(() => {
        if (!map || !initialPolygon || initialPolygon.length === 0 || finalPolygon) return;

        const poly = new google.maps.Polygon({
            paths: initialPolygon,
            strokeColor: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: readOnly ? 0 : 0.3,
            editable: !readOnly,
            draggable: !readOnly,
            map: map,
            clickable: false
        });

        setFinalPolygon(poly);
        setupPolygonListeners(poly);

    }, [map]); // Run once when map is ready 

    // ... (setupPolygonListeners) ...
    // 2. Setup Polygon Listeners (Edit/Drag)
    const setupPolygonListeners = (poly: google.maps.Polygon) => {
        const update = () => {
            const path = poly.getPath();
            const coords = [];
            for (let i = 0; i < path.getLength(); i++) {
                const pt = path.getAt(i);
                coords.push({ lat: pt.lat(), lng: pt.lng() });
            }
            onPolygonChange(coords);
        };

        const path = poly.getPath();
        ['set_at', 'insert_at', 'remove_at'].forEach(evt => {
            google.maps.event.addListener(path, evt, update);
        });
        google.maps.event.addListener(poly, 'dragend', update);

        // Ensure editable state sticks
        if (!readOnly) poly.setEditable(true);
    };


    // --- Drawing Logic ---
    // 3. Click Handler
    useEffect(() => {
        if (!map) return;

        const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;

            if (isDrawing) {
                const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                setPoints(prev => [...prev, newPoint]);
            } else if (addingGate) {
                const newGateData = {
                    name: `Portaria ${gates.length + 1}`,
                    lat: e.latLng.lat(),
                    lng: e.latLng.lng(),
                    is_main: gates.length === 0
                };

                if (onGateAdd) {
                    onGateAdd(newGateData);
                }
                // We do NOT update local state here manually anymore, strictly waiting for prop update
                // to ensure we have the backend ID.

                setAddingGate(false);
                map.setOptions({ draggableCursor: null });
            }
        });

        if (isDrawing) {
            map.setOptions({ draggableCursor: 'crosshair', clickableIcons: false });
        } else if (addingGate) {
            map.setOptions({ draggableCursor: 'copy', clickableIcons: false });
        } else {
            map.setOptions({ draggableCursor: null, clickableIcons: true });
        }

        return () => {
            google.maps.event.removeListener(clickListener);
        };
    }, [map, isDrawing, addingGate, gates]);

    // 4. Drawing Visualization (Polyline & Markers)
    useEffect(() => {
        if (!map || !markerLib) return;

        // Manage Polyline
        if (!tempPolyline) {
            setTempPolyline(new google.maps.Polyline({
                map,
                strokeColor: '#6366f1',
                strokeWeight: 2,
                clickable: false
            }));
        } else {
            tempPolyline.setPath(points);
            tempPolyline.setMap(points.length > 0 ? map : null);
        }

        // Manage Advanced Markers
        // Cleanup old
        markers.forEach(m => m.map = null);

        const newMarkers = points.map((pt, index) => {
            // Create a DOM element for the marker content
            const pinElement = document.createElement('div');
            pinElement.className = `w-4 h-4 rounded-full border border-slate-800 ${index === 0 ? 'bg-emerald-500' : 'bg-white'} shadow-lg cursor-pointer transform hover:scale-125 transition-transform`;

            // Note: AdvancedMarkerElement properties are different
            const marker = new markerLib.AdvancedMarkerElement({
                position: pt,
                map,
                content: pinElement,
                zIndex: 1000 + index,
                gmpClickable: true
            });

            // Click first point to finish
            if (index === 0 && points.length >= 3) {
                // Use gmp-click for AdvancedMarkerElement
                marker.addListener('gmp-click', finishDrawing);
            }
            return marker;
        });
        setMarkers(newMarkers);

    }, [points, map, markerLib]);

    // 5. Actions
    const startDrawing = () => {
        if (finalPolygon) {
            finalPolygon.setMap(null);
            setFinalPolygon(null);
        }
        setPoints([]); // Clear old points
        onPolygonChange([]); // Clear parent state
        setIsDrawing(true);
        setAddingGate(false);
    };

    const finishDrawing = () => {
        if (points.length < 3) return;

        setIsDrawing(false);

        // Convert points to Polygon
        const poly = new google.maps.Polygon({
            paths: points,
            strokeColor: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            editable: true,
            draggable: true,
            map: map
        });

        setFinalPolygon(poly);
        setupPolygonListeners(poly);

        // Notify parent
        onPolygonChange(points);

        // Cleanup drawing artifacts
        setPoints([]);
        if (tempPolyline) tempPolyline.setMap(null);
        markers.forEach(m => m.map = null);
        setMarkers([]);
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        setPoints([]);
        if (tempPolyline) tempPolyline.setMap(null);
        markers.forEach(m => m.map = null);
        setMarkers([]);

        onPolygonChange([]);
    };

    const undoLastPoint = () => {
        setPoints(prev => prev.slice(0, -1));
    };

    const clearAll = () => {
        if (finalPolygon) {
            finalPolygon.setMap(null);
            setFinalPolygon(null);
        }
        cancelDrawing();
        onPolygonChange([]);
    };

    const handleGateDragEnd = (e: google.maps.MapMouseEvent, index: number) => {
        if (!e.latLng) return;
        const gateToUpdate = gates[index];
        const updatedGate = { ...gateToUpdate, lat: e.latLng.lat(), lng: e.latLng.lng() };

        // Optimistic update
        const newGates = [...gates];
        newGates[index] = updatedGate;
        setGates(newGates);

        if (onGateUpdate) onGateUpdate(updatedGate);
    };

    // const deleteGate = ... (Expose delete functionality if button is clicked on map?)
    // Currently delete is outside in the parent list.
    // But if we want to delete from map popover:


    // Watch for external clearing (initialPolygon becoming empty)
    useEffect(() => {
        if (initialPolygon && initialPolygon.length === 0 && finalPolygon) {
            finalPolygon.setMap(null);
            setFinalPolygon(null);
        }
    }, [initialPolygon]);


    return (
        <>
            <Map
                defaultCenter={initialCenter}
                defaultZoom={17}
                mapId={MAP_ID}
                disableDefaultUI={false}
                className="w-full h-full"
                style={{ background: '#0f172a' }}
            >
                {/* Gate Markers */}
                {gates.map((gate, index) => (
                    <AdvancedMarker
                        key={gate.id}
                        position={{ lat: gate.lat, lng: gate.lng }}
                        draggable={!readOnly}
                        onDragEnd={(e) => handleGateDragEnd(e, index)}
                        title={gate.name}
                    >
                        <div className={`p-1.5 rounded-lg border-2 border-white shadow-lg flex items-center justify-center group relative
                            ${gate.is_main ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-slate-700 shadow-slate-900/50'}`}
                        >
                            <DoorOpen size={16} className="text-white" />

                            {/* Simple tooltip/delete on hover (can be improved) */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                {gate.name}
                            </div>
                        </div>
                    </AdvancedMarker>
                ))}
            </Map>

            {/* Search Control */}
            {!readOnly && (
                <MapControl position={ControlPosition.TOP_LEFT}>
                    <div className="mt-4 ml-4 w-96">
                        <PlaceSearchBox onPlaceSelect={handlePlaceSelect} />
                    </div>
                </MapControl>
            )}

            {/* Toolbar */}
            {!readOnly && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-700 p-1.5 rounded-xl shadow-xl flex gap-1 z-50">
                    {!isDrawing ? (
                        <>
                            <button
                                onClick={() => { setAddingGate(!addingGate); setIsDrawing(false); }}
                                className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors shadow-lg
                                    ${addingGate ? 'bg-amber-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-blue-400'}`}
                                title="Adicionar Portaria"
                            >
                                <Plus size={16} />
                                <span>Portaria</span>
                            </button>
                            <div className="w-px h-6 bg-slate-700 mx-1"></div>

                            <button
                                onClick={startDrawing}
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition-colors shadow-lg"
                            >
                                <PenTool size={16} />
                                <span>{finalPolygon ? 'Redesenhar' : 'Desenhar'}</span>
                            </button>
                            <div className="w-px h-6 bg-slate-700 mx-1"></div>
                            <button
                                onClick={clearAll}
                                disabled={!finalPolygon}
                                className="p-2 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-slate-400"
                                title="Limpar"
                            >
                                <Eraser size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={finishDrawing}
                                disabled={points.length < 3}
                                className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center gap-2 text-sm font-bold transition-colors shadow-lg"
                            >
                                <CheckCircle size={16} />
                                <span>Concluir</span>
                            </button>
                            <div className="w-px h-6 bg-slate-700 mx-1"></div>
                            <button
                                onClick={undoLastPoint}
                                disabled={points.length === 0}
                                className="p-2 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300"
                                title="Desfazer ponto"
                            >
                                <Undo size={16} />
                            </button>
                            <button
                                onClick={cancelDrawing}
                                className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400"
                                title="Cancelar"
                            >
                                <Eraser size={16} />
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Status */}
            {!readOnly && (
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2 z-10">
                    <Info size={14} />
                    {isDrawing
                        ? <span>Clique no mapa para adicionar pontos. Clique no primeiro ponto ou "Concluir" para fechar.</span>
                        : addingGate
                            ? <span className="text-amber-400">Clique na localização da nova portaria.</span>
                            : <span>{finalPolygon ? "Área definida. Arraste os pontos para ajustar." : "Desenhe o perímetro exato do condomínio."}</span>
                    }
                </div>
            )}
        </>
    );
}
