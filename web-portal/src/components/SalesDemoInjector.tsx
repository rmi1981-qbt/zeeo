import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Zap, Store, Truck, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deliveryService } from '../services/deliveryService';

export const SalesDemoInjector: React.FC = () => {
    const { selectedCondo } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isInjecting, setIsInjecting] = useState(false);

    if (!selectedCondo) return null;

    const injectDelivery = async (provider: 'ifood' | 'mercadolivre' | 'ubereats', withBiometrics: boolean) => {
        setIsInjecting(true);

        const providersMap = {
            ifood: { name: 'João Entregador', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
            mercadolivre: { name: 'Carlos Logística', photo: 'https://randomuser.me/api/portraits/men/44.jpg' },
            ubereats: { name: 'Motorista Ana', photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
        };

        const loc = { lat: -23.5510, lng: -46.6340 }; // Approaching location

        const pInfo = providersMap[provider];
        const newDelivery = {
            condo_id: selectedCondo,
            status: 'approaching' as const, // For iFood/ML it's usually approaching or pre_authorized
            platform: provider,
            driver_name: pInfo.name,
            driver_plate: 'TST-9999',
            driver_photo: withBiometrics ? `${pInfo.photo}#verified` : pInfo.photo,
            driver_lat: loc.lat,
            driver_lng: loc.lng,
            unit: `Apto ${Math.floor(Math.random() * 800) + 100}`
        };

        try {
            await deliveryService.createDelivery(newDelivery);
            setIsOpen(false);
        } catch (e) {
            console.error("Failed to inject demo delivery", e);
        } finally {
            setIsInjecting(false);
        }
    };

    return (
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
                                disabled={isInjecting}
                                onClick={() => injectDelivery('ifood', true)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700 hover:bg-slate-800 transition-colors group disabled:opacity-50"
                            >
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <Store size={18} className="text-red-500" />
                                    <span className="font-semibold text-sm group-hover:text-white">iFood + Biometria</span>
                                </div>
                                <Fingerprint size={16} className="text-emerald-500" />
                            </button>

                            <button
                                disabled={isInjecting}
                                onClick={() => injectDelivery('mercadolivre', false)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700 hover:bg-slate-800 transition-colors group disabled:opacity-50"
                            >
                                <div className="flex items-center space-x-3 text-slate-300">
                                    <ShoppingBag size={18} className="text-yellow-400" />
                                    <span className="font-semibold text-sm group-hover:text-white">Mercado Livre (Normal)</span>
                                </div>
                            </button>

                            <button
                                disabled={isInjecting}
                                onClick={() => injectDelivery('ubereats', true)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700 hover:bg-slate-800 transition-colors group disabled:opacity-50"
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
                <Zap size={20} className={isInjecting ? 'animate-pulse' : ''} />
            </button>
        </div>
    );
};
