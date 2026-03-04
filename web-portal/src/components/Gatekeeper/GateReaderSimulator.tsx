import React, { useState } from 'react';
import { QrCode, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const GateReaderSimulator: React.FC = () => {
    const { selectedCondo } = useAuth();
    const [token, setToken] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Audio Context for the Beep
    const playBeep = (type: 'success' | 'error') => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            } else {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            console.error('AudioContext not supported', e);
        }
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim() || !selectedCondo) return;

        setStatus('loading');

        try {
            const res = await fetch(`http://localhost:8000/api/hub/check-in/qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'condominio_sim_key_123'
                },
                body: JSON.stringify({
                    condo_id: selectedCondo,
                    qr_code_token: token.toUpperCase()
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Token inválido');
            }

            setStatus('success');
            playBeep('success');
            setToken('');

            // Reset success visually after 3 seconds
            setTimeout(() => setStatus('idle'), 3000);

        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message);
            playBeep('error');
            // Reset error visually after 3 seconds
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className={`p-4 rounded-2xl border transition-colors duration-300 backdrop-blur-md flex flex-col gap-3
            ${status === 'success' ? 'bg-emerald-900/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
                status === 'error' ? 'bg-rose-900/30 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]' :
                    'bg-slate-900/50 border-slate-800/50'}
        `}>
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <QrCode size={16} className="text-slate-400" />
                    Catraca Virtual / Leitora OTP
                </h3>
                {status === 'success' && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Acesso Liberado</span>}
                {status === 'error' && <span className="text-xs font-bold text-rose-400 flex items-center gap-1"><XCircle size={12} /> Negado</span>}
            </div>

            {status === 'error' && (
                <div className="text-[10px] text-rose-400 font-medium px-1 uppercase tracking-wide">
                    Erro: {errorMessage}
                </div>
            )}

            <form onSubmit={handleScan} className="flex gap-2">
                <input
                    type="text"
                    placeholder="Digite o Token..."
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 text-sm font-mono text-center tracking-widest outline-none focus:border-blue-500/50 uppercase"
                    maxLength={6}
                    disabled={status === 'loading'}
                />
                <button
                    type="submit"
                    disabled={status === 'loading' || !token.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Escanear'}
                </button>
            </form>
        </div>
    );
};
