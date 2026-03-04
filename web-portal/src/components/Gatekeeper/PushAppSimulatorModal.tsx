import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Building2 } from 'lucide-react';
import { Delivery } from '@zeeo/shared';

interface PushAppSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    delivery: Delivery | null;
    onSuccess?: () => void;
}

export const PushAppSimulatorModal: React.FC<PushAppSimulatorModalProps> = ({ isOpen, onClose, delivery, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<'authorized' | 'denied' | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Reset state when opening a new delivery
    React.useEffect(() => {
        if (isOpen) {
            setResult(null);
            setLoading(false);
            setIsExpanded(false);
        }
    }, [isOpen, delivery?.id]);

    if (!isOpen || !delivery) return null;

    const handleAction = async (decision: 'authorized' | 'denied') => {
        setLoading(true);
        try {
            const authResponse = await fetch(`http://localhost:8000/api/hub/webhook/approval`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'ifood_sim_key_123' // Mock key for simulator
                },
                body: JSON.stringify({
                    delivery_id: delivery.id,
                    decision: decision,
                    channel: 'app_condominio',
                    actor_id: 'Morador App',
                    notes: `Respondido via Push App (${decision === 'authorized' ? 'Liberado' : 'Negado'})`
                })
            });

            if (!authResponse.ok) {
                const errData = await authResponse.json();
                throw new Error(errData.detail || 'Failed to authorize delivery via Webhook');
            }

            setResult(decision);
            if (onSuccess) onSuccess();
            setTimeout(onClose, 1500);

        } catch (e: any) {
            console.error("Failed to simulate Push App auth:", e);
            alert("Erro na simulação: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                    onClick={onClose}
                />

                {/* Simulated Phone Screen */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    className="relative w-full max-w-[320px] aspect-[9/19.5] bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-slate-900"
                >
                    {/* Dark Overlay for Wallpaper */}
                    <div className="absolute inset-0 bg-slate-900/40" />

                    {/* Time (Fake iOS Status Bar) */}
                    <div className="relative z-10 w-full pt-4 pb-2 px-6 flex justify-between items-center text-white text-xs font-semibold">
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex gap-1" />
                    </div>

                    <div className="relative z-10 w-full h-full flex flex-col p-3 pt-6 gap-3">
                        {/* Big Clock */}
                        <div className="text-center text-white/90 mb-8 mt-4">
                            <div className="text-6xl font-light tracking-tight">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-sm font-medium mt-1 opacity-80 decoration-white">Segunda-feira, 3 de Mar</div>
                        </div>

                        {/* Push Notification */}
                        {!result ? (
                            <motion.div
                                layout
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="bg-slate-100/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 shadow-xl cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-white/80">
                                        <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                                            <Building2 size={12} className="text-white" />
                                        </div>
                                        <span className="text-xs uppercase tracking-wider font-semibold">Condomínio App</span>
                                    </div>
                                    <span className="text-[10px] text-white/50">Agora</span>
                                </div>

                                <h3 className="text-white font-semibold text-sm mb-1">Chegou uma Entrega! 📦</h3>
                                <p className="text-white/80 text-xs leading-relaxed">
                                    <strong className="text-white">{delivery.driver_snapshot.name}</strong> ({delivery.provider}) aguarda na portaria para entregar no <strong className="text-white">{delivery.target_unit_label}</strong>.
                                </p>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            className="overflow-hidden flex gap-2 pt-2 border-t border-white/10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => handleAction('authorized')}
                                                disabled={loading}
                                                className="flex-1 bg-white/20 hover:bg-white/30 text-emerald-400 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <Check size={14} /> Liberar
                                            </button>
                                            <button
                                                onClick={() => handleAction('denied')}
                                                disabled={loading}
                                                className="flex-1 bg-white/10 hover:bg-white/20 text-rose-400 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <X size={14} /> Negar
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!isExpanded && (
                                    <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mt-3" />
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-slate-100/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 shadow-xl text-center"
                            >
                                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${result === 'authorized' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {result === 'authorized' ? <Check size={24} /> : <X size={24} />}
                                </div>
                                <h3 className="text-white font-semibold text-sm mb-1">{result === 'authorized' ? 'Entrada Liberada' : 'Acesso Negado'}</h3>
                                <p className="text-white/60 text-xs">O portão enviará as instruções automaticamente.</p>
                            </motion.div>
                        )}

                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/50 rounded-full z-10" />
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
