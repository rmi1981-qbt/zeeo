import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeliveries } from '../hooks/useDeliveries';
import LiveMap from '../components/LiveMap';
import { AnimatePresence } from 'framer-motion';
import { condoService } from '../services/condoService';
import { ActiveProcessListItem } from '../components/Gatekeeper/ActiveProcessListItem';
import { ManualAuthorizationModal, PhoneCallOutcome } from '../components/Gatekeeper/ManualAuthorizationModal';
import { WhatsAppSimulatorModal } from '../components/Gatekeeper/WhatsAppSimulatorModal';
import { PushAppSimulatorModal } from '../components/Gatekeeper/PushAppSimulatorModal';
import { BiometricScannerModal } from '../components/Gatekeeper/BiometricScannerModal';
import { QRScannerModal } from '../components/Gatekeeper/QRScannerModal';
import { Search, DoorOpen } from 'lucide-react';
import { SalesDemoInjector } from '../components/SalesDemoInjector';

const Concierge: React.FC = () => {
    const { selectedCondo } = useAuth();
    const { deliveries, updateStatus, fetchDeliveries } = useDeliveries(selectedCondo || 'mock');

    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [gates, setGates] = useState<{ id: string; name: string; lat: number; lng: number; is_main: boolean }[]>([]);
    const [condoCenter, setCondoCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [condoPerimeter, setCondoPerimeter] = useState<{ lat: number; lng: number }[]>([]);

    // Modal state
    const [phoneModalDeliveryId, setPhoneModalDeliveryId] = useState<string | null>(null);
    const [whatsappModalDeliveryId, setWhatsappModalDeliveryId] = useState<string | null>(null);
    const [pushModalDeliveryId, setPushModalDeliveryId] = useState<string | null>(null);
    const [biometricModalDeliveryId, setBiometricModalDeliveryId] = useState<string | null>(null);
    const [qrModalDeliveryId, setQrModalDeliveryId] = useState<string | null>(null);

    const handlePhoneCallSubmit = async (outcome: PhoneCallOutcome) => {
        if (!phoneModalDeliveryId) return;

        const newStatus = outcome.status === 'authorized' ? 'authorized' :
            outcome.status === 'rejected' ? 'rejected' : 'at_gate';

        await updateStatus(phoneModalDeliveryId, {
            status: newStatus,
            authorization_method: 'phone_call',
            actor_role: 'concierge',
            authorized_by_resident_name: outcome.authorizerName,
            notes: outcome.status === 'no_answer' ? 'Morador não atendeu' : undefined
        });
        setPhoneModalDeliveryId(null);
    };

    useEffect(() => {
        if (selectedCondo) {
            // Fetch Gates
            fetch(`http://localhost:8000/condos/${selectedCondo}/gates`)
                .then(res => res.json())
                .then(data => {
                    const uiGates = data.map((g: any) => ({
                        id: g.id,
                        name: g.name,
                        lat: g.lat,
                        lng: g.lng,
                        is_main: g.is_main
                    }));
                    setGates(uiGates);
                })
                .catch(err => console.error('Failed to fetch gates', err));

            // Fetch Condo Details for Center & Perimeter
            condoService.getCondo(selectedCondo)
                .then(data => {
                    if (data.lat && data.lng) {
                        setCondoCenter({ lat: data.lat, lng: data.lng });
                    }
                    if (data.perimeter && data.perimeter.coordinates && data.perimeter.coordinates[0]) {
                        // GeoJSON Polygon coordinates are usually [lng, lat]
                        const coords = data.perimeter.coordinates[0].map((c: any) => ({ lat: c[1], lng: c[0] }));
                        setCondoPerimeter(coords);
                    }
                })
                .catch(err => console.error('Failed to fetch condo details', err));
        }
    }, [selectedCondo]);

    // Listen for Demo Injection Events
    useEffect(() => {
        const handleDemoAuth = (e: Event) => {
            const customEvent = e as CustomEvent<{ method: string }>;

            // Find the most recent delivery waiting for authorization
            const targetDeliveries = deliveries.filter(d => ['at_gate', 'pre_authorized'].includes(d.status || '') && (d.request_channels && d.request_channels.length > 0));

            if (targetDeliveries.length > 0) {
                const target = targetDeliveries[0];
                updateStatus(target.id, {
                    status: 'authorized',
                    authorization_method: customEvent.detail.method,
                    actor_role: 'resident',
                    authorized_by_resident_name: 'Morador Teste (Demo)'
                });
            } else {
                console.warn("No pending delivery found to authorize");
            }
        };

        window.addEventListener('demo-authorize', handleDemoAuth);
        return () => window.removeEventListener('demo-authorize', handleDemoAuth);
    }, [deliveries, updateStatus]);

    // Filter Logic
    const filteredDeliveries = deliveries.filter(d => {
        const s = d.status || '';

        // Base Filter
        // Exclude completely finalized processes (completed)
        if (s === 'completed') return false;

        // 1. Provider Filter
        if (providerFilter !== 'all' && d.provider !== providerFilter) return false;

        // 2. Smart Text Filter
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const gateMatch = d.current_gate?.name?.toLowerCase().includes(query) || false;
            const unitMatch = d.target_unit_label?.toLowerCase().includes(query) || false;
            const plateMatch = d.driver_snapshot?.plate?.toLowerCase().includes(query) || false;
            if (!gateMatch && !unitMatch && !plateMatch) return false;
        }

        return true;
    }).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()); // Sort newest first

    const entradasQueue = filteredDeliveries.filter(d => ['created', 'driver_assigned', 'approaching', 'at_gate', 'conflicting', 'pre_authorized', 'authorized'].includes(d.status || ''));
    const insideQueue = filteredDeliveries.filter(d => ['inside'].includes(d.status || ''));
    const saidasQueue = filteredDeliveries.filter(d => ['exited'].includes(d.status || ''));
    const trashQueue = filteredDeliveries.filter(d => ['denied', 'rejected'].includes(d.status || ''));

    return (
        <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">

            {/* MAIN LAYOUT */}
            <div className="flex-1 flex flex-col h-full relative z-10">

                {/* BOARD CONTENT */}
                <main className="flex-1 p-4 lg:p-6 overflow-hidden">
                    <div className="flex h-full gap-4 lg:gap-6 max-w-[1800px] mx-auto">

                        {/* COL 1: ENTRADAS (25%) */}
                        <div className="w-1/4 flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-800/50 flex flex-col gap-3 bg-slate-900/80 backdrop-blur-md">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-base lg:text-lg font-bold text-slate-100 flex items-center space-x-2">
                                        <div className="w-2.5 h-2.5 bg-yellow-400 rounded-sm rotate-45 animate-pulse" />
                                        <span>Entradas</span>
                                    </h2>
                                    <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full">{entradasQueue.length}</span>
                                </div>

                                {/* Smart Filter */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                                    />
                                </div>

                                {/* Provider Filters */}
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {[
                                        { id: 'all', label: 'Todos' },
                                        { id: 'ifood', label: 'iFood' },
                                        { id: 'mercadolivre', label: 'Mercado Livre' },
                                        { id: 'uber', label: 'Uber' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setProviderFilter(f.id)}
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors border ${providerFilter === f.id
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-900/20'
                                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                                }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-hide">
                                <AnimatePresence mode="popLayout">
                                    {entradasQueue.length > 0 ? entradasQueue.map(d => (
                                        <ActiveProcessListItem
                                            key={d.id}
                                            delivery={d}
                                            onRequestWhatsApp={(id) => setWhatsappModalDeliveryId(id)}
                                            onRequestPush={(id) => setPushModalDeliveryId(id)}
                                            onPhoneCallClick={(id) => setPhoneModalDeliveryId(id)}
                                            onExitManual={(id) => updateStatus(id, { status: 'exited', actor_role: 'concierge' })}
                                            onBiometricScanClick={(d) => setBiometricModalDeliveryId(d.id)}
                                            onVerifyBiometrics={() => alert("Validação visual registrada.")}
                                            onQRScanClick={(id) => setQrModalDeliveryId(id)}
                                            onLiberateEntry={(id) => updateStatus(id, { status: 'inside', actor_role: 'concierge', notes: 'entry_liberated' })}
                                        />
                                    )) : (
                                        <div className="text-center py-6 text-slate-600 flex flex-col items-center justify-center">
                                            <DoorOpen className="w-10 h-10 mb-2 text-slate-800" />
                                            <p className="text-xs">Nenhuma entrada.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* COL 2: CENTER (50%) - MAP + INSIDE */}
                        <div className="w-2/4 flex flex-col h-full gap-4 lg:gap-6">
                            {/* MAP (Top 2/3) */}
                            <div className="flex-[2] flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden group min-h-[300px]">
                                <LiveMap
                                    deliveries={deliveries}
                                    gates={gates}
                                    center={condoCenter}
                                    condoPerimeter={condoPerimeter}
                                    onMarkerDragEnd={(id, lat, lng) => {
                                        const deliveryToUpdate = deliveries.find(d => d.id === id);
                                        if (deliveryToUpdate) {
                                            updateStatus(id, {
                                                status: deliveryToUpdate.status,
                                                driver_lat: lat,
                                                driver_lng: lng
                                            });
                                        }
                                    }}
                                    onMarkerClick={(id, provider) => {
                                        window.dispatchEvent(new CustomEvent('open-simulator', { detail: { deliveryId: id, provider } }));
                                    }}
                                />
                            </div>

                            {/* INSIDE QUEUE (Bottom 1/3) */}
                            <div className="flex-[1] flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden min-h-[250px]">
                                <div className="p-3 lg:p-4 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md">
                                    <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between uppercase tracking-wider">
                                        <span>No Condomínio</span>
                                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">{insideQueue.length}</span>
                                    </h3>
                                </div>
                                <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-hide bg-slate-950/20">
                                    <AnimatePresence mode="popLayout">
                                        {insideQueue.length > 0 ? insideQueue.map(d => (
                                            <ActiveProcessListItem
                                                key={d.id}
                                                delivery={d}
                                                onRequestWhatsApp={() => { }}
                                                onRequestPush={() => { }}
                                                onPhoneCallClick={() => { }}
                                                onExitManual={(id) => updateStatus(id, { status: 'exited', actor_role: 'concierge' })}
                                                onRecover={() => { }}
                                                onLiberateEntry={() => { }}
                                                onVerifyBiometrics={() => { }}
                                            />
                                        )) : (
                                            <div className="text-center h-full flex flex-col items-center justify-center text-slate-600">
                                                <p className="text-xs">Nenhum veículo no condomínio.</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* COL 3: SAIDAS & HISTÓRICO (25%) */}
                        <div className="w-1/4 flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-md">
                                <h2 className="text-base lg:text-lg font-bold text-slate-100 flex items-center space-x-2">
                                    <span>Saídas</span>
                                </h2>
                            </div>

                            <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-hide">
                                <AnimatePresence mode="popLayout">
                                    {saidasQueue.length > 0 && (
                                        <div className="mb-4">
                                            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                                                <span>Finalizados</span>
                                                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">{saidasQueue.length}</span>
                                            </h3>
                                            <div className="space-y-3">
                                                {saidasQueue.map(d => (
                                                    <ActiveProcessListItem
                                                        key={d.id}
                                                        delivery={d}
                                                        onRequestWhatsApp={() => { }}
                                                        onRequestPush={() => { }}
                                                        onPhoneCallClick={() => { }}
                                                        onExitManual={() => { }}
                                                        onRecover={(id) => {
                                                            updateStatus(id, { status: 'inside', actor_role: 'concierge', notes: 'recovered_exit' });
                                                        }}
                                                        onLiberateEntry={() => { }}
                                                        onVerifyBiometrics={() => { }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {trashQueue.length > 0 && (
                                        <div className="pt-2 border-t border-slate-800/50">
                                            <h3 className="text-xs font-bold text-rose-500/80 mb-2 uppercase tracking-wider flex items-center justify-between">
                                                <span>Acessos Negados</span>
                                                <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full text-[10px]">{trashQueue.length}</span>
                                            </h3>
                                            <div className="space-y-3 opacity-75">
                                                {trashQueue.map(d => (
                                                    <ActiveProcessListItem
                                                        key={d.id}
                                                        delivery={d}
                                                        onRequestWhatsApp={() => { }}
                                                        onRequestPush={() => { }}
                                                        onPhoneCallClick={() => { }}
                                                        onRecover={(id) => {
                                                            updateStatus(id, { status: 'at_gate', request_channels: ['recovered'], notes: 'recovered_from_trash' });
                                                        }}
                                                        onLiberateEntry={() => { }}
                                                        onVerifyBiometrics={() => { }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {saidasQueue.length === 0 && trashQueue.length === 0 && (
                                        <div className="text-center py-10 text-slate-600 flex flex-col items-center justify-center">
                                            <p className="text-sm">Nenhuma saída ou negação recente.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            {/* Background Texture */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <ManualAuthorizationModal
                isOpen={!!phoneModalDeliveryId}
                onClose={() => setPhoneModalDeliveryId(null)}
                onSubmit={handlePhoneCallSubmit}
                deliveryName={deliveries.find(d => d.id === phoneModalDeliveryId)?.driver_snapshot.name || 'Desconhecido'}
                unitLabel={deliveries.find(d => d.id === phoneModalDeliveryId)?.target_unit_label || 'Desconhecida'}
            />

            <WhatsAppSimulatorModal
                isOpen={!!whatsappModalDeliveryId}
                onClose={() => setWhatsappModalDeliveryId(null)}
                delivery={deliveries.find(d => d.id === whatsappModalDeliveryId) || null}
                onSuccess={() => fetchDeliveries()}
            />

            <PushAppSimulatorModal
                isOpen={!!pushModalDeliveryId}
                onClose={() => setPushModalDeliveryId(null)}
                delivery={deliveries.find(d => d.id === pushModalDeliveryId) || null}
                onSuccess={() => fetchDeliveries()}
            />

            <BiometricScannerModal
                isOpen={!!biometricModalDeliveryId}
                onClose={() => setBiometricModalDeliveryId(null)}
                condoId={selectedCondo || ''}
                deliveryId={biometricModalDeliveryId || ''}
                driverName={deliveries.find(d => d.id === biometricModalDeliveryId)?.driver_snapshot.name || 'Desconhecido'}
                onSuccess={() => {
                    if (biometricModalDeliveryId) updateStatus(biometricModalDeliveryId, { status: 'inside' });
                    setBiometricModalDeliveryId(null);
                }}
            />

            <QRScannerModal
                isOpen={!!qrModalDeliveryId}
                onClose={() => setQrModalDeliveryId(null)}
                condoId={selectedCondo || ''}
                onSuccess={() => fetchDeliveries()}
            />

            {/* New Flow: Sales Demo Injector opens simulator modal directly */}
            <SalesDemoInjector onDeliveryChange={() => fetchDeliveries()} />
        </div>
    );
};

export default Concierge;
