import React from 'react';
import { useDeliveries } from '../hooks/useDeliveries';
import { DeliveryCard } from '../components/DeliveryCard';
import LiveMap from '../components/LiveMap';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusCircle,
    MapPin,
    Bell,
    History
} from 'lucide-react';

const Concierge: React.FC = () => {
    // Condo ID would come from Auth Context
    const { deliveries, addMockDelivery, updateStatus } = useDeliveries('condo_123');

    // Filter Logic
    // const arrivingDeliveries = deliveries.filter(d => ['arriving', 'pre_authorized'].includes(d.status || '')); // VISUALIZED ON MAP
    const atGateDeliveries = deliveries.filter(d => d.status === 'at_gate');
    const recentHistory = deliveries.filter(d => ['completed', 'rejected'].includes(d.status || '')).slice(0, 5); // Last 5

    return (
        <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">

            {/* MAIN LAYOUT */}
            <div className="flex-1 flex flex-col h-full relative z-10">

                {/* HEADER */}
                <header className="h-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-50 gap-4">
                    <div className="flex items-center space-x-4 min-w-[50px]">
                        <div className="text-2xl font-display font-bold text-white shrink-0">
                            Zeeo <span className="text-primary-500">.</span>
                        </div>
                        <div className="h-6 w-px bg-slate-700 hidden md:block" />
                        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700 text-slate-400 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] lg:max-w-none">
                            <MapPin size={14} className="shrink-0" />
                            <span className="truncate">Condomínio Jardins • Portaria Principal</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 md:space-x-6 shrink-0">
                        {/* Demo Action */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={addMockDelivery}
                            className="flex items-center space-x-2 px-3 py-2 md:px-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg font-bold shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transition-shadow whitespace-nowrap text-sm md:text-base"
                        >
                            <PlusCircle size={18} />
                            <span className="hidden sm:inline">Simular iFood</span>
                            <span className="sm:hidden">Simular</span>
                        </motion.button>

                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 relative cursor-pointer shrink-0">
                            <Bell size={16} className="text-slate-400" />
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-800" />
                        </div>
                        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold ring-2 ring-slate-800 shrink-0">
                            OP
                        </div>
                    </div>
                </header>

                {/* BOARD CONTENT */}
                <main className="flex-1 p-6 overflow-hidden">
                    <div className="flex h-full gap-6 max-w-[1800px] mx-auto">

                        {/* COL 1: LIVE MAP (65%) */}
                        <div className="flex-[2] flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden group">
                            <LiveMap deliveries={deliveries} />
                        </div>

                        {/* COL 2: PLANNER / OPERATIONAL (35%) */}
                        <div className="flex-1 flex flex-col h-full space-y-6">

                            {/* AT GATE (Active Action Required) */}
                            <div className="flex-1 flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800/50 backdrop-blur-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/80 backdrop-blur-md">
                                    <h2 className="text-lg font-bold text-emerald-100 flex items-center space-x-2">
                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm rotate-45" />
                                        <span>Na Portaria / Liberado</span>
                                    </h2>
                                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">{atGateDeliveries.length}</span>
                                </div>

                                <div className="p-4 overflow-y-auto space-y-4 flex-1 scrollbar-hide">
                                    <AnimatePresence mode="popLayout">
                                        {atGateDeliveries.length === 0 && (
                                            <div className="text-center py-10 text-slate-600">
                                                <p className="text-sm">Ninguém aguardando entrada</p>
                                            </div>
                                        )}
                                        {atGateDeliveries.map(d => (
                                            <DeliveryCard
                                                key={d.id}
                                                delivery={d}
                                                // Show actions to allow entry
                                                onAuthorize={(id) => updateStatus(id, 'inside')}
                                                onReject={(id) => updateStatus(id, 'rejected')}
                                                primaryActionLabel="Registrar Entrada"
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
