import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Link2, Save, Key, RefreshCcw, Trash2 } from 'lucide-react';

interface CondominiumWebhookConfigProps {
    condoId: string;
}

export const CondominiumWebhookConfig: React.FC<CondominiumWebhookConfigProps> = ({ condoId }) => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [existingId, setExistingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchWebhook = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('condominium_webhooks')
                    .select('*')
                    .eq('condominium_id', condoId)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
                    throw error;
                }

                if (data) {
                    setExistingId(data.id);
                    setWebhookUrl(data.target_url);
                    setSecretKey(data.secret_key);
                    setIsActive(data.is_active);
                } else {
                    // Generate a default secret key for new setups
                    setSecretKey('whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
                }
            } catch (err) {
                console.error("Failed to load webhook config", err);
            } finally {
                setLoading(false);
            }
        };

        if (condoId) {
            fetchWebhook();
        }
    }, [condoId]);

    const handleSave = async () => {
        if (!webhookUrl.trim() && existingId) {
            // Delete if they clear the URL and save
            await handleDelete();
            return;
        }

        if (!webhookUrl.trim()) {
            alert("A URL do Webhook não pode estar vazia para salvar.");
            return;
        }

        setSaving(true);
        try {
            if (existingId) {
                // Update
                const { error } = await supabase
                    .from('condominium_webhooks')
                    .update({
                        target_url: webhookUrl,
                        secret_key: secretKey,
                        is_active: isActive,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingId);

                if (error) throw error;
                alert("Configuração de Webhook atualizada com sucesso.");
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('condominium_webhooks')
                    .insert({
                        condominium_id: condoId,
                        target_url: webhookUrl,
                        secret_key: secretKey,
                        is_active: isActive
                    })
                    .select()
                    .single();

                if (error) throw error;
                setExistingId(data.id);
                alert("Webhook configurado com sucesso.");
            }
        } catch (err: any) {
            console.error(err);
            alert("Erro ao salvar webhook: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existingId) return;
        if (!confirm('Remover esta configuração de Webhook? O sistema local parará de receber notificações.')) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('condominium_webhooks')
                .delete()
                .eq('id', existingId);

            if (error) throw error;
            setExistingId(null);
            setWebhookUrl('');
            setIsActive(false);
            // Default new secret
            setSecretKey('whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        } catch (err: any) {
            console.error(err);
            alert("Erro ao remover: " + err.message);
        } finally {
            setSaving(false);
        }
    }

    const generateNewSecret = () => {
        if (confirm('Gerar nova chave secreta invalida assinaturas usando a chave atual. Continuar?')) {
            setSecretKey('whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        }
    };

    if (loading) {
        return <div className="text-slate-400 py-10 text-center">Carregando configurações do Hub...</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 mb-12 shadow-2xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                        <Link2 className="text-primary-400" />
                        Saída de Dados (Webhooks)
                    </h2>
                    <p className="text-slate-400 max-w-2xl">
                        O Hub SaFE pode notificar o seu próprio sistema de portaria (ou ERP terceiro) sempre que o status de uma entrega mudar.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400">Status:</span>
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className={`w-14 h-8 rounded-full relative transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${isActive ? 'right-1' : 'left-1'}`} />
                    </button>
                    <span className={`text-sm font-bold uppercase ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                            Endpoint (URL de Destino)
                        </label>
                        <input
                            type="url"
                            placeholder="https://seu-sistema.com/api/webhooks/safe"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                        />
                        <p className="text-xs text-slate-500 mt-2">Nós enviaremos requisições POST para esta URL com o payload do evento.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                            Chave Secreta de Assinatura
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    readOnly
                                    value={secretKey}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-300 font-mono text-sm focus:outline-none opacity-80"
                                />
                            </div>
                            <button
                                onClick={generateNewSecret}
                                title="Gerar Nova Chave"
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 rounded-xl transition-colors"
                            >
                                <RefreshCcw size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Use esta chave para validar a assinatura SHA256 do webhook (Header `x-safe-signature`).</p>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-4 relative z-10">
                {existingId && (
                    <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors font-bold text-sm"
                    >
                        <Trash2 size={16} />
                        Remover Configuração
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-colors font-bold disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
            </div>
        </motion.div>
    );
};
