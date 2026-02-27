import React, { useState } from 'react';
import { Delivery } from '@zeeo/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, MapPin, CheckCircle2, XCircle, ShieldCheck, Fingerprint, ScanFace } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface DeliveryCardProps {
    delivery: Delivery;
    onAuthorize: (id: string) => void;
    onReject: (id: string) => void;
    showActions?: boolean;
    compact?: boolean;
    primaryActionLabel?: string;
}

export const DeliveryCard = React.forwardRef<HTMLDivElement, DeliveryCardProps>(({
    delivery,
    onAuthorize,
    onReject,
    showActions = true,
    compact = false,
    primaryActionLabel = "Autorizar"
}, ref) => {
    const [isVerifyingMatch, setIsVerifyingMatch] = useState(false);
    const [matchSuccess, setMatchSuccess] = useState(false);

    const isArriving = delivery.status === 'arriving';
    const isPreAuth = delivery.status === 'pre_authorized';
    const hasBiometrics = delivery.driver_snapshot.isBiometricVerified;

    const handleAuthorizeClick = () => {
        if (hasBiometrics && delivery.status === 'at_gate') {
            // Trigger visual Face Match Simulation
            setIsVerifyingMatch(true);
            setTimeout(() => {
                setMatchSuccess(true);
                setTimeout(() => {
                    onAuthorize(delivery.id);
                }, 1000); // 1 second showing success before dispatching
            }, 1500); // 1.5 second scanning animation
        } else {
            onAuthorize(delivery.id);
        }
    };

    return (
        <motion.div
            ref={ref}
            layout // Enable layout animation for FLIP effects
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
                "relative overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300",
                (isArriving || delivery.status === 'approaching') ? "bg-slate-800/80 border-primary-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]" :
                    delivery.status === 'at_gate' ? "bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]" :
                        "bg-slate-800/40 border-glass-100",
                compact ? "p-3" : "p-5"
            )}
        >
            {/* Pulsing Indicator for Arriving */}
            {isArriving && (
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600 animate-pulse" />
            )}

            {/* Flash Overlay for Biometric Match */}
            <AnimatePresence>
                {isVerifyingMatch && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-xl"
                    >
                        {!matchSuccess ? (
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="flex flex-col items-center"
                            >
                                <ScanFace size={48} className="text-primary-500 mb-3" />
                                <div className="text-primary-400 font-bold text-center tracking-widest uppercase text-sm">
                                    Conferindo Biometria...
                                </div>
                                {/* Scanning line */}
                                <motion.div
                                    className="w-32 h-0.5 bg-primary-500 mt-2 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                                    animate={{ y: [-15, 15, -15] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                                    <CheckCircle2 size={32} className="text-emerald-500" />
                                </div>
                                <div className="text-emerald-400 font-bold text-center tracking-widest uppercase text-sm">
                                    Match 99.8% Confirmado
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header: Unit & Badge */}
            <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                    <div className="flex items-center space-x-2">
                        <MapPin size={14} className="text-primary-400" />
                        <span className="text-lg font-bold text-white">{delivery.target_unit_label}</span>
                    </div>
                    {isPreAuth ? (
                        <div className="flex items-center space-x-1 mt-1 text-emerald-400 text-[10px] uppercase font-bold tracking-wide">
                            <CheckCircle2 size={10} />
                            <span>Pré-Autorizado</span>
                        </div>
                    ) : delivery.status === 'authorized' ? (
                        <div className="flex items-center space-x-1 mt-1 text-blue-400 text-[10px] uppercase font-bold tracking-wide">
                            <ShieldCheck size={10} />
                            <span>Autorizado</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1 mt-1 text-slate-500 text-[10px] uppercase font-bold tracking-wide">
                            <ShieldCheck size={10} />
                            <span>Aguardando Liberação</span>
                        </div>
                    )}
                    {delivery.status === 'approaching' && delivery.current_gate && (
                        <div className="flex items-center space-x-1 mt-1 text-yellow-500 text-[10px] uppercase font-bold tracking-wide animate-pulse bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                            <MapPin size={10} />
                            <span>Chegando {delivery.current_gate.name ? 'na ' + delivery.current_gate.name : ''}</span>
                        </div>
                    )}
                    {/* Authorization method badge */}
                    {delivery.authorized_method && (
                        <div className="flex items-center space-x-1 mt-1 text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
                            <span>
                                {delivery.authorized_method === 'app_zeeo' ? '📱 App' :
                                    delivery.authorized_method === 'whatsapp' ? '💬 WhatsApp' :
                                        delivery.authorized_method === 'phone_call' ? '📞 Telefone' :
                                            delivery.authorized_method === 'pre_authorized' ? '🔒 Pré-autorizado' :
                                                delivery.authorized_method === 'intercom' ? '📞 Interfone' : '✋ Manual'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                        "text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider",
                        delivery.provider === 'ifood' ? "bg-[#EA1D2C]/20 text-[#EA1D2C]" :
                            delivery.provider === 'mercadolivre' ? "bg-[#FFE600]/20 text-[#FFE600]" :
                                delivery.provider === 'uber' ? "bg-black/40 text-white" : "bg-slate-700 text-slate-300"
                    )}>
                        {delivery.provider}
                    </span>
                    {hasBiometrics && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase font-bold tracking-wide border border-emerald-500/30 flex items-center space-x-1">
                            <Fingerprint size={10} />
                            <span>Biometria Verificada</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Driver Info */}
            <div className={cn("flex items-center space-x-4", compact ? "mb-2" : "mb-4")}>
                <div className="relative shrink-0">
                    {delivery.driver_snapshot.photoUrl ? (
                        <img
                            src={delivery.driver_snapshot.photoUrl}
                            className={cn(
                                "rounded-full object-cover ring-2",
                                hasBiometrics ? "ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "ring-slate-700",
                                compact ? "w-10 h-10" : "w-16 h-16"
                            )}
                            onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(delivery.driver_snapshot.name)}&background=334155&color=94a3b8`;
                            }}
                        />
                    ) : (
                        <div className={cn(
                            "rounded-full bg-slate-800 flex items-center justify-center ring-2",
                            hasBiometrics ? "ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "ring-slate-700",
                            compact ? "w-10 h-10" : "w-16 h-16"
                        )}>
                            <span className={cn("font-bold text-slate-500", compact ? "text-sm" : "text-xl")}>
                                {delivery.driver_snapshot.name.charAt(0)}
                            </span>
                        </div>
                    )}

                    {delivery.driver_snapshot.documentHash && !hasBiometrics && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border border-slate-900" title="Documento Validado">
                            <ShieldCheck size={12} className="text-white" />
                        </div>
                    )}
                    {hasBiometrics && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-slate-900" title="Biometria Confirmada">
                            <ScanFace size={12} className="text-white" />
                        </div>
                    )}
                </div>
                <div className="overflow-hidden">
                    <h3 className={cn("font-bold text-slate-100 truncate", compact ? "text-sm" : "text-lg")} title={delivery.driver_snapshot.name}>
                        {delivery.driver_snapshot.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-0.5 bg-black/20 px-2 py-0.5 rounded inline-block">
                        <Truck size={12} className="text-slate-400" />
                        <span className="font-mono text-xs text-slate-300 tracking-wider">
                            {delivery.driver_snapshot.plate || "SEM-PLACA"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {showActions && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                        onClick={() => onReject(delivery.id)}
                        disabled={isVerifyingMatch}
                        className="flex items-center justify-center space-x-1 py-3 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-sm transition-colors min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <XCircle size={16} />
                        <span>Recusar</span>
                    </button>
                    <button
                        onClick={handleAuthorizeClick}
                        disabled={isVerifyingMatch}
                        className={cn(
                            "flex items-center justify-center space-x-1 py-3 rounded-lg font-bold text-sm shadow-lg transition-all min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed",
                            hasBiometrics
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 hover:scale-[1.02]"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 hover:scale-[1.02]"
                        )}
                    >
                        {hasBiometrics ? <ScanFace size={16} /> : <CheckCircle2 size={16} />}
                        <span>{hasBiometrics ? "Face Match & Liberar" : primaryActionLabel}</span>
                    </button>
                </div>
            )}

            {!showActions && delivery.status === 'at_gate' && (
                <div className="mt-2 w-full py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-center text-sm font-bold flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>Entrada Liberada</span>
                </div>
            )}
        </motion.div>
    );
});
