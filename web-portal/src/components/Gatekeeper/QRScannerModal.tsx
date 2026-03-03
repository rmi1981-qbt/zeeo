import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanLine, Loader2, CheckCircle } from 'lucide-react';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    condoId: string;
    onSuccess: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, condoId, onSuccess }) => {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleValidate = async () => {
        if (!token.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // Wait, we need the hub API provider! In the gatekeeper we will just use 
            // the internal safe check-in bypassing provider-specific keys, OR we just use a generic fetch
            // Let's use the local API /deliveries/{deliveryId}/status to force 'inside' since 
            // gatekeeper is already authenticated locally. Or call check-in/qr API.
            // Let's call the check-in/qr endpoint using a generic Safe Api Key for now, or just /deliveries route. 
            // Wait, the easiest way for the Concierge is to just use standard `deliveryService.updateStatus` 
            // with 'inside' and send the token in notes or a specific field, BUT we made a fancy `/api/hub/check-in/qr`
            // Let's call check-in/qr directly since that validates the token correctly.
            // For now we mock the provider key as 'admin' if using from dashboard.

            const response = await fetch('http://localhost:8000/api/hub/check-in/qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'sim-key-ifood-123' // We use a dummy for now since Gateway is still mocked
                },
                body: JSON.stringify({
                    condo_id: condoId,
                    qr_code_token: token.toUpperCase()
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Token Inválido ou Expirado');
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                setSuccess(false);
                setToken('');
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
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
                    className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-sm bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl p-6"
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ScanLine size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">Check-In Seguro</h2>
                        <p className="text-sm text-slate-400">Digite o Token gerado no app do entregador ou faça a leitura do QR Code.</p>
                    </div>

                    {!success ? (
                        <div className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    value={token}
                                    onChange={(e) => {
                                        setToken(e.target.value.toUpperCase());
                                        setError(null);
                                    }}
                                    placeholder="Ex: XB9PQ2"
                                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-4 text-center text-3xl font-mono font-bold text-white tracking-[0.2em] focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                                    maxLength={6}
                                />
                                {error && <p className="text-rose-400 text-xs text-center mt-2 font-semibold">{error}</p>}
                            </div>

                            <button
                                onClick={handleValidate}
                                disabled={loading || token.length < 6}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                {loading ? 'Validando...' : 'Confirmar Check-In'}
                            </button>
                        </div>
                    ) : (
                        <div className="py-6 text-center">
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                            >
                                <CheckCircle size={40} />
                            </motion.div>
                            <h3 className="text-xl font-bold text-white">Acesso Liberado!</h3>
                            <p className="text-slate-400 text-sm mt-1">A catraca/cancela foi acionada.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
