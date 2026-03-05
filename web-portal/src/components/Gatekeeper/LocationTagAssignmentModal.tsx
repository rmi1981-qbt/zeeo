import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Delivery } from '@zeeo/shared';

interface LocationTag {
    id: string;
    system_id: string;
    status: 'available' | 'in_use' | 'maintenance' | 'lost';
}

// Mock tags as if fetched from API
const MOCK_TAGS: LocationTag[] = [
    { id: 't1', system_id: 'A01', status: 'available' },
    { id: 't2', system_id: 'A02', status: 'available' },
    { id: 't3', system_id: 'A03', status: 'in_use' },
    { id: 't4', system_id: 'B01', status: 'available' },
    { id: 't5', system_id: 'B02', status: 'maintenance' },
    { id: 't6', system_id: 'C01', status: 'available' },
];

interface LocationTagAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tagId: string) => void;
    delivery: Delivery | null;
}

export const LocationTagAssignmentModal: React.FC<LocationTagAssignmentModalProps> = ({ isOpen, onClose, onSubmit, delivery }) => {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the input when modal opens
    useEffect(() => {
        if (isOpen) {
            setInputValue('');
            setError('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleInputConfirm = (val: string) => {
        const cleanVal = val.toUpperCase().trim();
        const tag = MOCK_TAGS.find(t => t.system_id === cleanVal);

        if (!tag) {
            setError('TAG não encontrada no sistema.');
            // Shake effect could be added here
            return;
        }

        if (tag.status !== 'available') {
            setError(`A TAG ${cleanVal} não está disponível (Status: ${tag.status}).`);
            return;
        }

        // Success
        setError('');
        onSubmit(tag.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.length > 0) {
                handleInputConfirm(inputValue);
            }
        }
    };

    if (!isOpen || !delivery) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center border border-orange-500/30">
                                <Target size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-tight">Vincular Rastreador</h2>
                                <p className="text-xs text-slate-400">Entrega de {delivery.driver_snapshot.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 bg-slate-950 flex flex-col gap-6">

                        {/* Smart Input Area */}
                        <div className="flex flex-col items-center">
                            <label className="text-sm text-slate-400 mb-3 font-medium text-center">
                                Leia o código de barras ou digite o ID da TAG (ex: A01)
                            </label>

                            <div className="relative w-full max-w-xs">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    maxLength={3}
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value.toUpperCase());
                                        setError('');
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="___"
                                    className={`w-full bg-slate-900 border-2 rounded-xl px-4 py-4 text-center text-4xl text-white placeholder-slate-700 focus:outline-none uppercase font-mono tracking-widest transition-colors ${error ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-orange-500'}`}
                                />
                                {inputValue.length === 3 && !error && (
                                    <button
                                        onClick={() => handleInputConfirm(inputValue)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors"
                                    >
                                        <CheckCircle2 size={24} />
                                    </button>
                                )}
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-rose-400 text-sm mt-3 font-medium bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20"
                                >
                                    <AlertCircle size={14} />
                                    {error}
                                </motion.div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-800"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-medium uppercase tracking-wider">Visual Grid</span>
                            <div className="flex-grow border-t border-slate-800"></div>
                        </div>

                        {/* Visual Grid Area */}
                        <div className="grid grid-cols-4 gap-3">
                            {MOCK_TAGS.map(tag => {
                                const isAvail = tag.status === 'available';
                                return (
                                    <button
                                        key={tag.id}
                                        disabled={!isAvail}
                                        onClick={() => handleInputConfirm(tag.system_id)}
                                        className={`flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all group ${isAvail
                                                ? 'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 cursor-pointer'
                                                : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <Tag size={16} className={`mb-1 ${isAvail ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-slate-500'}`} />
                                        <span className={`font-mono font-bold tracking-widest ${isAvail ? 'text-slate-200 group-hover:text-white' : 'text-slate-500'}`}>
                                            {tag.system_id}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
