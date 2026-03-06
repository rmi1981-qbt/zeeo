import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { Delivery } from '@zeeo/shared';
import { motion } from 'framer-motion';
import { Bike, Truck, Car, MapPin, DoorOpen } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = 'DEMO_MAP_ID';

const getProviderIcon = (provider: string = '') => {
    switch (provider.toLowerCase()) {
        case 'ifood': return <Bike size={16} className="text-white" />;
        case 'mercadolivre': return <Truck size={16} className="text-slate-900" />;
        case 'uber':
        case 'ubereats': return <Car size={16} className="text-white" />;
        default: return <MapPin size={16} className="text-white" />;
    }
};

const getProviderColors = (provider: string = '') => {
    switch (provider.toLowerCase()) {
        case 'ifood': return { bg: 'bg-red-600', shadow: 'shadow-red-600/50' };
        case 'mercadolivre': return { bg: 'bg-yellow-400', shadow: 'shadow-yellow-400/50' };
        case 'uber':
        case 'ubereats': return { bg: 'bg-black', shadow: 'shadow-black/50' };
        default: return { bg: 'bg-slate-600', shadow: 'shadow-slate-600/50' };
    }
};

const PerimeterPolygon = ({ perimeter }: { perimeter: { lat: number, lng: number }[] }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || perimeter.length === 0) return;
        const poly = new google.maps.Polygon({
            paths: perimeter,
            strokeColor: '#3b82f6',
            strokeWeight: 2,
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            map: map,
            clickable: false
        });
        return () => poly.setMap(null);
    }, [map, perimeter]);
    return null;
};


export interface Gate {
    id: string;
    name: string;
    lat: number;
    lng: number;
    is_main: boolean;
}

interface LiveMapProps {
    deliveries: Delivery[];
    gates?: Gate[];
    center?: { lat: number, lng: number };
    onMarkerDragEnd?: (deliveryId: string, lat: number, lng: number) => void;
    onMapClick?: (lat: number, lng: number) => void;
    onMarkerClick?: (deliveryId: string, provider: string) => void;
    condoPerimeter?: { lat: number; lng: number }[];
    isPlacingItem?: boolean;
    selectedDeliveryId?: string | null;
}

