import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useAdvancedMarkerRef, useMap } from '@vis.gl/react-google-maps';
import { Delivery } from '@zeeo/shared';
import { motion } from 'framer-motion';
import { Bike, Truck, Car, MapPin, DoorOpen } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = 'DEMO_MAP_ID';

const getProviderIcon = (provider: string = '') => {
    switch (provider.toLowerCase()) {
        case 'ifood': return <Bike size={14} className="text-white" />;
        case 'mercadolivre': return <Truck size={14} className="text-white" />;
        case 'uber': return <Car size={14} className="text-white" />;
        default: return <MapPin size={14} className="text-white" />;
    }
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
}

// Internal component for each marker to manage its own InfoWindow state
const DeliveryMarker = ({ delivery }: { delivery: Delivery }) => {
    const [open, setOpen] = useState(false);
    const [markerRef, marker] = useAdvancedMarkerRef();

    const isInside = delivery.status === 'inside';
    const bgColor = isInside ? 'bg-red-500' : 'bg-yellow-500';
    const shadowColor = isInside ? 'shadow-red-500/50' : 'shadow-yellow-500/50';

    return (
        <>
            <AdvancedMarker
                ref={markerRef}
                position={{ lat: delivery.location!.lat, lng: delivery.location!.lng }}
                onClick={() => setOpen(true)}
                title={delivery.driver_snapshot.name}
            >
                <div
                    className={`p-1.5 rounded-full border-2 border-white shadow-lg ${bgColor} ${shadowColor} transition-transform hover:scale-110 flex items-center justify-center`}
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
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block ${isInside ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {isInside ? 'No Condomínio' : 'Chegando'}
                        </div>
                    </div>
                </InfoWindow>
            )}
        </>
    );
};

// Inner component to handle map updates
const MapController = ({ center }: { center: { lat: number, lng: number } }) => {
    const map = useMap();

    useEffect(() => {
        if (map && center) {
            map.panTo(center);
        }
    }, [map, center]);

    return null;
};

const LiveMap: React.FC<LiveMapProps> = ({ deliveries, gates = [], center = { lat: -23.5505, lng: -46.6333 } }) => {
    // Filter deliveries to show on map (Arriving and Inside)
    const mapDeliveries = deliveries.filter(d =>
        ['arriving', 'approaching', 'pre_authorized', 'inside'].includes(d.status) && d.location
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
                    className="w-full h-full"
                    style={{ background: '#0f172a' }} // prevent white flash
                >
                    <MapController center={center} />

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
                        <DeliveryMarker key={d.id} delivery={d} />
                    ))}
                </Map>

                {/* Overlay Title */}
                <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg border border-slate-700 shadow-xl">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Google Maps Live</div>
                    <div className="flex items-center space-x-3 text-white text-sm">
                        <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                            <span>Chegando</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                            <span>No Interior</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </APIProvider>
    );
};

export default LiveMap;
