import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastMessage;
    onDismiss: (id: string) => void;
}

const toastConfig = {
    success: {
        icon: CheckCircle,
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
        progressColor: 'bg-emerald-500'
    },
    error: {
        icon: XCircle,
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-400',
        progressColor: 'bg-red-500'
    },
    warning: {
        icon: AlertCircle,
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        iconColor: 'text-amber-400',
        progressColor: 'bg-amber-500'
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        iconColor: 'text-blue-400',
        progressColor: 'bg-blue-500'
    }
};

export default function Toast({ toast, onDismiss }: ToastProps) {
    const config = toastConfig[toast.type];
    const Icon = config.icon;
    const duration = toast.duration || 5000;

    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, duration);

        return () => clearTimeout(timer);
    }, [toast.id, duration, onDismiss]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className={`relative overflow-hidden bg-slate-900/95 backdrop-blur-xl border ${config.borderColor} rounded-xl shadow-2xl min-w-[320px] max-w-md`}
            role="alert"
            aria-live="assertive"
        >
            <div className="p-4 flex items-start gap-3">
                <div className={`${config.bgColor} p-2 rounded-lg flex-shrink-0`}>
                    <Icon size={20} className={config.iconColor} />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm mb-1">{toast.title}</h4>
                    {toast.message && (
                        <p className="text-slate-400 text-xs leading-relaxed">{toast.message}</p>
                    )}
                </div>

                <button
                    onClick={() => onDismiss(toast.id)}
                    className="flex-shrink-0 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
                    aria-label="Fechar notificação"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar */}
            <motion.div
                className={`h-1 ${config.progressColor}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
            />
        </motion.div>
    );
}

// Toast Container Component
interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast toast={toast} onDismiss={onDismiss} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}
