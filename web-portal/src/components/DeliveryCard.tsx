import React from 'react';
import { Delivery } from '@zeeo/shared';
import { motion } from 'framer-motion';
import { Truck, MapPin, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
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
    const isArriving = delivery.status === 'arriving';
    const isPreAuth = delivery.status === 'pre_authorized';

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
                    ) : (
                        <div className="flex items-center space-x-1 mt-1 text-slate-500 text-[10px] uppercase font-bold tracking-wide">
                            <ShieldCheck size={10} />
                            <span>Aguardando Liberação</span>
                        </div>
                    )}
                    {delivery.status === 'approaching' && delivery.current_gate && (
                        <div className="flex items-center space-x-1 mt-1 text-yellow-500 text-[10px] uppercase font-bold tracking-wide animate-pulse bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                            <MapPin size={10} />
                            <span>Chegando na {delivery.current_gate.name}</span>
                        </div>
                    )}
                </div>
                <span className={cn(
                    "text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider",
                    delivery.provider === 'ifood' ? "bg-[#EA1D2C]/20 text-[#EA1D2C]" :
                        delivery.provider === 'mercadolivre' ? "bg-[#FFE600]/20 text-[#FFE600]" :
                            delivery.provider === 'uber' ? "bg-black/40 text-white" : "bg-slate-700 text-slate-300"
                )}>
                    {delivery.provider}
                </span>
            </div>

            {/* Driver Info */}
            <div className={cn("flex items-center space-x-4", compact ? "mb-2" : "mb-4")}>
                <div className="relative">
                    <img
                        src={delivery.driver_snapshot.photoUrl}
                        className={cn(
                            "rounded-full object-cover ring-2 ring-slate-700",
                            compact ? "w-10 h-10" : "w-16 h-16"
                        )}
                    />
                    {delivery.driver_snapshot.documentHash && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-slate-900">
                            <ShieldCheck size={12} className="text-white" />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className={cn("font-bold text-slate-100", compact ? "text-sm" : "text-lg")}>
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
                        className="flex items-center justify-center space-x-1 py-3 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-sm transition-colors"
                    >
                        <XCircle size={16} />
                        <span>Rejeitar</span>
                    </button>
                    <button
                        onClick={() => onAuthorize(delivery.id)}
                        className="flex items-center justify-center space-x-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02]"
                    >
                        <CheckCircle2 size={16} />
                        <span>{primaryActionLabel}</span>
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
