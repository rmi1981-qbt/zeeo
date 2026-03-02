import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, CheckCircle, XCircle, MapPin, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../../lib/supabase';
import { generateRandomName, generateRandomUnit, generateRandomPlate } from '../../utils/mockGenerators';

interface DriverAppSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: 'ifood' | 'mercadolivre' | 'ubereats';
    condoId: string;
}

const PROVIDER_API_KEYS: Record<string, string> = {
    'ifood': 'sim-key-ifood-123',
    'mercadolivre': 'sim-key-ml-123',
    'ubereats': 'sim-key-uber-123',
};

// Map provider frontend names to backend names (uber vs ubereats)
const getBackendProviderName = (p: string) => p === 'ubereats' ? 'uber' : p;

// Fix Leaflet icons
const driverIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082338.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
});

// A component to handle map clicks
const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

export const DriverAppSimulatorModal: React.FC<DriverAppSimulatorModalProps> = ({
    isOpen,
    onClose,
    provider,
    condoId
}) => {
    const [step, setStep] = useState<'setup' | 'active'>('setup');
    const [deliveryId, setDeliveryId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('N/A');

    // Form fields
    const [driverName, setDriverName] = useState(generateRandomName());
    const [vehiclePlate, setVehiclePlate] = useState(generateRandomPlate());
    const [targetUnit, setTargetUnit] = useState(generateRandomUnit());

    // Map State (default to approx location of Alphaville or generic)
    const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number }>({ lat: -23.5029, lng: -46.8488 });
    const [loading, setLoading] = useState(false);

    // Initial setup when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('setup');
            setDeliveryId(null);
            setStatus('N/A');
            setDriverName(generateRandomName());
            setVehiclePlate(generateRandomPlate());
            setTargetUnit(generateRandomUnit());
        }
    }, [isOpen, provider]);

    // Listen to delivery status changes using Supabase realtime
    useEffect(() => {
        if (!deliveryId) return;

        const channel = supabase.channel(`driver-sim-${deliveryId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `id=eq.${deliveryId}`
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    setStatus(newStatus);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [deliveryId]);

    const handleStartDelivery = async () => {
        setLoading(true);
        try {
            const backendProvider = getBackendProviderName(provider);
            const apiKey = PROVIDER_API_KEYS[provider];

            const response = await fetch(`http://localhost:8002/api/hub/inbound/${backendProvider}/delivery`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    condo_id: condoId,
                    target_unit: targetUnit,
                    driver_name: driverName,
                    vehicle_plate: vehiclePlate,
                    eta_mins: 15
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to start delivery');
            }

            const data = await response.json();
            setDeliveryId(data.data.id);
            setStatus(data.data.status);
            setStep('active');

        } catch (err: any) {
            alert("Erro ao iniciar corrida: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLocation = async () => {
        if (!deliveryId) return;
        setLoading(true);
        try {
            const backendProvider = getBackendProviderName(provider);
            const apiKey = PROVIDER_API_KEYS[provider];

            const response = await fetch(`http://localhost:8002/api/hub/inbound/${backendProvider}/location/${deliveryId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    driver_lat: currentLocation.lat,
                    driver_lng: currentLocation.lng
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update location');
            }

            // Show brief animation or toast (we'll just let the state update button)
            setTimeout(() => setLoading(false), 500);

        } catch (err: any) {
            alert("Erro ao atualizar localização: " + err.message);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const providerColors = {
        'ifood': 'bg-red-500',
        'mercadolivre': 'bg-yellow-400',
        'ubereats': 'bg-emerald-500' // Using emerald since white text on white bg is bad
    };

    const themeColorClass = providerColors[provider];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                {/* Mobile Device Mockup */}
                <motion.div
                    initial={{ y: 50, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    className="relative w-full max-w-[375px] h-[812px] max-h-[90vh] bg-slate-100 rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-slate-800 flex flex-col"
                >
                    {/* Fake Notch */}
                    <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-3xl mx-24 z-50"></div>

                    {/* Header */}
                    <div className={`${themeColorClass} text-white pt-12 pb-4 px-6 flex items-center justify-between shadow-md z-40`}>
                        <div className="flex items-center gap-2">
                            <Truck size={20} />
                            <span className="font-bold text-lg capitalize">{provider === 'ubereats' ? 'Uber Eats' : provider}</span>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-black/20 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-100 relative">
                        {step === 'setup' ? (
                            <div className="p-6 space-y-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-xl font-bold text-slate-800">Nova Corrida</h2>
                                    <p className="text-sm text-slate-500">Configure os dados do entregador simulado</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome do Entregador</label>
                                        <input
                                            type="text"
                                            value={driverName}
                                            onChange={(e) => setDriverName(e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Placa do Veículo</label>
                                        <input
                                            type="text"
                                            value={vehiclePlate}
                                            onChange={(e) => setVehiclePlate(e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Unidade de Destino</label>
                                        <input
                                            type="text"
                                            value={targetUnit}
                                            onChange={(e) => setTargetUnit(e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleStartDelivery}
                                    disabled={loading}
                                    className={`w-full ${themeColorClass} text-white font-bold text-lg py-4 rounded-2xl shadow-lg mt-8 active:scale-95 transition-all flex justify-center items-center`}
                                >
                                    {loading ? 'Conectando ao Hub...' : 'Aceitar Corrida'}
                                </button>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                {/* Map View occupying most space */}
                                <div className="flex-1 bg-slate-200 relative">
                                    <MapContainer
                                        center={[currentLocation.lat, currentLocation.lng]}
                                        zoom={15}
                                        style={{ height: '100%', width: '100%', zIndex: 10 }}
                                        zoomControl={false}
                                    >
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={driverIcon} />
                                        <MapClickHandler onLocationSelect={(lat, lng) => setCurrentLocation({ lat, lng })} />
                                    </MapContainer>

                                    {/* Map overlay hint */}
                                    <div className="absolute top-4 inset-x-4 z-20 bg-white/90 backdrop-blur rounded-xl p-3 shadow-md border border-slate-200 text-center">
                                        <p className="text-xs font-bold text-slate-700">👆 Clique no mapa para mover o entregador</p>
                                    </div>
                                </div>

                                {/* Status Dashboard Handle */}
                                <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-30 pb-10">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">Status Interno SaFE</h3>
                                            <p className="text-sm text-slate-500">Sincronizado via Webhooks</p>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                                            {status === 'authorized' || status === 'pre_authorized' || status === 'inside' ? (
                                                <CheckCircle size={16} className="text-emerald-500" />
                                            ) : status === 'rejected' || status === 'denied' ? (
                                                <XCircle size={16} className="text-rose-500" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                            )}
                                            <span className="text-sm font-bold text-slate-700 capitalize">
                                                {status}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleUpdateLocation}
                                        disabled={loading}
                                        className={`w-full ${themeColorClass} text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2`}
                                    >
                                        <Navigation size={20} className={loading ? 'animate-spin' : ''} />
                                        {loading ? 'Enviando API...' : 'Atualizar Localização'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
