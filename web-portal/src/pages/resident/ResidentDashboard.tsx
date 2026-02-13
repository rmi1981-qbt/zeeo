import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { deliveryService, ApiDelivery } from '../../services/deliveryService';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, LogOut, Clock, MapPin } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const ResidentDashboard: React.FC = () => {
    const { signOut, selectedCondo, memberships } = useAuth();
    const { showToast } = useToast();
    const [deliveries, setDeliveries] = useState<ApiDelivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'active' | 'history'>('active');
    const [showPreAuthModal, setShowPreAuthModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newDelivery, setNewDelivery] = useState({ name: '', obs: '' });

    // Resolve Unit Label
    const currentMembership = memberships.find(m => m.condominium_id === selectedCondo);
    const unitLabel = currentMembership?.unit_label;

    useEffect(() => {
        if (selectedCondo && unitLabel) {
            loadDeliveries();
        } else {
            setLoading(false);
        }
    }, [selectedCondo, unitLabel]);

    const loadDeliveries = async () => {
        if (!selectedCondo) return;
        setLoading(true);
        try {
            // Fetch deliveries for this condo AND unit
            const data = await deliveryService.getDeliveries(selectedCondo, unitLabel);
            setDeliveries(data);
        } catch (error) {
            console.error(error);
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar entregas' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        window.location.href = '/login';
    };

    const handlePreAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCondo) return;
        setSubmitting(true);
        try {
            await deliveryService.createDelivery({
                condo_id: selectedCondo,
                unit: unitLabel,
                status: 'pre_authorized',
                platform: 'other',
                driver_name: newDelivery.name,
                // treating obs as driver_plate for now since we lack a field, or just ignore.
                // Actually schemas.py allows driver_plate. Let's map obs -> driver_plate or just name.
                // Better: keep it simple.
            });
            showToast({ type: 'success', title: 'Sucesso', message: 'Pré-autorização criada!' });
            setShowPreAuthModal(false);
            setNewDelivery({ name: '', obs: '' });
            loadDeliveries();
        } catch (error) {
            console.error(error);
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao criar pré-autorização' });
        } finally {
            setSubmitting(false);
        }
    };

    // Filter Logic
    const activeDeliveries = deliveries.filter(d => ['created', 'driver_assigned', 'approaching', 'at_gate', 'pre_authorized'].includes(d.status));
    const historyDeliveries = deliveries.filter(d => ['completed', 'rejected', 'inside'].includes(d.status));

    const displayList = filter === 'active' ? activeDeliveries : historyDeliveries;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
            {/* Header */}
            <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-white">Meu Apartamento</h1>
                        <p className="text-xs text-slate-400">
                            {unitLabel ? `Unidade ${unitLabel}` : 'Unidade não definida'}
                        </p>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {/* Stats / Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                        <Package className="text-blue-500 mb-2" />
                        <div>
                            <span className="text-2xl font-bold">{activeDeliveries.length}</span>
                            <p className="text-xs text-slate-400">A caminho</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPreAuthModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-xl border border-emerald-500/50 flex flex-col justify-between transition-colors group">
                        <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="text-white" size={18} />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white">Nova Entrega</span>
                            <p className="text-[10px] text-emerald-100">Pré-autorizar</p>
                        </div>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800">
                    <button
                        onClick={() => setFilter('active')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${filter === 'active' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Em Andamento
                    </button>
                    <button
                        onClick={() => setFilter('history')}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${filter === 'history' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Histórico
                    </button>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Carregando...</div>
                    ) : displayList.length === 0 ? (
                        <div className="text-center py-10 text-slate-600 flex flex-col items-center">
                            <Package size={48} className="opacity-20 mb-3" />
                            <p>Nenhuma entrega encontrada</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {displayList.map((d) => (
                                <motion.div
                                    key={d.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center space-x-4"
                                >
                                    {/* Icon based on Provider */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${d.platform === 'ifood' ? 'bg-[#EA1D2C]/10 text-[#EA1D2C]' :
                                            d.platform === 'mercadolivre' ? 'bg-[#FFE600]/10 text-[#FFE600]' :
                                                'bg-slate-800 text-slate-400'
                                        }`}>
                                        <Package size={20} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-slate-200 truncate">{d.driver_name || d.platform}</h3>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${d.status === 'at_gate' ? 'bg-green-500/20 text-green-400 animate-pulse' :
                                                    d.status === 'approaching' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-slate-800 text-slate-500'
                                                }`}>
                                                {d.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-xs text-slate-500 mt-1 space-x-3">
                                            <span className="flex items-center">
                                                <Clock size={12} className="mr-1" />
                                                {new Date(d.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {d.current_gate && (
                                                <span className="flex items-center text-slate-400">
                                                    <MapPin size={12} className="mr-1" />
                                                    {d.current_gate.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </main>

            {/* Pre-Auth Modal */}
            <AnimatePresence>
                {showPreAuthModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl"
                        >
                            <h2 className="text-xl font-bold mb-4">Nova Pré-Autorização</h2>
                            <form onSubmit={handlePreAuthSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Nome do Visitante/Entregador</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDelivery.name}
                                        onChange={e => setNewDelivery({ ...newDelivery, name: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Observações (Opcional)</label>
                                    <input
                                        type="text"
                                        value={newDelivery.obs}
                                        onChange={e => setNewDelivery({ ...newDelivery, obs: e.target.value })}
                                        className="w-full bg-slate-800 border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="Ex: Entregar na portaria"
                                    />
                                </div>
                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreAuthModal(false)}
                                        className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
                                    >
                                        {submitting ? 'Salvando...' : 'Autorizar'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ResidentDashboard;
