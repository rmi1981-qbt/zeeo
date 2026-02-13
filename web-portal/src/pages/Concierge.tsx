import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeliveries } from '../hooks/useDeliveries';
import { DeliveryCard } from '../components/DeliveryCard';
import LiveMap from '../components/LiveMap';
import { AnimatePresence } from 'framer-motion';
import { condoService } from '../services/condoService';
import {
    History
} from 'lucide-react';

const Concierge: React.FC = () => {
    const { selectedCondo } = useAuth();
    const { deliveries, updateStatus } = useDeliveries(selectedCondo || 'mock');



    const [providerFilter, setProviderFilter] = useState<string>('all');

    const [gates, setGates] = useState<{ id: string; name: string; lat: number; lng: number; is_main: boolean }[]>([]);
    const [condoCenter, setCondoCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);

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

            // Fetch Condo Details for Center
            condoService.getCondo(selectedCondo)
                .then(data => {
                    if (data.lat && data.lng) {
                        setCondoCenter({ lat: data.lat, lng: data.lng });
                    }
                })
                .catch(err => console.error('Failed to fetch condo details', err));
        }
    }, [selectedCondo]);

    // Filter Logic
    const activeDeliveries = deliveries.filter(d =>
        ['at_gate', 'approaching', 'pre_authorized'].includes(d.status || '') &&
        (providerFilter === 'all' || d.provider === providerFilter)
    );
    const recentHistory = deliveries.filter(d => ['completed', 'rejected'].includes(d.status || '')).slice(0, 5); // Last 5

    return (
        <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">

            {/* MAIN LAYOUT */}
            <div className="flex-1 flex flex-col h-full relative z-10">

                {/* BOARD CONTENT */}
                <main className="flex-1 p-6 overflow-hidden">
                    <div className="flex h-full gap-6 max-w-[1800px] mx-auto">

                        {/* COL 1: LIVE MAP (65%) */}
                        <div className="flex-[2] flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden group">
                            <LiveMap deliveries={deliveries} gates={gates} center={condoCenter} />
                        </div>

                        {/* COL 2: PLANNER / OPERATIONAL (35%) */}
                        <div className="flex-1 flex flex-col h-full space-y-6">

                            {/* AT GATE (Active Action Required) */}
                            <div className="flex-1 flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-800/50 flex flex-col gap-3 bg-slate-900/80 backdrop-blur-md">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                                            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-sm rotate-45 animate-pulse" />
                                            <span>Chegando / Portaria</span>
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
                                                <p className="text-sm">Ninguém aguardando ou chegando</p>
                                            </div>
                                        )}
                                        {activeDeliveries.map(d => (
                                            <DeliveryCard
                                                key={d.id}
                                                delivery={d}
                                                // Show actions to allow entry
                                                onAuthorize={(id) => updateStatus(id, 'inside')}
                                                onReject={(id) => updateStatus(id, 'rejected')}
                                                primaryActionLabel={['at_gate', 'pre_authorized'].includes(d.status || '') ? "Liberar Entrada" : "Pré-Autorizar"}
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
        </div>
    );
};

export default Concierge;
