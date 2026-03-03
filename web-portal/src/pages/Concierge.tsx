import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeliveries } from '../hooks/useDeliveries';
import LiveMap from '../components/LiveMap';
import { AnimatePresence } from 'framer-motion';
import { condoService } from '../services/condoService';
import { ActiveProcessListItem } from '../components/Gatekeeper/ActiveProcessListItem';
import { ManualAuthorizationModal, PhoneCallOutcome } from '../components/Gatekeeper/ManualAuthorizationModal';
import { AlertCircle, Clock, MapPin, Navigation, PhoneCall, ShieldCheck, User, Video, X, Loader2, Map as MapIcon, Link as LinkIcon, AlertTriangle, Key, Search, DoorOpen } from 'lucide-react';
import { SalesDemoInjector } from '../components/SalesDemoInjector';

const Concierge: React.FC = () => {
    const { selectedCondo } = useAuth();
    const { deliveries, updateStatus } = useDeliveries(selectedCondo || 'mock');

    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'saidas' | 'trash'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [gates, setGates] = useState<{ id: string; name: string; lat: number; lng: number; is_main: boolean }[]>([]);
    const [condoCenter, setCondoCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [condoPerimeter, setCondoPerimeter] = useState<{ lat: number; lng: number }[]>([]);

    // Modal state
    const [phoneModalDeliveryId, setPhoneModalDeliveryId] = useState<string | null>(null);

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

        // 3. Tab Filter
        if (activeTab === 'saidas' && s !== 'exited') return false;
        if (activeTab !== 'saidas' && s === 'exited') return false;

        if (activeTab === 'pending') {
            return ['approaching', 'at_gate', 'created', 'conflicting'].includes(s);
        } else if (activeTab === 'approved') {
            return ['authorized', 'pre_authorized', 'inside'].includes(s);
        } else if (activeTab === 'trash') {
            // Trash includes denied/rejected things that haven't expired from the backend yet
            return ['denied', 'rejected'].includes(s);
        } else if (activeTab === 'saidas') {
            return s === 'exited';
        }

        return true;
    }).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()); // Sort newest first

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
                                        <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full">{filteredDeliveries.length}</span>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex bg-slate-950/50 p-1 rounded-lg">
                                        {[
                                            { id: 'pending', label: 'Pendentes' },
                                            { id: 'approved', label: 'Aprovados' },
                                            { id: 'saidas', label: 'Saídas' },
                                            { id: 'trash', label: 'Lixeira' }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id
                                                    ? 'bg-slate-800 text-white shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-300'
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Smart Filter */}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Buscar unidade, placa ou portaria..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-600"
                                        />
                                    </div>

                                    {/* Quick Provider Filters */}
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

                                <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-hide">
                                    <AnimatePresence mode="popLayout">
                                        {filteredDeliveries.length === 0 && (
                                            <div className="text-center py-10 text-slate-600">
                                                <p className="text-sm">Nenhum processo {activeTab === 'trash' ? 'na lixeira' : 'encontrado'}</p>
                                            </div>
                                        )}
                                        {filteredDeliveries.map(d => (
                                            <ActiveProcessListItem
                                                key={d.id}
                                                delivery={d}
                                                onRequestWhatsApp={(id) => updateStatus(id, { status: 'at_gate', request_channels: ['whatsapp'], notes: 'whatsapp_requested' })}
                                                onRequestPush={(id) => updateStatus(id, { status: 'at_gate', request_channels: ['push'], notes: 'push_requested' })}
                                                onPhoneCallClick={(id) => setPhoneModalDeliveryId(id)}
                                                onAuthorizeManual={(id) => updateStatus(id, { status: 'authorized', actor_role: 'concierge', authorization_method: 'manual' })}
                                                onRejectManual={(id) => updateStatus(id, { status: 'rejected', actor_role: 'concierge', authorization_method: 'manual' })}
                                                onExitManual={(id) => updateStatus(id, { status: 'exited', actor_role: 'concierge' })}
                                                onRecover={(id) => {
                                                    const del = deliveries.find(d => d.id === id);
                                                    if (del && del.status === 'exited') {
                                                        updateStatus(id, { status: 'inside', actor_role: 'concierge', notes: 'recovered_exit' });
                                                    } else {
                                                        updateStatus(id, { status: 'at_gate', request_channels: ['recovered'], notes: 'recovered_from_trash' });
                                                    }
                                                }}
                                            />
                                        ))}
                                    </AnimatePresence>
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
                deliveryName={filteredDeliveries.find(d => d.id === phoneModalDeliveryId)?.driver_snapshot.name || 'Desconhecido'}
                unitLabel={filteredDeliveries.find(d => d.id === phoneModalDeliveryId)?.target_unit_label || 'Desconhecida'}
            />

            {/* New Flow: Sales Demo Injector opens simulator modal directly */}
            <SalesDemoInjector />
        </div>
    );
};

export default Concierge;
