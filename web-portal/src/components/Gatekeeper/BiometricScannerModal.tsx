import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanFace, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface BiometricScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    condoId: string;
    deliveryId: string;
    driverName: string;
    onSuccess: () => void;
}

export const BiometricScannerModal: React.FC<BiometricScannerModalProps> = ({ isOpen, onClose, condoId, deliveryId, driverName, onSuccess }) => {
    const [step, setStep] = useState<'idle' | 'scanning' | 'analyzing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [matchScore, setMatchScore] = useState<number>(0);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setStep('idle');
            setErrorMsg(null);
            setMatchScore(0);
        }
    }, [isOpen]);

    const handleScan = async () => {
        setStep('scanning');

        // Simulate scanning physical hardware delays
        await new Promise(r => setTimeout(r, 1500));
        setStep('analyzing');
        await new Promise(r => setTimeout(r, 1000));

        try {
            const response = await fetch('http://localhost:8000/api/hub/check-in/biometrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'condominio_sim_key_123'
                },
                body: JSON.stringify({
                    condo_id: condoId,
                    delivery_id: deliveryId,
                    image_b64: 'simulated_face_live_capture_base64_data_here'
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Falha no reconhecimento biométrico.');
            }

            const data = await response.json();
            setMatchScore(data.match_score * 100);
            setStep('success');

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2500);

        } catch (err: any) {
            setErrorMsg(err.message);
            setStep('error');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-sm bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl p-6 overflow-hidden"
                >
                    <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 z-10 transition-colors">
                        <X size={20} />
                    </button>

                    <div className="text-center mb-6 relative z-10">
                        <h2 className="text-xl font-bold text-white mb-1 tracking-tight">Câmera da Portaria</h2>
                        <p className="text-sm text-slate-400">Verificando: <span className="text-indigo-400 font-semibold">{driverName}</span></p>
                    </div>

                    <div className="relative w-full aspect-square bg-slate-950 rounded-2xl mb-6 overflow-hidden border border-slate-800 flex items-center justify-center">
                        {/* Fake Camera Feed Background */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4f46e5 0%, transparent 70%)' }} />
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

                        {step === 'idle' && (
                            <div className="text-center relative z-10">
                                <ScanFace size={64} className="mx-auto text-slate-500 mb-4 opacity-50" />
                                <p className="text-slate-500 text-sm font-medium">Aguardando enquadramento...</p>
                            </div>
                        )}

                        {(step === 'scanning' || step === 'analyzing') && (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {/* Scanning Laser Line */}
                                <motion.div
                                    className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20"
                                    animate={{ top: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />

                                <div className="text-center relative z-10">
                                    <ScanFace size={80} className="mx-auto text-indigo-400 mb-4" />
                                    <div className="flex items-center justify-center gap-2 text-indigo-300 font-medium">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>{step === 'scanning' ? 'Capturando face...' : 'Analisando embeddings...'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center relative z-10"
                            >
                                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                    <CheckCircle size={48} className="text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold text-emerald-400 mb-1">Match Encontrado!</h3>
                                <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                    Score: {matchScore.toFixed(1)}%
                                </div>
                            </motion.div>
                        )}

                        {step === 'error' && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center relative z-10 px-4"
                            >
                                <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-rose-500">
                                    <AlertTriangle size={40} className="text-rose-400" />
                                </div>
                                <h3 className="text-lg font-bold text-rose-400 mb-2">Falha na Biometria</h3>
                                <p className="text-slate-400 text-xs">{errorMsg}</p>
                            </motion.div>
                        )}
                    </div>

                    <div className="relative z-10 space-y-3">
                        {step === 'idle' && (
                            <button
                                onClick={handleScan}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                            >
                                Simular Leitura do Totem
                            </button>
                        )}

                        {step === 'error' && (
                            <button
                                onClick={() => setStep('idle')}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors border border-slate-700"
                            >
                                Tentar Novamente
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-400 font-medium py-2 rounded-xl transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
