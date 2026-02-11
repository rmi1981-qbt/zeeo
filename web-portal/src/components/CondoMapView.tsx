import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, InfoWindow } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { type Condo } from '../services/condoService';
import '../styles/CondoMapView.css';

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
            <div className="map-loading">
                <div className="spinner"></div>
                <p>Carregando mapa...</p>
            </div>
        );
    }

    if (condos.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <h3>Nenhum condomínio para exibir</h3>
                <p>Ajuste os filtros para ver condomínios no mapa</p>
            </div>
        );
    }

    return (
        <div className="condo-map-view">
            <GoogleMap
                mapContainerClassName="map-container"
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
                        <div className="info-window-content">
                            <h3>{selectedCondo.name}</h3>
                            <p className="info-location">
                                📍 {selectedCondo.city}/{selectedCondo.state}
                            </p>
                            {selectedCondo.address && (
                                <p className="info-address">{selectedCondo.address}</p>
                            )}
                            <div className="info-actions">
                                <button
                                    className="btn-info-edit"
                                    onClick={() => handleEdit(selectedCondo)}
                                >
                                    ✏️ Editar
                                </button>
                                <button
                                    className="btn-info-perimeter"
                                    onClick={() => handleViewPerimeter(selectedCondo)}
                                >
                                    🗺️ Ver Perímetro
                                </button>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}
