import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDeliveries } from '../../hooks/useDeliveries';
import { DeliveryCard } from '../../components/DeliveryCard';
import PerimeterMap from '../../components/PerimeterMap';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Truck,
    DoorOpen,
    Home,
    History,
} from 'lucide-react';
import { Delivery } from '@zeeo/shared';
import { Gate, condoService } from '../../services/condoService';

const DashboardHome: React.FC = () => {
    const { selectedCondo } = useAuth();
    const { deliveries, updateStatus } = useDeliveries(selectedCondo || 'mock');
    const [condoCenter, setCondoCenter] = useState<{ lat: number; lng: number }>({ lat: -23.55, lng: -46.63 });
    const [gates, setGates] = useState<Gate[]>([]);
    const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
    const [perimeter, setPerimeter] = useState<{ lat: number; lng: number }[] | undefined>(undefined);

    // Fetch condo center, perimeter & gates
    useEffect(() => {
        if (selectedCondo) {
            condoService.getCondo(selectedCondo)
                .then(data => {
                    if (data.lat && data.lng) {
                        setCondoCenter({ lat: data.lat, lng: data.lng });
                    }
                    // Parse Perimeter (GeoJSON)
                    if (data.perimeter && data.perimeter.coordinates && data.perimeter.coordinates.length > 0) {
                        const coords = data.perimeter.coordinates[0].map((p: any) => ({
                            lat: p[1],
                            lng: p[0]
                        }));
                        setPerimeter(coords);
                    } else {
                        setPerimeter(undefined);
                    }
                })
                .catch(err => console.error('Failed to fetch condo details', err));

            condoService.getGates(selectedCondo).then(setGates).catch(console.error);
        }
    }, [selectedCondo]);



    // Strict filter for 'Filtered' view
    const displayedDeliveries = selectedGateId
        ? deliveries.filter(d => d.current_gate?.id === selectedGateId)
        : deliveries;

    const arriving = displayedDeliveries.filter(d =>
        ['approaching', 'pre_authorized', 'arriving'].includes(d.status || '')
    );
    const atGate = displayedDeliveries.filter(d =>
        ['at_gate', 'authorized'].includes(d.status || '')
    );
    const inside = displayedDeliveries.filter(d => d.status === 'inside');
    const recentHistory = displayedDeliveries.filter(d =>
        ['completed', 'rejected', 'exited'].includes(d.status || '')
    ).slice(0, 10);

    const totalActive = arriving.length + atGate.length + inside.length;

    return (
        <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">
            <div className="flex-1 flex flex-col h-full relative z-10">
                <main className="flex-1 p-6 overflow-hidden">
                    <div className="flex h-full gap-6 max-w-[1800px] mx-auto">

                        {/* COL 1: MAP */}
                        <div className="flex-[2] flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/50">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${totalActive > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                    <span className="text-sm font-bold text-slate-200">
                                        {totalActive > 0 ? `${totalActive} entrega${totalActive > 1 ? 's' : ''} ativa${totalActive > 1 ? 's' : ''}` : 'Nenhuma entrega'}
                                    </span>
                                </div>
                            </div>
                            <PerimeterMap
                                key={`${condoCenter.lat}-${condoCenter.lng}`}
                                readOnly
                                initialCenter={condoCenter}
                                initialPolygon={perimeter}
                                initialGates={gates}
                                onPolygonChange={() => { }}
                            />
                        </div>

                        {/* COL 2: DELIVERY SECTIONS */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-[380px]">
                            {/* Gate Selector */}
                            <div className="mb-4 flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                                <span className="text-sm text-slate-400 font-medium">Filtrar por:</span>
                                <select
                                    className="bg-slate-800 text-white text-sm rounded border border-slate-700 px-3 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedGateId || ''}
                                    onChange={(e) => setSelectedGateId(e.target.value || null)}
                                >
                                    <option value="">Todas as Portarias</option>
                                    {gates.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">

                                {/* SECTION 1: CHEGANDO (arriving/approaching) */}
                                <StatusSection
                                    icon={<Truck size={18} />}
                                    title="Chegando"
                                    count={arriving.length}
                                    color="amber"
                                    emptyText="Nenhuma entrega a caminho"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {arriving.map(d => (
                                            <DeliveryCard
                                                key={d.id}
                                                delivery={d}
                                                onAuthorize={(id) => updateStatus(id, {
                                                    status: 'authorized',
                                                    authorization_method: 'manual',
                                                    actor_role: 'concierge',
                                                })}
                                                onReject={(id) => updateStatus(id, { status: 'rejected', actor_role: 'concierge' })}
                                                primaryActionLabel="Pré-Autorizar"
                                            />
                                        ))}
                                    </AnimatePresence>
                                </StatusSection>

                                {/* SECTION 2: NA PORTARIA (at_gate/authorized) */}
                                <StatusSection
                                    icon={<DoorOpen size={18} />}
                                    title="Na Portaria"
                                    count={atGate.length}
                                    color="blue"
                                    emptyText="Ninguém aguardando na portaria"
                                    urgent={atGate.length > 0}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {atGate.map(d => (
                                            <DeliveryCard
                                                key={d.id}
                                                delivery={d}
                                                onAuthorize={(id) => updateStatus(id, {
                                                    status: 'inside',
                                                    authorization_method: d.authorized_method || 'manual',
                                                    actor_role: 'concierge',
                                                })}
                                                onReject={(id) => updateStatus(id, { status: 'rejected', actor_role: 'concierge' })}
                                                primaryActionLabel="Liberar Entrada"
                                            />
                                        ))}
                                    </AnimatePresence>
                                </StatusSection>

                                {/* SECTION 3: DENTRO (inside) */}
                                <StatusSection
                                    icon={<Home size={18} />}
                                    title="Dentro do Condomínio"
                                    count={inside.length}
                                    color="emerald"
                                    emptyText="Ninguém dentro no momento"
                                >
                                    <AnimatePresence mode="popLayout">
                                        {inside.map(d => (
                                            <DeliveryCard
                                                key={d.id}
                                                delivery={d}
                                                onAuthorize={(id) => updateStatus(id, { status: 'completed', actor_role: 'concierge' })}
                                                onReject={(id) => updateStatus(id, { status: 'rejected', actor_role: 'concierge' })}
                                                showActions={true}
                                                primaryActionLabel="Marcar Saída"
                                                compact
                                            />
                                        ))}
                                    </AnimatePresence>
                                </StatusSection>

                                {/* SECTION 4: HISTÓRICO */}
                                <HistorySection deliveries={recentHistory} />

                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Background Texture */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
    );
};

// --- StatusSection Component ---

interface StatusSectionProps {
    icon: React.ReactNode;
    title: string;
    count: number;
    color: 'amber' | 'blue' | 'emerald' | 'slate';
    emptyText: string;
    urgent?: boolean;
    children: React.ReactNode;
}

const colorMap = {
    amber: {
        bg: 'bg-amber-900/15',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-400',
        icon: 'text-amber-400',
        dot: 'bg-amber-400',
    },
    blue: {
        bg: 'bg-blue-900/15',
        border: 'border-blue-500/30',
        badge: 'bg-blue-500/20 text-blue-400',
        icon: 'text-blue-400',
        dot: 'bg-blue-400',
    },
    emerald: {
        bg: 'bg-emerald-900/15',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-400',
        icon: 'text-emerald-400',
        dot: 'bg-emerald-400',
    },
    slate: {
        bg: 'bg-slate-900/30',
        border: 'border-slate-700/30',
        badge: 'bg-slate-700/50 text-slate-400',
        icon: 'text-slate-400',
        dot: 'bg-slate-500',
    },
};

const StatusSection: React.FC<StatusSectionProps> = ({ icon, title, count, color, emptyText, urgent, children }) => {
    const c = colorMap[color];

    return (
        <div className={`rounded-2xl border ${c.border} ${c.bg} backdrop-blur-sm overflow-hidden`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                    <div className={`${c.icon}`}>{icon}</div>
                    <span>{title}</span>
                    {urgent && <div className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />}
                </h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
                    {count}
                </span>
            </div>
            {/* Body */}
            <div className="p-3 space-y-3">
                {count === 0 && (
                    <div className="text-center py-6 text-slate-600">
                        <p className="text-sm">{emptyText}</p>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};

// --- HistorySection Component ---

interface HistorySectionProps {
    deliveries: Delivery[];
}

const HistorySection: React.FC<HistorySectionProps> = ({ deliveries }) => {
    if (deliveries.length === 0) return null;

    return (
        <div className="rounded-2xl border border-slate-700/30 bg-slate-900/30 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-400 flex items-center space-x-2">
                    <History size={16} />
                    <span>Histórico Recente</span>
                </h2>
            </div>
            <div className="p-3 space-y-2">
                {deliveries.map(d => (
                    <motion.div
                        key={d.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.7 }}
                        className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg border border-slate-800/50 hover:opacity-100 transition-opacity"
                    >
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
                                <div className="flex items-center space-x-2">
                                    <span className="text-[10px] text-slate-500">
                                        {d.status === 'completed' ? '✅ Finalizado' : d.status === 'exited' ? '🚪 Saiu' : '❌ Rejeitado'}
                                    </span>
                                    <span className="text-[10px] text-slate-600">→ {d.target_unit_label}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-600 font-mono">
                                {new Date(d.updatedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {d.authorized_method && (
                                <div className="text-[9px] text-slate-600 mt-0.5">
                                    {d.authorized_method === 'app_zeeo' ? '📱 App' :
                                        d.authorized_method === 'whatsapp' ? '💬 WhatsApp' :
                                            d.authorized_method === 'phone_call' ? '📞 Telefone' :
                                                d.authorized_method === 'pre_authorized' ? '🔒 Pré-aut.' :
                                                    d.authorized_method === 'intercom' ? '📞 Interfone' : '✋ Manual'}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default DashboardHome;
