import React from 'react';
import { Delivery } from '@zeeo/shared';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Bell, Loader2, AlertTriangle, MapPinOff, Navigation } from 'lucide-react';
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
    onAuthorizeManual: (id: string) => void;
    onRejectManual: (id: string) => void;
    onExitManual?: (id: string) => void;
    onRecover?: (id: string) => void;
}

export const ActiveProcessListItem: React.FC<ActiveProcessListItemProps> = ({
    delivery,
    onRequestWhatsApp,
    onRequestPush,
    onPhoneCallClick,
    onAuthorizeManual,
    onRejectManual,
    onExitManual,
    onRecover
}) => {
    // Determine active flags based on status
    const isPending = (delivery.request_channels && delivery.request_channels.length > 0 && !delivery.authorized_by);
    const isConflict = delivery.status === 'conflicting';
    const isAuthorized = delivery.status === 'authorized' || delivery.status === 'pre_authorized' || delivery.status === 'inside';
    const isDenied = delivery.status === 'denied' || delivery.status === 'rejected';
    const isExited = delivery.status === 'exited';

    const hasWhatsApp = delivery.request_channels?.includes('whatsapp');
    const hasPush = delivery.request_channels?.includes('push');

    // Assume integrations are disabled for MVP default as per spec, require tooltip
    const isWhatsAppConfigured = false;
    const isPushConfigured = false;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
                isExited ? "bg-slate-800/60 border-slate-600/50 opacity-80" :
                    isAuthorized ? "bg-emerald-900/20 border-emerald-500/50" :
                        isDenied ? "bg-rose-900/20 border-rose-500/50" :
                            isConflict ? "bg-orange-900/20 border-orange-500/50" :
                                isPending ? "bg-yellow-900/20 border-yellow-500/50" :
                                    "bg-slate-800/40 border-slate-700 hover:border-slate-600"
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

                <div className="flex flex-col items-end">
                    {delivery.location ? (
                        <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-1 rounded text-primary-400 font-bold">
                            <Navigation size={12} />
                            <span>{delivery.target_unit_label}</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-1 rounded text-slate-500 font-bold">
                            <MapPinOff size={12} />
                            <span className="text-[10px]">Sem GPS</span>
                        </div>
                    )}
                    {/* Status Badge */}
                    <div className="mt-1 flex justify-end">
                        {isExited && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saída Liberada</span>}
                        {isAuthorized && !isExited && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Autorizado</span>}
                        {isDenied && <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Negado</span>}
                        {isConflict && <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={10} /> Conflito de Respostas</span>}
                        {isPending && !isConflict && <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Aguardando Morador</span>}
                    </div>
                </div>
            </div>

            {/* Quick Actions for Pending / Unresolved */}
            {(!isAuthorized && !isDenied && !isExited) && (
                <div className="mt-3 flex gap-2">
                    {/* WhatsApp Button */}
                    <div className="group relative flex-1">
                        <button
                            disabled={!isWhatsAppConfigured}
                            onClick={() => onRequestWhatsApp(delivery.id)}
                            className={cn(
                                "w-full flex items-center justify-center space-x-1 py-2 rounded text-xs font-bold transition-all",
                                isWhatsAppConfigured
                                    ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20"
                                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed",
                                hasWhatsApp && "bg-[#25D366] text-slate-950"
                            )}
                        >
                            <MessageCircle size={14} />
                            <span>{hasWhatsApp ? "Enviado" : "WhatsApp"}</span>
                        </button>
                        {/* Tooltip */}
                        {!isWhatsAppConfigured && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-900 text-slate-300 text-[10px] p-2 rounded border border-slate-700 shadow-xl z-10 text-center">
                                Configuração necessária para ativar WhatsApp.
                                <br /><br />
                                <span className="text-slate-500 italic">"Olá, {delivery.driver_snapshot.name} está aguardando liberação na portaria..."</span>
                            </div>
                        )}
                    </div>

                    {/* Push Button */}
                    <div className="group relative flex-1">
                        <button
                            disabled={!isPushConfigured}
                            onClick={() => onRequestPush(delivery.id)}
                            className={cn(
                                "w-full flex items-center justify-center space-x-1 py-2 rounded text-xs font-bold transition-all",
                                isPushConfigured
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20"
                                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed",
                                hasPush && "bg-blue-500 text-white"
                            )}
                        >
                            <Bell size={14} />
                            <span>{hasPush ? "Enviado" : "Push App"}</span>
                        </button>
                        {!isPushConfigured && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-900 text-slate-300 text-[10px] p-2 rounded border border-slate-700 shadow-xl z-10 text-center">
                                Configuração necessária para ativar (Firebase).
                            </div>
                        )}
                    </div>

                    {/* Phone Call */}
                    <button
                        onClick={() => onPhoneCallClick(delivery.id)}
                        className="flex-1 flex items-center justify-center space-x-1 py-2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-bold transition-all"
                    >
                        <Phone size={14} />
                        <span>Ligar</span>
                    </button>

                    {/* Quick Simulator Access */}
                    {!delivery.location && (
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-simulator', { detail: { deliveryId: delivery.id, provider: delivery.provider } }))}
                            className="flex-shrink flex items-center justify-center py-2 px-3 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 text-xs font-bold transition-all"
                            title="Abrir Simulador (Adicionar GPS)"
                        >
                            📱
                        </button>
                    )}
                </div>
            )}

            {/* Direct Gatekeeper Actions (Emergency/Override) */}
            {(!isAuthorized && !isDenied && !isExited) && (
                <div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Ações manuais do porteiro</span>
                    <div className="flex gap-2">
                        <button onClick={() => onRejectManual(delivery.id)} className="px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition-colors">Negar Acesso</button>
                        <button onClick={() => onAuthorizeManual(delivery.id)} className="px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold transition-colors">Liberar</button>
                    </div>
                </div>
            )}

            {/* Exit Control Action for Authorized Deliveries */}
            {(isAuthorized && !isExited && onExitManual) && (
                <div className="mt-3 pt-3 border-t border-emerald-500/30 flex justify-between items-center">
                    <span className="text-[10px] text-emerald-500/70">Veículo no Condomínio</span>
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