// Internal component for each marker to manage its own InfoWindow state
const DeliveryMarker = ({ delivery, onDragEnd, onMarkerClick, isSelected }: { delivery: Delivery, onDragEnd?: (id: string, lat: number, lng: number) => void, onMarkerClick?: (id: string, provider: string) => void, isSelected?: boolean }) => {
    const [open, setOpen] = useState(false);
    const [markerRef, marker] = useAdvancedMarkerRef();

    // Auto-open if selected externally
    useEffect(() => {
        if (isSelected !== undefined) {
            setOpen(isSelected);
        }
    }, [isSelected]);

    const isAuthorized = delivery.status === 'authorized' || delivery.status === 'pre_authorized';
    const isDenied = delivery.status === 'denied' || delivery.status === 'rejected';
    const isConflict = delivery.status === 'conflicting';
    const isInside = delivery.status === 'inside';

    let statusText = 'Aguardando Liberação';
    let statusLabelClass = 'bg-yellow-100 text-yellow-600 border border-yellow-200';

    if (isInside) {
        statusText = 'No Condomínio';
        statusLabelClass = 'bg-purple-100 text-purple-600 border border-purple-200';
    } else if (isAuthorized) {
        statusText = 'Autorizado';
        statusLabelClass = 'bg-emerald-100 text-emerald-600 border border-emerald-200';
    } else if (isDenied) {
        statusText = 'Negado';
        statusLabelClass = 'bg-rose-100 text-rose-600 border border-rose-200';
    } else if (isConflict) {
        statusText = 'Conflito de Respostas';
        statusLabelClass = 'bg-orange-100 text-orange-600 border border-orange-200';
    }

    const providerStyle = getProviderColors(delivery.provider);

    return (
        <>
            <AdvancedMarker
                ref={markerRef}
                position={{ lat: delivery.location!.lat, lng: delivery.location!.lng }}
                onClick={() => setOpen(true)}
                title={delivery.driver_snapshot.name}
                // @ts-ignore
                gmpDraggable={!!onDragEnd}
                draggable={!!onDragEnd}
                onDragEnd={(e: any) => {
                    console.log('AdvancedMarker Drag Ended', e, marker);
                    if (onDragEnd && marker) {
                        // The event for AdvancedMarker drag doesn't always have latLng natively in react-google-maps types.
                        // We extract it from marker.position.
                        const pos = (marker as any).position;
                        if (pos) {
                            const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
                            const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
                            console.log('Found Drag Position:', lat, lng);
                            if (typeof lat === 'number' && typeof lng === 'number') {
                                onDragEnd(delivery.id, lat, lng);
                            }
                        }
                    }
                }}
            >
                <div
                    className={`p-2 rounded-full border-2 border-white shadow-lg ${providerStyle.bg} ${providerStyle.shadow} flex items-center justify-center`}
                >
                    {getProviderIcon(delivery.provider)}
                </div>
            </AdvancedMarker>

            {open && (
                <InfoWindow
                    anchor={marker}
                    onCloseClick={() => setOpen(false)}
                    maxWidth={200}
                >
                    <div className="p-1 text-slate-900">
                        <div className="font-bold">{delivery.driver_snapshot.name}</div>
                        <div className="text-xs text-slate-600 mb-1">{delivery.driver_snapshot.plate}</div>
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block ${statusLabelClass} mb-2`}>
                            {statusText}
                        </div>
                        {onMarkerClick && (
                            <button
                                onClick={() => onMarkerClick(delivery.id, delivery.provider)}
                                className="w-full mt-2 bg-slate-900 text-white text-[10px] py-1.5 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1"
                            >
                                <span>Abrir App Motorista</span>
                            </button>
                        )}
                    </div>
                </InfoWindow>
            )}
        </>
    );
};

// Inner component to handle map updates
const MapController = ({ center, selectedDelivery }: { center: { lat: number, lng: number }, selectedDelivery?: Delivery }) => {
    const map = useMap();

    useEffect(() => {
        if (map && selectedDelivery?.location) {
            map.panTo({ lat: selectedDelivery.location.lat, lng: selectedDelivery.location.lng });
            map.setZoom(18); // Zoom in closer on selection
        } else if (map && center && !selectedDelivery) {
            map.panTo(center);
        }
    }, [map, center, selectedDelivery]);

    return null;
};

const LiveMap: React.FC<LiveMapProps> = ({ deliveries, gates = [], center = { lat: -23.5505, lng: -46.6333 }, onMarkerDragEnd, onMapClick, onMarkerClick, isPlacingItem, condoPerimeter, selectedDeliveryId }) => {
    // Filter deliveries to show on map (Arriving and Inside)
    const mapDeliveries = deliveries.filter(d =>
        // Show everything that isn't completed or exited
        !['completed', 'exited'].includes(d.status) && d.location
    );

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                <div className="text-center">
                    <p className="font-bold">Google Maps API Key Missing</p>
                    <p className="text-sm mt-1">Add VITE_GOOGLE_MAPS_API_KEY to .env</p>
                </div>
            </div>
        );
    }

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full rounded-2xl overflow-hidden border border-slate-800/50 relative shadow-2xl"
            >
                <Map
                    defaultCenter={center}
                    defaultZoom={16}
                    mapId={MAP_ID}
                    disableDefaultUI={true}
                    gestureHandling={'greedy'}
                    className={`w-full h-full ${isPlacingItem ? 'cursor-crosshair' : ''}`}
                    style={{ background: '#0f172a' }} // prevent white flash
                    onClick={(e) => {
                        console.log("Map clicked event:", e);
                        if (isPlacingItem && onMapClick && e.detail.latLng) {
                            const latLng: any = e.detail.latLng;
                            const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
                            const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
                            if (typeof lat === 'number' && typeof lng === 'number') {
                                onMapClick(lat, lng);
                            }
                        }
                    }}
                >
                    <MapController center={center} selectedDelivery={deliveries.find(d => d.id === selectedDeliveryId)} />

                    {/* Perimeter Polygon */}
                    {condoPerimeter && condoPerimeter.length > 0 && (
                        <PerimeterPolygon perimeter={condoPerimeter} />
                    )}

                    {/* Condo Center Marker - Kept as fallback/general location */}
                    <AdvancedMarker position={center} title="Localização do Condomínio">
                        <div className="w-3 h-3 rounded-full bg-slate-400/50 border border-slate-300"></div>
                    </AdvancedMarker>

                    {/* Gates */}
                    {gates.map(gate => (
                        <AdvancedMarker
                            key={gate.id}
                            position={{ lat: gate.lat, lng: gate.lng }}
                            title={gate.name}
                        >
                            <div className={`p-1.5 rounded-lg border-2 border-white shadow-lg flex items-center justify-center group relative
                                ${gate.is_main ? 'bg-emerald-600 shadow-emerald-500/50' : 'bg-slate-700 shadow-slate-900/50'}`}
                            >
                                <DoorOpen size={16} className="text-white" />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                    {gate.name}
                                </div>
                            </div>
                        </AdvancedMarker>
                    ))}

                    {mapDeliveries.map(d => (
                        <DeliveryMarker key={d.id} delivery={d} onDragEnd={onMarkerDragEnd} onMarkerClick={onMarkerClick} isSelected={d.id === selectedDeliveryId} />
                    ))}
                </Map>

                {/* Overlay Title */}
                <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 shadow-xl">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status no Mapa</div>
                    <div className="flex flex-col space-y-1 text-white text-sm">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px]">Autorizado</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                            <span className="text-[10px]">Aguardando</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                            <span className="text-[10px]">Negado</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                            <span className="text-[10px]">No Interior</span>
                        </div>
                    </div>
                </div>

                {isPlacingItem ? (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-blue-600/90 backdrop-blur-md px-6 py-3 rounded-full border border-blue-400/50 text-white text-sm font-bold shadow-2xl animate-pulse">
                        📍 Clique no mapa para posicionar o entregador
                    </div>
                ) : onMarkerDragEnd && (
                    <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10 text-white/50 text-[10px] uppercase font-bold tracking-widest pointer-events-none">
                        Mova os ícones para simular o motorista
                    </div>
                )}
            </motion.div>
        </APIProvider>
    );
};

export default LiveMap;
