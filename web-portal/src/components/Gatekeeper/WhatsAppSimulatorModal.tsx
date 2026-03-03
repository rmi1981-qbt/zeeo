import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { Delivery } from '@zeeo/shared';

interface WhatsAppSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    delivery: Delivery | null;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({ isOpen, onClose, delivery }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<'authorized' | 'denied' | null>(null);

    // Reset state when opening a new delivery
    React.useEffect(() => {
        if (isOpen) {
            setResult(null);
            setLoading(false);
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
                    channel: 'whatsapp',
                    actor_id: 'Morador do ' + delivery.target_unit_label,
                    notes: `Respondido via WhatsApp (${decision === 'authorized' ? 'Aprovado' : 'Rejeitado'})`
                })
            });

            if (!authResponse.ok) {
                const errData = await authResponse.json();
                throw new Error(errData.detail || 'Failed to authorize delivery via Webhook');
            }

            setResult(decision);
            setTimeout(onClose, 1200);

        } catch (e: any) {
            console.error("Failed to simulate WhatsApp auth:", e);
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
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-sm bg-[#0b141a] rounded-xl shadow-2xl overflow-hidden"
                >
                    {/* Header WP */}
                    <div className="flex justify-between items-center p-3 bg-[#202c33] border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex flex-col items-center justify-center text-xl">
                                🤖
                            </div>
                            <div>
                                <h2 className="text-md font-medium text-[#e9edef]">Bot do Condomínio</h2>
                                <p className="text-xs text-[#8696a0]">online</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-[#8696a0] hover:text-[#d1d7db] transition-colors p-2 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div className="p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover relative min-h-[400px] flex flex-col justify-end">
                        <div className="absolute inset-0 bg-[#0b141a]/90" /> {/* Dark overlay */}

                        <div className="relative z-10 w-[85%] bg-[#202c33] rounded-lg p-2 pb-1 rounded-tl-none shadow self-start mb-4 border border-slate-700/50">
                            <span className="text-[#8696a0] font-bold text-xs mb-1 block">Bot do Condomínio</span>
                            <p className="text-sm text-[#e9edef] leading-relaxed">
                                Olá! O motorista <strong className="text-white">{delivery.driver_snapshot.name}</strong> ({delivery.provider}) chegou na portaria para o <strong className="text-white">{delivery.target_unit_label}</strong>.
                                <br /><br />
                                Você autoriza a entrada?
                            </p>
                            <span className="text-[10px] text-[#8696a0] float-right mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Inline Buttons */}
                        {!result ? (
                            <div className="relative z-10 flex flex-col gap-2 w-[85%] self-start mb-2">
                                <button
                                    onClick={() => handleAction('authorized')}
                                    disabled={loading}
                                    className="bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] font-medium py-2.5 px-4 rounded-lg shadow border border-slate-700/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} /> Aprovar Entrada
                                </button>
                                <button
                                    onClick={() => handleAction('denied')}
                                    disabled={loading}
                                    className="bg-[#202c33] hover:bg-[#2a3942] text-rose-500 font-medium py-2.5 px-4 rounded-lg shadow border border-slate-700/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle size={18} /> Rejeitar Entrada
                                </button>
                            </div>
                        ) : (
                            <div className="relative z-10 w-fit max-w-[85%] bg-[#005c4b] rounded-lg p-2 pb-1 rounded-tr-none shadow self-end mb-2">
                                <p className="text-sm text-[#e9edef]">
                                    {result === 'authorized' ? 'Aprovar Entrada' : 'Rejeitar Entrada'}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[10px] text-[#8696a0]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <CheckCircle2 size={12} className="text-[#53bdeb] ml-1" /> {/* Read receipts */}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
