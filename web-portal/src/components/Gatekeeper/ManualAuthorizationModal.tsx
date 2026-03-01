import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, UserCheck, UserX, PhoneMissed } from 'lucide-react';

export interface PhoneCallOutcome {
    status: 'authorized' | 'denied' | 'no_answer';
    authorizerName: string;
}

interface ManualAuthorizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (outcome: PhoneCallOutcome) => void;
    deliveryName: string;
    unitLabel: string;
}

export const ManualAuthorizationModal: React.FC<ManualAuthorizationModalProps> = ({ isOpen, onClose, onSubmit, deliveryName, unitLabel }) => {
    const [authorizerName, setAuthorizerName] = useState('');
    const [selectedOutcome, setSelectedOutcome] = useState<'authorized' | 'denied' | 'no_answer' | null>(null);

    const handleSubmit = () => {
        if (!selectedOutcome) return;
        if (selectedOutcome !== 'no_answer' && !authorizerName.trim()) {
            alert('Por favor, informe o nome de quem autorizou ou negou a entrada.');
            return;
        }

        onSubmit({
            status: selectedOutcome,
            authorizerName: authorizerName.trim()
        });

        // Reset
        setAuthorizerName('');
        setSelectedOutcome(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                >
                    <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>

                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <Phone className="text-purple-400" />
                        Chamada Telefônica
                    </h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Registrar contato com a unidade <strong className="text-white">{unitLabel}</strong> para liberação de <strong className="text-white">{deliveryName}</strong>.
                    </p>

                    {/* Outcomes */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={() => setSelectedOutcome('authorized')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedOutcome === 'authorized' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                        >
                            <UserCheck size={24} />
                            <span className="text-xs font-bold">Aprovado</span>
                        </button>
                        <button
                            onClick={() => setSelectedOutcome('denied')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedOutcome === 'denied' ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                        >
                            <UserX size={24} />
                            <span className="text-xs font-bold">Negado</span>
                        </button>
                        <button
                            onClick={() => setSelectedOutcome('no_answer')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${selectedOutcome === 'no_answer' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                        >
                            <PhoneMissed size={24} />
                            <span className="text-xs font-bold text-center">Não Atendeu</span>
                        </button>
                    </div>

                    {/* Input */}
                    <AnimatePresence>
                        {selectedOutcome && selectedOutcome !== 'no_answer' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mb-6 overflow-hidden"
                            >
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                    Quem {selectedOutcome === 'authorized' ? 'autorizou' : 'negou'} a entrada?
                                </label>
                                <input
                                    type="text"
                                    value={authorizerName}
                                    onChange={e => setAuthorizerName(e.target.value)}
                                    placeholder="Ex: João (Morador), Maria (Esposa)"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedOutcome}
                            className={`flex-1 px-4 py-3 rounded-xl font-bold shadow-lg transition-all ${selectedOutcome ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-900/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                            Registrar
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};
