import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, InfoWindow } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { type Condo } from '../services/condoService';
import { Loader2, Map as MapIcon, Edit2, MapPin } from 'lucide-react';

interface CondoMapViewProps {
    condos: Condo[];
    onViewOnMap: (condo: Condo) => void;
}

const libraries: ("places" | "drawing" | "geometry")[] = ['places', 'drawing', 'geometry'];

/**
 * Parse perimeter data from Supabase/PostGIS.
 * The perimeter comes as GeoJSON: { type: "Polygon", coordinates: [[[lng, lat], ...]] }
 */
function parsePerimeterToCoords(perimeter: any): google.maps.LatLngLiteral[] | null {
    if (!perimeter) {
        console.log('Perimeter is null or undefined');
        return null;
    }
    console.log('Parsing perimeter:', JSON.stringify(perimeter));

    try {
        // GeoJSON Polygon format from PostGIS
        if (perimeter.type === 'Polygon' && perimeter.coordinates && perimeter.coordinates.length > 0) {
            const ring = perimeter.coordinates[0]; // Exterior ring
            const coords = ring.map((c: number[]) => ({
                lat: c[1],
                lng: c[0]
            }));
            // Remove last point if it duplicates the first (GeoJSON convention)
            if (coords.length > 1 &&
                coords[0].lat === coords[coords.length - 1].lat &&
                coords[0].lng === coords[coords.length - 1].lng) {
                coords.pop();
            }
            return coords;
        }
    } catch (e) {
        console.warn('Failed to parse perimeter:', e);
    }
    return null;
}

/**
 * Get center of a condominium from its perimeter or address
 */
async function getCondoCenter(condo: Condo): Promise<google.maps.LatLngLiteral | null> {
    // 1. Try to get center from perimeter coordinates
    const coords = parsePerimeterToCoords(condo.perimeter);
    if (coords && coords.length > 0) {
        const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / coords.length;
        const avgLng = coords.reduce((sum, p) => sum + p.lng, 0) / coords.length;
        return { lat: avgLat, lng: avgLng };
    }

    // 2. Fallback: geocode the address
    if (condo.address || (condo.city && condo.state)) {
        const addressParts = [condo.address, condo.number, condo.neighborhood, condo.city, condo.state, 'Brasil'].filter(Boolean);
        const address = addressParts.join(', ');
        const geocoder = new google.maps.Geocoder();

        try {
            const result = await geocoder.geocode({ address });
            if (result.results[0]) {
                const loc = result.results[0].geometry.location;
                return { lat: loc.lat(), lng: loc.lng() };
            }
        } catch (e) {
            console.warn('Geocoding failed for:', condo.name, e);
        }
    }

    // 3. Default: São Paulo center
    return { lat: -23.55, lng: -46.63 };
}

