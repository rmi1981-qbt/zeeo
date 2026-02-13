import { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Eraser, CheckCircle, Info, Sparkles } from 'lucide-react';
import { condoService, Condo } from '../services/condoService';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = 'WIZARD_MAP';

interface EnhancedPerimeterMapProps {
    initialCenter?: { lat: number; lng: number };
    autoPolygon?: { lat: number; lng: number }[] | null;
    onPolygonChange: (polygon: { lat: number; lng: number }[]) => void;
    formData?: any;
}

const DrawingManager = ({
    isDrawing,
    initialPolygon,
    onPolygonChange,
    onPolygonSet
}: {
    isDrawing: boolean;
    initialPolygon?: { lat: number; lng: number }[];
    onPolygonChange: (path: { lat: number; lng: number }[]) => void;
    onPolygonSet: () => void;
}) => {
    const map = useMap();
    const drawing = useMapsLibrary('drawing');
    const [manager, setManager] = useState<google.maps.drawing.DrawingManager | null>(null);
    const activePolygon = useRef<google.maps.Polygon | null>(null);
    const initializedPolygon = useRef(false);

    // Use refs to avoid adding callbacks to dependencies
    const onPolygonChangeRef = useRef(onPolygonChange);
    const onPolygonSetRef = useRef(onPolygonSet);

    // Update refs when callbacks change
    useEffect(() => {
        onPolygonChangeRef.current = onPolygonChange;
        onPolygonSetRef.current = onPolygonSet;
    }, [onPolygonChange, onPolygonSet]);

    // Load Initial Polygon (only once when polygon data becomes available)
    useEffect(() => {
        if (!map || !initialPolygon || initialPolygon.length === 0) return;
        if (initializedPolygon.current || activePolygon.current) return;

        const poly = new google.maps.Polygon({
            paths: initialPolygon,
            strokeColor: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            editable: true,
            draggable: true,
            map: map
        });

        activePolygon.current = poly;
        initializedPolygon.current = true;
        onPolygonSetRef.current();

        // Listen for edits
        const path = poly.getPath();
        const triggerUpdate = () => {
            const coords = [];
            for (let i = 0; i < path.getLength(); i++) {
                const pt = path.getAt(i);
                coords.push({ lat: pt.lat(), lng: pt.lng() });
            }
            onPolygonChangeRef.current(coords);
        };

        google.maps.event.addListener(path, 'set_at', triggerUpdate);
        google.maps.event.addListener(path, 'insert_at', triggerUpdate);
        google.maps.event.addListener(path, 'remove_at', triggerUpdate);

        // Initial update
        triggerUpdate();
    }, [map, initialPolygon]);

    // Initialize Manager (only once)
    useEffect(() => {
        if (!map || !drawing) return;

        const newManager = new drawing.DrawingManager({
            map,
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                editable: true,
                draggable: true,
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
                // Remove old polygon if exists
                if (activePolygon.current) activePolygon.current.setMap(null);

                const newPoly = event.overlay as google.maps.Polygon;
                activePolygon.current = newPoly;
                initializedPolygon.current = true;
                onPolygonSetRef.current();

                newManager.setDrawingMode(null);

                const path = newPoly.getPath();
                const getCoords = () => {
                    const coords = [];
                    for (let i = 0; i < path.getLength(); i++) {
                        const pt = path.getAt(i);
                        coords.push({ lat: pt.lat(), lng: pt.lng() });
                    }
                    return coords;
                };

                onPolygonChangeRef.current(getCoords());

                const triggerUpdate = () => onPolygonChangeRef.current(getCoords());
                google.maps.event.addListener(path, 'set_at', triggerUpdate);
                google.maps.event.addListener(path, 'insert_at', triggerUpdate);
                google.maps.event.addListener(path, 'remove_at', triggerUpdate);
            }
        });

        return () => {
            newManager.setMap(null);
            google.maps.event.removeListener(overlayCompleteListener);
        };
    }, [map, drawing]);

    // Handle External Clear
    useEffect(() => {
        if (initialPolygon && initialPolygon.length === 0 && activePolygon.current) {
            activePolygon.current.setMap(null);
            activePolygon.current = null;
            initializedPolygon.current = false;
        }
    }, [initialPolygon]);

    // Toggle Drawing Mode
    useEffect(() => {
        if (!manager) return;
        manager.setDrawingMode(isDrawing ? google.maps.drawing.OverlayType.POLYGON : null);
    }, [manager, isDrawing]);

    return null;
};

// Neighbors Layer
const NeighborsMap = ({ neighbors }: { neighbors: Condo[] }) => {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        const polygons = neighbors.map(n => {
            let path: { lat: number, lng: number }[] = [];
            if (n.perimeter && n.perimeter.coordinates && n.perimeter.coordinates[0]) {
                path = n.perimeter.coordinates[0].map((c: any) => ({ lat: c[1], lng: c[0] }));
            }
            return new google.maps.Polygon({
                paths: path,
                strokeColor: '#64748b',
                strokeOpacity: 0.6,
                strokeWeight: 1.5,
                fillColor: '#64748b',
                fillOpacity: 0.08,
                map: map,
                clickable: false
            });
        });
        return () => polygons.forEach(p => p.setMap(null));
    }, [map, neighbors]);
    return null;
};

