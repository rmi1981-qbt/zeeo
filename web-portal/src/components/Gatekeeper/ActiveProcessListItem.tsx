import React from 'react';
import { Delivery } from '@zeeo/shared';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Bell, Loader2, AlertTriangle, MapPinOff, Navigation, ScanFace, ScanLine, ShieldCheck, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ActiveProcessListItemProps {
    delivery: Delivery;
    onRequestWhatsApp: (id: string) => void;
    onRequestPush: (id: string) => void;
    onPhoneCallClick: (id: string) => void;
    onExitManual?: (id: string) => void;
    onRecover?: (id: string) => void;
    onBiometricScanClick?: (delivery: Delivery) => void;
    onQRScanClick?: (deliveryId: string) => void;
    onVerifyBiometrics?: (id: string) => void;
    onLiberateEntry?: (id: string) => void;
    onCardClick?: (id: string) => void;
}

export const ActiveProcessListItem: React.FC<ActiveProcessListItemProps> = ({
    delivery,
    onRequestWhatsApp,
    onRequestPush,
    onPhoneCallClick,
    onExitManual,
    onRecover,
    onBiometricScanClick,
    onQRScanClick,
    onVerifyBiometrics,
    onLiberateEntry,
    onCardClick
}) => {
    const isPending = (delivery.request_channels && delivery.request_channels.length > 0 && !delivery.authorized_by && delivery.status !== 'pre_authorized');
    const isConflict = delivery.status === 'conflicting';
    const isPreAuthorizedFallback = delivery.status === 'pre_authorized'; // Used when ZK Match fails or isn't fast enough
    const isAuthorized = delivery.status === 'authorized' || delivery.status === 'inside';
    const isDenied = delivery.status === 'denied' || delivery.status === 'rejected';
    const isExited = delivery.status === 'exited';
    const isInside = delivery.status === 'inside';

    const activeAlerts = delivery.active_alerts || [];
    const hasGatekeeperAlerts = activeAlerts.some(a => a.target === 'gatekeeper');

    const hasWhatsApp = delivery.request_channels?.includes('whatsapp');
    const hasPush = delivery.request_channels?.includes('push');

    // Enable integrations for Simulator / Sales Demo
    const isWhatsAppConfigured = true;
    const isPushConfigured = true;

    // Double-Check State Variables
    const isEntrada = ['created', 'driver_assigned', 'approaching', 'at_gate', 'conflicting', 'authorized', 'pre_authorized'].includes(delivery.status);
    const residentApproved = ['authorized', 'inside'].includes(delivery.status) || !!delivery.authorized_by;
    const biometricsApproved = !!delivery.biometrics_verified || !!delivery.driver_snapshot?.isBiometricVerified;
    const canLiberate = residentApproved && biometricsApproved;

    let cardColorClasses = "bg-slate-800/40 border-slate-700 hover:border-slate-600";
    if (isExited) {
        cardColorClasses = "bg-slate-800/60 border-slate-600/50 opacity-80";
    } else if (isDenied) {
        cardColorClasses = "bg-rose-900/20 border-rose-500/50";
    } else if (isInside) {
        cardColorClasses = "bg-indigo-900/20 border-indigo-500/50";
    } else if (isEntrada) {
        if (isConflict) {
            cardColorClasses = "bg-orange-900/20 border-orange-500/50";
        } else if (canLiberate) {
            cardColorClasses = "bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
        } else if (residentApproved || biometricsApproved) {
            cardColorClasses = "bg-amber-900/20 border-amber-500/50";
        } else {
            cardColorClasses = "bg-slate-800/40 border-slate-700 hover:border-slate-600"; // Neutral
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => onCardClick?.(delivery.id)}
            className={cn(
                "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
                onCardClick && "cursor-pointer hover:ring-2 hover:ring-blue-500/50",
                cardColorClasses
            )}
        >
            {/* Header: Driver & Unit */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        {delivery.driver_snapshot.photoUrl ? (
                            <img src={delivery.driver_snapshot.photoUrl} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="font-bold text-slate-500">{delivery.driver_snapshot.name.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-100">{delivery.driver_snapshot.name}</h3>
                        <div className="flex items-center space-x-1 text-xs text-slate-400">
                            <span>{delivery.provider}</span>
                            <span>•</span>
                            <span>{delivery.driver_snapshot.plate || 'Sem Placa'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                    {/* Always show the Target Unit */}
                    <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-1 rounded text-primary-400 font-bold border border-primary-500/20">
                        <Navigation size={12} />
                        <span>{delivery.target_unit_label || 'Destino Desconhecido'}</span>
                    </div>
                    
                    {/* If no location, show the Open Driver App button clearly */}
                    {!delivery.location && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('open-simulator', { detail: { deliveryId: delivery.id, provider: delivery.provider } }));
                            }}
                            className="flex items-center space-x-1 hover:bg-slate-800 bg-slate-900/50 px-2 py-1 rounded text-slate-400 hover:text-white font-bold transition-colors cursor-pointer border border-slate-700/50 hover:border-slate-500 shadow-sm"
                            title="Abrir App do Motorista (Simulador)"
                        >
                            <MapPinOff size={12} />
                            <span className="text-[10px]">Sem GPS - App Motorista</span>
                        </button>
                    )}
                    
                    {/* Status Badge */}
                    <div className="mt-1 flex justify-end">
                        {isExited && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saída Liberada</span>}
                        {isAuthorized && !isExited && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Autorizado</span>}
                        {isDenied && <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Negado</span>}
                        {isPreAuthorizedFallback && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> Fallback Reforçado</span>}
                        {isConflict && <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> Conflito de Respostas</span>}
                        {isPending && !isConflict && !isPreAuthorizedFallback && <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Aguardando Morador</span>}
                    </div>

                    {/* Active Alerts */}
                    {hasGatekeeperAlerts && (
                        <div className="flex flex-col gap-1 items-end mt-1">
                            {activeAlerts.filter(a => a.target === 'gatekeeper').map(alert => (
                                <div key={alert.id} className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap",
                                    alert.type === 'warning' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                )} title={alert.message}>
                                    {alert.type === 'warning' ? <AlertTriangle size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />}
                                    {alert.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Double-Check & Actions for Entradas */}
            {isEntrada && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-3">
                    {/* Check 1: Morador */}
                    <div className={cn("p-3 rounded-lg border transition-all", residentApproved ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]" : "bg-slate-800/50 border-slate-700")}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-xs font-bold", residentApproved ? "text-emerald-400" : "text-slate-300")}>
                                1. Autorização do Morador
                            </span>
                            {residentApproved ? (
                                <span className="text-[10px] text-emerald-500 flex items-center gap-1 uppercase tracking-widest font-bold"><ShieldCheck size={12} /> Aprovado</span>
                            ) : (
                                <span className="text-[10px] text-yellow-500 flex items-center gap-1 uppercase tracking-widest font-bold"><Clock size={12} className="animate-pulse" /> Aguardando</span>
                            )}
                        </div>
                        {!residentApproved && (
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <div className="group relative flex-1">
                                        <button
                                            disabled={!isWhatsAppConfigured}
                                            onClick={() => onRequestWhatsApp(delivery.id)}
                                            className={cn(
                                                "w-full flex items-center justify-center space-x-1 py-1.5 rounded text-xs transition-all",
                                                isWhatsAppConfigured
                                                    ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20"
                                                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed",
                                                hasWhatsApp && "bg-[#25D366] text-slate-950 font-bold"
                                            )}
                                        >
                                            <MessageCircle size={12} />
                                            <span>{hasWhatsApp ? "Enviado" : "WhatsApp"}</span>
                                        </button>
                                    </div>
                                    <div className="group relative flex-1">
                                        <button
                                            disabled={!isPushConfigured}
                                            onClick={() => onRequestPush(delivery.id)}
                                            className={cn(
                                                "w-full flex items-center justify-center space-x-1 py-1.5 rounded text-xs transition-all",
                                                isPushConfigured
                                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20"
                                                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed",
                                                hasPush && "bg-blue-500 text-white font-bold"
                                            )}
                                        >
                                            <Bell size={12} />
                                            <span>{hasPush ? "Enviado" : "Push App"}</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => onPhoneCallClick(delivery.id)}
                                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 text-xs transition-all"
                                    >
                                        <Phone size={12} />
                                        <span>Ligar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Check 2: Validação Biometria / Portaria */}
                    <div className={cn("p-3 rounded-lg border transition-all", biometricsApproved ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]" : "bg-slate-800/50 border-slate-700")}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-xs font-bold", biometricsApproved ? "text-emerald-400" : "text-slate-300")}>
                                2. Validação na Portaria
                            </span>
                            {biometricsApproved ? (
                                <span className="text-[10px] text-emerald-500 flex items-center gap-1 uppercase tracking-widest font-bold"><ShieldCheck size={12} /> Validado</span>
                            ) : (
                                <span className="text-[10px] text-yellow-500 flex items-center gap-1 uppercase tracking-widest font-bold"><Clock size={12} className="animate-pulse" /> Pendente</span>
                            )}
                        </div>
                        {!biometricsApproved && (
                            <div className="flex flex-col gap-2">
                                {onBiometricScanClick && (
                                    <button
                                        onClick={() => onBiometricScanClick(delivery)}
                                        className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 text-xs transition-all"
                                    >
                                        <ScanFace size={14} />
                                        <span>Reconhecimento Facial</span>
                                    </button>
                                )}
                                {onQRScanClick && (
                                    <button
                                        onClick={() => onQRScanClick(delivery.id)}
                                        className="w-full mt-1 flex items-center justify-center gap-2 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs transition-all"
                                    >
                                        <ScanLine size={14} />
                                        <span>Check-in via Token / QR Code</span>
                                    </button>
                                )}
                                <div className="flex justify-between items-center mt-1 border-t border-slate-700/50 pt-2">
                                    <span className="text-[9px] text-slate-500">
                                        Forçar Validação (Falhas / Exceções):
                                    </span>
                                    <button onClick={() => onVerifyBiometrics?.(delivery.id)} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-bold transition-colors">Validar Documento Visualmente</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Action Action */}
                    {!canLiberate && (
                        <div className="w-full py-2.5 mt-1 rounded-lg border border-slate-700/50 bg-slate-800/30 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2 text-sm font-bold">
                            <Clock size={16} /> Aguardando {(!residentApproved && !biometricsApproved) ? "Validações" : !residentApproved ? "Morador" : "Portaria"}...
                        </div>
                    )}
                    {canLiberate && (
                        <button
                            onClick={() => onLiberateEntry?.(delivery.id)}
                            className="w-full py-3 mt-1 rounded-lg font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 animate-in zoom-in"
                        >
                            <ShieldCheck size={18} /> LIBERAR ENTRADA
                        </button>
                    )}
                </div>
            )}

            {/* Exit Control Action for Inside Deliveries */}
            {(delivery.status === 'inside' && !isExited && onExitManual) && (
                <div className="mt-3 pt-3 border-t border-sky-500/30 flex justify-between items-center">
                    <span className="text-[10px] text-sky-500/70">Veículo no Condomínio</span>
                    <button onClick={() => onExitManual(delivery.id)} className="px-4 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-300 text-xs font-bold transition-colors">
                        Liberar Saída
                    </button>
                </div>
            )}

            {/* Recover Action for Trash / Exited */}
            {(isDenied || isExited) && onRecover && (
                <div className={cn(
                    "mt-3 pt-3 flex justify-end border-t",
                    isDenied ? "border-rose-500/30" : "border-slate-600/30"
                )}>
                    <button
                        onClick={() => onRecover(delivery.id)}
                        className={cn(
                            "px-4 py-2 rounded border text-xs font-bold transition-all shadow-lg",
                            isDenied
                                ? "bg-rose-500/20 border-rose-500/50 hover:bg-rose-500 text-rose-300 hover:text-rose-50"
                                : "bg-slate-800/50 border-slate-600 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                        )}
                    >
                        {isExited ? 'Desfazer Saída' : 'Recuperar Processo'}
                    </button>
                </div>
            )}

        </motion.div>
    );
};
