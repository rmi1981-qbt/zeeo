import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { deliveryService, ApiDelivery } from '../../services/deliveryService';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, LogOut, Clock, MapPin, QrCode, Home, User, Share2 } from 'lucide-react';
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

    const [activeTab, setActiveTab] = useState<'deliveries' | 'invites' | 'profile'>('deliveries');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [generatedQR, setGeneratedQR] = useState<string | null>(null);
    const [newInvite, setNewInvite] = useState({ name: '', date: '', type: 'visitor' });

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

    const handleGenerateInvite = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        // Simulate network request
        setTimeout(() => {
            setGeneratedQR(`INVITE - ${Math.random().toString(36).substring(2, 10).toUpperCase()} `);
            setSubmitting(false);
            showToast({ type: 'success', title: 'Sucesso', message: 'Convite gerado com sucesso!' });
        }, 1000);
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(`https://app.zeeo.com.br/invite/${generatedQR}`);
        showToast({ type: 'info', title: 'Copiado', message: 'Link copiado para a área de transferência' });
    };

    const handleQuickAction = (action: string, deliveryId: string) => {
        showToast({ type: 'success', title: 'Aviso Enviado', message: `Você informou: ${action} para a entrega ${deliveryId.slice(0, 4)}. A portaria foi notificada.` });
        // In a real app we would update the delivery status/log here
    };

    // Filter Logic
    const activeDeliveries = deliveries.filter(d => ['created', 'driver_assigned', 'approaching', 'at_gate', 'pre_authorized'].includes(d.status));
    const historyDeliveries = deliveries.filter(d => ['completed', 'rejected', 'inside'].includes(d.status));

    const displayList = filter === 'active' ? activeDeliveries : historyDeliveries;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10 safe-top">
                <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">
                            {activeTab === 'deliveries' ? 'Minhas Entregas' : activeTab === 'invites' ? 'Meus Convites' : 'Meu Perfil'}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">
                            {unitLabel ? `Apto ${unitLabel}` : 'Unidade não definida'}
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                <AnimatePresence mode="wait">
                    {/* Deliveries Tab */}
                    {activeTab === 'deliveries' && (
                        <motion.div
                            key="deliveries"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            {/* Stats / Quick Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between shadow-lg shadow-black/20">
                                    <div className="bg-blue-500/20 w-10 h-10 rounded-full flex items-center justify-center mb-2">
                                        <Package className="text-blue-400" size={20} />
                                    </div>
                                    <div>
                                        <span className="text-3xl font-bold text-white">{activeDeliveries.length}</span>
                                        <p className="text-xs text-slate-400 font-medium">A caminho</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPreAuthModal(true)}
                                    className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 rounded-2xl flex flex-col justify-between transition-all group hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-900/30">
                                    <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                        <Plus className="text-white" size={20} />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-bold text-white block">Nova Entrega</span>
                                        <p className="text-[11px] text-emerald-100 font-medium">Pré-autorizar acesso</p>
                                    </div>
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex p-1 bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setFilter('active')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${filter === 'active' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Hoje
                                </button>
                                <button
                                    onClick={() => setFilter('history')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${filter === 'history' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Histórico
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="text-center py-10 text-slate-500 animate-pulse font-medium">Carregando...</div>
                                ) : displayList.length === 0 ? (
                                    <div className="text-center py-16 text-slate-600 flex flex-col items-center bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                                        <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                            <Package size={24} className="opacity-50" />
                                        </div>
                                        <p className="font-medium">Nenhuma entrega no momento</p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {displayList.map((d) => (
                                            <motion.div
                                                key={d.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-2xl p-4 shadow-xl shadow-black/10"
                                            >
                                                <div className="flex items-center space-x-4 mb-4">
                                                    {/* Icon based on Provider */}
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${d.platform === 'ifood' ? 'bg-gradient-to-br from-[#EA1D2C] to-[#b31420] text-white' :
                                                        d.platform === 'mercadolivre' ? 'bg-gradient-to-br from-[#FFE600] to-[#ccb800] text-[#2d3277]' :
                                                            'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300'
                                                        }`}>
                                                        <Package size={22} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-white text-base truncate">{d.driver_name || (d.platform.charAt(0).toUpperCase() + d.platform.slice(1))}</h3>
                                                            <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase font-bold tracking-wider ${d.status === 'at_gate' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' :
                                                                d.status === 'approaching' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                                    'bg-slate-800 text-slate-400 border border-slate-700'
                                                                }`}>
                                                                {d.status === 'at_gate' ? 'Na Portaria' :
                                                                    d.status === 'approaching' ? 'Chegando' :
                                                                        d.status === 'pre_authorized' ? 'Pré-Autorizado' :
                                                                            d.status === 'completed' ? 'Concluído' :
                                                                                d.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center text-xs text-slate-400 mt-1.5 space-x-3 font-medium">
                                                            <span className="flex items-center bg-slate-800/80 px-2 py-0.5 rounded text-[11px]">
                                                                <Clock size={12} className="mr-1.5 opacity-70" />
                                                                {new Date(d.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {d.current_gate && (
                                                                <span className="flex items-center">
                                                                    <MapPin size={12} className="mr-1 opacity-70 text-blue-400" />
                                                                    {d.current_gate.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons for Active Deliveries at Gate */}
                                                {d.status === 'at_gate' && (
                                                    <div className="flex space-x-2 pt-3 border-t border-slate-800/50 mt-1">
                                                        <button onClick={() => handleQuickAction('Estou descendo', d.id)} className="flex-1 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-sm font-bold transition-colors border border-blue-500/20">
                                                            Estou Descendo
                                                        </button>
                                                        <button onClick={() => handleQuickAction('Deixar na portaria', d.id)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors border border-slate-700">
                                                            Deixar na Portaria
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Invites Tab */}
                    {activeTab === 'invites' && (
                        <motion.div
                            key="invites"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl flex items-center justify-between transition-all group hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-900/20"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                        <QrCode className="text-white" size={24} />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-lg font-bold text-white block">Novo Convite</span>
                                        <p className="text-blue-100 text-sm font-medium pt-0.5">Gerar QR Code de acesso</p>
                                    </div>
                                </div>
                                <Plus className="text-white/70" size={24} />
                            </button>

                            <div className="py-10 text-center bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
                                <div className="bg-slate-800/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <QrCode size={32} className="text-slate-500" />
                                </div>
                                <h3 className="text-slate-300 font-bold text-lg mb-1">Nenhum convite ativo</h3>
                                <p className="text-slate-500 text-sm px-8">Visitas agendadas e QR Codes gerados aparecerão aqui.</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center gap-5">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 text-2xl font-bold text-white">
                                    {unitLabel ? unitLabel.substring(0, 2) : 'A'}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Apto {unitLabel}</h2>
                                    <span className="inline-block mt-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
                                        Morador Conectado
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/50">
                                <button className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-800 rounded-lg"><User size={18} className="text-slate-300" /></div>
                                        <span className="font-medium text-slate-200">Meus Dados</span>
                                    </div>
                                </button>
                                <button onClick={handleLogout} className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left text-red-400">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 rounded-lg"><LogOut size={18} className="text-red-400" /></div>
                                        <span className="font-bold">Sair do Aplicativo</span>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 safe-bottom z-40 px-6 py-3">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <button
                        onClick={() => setActiveTab('deliveries')}
                        className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'deliveries' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Home size={24} className={activeTab === 'deliveries' ? 'fill-current' : ''} />
                        <span className="text-[10px] font-bold">Início</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('invites')}
                        className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'invites' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <QrCode size={24} />
                        <span className="text-[10px] font-bold">Convites</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center gap-1.5 transition-colors ${activeTab === 'profile' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <User size={24} className={activeTab === 'profile' ? 'fill-current' : ''} />
                        <span className="text-[10px] font-bold">Perfil</span>
                    </button>
                </div>
            </div>

            {/* Pre-Auth Modal (Delivery) */}
            <AnimatePresence>
                {showPreAuthModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm sm:p-4">
                        <motion.div
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-safe shadow-2xl h-[85vh] sm:h-auto flex flex-col"
                        >
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6 sm:hidden" />
                            <h2 className="text-2xl font-bold mb-6 text-white tracking-tight">Autorizar Entrega</h2>

                            <form onSubmit={handlePreAuthSubmit} className="space-y-5 flex-1 flex flex-col">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Nome Prometido do Entregador</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDelivery.name}
                                        onChange={e => setNewDelivery({ ...newDelivery, name: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-lg"
                                        placeholder="Ex: João da Silva (iFood)"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Detalhes Opcionais (Veículo, etc)</label>
                                    <input
                                        type="text"
                                        value={newDelivery.obs}
                                        onChange={e => setNewDelivery({ ...newDelivery, obs: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-lg"
                                        placeholder="Ex: Moto preta, placa ABC-1234"
                                    />
                                </div>
                                <div className="flex space-x-3 pt-4 mt-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreAuthModal(false)}
                                        className="w-1/3 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-2/3 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xl shadow-blue-900/30 transition-all disabled:opacity-50 text-lg"
                                    >
                                        {submitting ? 'Salvando...' : 'Liberar Portaria'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Invite / QR Code Modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm sm:p-4">
                        <motion.div
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-slate-900 border-t sm:border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-safe shadow-2xl h-[90vh] sm:h-auto flex flex-col overflow-y-auto"
                        >
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6 sm:hidden" />

                            {!generatedQR ? (
                                <>
                                    <h2 className="text-2xl font-bold mb-2 text-white tracking-tight">Novo Convite</h2>
                                    <p className="text-slate-400 mb-6 font-medium">Gere um QR Code para acesso rápido do seu visitante ou serviço.</p>

                                    <form onSubmit={handleGenerateInvite} className="space-y-5 flex-1 flex flex-col">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-300 mb-2">Quem você vai receber?</label>
                                            <input
                                                type="text"
                                                required
                                                value={newInvite.name}
                                                onChange={e => setNewInvite({ ...newInvite, name: e.target.value })}
                                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 text-lg"
                                                placeholder="Nome do Visitante"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-300 mb-2">Para quando?</label>
                                            <input
                                                type="date"
                                                required
                                                value={newInvite.date}
                                                onChange={e => setNewInvite({ ...newInvite, date: e.target.value })}
                                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 text-lg color-scheme-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-300 mb-2">Tipo de Acesso</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button type="button" onClick={() => setNewInvite({ ...newInvite, type: 'visitor' })} className={`py-3 rounded-xl border font-semibold transition-all ${newInvite.type === 'visitor' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Visita Social</button>
                                                <button type="button" onClick={() => setNewInvite({ ...newInvite, type: 'service' })} className={`py-3 rounded-xl border font-semibold transition-all ${newInvite.type === 'service' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>Prestador</button>
                                            </div>
                                        </div>

                                        <div className="flex space-x-3 pt-6 mt-auto pb-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowInviteModal(false)}
                                                className="w-1/3 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="w-2/3 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-indigo-900/40 transition-all disabled:opacity-50 text-lg flex justify-center items-center"
                                            >
                                                {submitting ? 'Gerando...' : 'Gerar QR Code'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center flex-1 py-4">
                                    <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-bold tracking-wide border border-emerald-500/20 mb-8 w-fit mx-auto animate-pulse">
                                        Convite Ativo
                                    </div>

                                    <div className="bg-white p-6 rounded-3xl shadow-2xl mb-8 relative">
                                        {/* Fake QR Code */}
                                        <div className="w-56 h-56 bg-slate-100 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group">
                                            {/* Decorative QR Pattern */}
                                            <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-cover bg-center"></div>
                                            {/* Center Zeeo Logo representation */}
                                            <div className="w-12 h-12 bg-indigo-600 rounded-xl shadow-lg relative z-10 flex items-center justify-center">
                                                <span className="text-white font-bold text-xl">Z</span>
                                            </div>
                                            {/* Scanning Animation */}
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_blue] z-20 animate-[scan_2s_ease-in-out_infinite] opacity-50"></div>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-2">{newInvite.name}</h3>
                                    <p className="text-slate-400 font-medium mb-8">Válido para {newInvite.date.split('-').reverse().join('/')}</p>

                                    <div className="w-full space-y-3 mt-auto mb-4">
                                        <button onClick={copyInviteLink} className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all flex items-center justify-center gap-2 border border-slate-700">
                                            <Share2 size={20} /> Compartilhar Link
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowInviteModal(false);
                                                setGeneratedQR(null);
                                                setNewInvite({ name: '', date: '', type: 'visitor' });
                                            }}
                                            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-900/30 transition-all text-lg border border-indigo-500/50"
                                        >
                                            Concluir
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .pb-safe { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }
                .safe-bottom { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }
                .safe-top { padding-top: max(1rem, env(safe-area-inset-top)); }
                
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
            `}</style>
        </div>
    );
};

export default ResidentDashboard;