export default function EnhancedPerimeterMap({
    initialCenter = { lat: -23.5505, lng: -46.6333 },
    autoPolygon,
    onPolygonChange,
    formData
}: EnhancedPerimeterMapProps) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasPolygon, setHasPolygon] = useState(false);
    const [showAutoPrompt, setShowAutoPrompt] = useState(false);
    const [mapCenter, setMapCenter] = useState(initialCenter);
    const [neighbors, setNeighbors] = useState<Condo[]>([]);

    // Load neighbors (non-blocking)
    useEffect(() => {
        async function loadNeighbors() {
            try {
                const data = await condoService.getCondos();
                if (data) setNeighbors(data);
            } catch (e) {
                console.warn('Failed to load neighbor condos, continuing without them:', e);
                // Don't block the UI, just continue without neighbors
            }
        }
        loadNeighbors();
    }, []);

    // Update center when prop changes
    useEffect(() => {
        if (initialCenter) {
            setMapCenter(initialCenter);
        }
    }, [initialCenter]);

    // Show auto polygon prompt if available
    useEffect(() => {
        if (autoPolygon && autoPolygon.length > 0 && !hasPolygon) {
            setShowAutoPrompt(true);
        }
    }, [autoPolygon, hasPolygon]);

    const handleAcceptAuto = () => {
        if (autoPolygon) {
            onPolygonChange(autoPolygon);
            setHasPolygon(true);
            setShowAutoPrompt(false);
        }
    };

    const handleManualDraw = () => {
        setShowAutoPrompt(false);
        setIsDrawing(true);
    };

    const handleClear = () => {
        onPolygonChange([]);
        setHasPolygon(false);
        setIsDrawing(false);
    };

    const calculateArea = (polygon: { lat: number; lng: number }[]) => {
        if (polygon.length < 3) return 0;

        // Simple area calculation (not perfect for large areas, but good enough)
        // Using Shoelace formula
        let area = 0;
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            area += polygon[i].lat * polygon[j].lng;
            area -= polygon[j].lat * polygon[i].lng;
        }
        area = Math.abs(area / 2);

        // Convert to m² (rough approximation)
        const metersPerDegree = 111000; // at equator
        return Math.round(area * (metersPerDegree ** 2));
    };

    return (
        <div className="w-full h-full relative">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['drawing', 'geometry']}>
                <Map
                    defaultCenter={mapCenter}
                    center={mapCenter}
                    defaultZoom={hasPolygon ? 17 : 15}
                    mapId={MAP_ID}
                    disableDefaultUI={false}
                    className="w-full h-full"
                    style={{ background: '#0f172a' }}
                    gestureHandling="greedy"
                >
                    <DrawingManager
                        isDrawing={isDrawing}
                        initialPolygon={autoPolygon && !hasPolygon ? autoPolygon : undefined}
                        onPolygonChange={onPolygonChange}
                        onPolygonSet={() => setHasPolygon(true)}
                    />
                    <NeighborsMap neighbors={neighbors} />
                </Map>
            </APIProvider>

            {/* Auto Polygon Prompt */}
            <AnimatePresence>
                {showAutoPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl p-8 max-w-md z-50"
                    >
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-4">
                                <Sparkles className="text-blue-400" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Perímetro Detectado!</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Encontramos automaticamente os limites do condomínio. Você pode usar essa área ou desenhar manualmente.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleManualDraw}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors"
                                >
                                    Desenhar Manual
                                </button>
                                <button
                                    onClick={handleAcceptAuto}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
                                >
                                    Usar Automático
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toolbar */}
            {!showAutoPrompt && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-2 rounded-2xl shadow-2xl flex gap-2 z-40">
                    <button
                        onClick={() => setIsDrawing(true)}
                        disabled={hasPolygon}
                        className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold text-sm transition-all ${isDrawing
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : hasPolygon
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                    >
                        <PenTool size={18} />
                        <span>Desenhar</span>
                    </button>

                    <div className="w-px bg-slate-700" />

                    <button
                        onClick={() => setIsDrawing(false)}
                        disabled={!isDrawing}
                        className="px-4 py-3 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-slate-300 transition-colors"
                        title="Parar Desenho"
                    >
                        <CheckCircle size={18} />
                    </button>

                    <button
                        onClick={handleClear}
                        disabled={!hasPolygon}
                        className="px-4 py-3 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-slate-400 transition-colors"
                        title="Limpar"
                    >
                        <Eraser size={18} />
                    </button>
                </div>
            )}

            {/* Status Footer */}
            <div className="absolute bottom-4 left-8 right-8 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 flex justify-between items-center text-sm z-30">
                <div className="flex items-center gap-2 text-slate-400">
                    <Info size={16} />
                    <span>
                        {isDrawing
                            ? 'Clique no mapa para adicionar pontos. Feche o polígono clicando no primeiro ponto.'
                            : hasPolygon
                                ? 'Arraste os pontos para ajustar o perímetro.'
                                : 'Use "Desenhar" para marcar a área do condomínio.'}
                    </span>
                </div>

                {hasPolygon && formData?.perimeter?.length > 0 && (
                    <div className="flex items-center gap-4">
                        <div className="text-slate-500">
                            <span className="text-slate-400 font-semibold">{formData.perimeter.length}</span> pontos
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold">
                            ~{(calculateArea(formData.perimeter) / 1000).toFixed(1)}k m²
                        </div>
                    </div>
                )}
            </div>

            {/* Neighbor Legend */}
            {neighbors.length > 0 && (
                <div className="absolute top-8 left-8 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-xl p-3 text-xs text-slate-400 z-40">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-600/20 border border-slate-600 rounded" />
                        <span>{neighbors.length} condomínio{neighbors.length !== 1 ? 's' : ''} vizinho{neighbors.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
