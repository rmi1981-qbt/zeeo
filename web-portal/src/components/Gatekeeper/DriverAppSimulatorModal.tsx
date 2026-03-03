import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, CheckCircle, XCircle, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../../lib/supabase';
import 'leaflet/dist/leaflet.css';
import { generateRandomName, generateRandomUnit, generateRandomPlate } from '../../utils/mockGenerators';
import { condoService, Condo } from '../../services/condoService';
import { deliveryService } from '../../services/deliveryService';

interface DriverAppSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: 'ifood' | 'mercadolivre' | 'ubereats';
    condoId: string;
    existingDeliveryId?: string | null;
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

// Component to fix Leaflet map sizes inside Framer Motion animated modals
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 400); // Wait for modal animation to finish
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};

export const DriverAppSimulatorModal: React.FC<DriverAppSimulatorModalProps> = ({
    isOpen,
    onClose,
    provider,
    condoId,
    existingDeliveryId
}) => {
    const [step, setStep] = useState<'setup' | 'active'>('setup');
    const [deliveryId, setDeliveryId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('N/A');
    const [qrCodeToken, setQrCodeToken] = useState<string | null>(null);

    // Form fields
    const [driverName, setDriverName] = useState(generateRandomName());
    const [vehiclePlate, setVehiclePlate] = useState(generateRandomPlate());
    const [targetUnit, setTargetUnit] = useState(generateRandomUnit());

    // Additional configuration state
    const [condos, setCondos] = useState<Condo[]>([]);
    const [selectedCondoId, setSelectedCondoId] = useState<string>(condoId);
    const [simulatePreAuth, setSimulatePreAuth] = useState(false);

    // Map State (default to approx location of Alphaville or generic)
    const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number }>({ lat: -23.5029, lng: -46.8488 });
    const [loading, setLoading] = useState(false);

    // Initial setup when modal opens
    useEffect(() => {
        if (isOpen) {
            setSimulatePreAuth(false);

            // Load condos
            condoService.getCondos()
                .then(data => {
                    setCondos(data);
                    // Only set default if we are not loading an existing one
                    if (!existingDeliveryId && data.length > 0 && (!condoId || condoId === 'mock')) {
                        setSelectedCondoId(data[0].id);
                    }
                })
                .catch(console.error);

            if (existingDeliveryId) {
                setLoading(true);
                deliveryService.getDelivery(existingDeliveryId).then(data => {
                    setDeliveryId(data.id);
                    setStatus(data.status);
                    setDriverName(data.driver_name || '');
                    setVehiclePlate(data.driver_plate || '');
                    setTargetUnit(data.unit || '');
                    setSelectedCondoId(data.condo_id);
                    if (data.qr_code_token) {
                        setQrCodeToken(data.qr_code_token);
                    }

                    if (data.driver_lat && data.driver_lng) {
                        setCurrentLocation({ lat: data.driver_lat, lng: data.driver_lng });
                    }

                    setStep('active');
                    setLoading(false);
                }).catch(err => {
                    console.error("Failed to load existing delivery", err);
                    setLoading(false);
                    // fallback to setup
                    setStep('setup');
                });
            } else {
                setStep('setup');
                setDeliveryId(null);
                setStatus('N/A');
                setDriverName(generateRandomName());
                setVehiclePlate(generateRandomPlate());
                setTargetUnit(generateRandomUnit());
                setSelectedCondoId(condoId);
            }
        }
    }, [isOpen, provider, condoId, existingDeliveryId]);

    // Listen to delivery status changes using Supabase realtime
    useEffect(() => {
        if (!deliveryId) return;

        const uniqueChannelName = `delivery_${deliveryId}_${Math.random().toString(36).substring(7)}`;
        const channel = supabase
            .channel(uniqueChannelName)
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
                    if (payload.new.qr_code_token) {
                        setQrCodeToken(payload.new.qr_code_token);
                    } else if (newStatus === 'inside') {
                        setQrCodeToken(null);
                    }
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

            // Set map to condo center early so it looks good when we flip tabs
            const selectedCondoData = condos.find(c => c.id === selectedCondoId);
            if (selectedCondoData && selectedCondoData.lat && selectedCondoData.lng) {
                setCurrentLocation({ lat: selectedCondoData.lat, lng: selectedCondoData.lng });
            }

            const response = await fetch(`http://localhost:8000/api/hub/inbound/${backendProvider}/delivery`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    condo_id: selectedCondoId,
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
            const newDeliveryId = data.data.id;
            setDeliveryId(newDeliveryId);
            setStatus(data.data.status);

            // Handle pre-auth if checked
            if (simulatePreAuth) {
                try {
                    const authResponse = await fetch(`http://localhost:8000/api/hub/webhook/approval`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey // Using the provider's API key to simulate an authorized third-party
                        },
                        body: JSON.stringify({
                            delivery_id: newDeliveryId,
                            decision: 'pre_authorized',
                            channel: 'app_zeeo',
                            actor_id: 'Simulador',
                            notes: 'Pré-autorizado via Zero-Knowledge Match',
                            phone_hash: 'a869177964cc68954ffec997bbad30769f8a5a6fdc60f296ddbc60b9347dc416'
                        })
                    });

                    if (!authResponse.ok) {
                        const errData = await authResponse.json();
                        throw new Error(errData.detail || 'Failed to authorize delivery via Webhook');
                    }

                    setStatus('authorized');
                } catch (e) {
                    console.error("Failed to simulate pre-auth:", e);
                }
            }

            setStep('active');

        } catch (err: any) {
            alert("Erro ao iniciar corrida: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulatePreAuth = async () => {
        if (!deliveryId) return;
        setLoading(true);
        try {
            const apiKey = PROVIDER_API_KEYS[provider];
            const authResponse = await fetch(`http://localhost:8000/api/hub/webhook/approval`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    delivery_id: deliveryId,
                    decision: 'pre_authorized',
                    channel: 'app_zeeo',
                    actor_id: 'Simulador',
                    notes: 'Pré-autorização Zero-Knowledge (Atrasada)',
                    phone_hash: 'a869177964cc68954ffec997bbad30769f8a5a6fdc60f296ddbc60b9347dc416'
                })
            });

            if (!authResponse.ok) {
                const errData = await authResponse.json();
                throw new Error(errData.detail || 'Failed to authorize delivery via Webhook');
            }

            setStatus('authorized');
        } catch (e: any) {
            console.error("Failed to simulate pre-auth:", e);
            alert("Erro ao simular pré-autorização: " + e.message);
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

            const response = await fetch(`http://localhost:8000/api/hub/inbound/${backendProvider}/location/${deliveryId}`, {
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

            // Dispatch native event for instant local update on the map
            window.dispatchEvent(new CustomEvent('delivery-location-updated', {
                detail: {
                    deliveryId,
                    lat: currentLocation.lat,
                    lng: currentLocation.lng
                }
            }));

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

    // Make sure it doesn't render blocking backdrop if active
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                drag
                dragMomentum={false}
                className="fixed bottom-24 right-8 z-[100] w-[375px] h-[750px] bg-slate-100 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border-[8px] border-slate-800 flex flex-col cursor-grab active:cursor-grabbing pointer-events-auto"
                style={{ touchAction: 'none' }}
            >
                {/* Fake Notch */}
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-3xl mx-24 z-50 pointer-events-none"></div>

                {/* Header (Drag Handle) */}
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
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Condomínio Destino</label>
                                    <select
                                        value={selectedCondoId}
                                        onChange={(e) => setSelectedCondoId(e.target.value)}
                                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="" disabled>Selecione um condomínio...</option>
                                        {condos.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
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

                                <div className="pt-2">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={simulatePreAuth}
                                                onChange={(e) => setSimulatePreAuth(e.target.checked)}
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:ring-primary-500 checked:bg-primary-500 checked:border-primary-500 transition-colors"
                                            />
                                            <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary-600 transition-colors">
                                            Simular pré-autorização pelo morador
                                        </span>
                                    </label>
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
                                    <MapResizer />
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

                                {/* QR Code Display */}
                                {qrCodeToken && status === 'authorized' && (
                                    <div className="mb-6 p-6 bg-slate-800 rounded-3xl text-center shadow-lg relative overflow-hidden">
                                        {/* decorative scanning line */}
                                        <div className="absolute inset-x-0 h-0.5 bg-emerald-400/50 shadow-[0_0_10px_theme(colors.emerald.400)] top-1/2 -translate-y-1/2 animate-[scan_2s_ease-in-out_infinite_alternate]"></div>

                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Token de Acesso</p>
                                        <div className="bg-white px-6 py-4 rounded-xl inline-block mx-auto mb-2 relative z-10">
                                            <span className="text-4xl font-black text-slate-800 tracking-[0.2em] font-mono">{qrCodeToken}</span>
                                        </div>
                                        <p className="text-slate-300 text-sm">Mostre na portaria ou escaneie o leitor</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleUpdateLocation}
                                    disabled={loading}
                                    className={`w-full ${themeColorClass} text-white font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2`}
                                >
                                    <Navigation size={20} className={loading ? 'animate-spin' : ''} />
                                    {loading ? 'Enviando API...' : 'Atualizar Localização'}
                                </button>

                                {['created', 'driver_assigned', 'approaching', 'at_gate'].includes(status) && (
                                    <button
                                        onClick={handleSimulatePreAuth}
                                        disabled={loading}
                                        className="w-full mt-4 bg-white text-slate-700 border-2 border-slate-300 font-bold text-lg py-4 rounded-2xl active:scale-95 transition-all flex justify-center items-center gap-2 shadow-sm"
                                    >
                                        <CheckCircle size={20} className={loading ? 'animate-pulse' : 'text-emerald-500'} />
                                        Disparar Pré-Autorização
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
