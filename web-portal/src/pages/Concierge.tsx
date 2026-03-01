import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeliveries } from '../hooks/useDeliveries';
import LiveMap from '../components/LiveMap';
import { AnimatePresence } from 'framer-motion';
import { condoService } from '../services/condoService';
import { deliveryService } from '../services/deliveryService';
import { ActiveProcessListItem } from '../components/Gatekeeper/ActiveProcessListItem';
import { ManualAuthorizationModal, PhoneCallOutcome } from '../components/Gatekeeper/ManualAuthorizationModal';
import { History } from 'lucide-react';
import { SalesDemoInjector } from '../components/SalesDemoInjector';

const Concierge: React.FC = () => {
    const { selectedCondo } = useAuth();
    const { deliveries, updateStatus, fetchDeliveries } = useDeliveries(selectedCondo || 'mock');

    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [gates, setGates] = useState<{ id: string; name: string; lat: number; lng: number; is_main: boolean }[]>([]);
    const [condoCenter, setCondoCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [condoPerimeter, setCondoPerimeter] = useState<{ lat: number; lng: number }[]>([]);

    // Injection State
    const [pendingInjection, setPendingInjection] = useState<{ provider: 'ifood' | 'mercadolivre' | 'ubereats', withBiometrics: boolean } | null>(null);

    // Modal state
    const [phoneModalDeliveryId, setPhoneModalDeliveryId] = useState<string | null>(null);

    const handlePhoneCallSubmit = async (outcome: PhoneCallOutcome) => {
        if (!phoneModalDeliveryId) return;

        const newStatus = outcome.status === 'authorized' ? 'authorized' :
            outcome.status === 'denied' ? 'denied' : 'pending_authorization';

        await updateStatus(phoneModalDeliveryId, {
            status: newStatus,
            authorization_method: 'phone_call',
            actor_role: 'concierge',
            authorized_by_resident_name: outcome.authorizerName,
            notes: outcome.status === 'no_answer' ? 'Morador não atendeu' : undefined
        });
        setPhoneModalDeliveryId(null);
    };

    const handleMapClick = async (lat: number, lng: number) => {
        if (!pendingInjection || !selectedCondo) return;

        const { provider, withBiometrics } = pendingInjection;
        const providersMap = {
            ifood: { name: 'João Entregador', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
            mercadolivre: { name: 'Carlos Logística', photo: 'https://randomuser.me/api/portraits/men/44.jpg' },
            ubereats: { name: 'Motorista Ana', photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
        };
        const pInfo = providersMap[provider];

        const newDelivery = {
            condo_id: selectedCondo,
            status: 'approaching' as const,
            platform: provider,
            driver_name: pInfo.name,
            driver_plate: 'TST-9999',
            driver_photo: withBiometrics ? `${pInfo.photo}#verified` : pInfo.photo,
            driver_lat: lat,
            driver_lng: lng,
            unit: `Apto ${Math.floor(Math.random() * 800) + 100}`
        };

        try {
            await deliveryService.createDelivery(newDelivery);
            setPendingInjection(null);
            fetchDeliveries(); // Force update so it appears instantly
        } catch (e) {
            console.error("Failed to inject demo delivery", e);
        }
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
            const targetDeliveries = deliveries.filter(d => ['pending_authorization', 'pre_authorized'].includes(d.status || ''));

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
    const activeDeliveries = deliveries.filter(d =>
        // Active processes are those not yet completed or recently rejected (handled by backend, but we filter out exited/completed just in case)
        !['completed', 'exited'].includes(d.status || '') &&
        (providerFilter === 'all' || d.provider === providerFilter)
    ).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()); // Sort newest first

    const recentHistory = deliveries.filter(d => ['completed', 'rejected', 'exited', 'denied'].includes(d.status || '')).slice(0, 5); // Last 5

    return (
        <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">

            {/* MAIN LAYOUT */}
            <div className="flex-1 flex flex-col h-full relative z-10">

                {/* BOARD CONTENT */}
                <main className="flex-1 p-6 overflow-hidden">
                    <div className="flex h-full gap-6 max-w-[1800px] mx-auto">

                        {/* COL 1: LIVE MAP (65%) */}
                        <div className="flex-[2] flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden group">
                            <LiveMap
                                deliveries={deliveries}
                                gates={gates}
                                center={condoCenter}
                                condoPerimeter={condoPerimeter}
                                isPlacingItem={!!pendingInjection}
                                onMapClick={handleMapClick}
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
                            />
                        </div>

                        {/* COL 2: PLANNER / OPERATIONAL (35%) */}
                        <div className="flex-1 flex flex-col h-full space-y-6">

                            {/* AT GATE (Active Action Required) */}
                            <div className="flex-1 flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-800/50 flex flex-col gap-3 bg-slate-900/80 backdrop-blur-md">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                                            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-sm rotate-45 animate-pulse" />
                                            <span>Processos Ativos</span>
                                        </h2>
                                        <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full">{activeDeliveries.length}</span>
                                    </div>

                                    {/* Filters */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {[
                                            { id: 'all', label: 'Todos' },
                                            { id: 'ifood', label: 'iFood' },
                                            { id: 'mercadolivre', label: 'MercadoLivre' },
                                            { id: 'uber', label: 'Uber' },
                                            { id: 'rappi', label: 'Rappi' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setProviderFilter(f.id)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${providerFilter === f.id
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-hide">
                                    <AnimatePresence mode="popLayout">
                                        {activeDeliveries.length === 0 && (
                                            <div className="text-center py-10 text-slate-600">
                                                <p className="text-sm">Nenhum processo ativo</p>
                                            </div>
                                        )}
                                        {activeDeliveries.map(d => (
                                            <ActiveProcessListItem
                                                key={d.id}
                                                delivery={d}
                                                onRequestWhatsApp={(id) => updateStatus(id, { status: 'pending_authorization', notes: 'whatsapp_requested' })}
                                                onRequestPush={(id) => updateStatus(id, { status: 'pending_authorization', notes: 'push_requested' })}
                                                onPhoneCallClick={(id) => setPhoneModalDeliveryId(id)}
                                                onAuthorizeManual={(id) => updateStatus(id, { status: 'authorized', actor_role: 'concierge', authorization_method: 'manual' })}
                                                onRejectManual={(id) => updateStatus(id, { status: 'denied', actor_role: 'concierge', authorization_method: 'manual' })}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* HISTORY / RECENT EXIT */}
                            <div className="h-1/3 flex flex-col bg-slate-900/30 rounded-2xl border border-slate-800/30 backdrop-blur-sm overflow-hidden">
                                <div className="p-3 border-b border-slate-800/30 flex justify-between items-center">
                                    <h2 className="text-sm font-bold text-slate-400 flex items-center space-x-2">
                                        <History size={16} />
                                        <span>Últimas Saídas</span>
                                    </h2>
                                </div>

                                <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-hide">
                                    {recentHistory.map(d => (
                                        <div key={d.id} className="opacity-70 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                                        {d.driver_snapshot.photoUrl ? (
                                                            <img src={d.driver_snapshot.photoUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xs font-bold text-slate-500">{d.driver_snapshot.name[0]}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-300">{d.driver_snapshot.name}</div>
                                                        <div className="text-[10px] text-slate-500">{d.status === 'completed' ? 'Finalizado' : 'Rejeitado'}</div>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-slate-600 font-mono">
                                                    {new Date(d.updatedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
                deliveryName={activeDeliveries.find(d => d.id === phoneModalDeliveryId)?.driver_snapshot.name || 'Desconhecido'}
                unitLabel={activeDeliveries.find(d => d.id === phoneModalDeliveryId)?.target_unit_label || 'Desconhecida'}
            />

            <SalesDemoInjector onRequestInjection={(provider, withBiometrics) => setPendingInjection({ provider, withBiometrics })} />
        </div>
    );
};

export default Concierge;