export function CondoMapView({ condos, onViewOnMap }: CondoMapViewProps) {
    const navigate = useNavigate();
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
        libraries
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [condoCenters, setCondoCenters] = useState<Map<string, google.maps.LatLngLiteral>>(new Map());
    const [selectedCondo, setSelectedCondo] = useState<Condo | null>(null);
    const [showPerimeter, setShowPerimeter] = useState(false);
    const [perimeterCoords, setPerimeterCoords] = useState<google.maps.LatLngLiteral[]>([]);

    // Calculate center for each condo
    useEffect(() => {
        async function calculateCenters() {
            const centers = new Map<string, google.maps.LatLngLiteral>();

            for (const condo of condos) {
                const center = await getCondoCenter(condo);
                if (center) {
                    centers.set(condo.id, center);
                }
            }

            setCondoCenters(centers);
        }

        if (isLoaded && condos.length > 0) {
            calculateCenters();
        }
    }, [isLoaded, condos]);

    // Fit map bounds to show all condos
    useEffect(() => {
        if (!map || condoCenters.size === 0) return;

        const bounds = new google.maps.LatLngBounds();
        condoCenters.forEach(center => {
            bounds.extend(center);
        });

        map.fitBounds(bounds);
    }, [map, condoCenters]);

    // Auto-show logic removed as per user request.
    // Map will still center on condos via the generic bounds effect above.

    function handleEdit(condo: Condo) {
        navigate(`/condominium-settings?id=${condo.id}`);
    }

    function handleViewPerimeter(condo: Condo) {
        const coords = parsePerimeterToCoords(condo.perimeter);
        if (coords && coords.length > 0) {
            setPerimeterCoords(coords);
            setShowPerimeter(true);
            setSelectedCondo(condo);

            // Pan to perimeter
            if (map) {
                const bounds = new google.maps.LatLngBounds();
                coords.forEach(c => bounds.extend(c));
                map.fitBounds(bounds);
            }
        } else {
            // No perimeter data - just center on marker
            onViewOnMap(condo);
        }
    }

    if (!isLoaded) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900/50 backdrop-blur-sm min-h-[400px] border border-slate-700/50 rounded-2xl">
                <Loader2 className="animate-spin text-primary-500 mb-4" size={40} />
                <p className="text-slate-400 font-medium font-sans">Carregando mapa maravilhoso...</p>
            </div>
        );
    }

    if (condos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-2xl border border-slate-700/50 h-full min-h-[400px]">
                <MapIcon size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2 font-display">Nenhum condomínio para exibir</h3>
                <p className="text-slate-400 font-sans">Ajuste os filtros para ver condomínios no mapa</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner">
            <GoogleMap
                mapContainerClassName="w-full h-full"
                onLoad={setMap}
                options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: true
                }}
            >
                {/* Markers for each condo */}
                {condos.map(condo => {
                    const center = condoCenters.get(condo.id);
                    if (!center) return null;

                    return (
                        <Marker
                            key={condo.id}
                            position={center}
                            label={{
                                text: condo.name,
                                className: 'marker-label',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                            onClick={() => setSelectedCondo(condo)}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 12,
                                fillColor: '#4F46E5',
                                fillOpacity: 1,
                                strokeColor: '#FFFFFF',
                                strokeWeight: 3
                            }}
                        />
                    );
                })}

                {/* Perimeter polygon */}
                {showPerimeter && perimeterCoords.length > 0 && (
                    <Polygon
                        paths={perimeterCoords}
                        options={{
                            fillColor: '#4F46E5',
                            fillOpacity: 0.2,
                            strokeColor: '#4F46E5',
                            strokeOpacity: 0.8,
                            strokeWeight: 3
                        }}
                    />
                )}

                {/* InfoWindow for selected condo */}
                {selectedCondo && condoCenters.get(selectedCondo.id) && (
                    <InfoWindow
                        position={condoCenters.get(selectedCondo.id)!}
                        onCloseClick={() => {
                            setSelectedCondo(null);
                            setShowPerimeter(false);
                            setPerimeterCoords([]);
                        }}
                    >
                        <div className="p-3 max-w-[280px] font-sans">
                            <h3 className="text-lg font-bold text-slate-800 mb-2 border-b border-slate-200 pb-2">{selectedCondo.name}</h3>
                            <div className="flex items-start gap-1.5 text-sm text-slate-600 mb-1">
                                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                <span>{selectedCondo.city}/{selectedCondo.state}</span>
                            </div>
                            {selectedCondo.address && (
                                <p className="text-xs text-slate-500 pl-5 mb-4">{selectedCondo.address}</p>
                            )}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 text-xs font-semibold transition-colors"
                                    onClick={() => handleEdit(selectedCondo)}
                                >
                                    <Edit2 size={12} /> Editar
                                </button>
                                <button
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 text-xs font-semibold transition-colors"
                                    onClick={() => handleViewPerimeter(selectedCondo)}
                                >
                                    <MapIcon size={12} /> Perímetro
                                </button>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}
