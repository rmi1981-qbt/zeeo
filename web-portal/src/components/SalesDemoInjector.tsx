import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Zap, Store, Truck, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import { DriverAppSimulatorModal } from './Gatekeeper/DriverAppSimulatorModal';

export const SalesDemoInjector: React.FC<{ onDeliveryChange?: () => void }> = ({ onDeliveryChange }) => {
    const { selectedCondo } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Simulator Modal State
    const [simulatorProvider, setSimulatorProvider] = useState<'ifood' | 'mercadolivre' | 'ubereats' | null>(null);
    const [existingDeliveryId, setExistingDeliveryId] = useState<string | null>(null);

    React.useEffect(() => {
        const handleOpenSimulator = (e: Event) => {
            const customEvent = e as CustomEvent<{ deliveryId: string, provider: string }>;
            const mappedProvider = customEvent.detail.provider === 'uber' ? 'ubereats' : customEvent.detail.provider as any;
            setSimulatorProvider(mappedProvider);
            setExistingDeliveryId(customEvent.detail.deliveryId);
            setIsOpen(false);
        };
        window.addEventListener('open-simulator', handleOpenSimulator);
        return () => window.removeEventListener('open-simulator', handleOpenSimulator);
    }, []);

    if (!selectedCondo) return null;

    const openSimulator = (provider: 'ifood' | 'mercadolivre' | 'ubereats') => {
        setSimulatorProvider(provider);
        setIsOpen(false);
    };

    return (
        <>
            <div className="fixed bottom-6 left-6 z-50">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            className="absolute bottom-16 left-0 w-80 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                                <div className="flex items-center space-x-2 text-primary-400 font-bold">
                                    <Zap size={16} />
                                    <span>Sales Demo Injector</span>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="text-xs text-slate-400 mb-2">
                                    Injetar entregas reais (Webhooks) para demonstração. O Card aparecerá automaticamente na coluna "Chegando".
                                </div>

                                <button
                                    onClick={() => openSimulator('ifood')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700 hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="flex items-center space-x-3 text-slate-300">
                                        <Store size={18} className="text-red-500" />
                                        <span className="font-semibold text-sm group-hover:text-white">iFood + Biometria</span>
                                    </div>
                                    <Fingerprint size={16} className="text-emerald-500" />
                                </button>

                                <button
                                    onClick={() => openSimulator('mercadolivre')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700 hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="flex items-center space-x-3 text-slate-300">
                                        <ShoppingBag size={18} className="text-yellow-400" />
                                        <span className="font-semibold text-sm group-hover:text-white">Mercado Livre (Normal)</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => openSimulator('ubereats')}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700 hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="flex items-center space-x-3 text-slate-300">
                                        <Truck size={18} className="text-slate-100" />
                                        <span className="font-semibold text-sm group-hover:text-white">Uber Fast-Track</span>
                                    </div>
                                    <Fingerprint size={16} className="text-emerald-500" />
                                </button>

                                <div className="pt-2 border-t border-slate-700/50">
                                    <div className="text-xs text-slate-400 mb-2">Simular Resposta do Morador</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                // Mocking an event that resident approved via App Zeeo
                                                const event = new CustomEvent('demo-authorize', { detail: { method: 'app_zeeo' } });
                                                window.dispatchEvent(event);
                                            }}
                                            className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 text-xs font-bold text-center transition-colors"
                                        >
                                            📱 App Zeeo
                                        </button>
                                        <button
                                            onClick={() => {
                                                const event = new CustomEvent('demo-authorize', { detail: { method: 'whatsapp' } });
                                                window.dispatchEvent(event);
                                            }}
                                            className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold text-center transition-colors"
                                        >
                                            💬 WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    title="Sales Demo Menu"
                    className="w-12 h-12 bg-primary-600 hover:bg-primary-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-colors"
                >
                    <Zap size={20} />
                </button>
            </div>

            {/* The New Driver App Simulator */}
            {simulatorProvider && (
                <DriverAppSimulatorModal
                    isOpen={!!simulatorProvider}
                    onClose={() => { setSimulatorProvider(null); setExistingDeliveryId(null); }}
                    provider={simulatorProvider}
                    condoId={selectedCondo}
                    existingDeliveryId={existingDeliveryId}
                    onDeliveryStarted={onDeliveryChange}
                />
            )}
        </>
    );
};
