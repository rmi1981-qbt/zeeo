import React, { useState, useEffect } from 'react';
import { ShieldAlert, Bell, Clock, MapPin } from 'lucide-react';

interface AlertConfigDetails {
    // Gatekeeper
    gk_approaching_enabled: boolean;
    gk_approaching_dist_m: number;
    gk_time_limit_enabled: boolean;
    gk_time_limit_min: number;
    // Resident / Webhook
    res_approaching_enabled: boolean;
    res_approaching_dist_m: number;
}

interface AlertSettingsConfigProps {
    condoId: string;
}

export const AlertSettingsConfig: React.FC<AlertSettingsConfigProps> = ({ condoId }) => {
    const [config, setConfig] = useState<AlertConfigDetails>({
        gk_approaching_enabled: false,
        gk_approaching_dist_m: 500,
        gk_time_limit_enabled: false,
        gk_time_limit_min: 15,
        res_approaching_enabled: false,
        res_approaching_dist_m: 500
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCondoConfig();
    }, [condoId]);

    const fetchCondoConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/api/v1/condos/${condoId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.alert_config) {
                    setConfig({ ...config, ...data.alert_config });
                }
            }
        } catch (e) {
            console.error("Failed to fetch alert config", e);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`http://localhost:8000/api/v1/condos/${condoId}`);
            if (res.ok) {
                const data = await res.json();
                data.alert_config = config;

                await fetch(`http://localhost:8000/api/v1/condos/${condoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
        } catch (e) {
            console.error("Failed to update alert config", e);
        }
        setTimeout(() => setSaving(false), 500);
    };

    const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
        <div
            onClick={() => onChange(!checked)}
            className={`w-12 h-6 rounded-full relative cursor-pointer flex items-center px-1 transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute transition-all ${checked ? 'right-1' : 'left-1'}`} />
        </div>
    );

    if (loading) return <div className="p-6 text-slate-400">Carregando configurações...</div>;

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:p-8 mt-8">
            <div className="flex items-start gap-4 mb-8">
                <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                    <ShieldAlert className="text-amber-400" size={24} />
                </div>
                <div className="flex-1 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Telemetria e Alertas (Gatekeeper & Morador)</h2>
                        <p className="text-slate-400">
                            Configure alertas visuais e eventos de webhook disparados com base na localização em tempo real (GPS/Tags) e no tempo de permanência de processos ativos.
                        </p>
                    </div>
                     <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Gravando...' : 'Salvar Alertas'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gatekeeper Configs */}
                <div className="space-y-4 p-5 rounded-2xl bg-slate-950/50 border border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldAlert className="text-blue-400" size={20} />
                        <h3 className="font-bold text-slate-200">Alertas da Portaria (Gatekeeper)</h3>
                    </div>

                    {/* Aproximação Gatekeeper */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-slate-200 text-sm">Aviso de Aproximação</h4>
                                <p className="text-xs text-slate-400 mt-1">Sinaliza o card na portaria quando o motorista estiver chegando no condomínio.</p>
                            </div>
                            <Toggle 
                                checked={config.gk_approaching_enabled} 
                                onChange={(v) => setConfig({ ...config, gk_approaching_enabled: v })} 
                            />
                        </div>
                        {config.gk_approaching_enabled && (
                            <div className="flex items-center gap-3">
                                <MapPin size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-300">Distância na Borda (metros):</span>
                                <input 
                                    type="number" 
                                    value={config.gk_approaching_dist_m}
                                    onChange={(e) => setConfig({ ...config, gk_approaching_dist_m: Number(e.target.value) })}
                                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Tempo Limite Gatekeeper */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-slate-200 text-sm">Alerta de Permanência</h4>
                                <p className="text-xs text-slate-400 mt-1">Sinaliza se o motorista estiver demorando além do limite aceitável no interior do condomínio (TMA).</p>
                            </div>
                            <Toggle 
                                checked={config.gk_time_limit_enabled} 
                                onChange={(v) => setConfig({ ...config, gk_time_limit_enabled: v })} 
                            />
                        </div>
                        {config.gk_time_limit_enabled && (
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-300">Tempo Limite (minutos):</span>
                                <input 
                                    type="number" 
                                    value={config.gk_time_limit_min}
                                    onChange={(e) => setConfig({ ...config, gk_time_limit_min: Number(e.target.value) })}
                                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Morador / Webhook Configs */}
                <div className="space-y-4 p-5 rounded-2xl bg-slate-950/50 border border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="text-fuchsia-400" size={20} />
                        <h3 className="font-bold text-slate-200">Notificações p/ Morador & Webhooks</h3>
                    </div>

                    {/* Aproximação Morador */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-slate-200 text-sm">Disparo de Aproximação (Outbound)</h4>
                                <p className="text-xs text-slate-400 mt-1">Dispara um Webhook para o App do Condomínio, WhatsApp ou parceiros logísticos.</p>
                            </div>
                            <Toggle 
                                checked={config.res_approaching_enabled} 
                                onChange={(v) => setConfig({ ...config, res_approaching_enabled: v })} 
                            />
                        </div>
                        {config.res_approaching_enabled && (
                            <div className="flex items-center gap-3">
                                <MapPin size={16} className="text-slate-500" />
                                <span className="text-sm text-slate-300">Distância Alvo (metros):</span>
                                <input 
                                    type="number" 
                                    value={config.res_approaching_dist_m}
                                    onChange={(e) => setConfig({ ...config, res_approaching_dist_m: Number(e.target.value) })}
                                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                        <p className="text-xs text-slate-500 text-center">
                            Avisos de 'Entrada/Catraca' e 'Saída' são enviados automaticamente via sistema de eventos, caso habilitado nas configurações específicas das integrações no painel central.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};
