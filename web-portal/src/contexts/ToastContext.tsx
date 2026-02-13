import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';

interface ToastContextValue {
    showToast: (params: {
        type: ToastType;
        title: string;
        message?: string;
        duration?: number;
    }) => void;
    dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback(
        ({ type, title, message, duration = 5000 }: {
            type: ToastType;
            title: string;
            message?: string;
            duration?: number;
        }) => {
            const id = Math.random().toString(36).substring(2, 9);
            const newToast: ToastMessage = {
                id,
                type,
                title,
                message,
                duration
            };

            setToasts(prev => [...prev, newToast]);
        },
        []
    );

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, dismissToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
