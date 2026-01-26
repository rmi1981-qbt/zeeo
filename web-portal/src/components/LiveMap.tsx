import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { Delivery } from '@zeeo/shared';
import { motion } from 'framer-motion';
import { Bike, Truck, Car, MapPin } from 'lucide-react';

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

interface LiveMapProps {
    deliveries: Delivery[];
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

const LiveMap: React.FC<LiveMapProps> = ({ deliveries, center = { lat: -23.5505, lng: -46.6333 } }) => {
    // Filter deliveries to show on map (Arriving and Inside)
    const mapDeliveries = deliveries.filter(d =>
        ['arriving', 'pre_authorized', 'inside'].includes(d.status) && d.location
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
                // Custom dark style for generic Map ID (if DEMO_MAP_ID doesn't exist, this might not fully apply without a cloud style)
                >
                    {/* Condo Center Marker */}
                    <AdvancedMarker position={center} title="Portaria Principal">
                        <div className="p-2 rounded-full bg-emerald-500 border-2 border-white shadow-lg shadow-emerald-500/50">
                            <MapPin size={20} className="text-white" />
                        </div>
                    </AdvancedMarker>

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
