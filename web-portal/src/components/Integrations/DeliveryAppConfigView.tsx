import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Key, ShieldCheck } from 'lucide-react';

export const DeliveryAppConfigView: React.FC = () => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [apiKey] = useState('zhub_live_8f92a1b9e0...');
    const [isBiometricProvider, setIsBiometricProvider] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => setSaving(false), 800);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-10">
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-display font-bold text-white mb-2"
                >
                    Portal do Parceiro Logístico
                </motion.h1>
                <p className="text-slate-400">
                    Gerencie a conectividade do seu App com o Zeeo Hub. Envie rotas, sincronize entregadores e gerencie biometria.
                </p>
            </div>

            {/* API Keys */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:p-8"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                        <Key className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Chaves de API</h2>
                        <p className="text-slate-400 text-sm">Autentique as requisições do seu backend para a Zeeo.</p>
                    </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between mb-4">
                    <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chave de Produção</div>
                        <div className="font-mono text-slate-300 tracking-wider">
                            {apiKey}
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
                        Rotacionar Chave
                    </button>
                </div>
            </motion.div>

            {/* Provedor Biométrico */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:p-8"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                        <ShieldCheck className="text-emerald-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white">Provedor de Biometria (Inbound)</h2>
                        <p className="text-slate-400 text-sm">Permita que os Condomínios Zeeo validem a face de entregadores na sua base cadastral.</p>
                    </div>
                    <div>
                        <motion.button
                            onClick={() => setIsBiometricProvider(!isBiometricProvider)}
                            className={`w-14 h-7 rounded-full relative cursor-pointer flex items-center px-1 transition-colors ${isBiometricProvider ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                            <motion.div
                                layout
                                className="w-5 h-5 bg-white rounded-full shadow-sm"
                                animate={{ x: isBiometricProvider ? 28 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        </motion.button>
                    </div>
                </div>

                {isBiometricProvider && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                        <p className="font-semibold mb-1">Integração Ativa!</p>
                        <p>O Zeeo Hub enviará requisições POST para o seu Endpoint Biométrico quando um entregador tentar acessar um condomínio parceiro usando reconhecimento facial.</p>
                    </div>
                )}
            </motion.div>

            {/* Webhooks Outbound */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 lg:p-8"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-xl">
                        <Link2 className="text-fuchsia-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Eventos e Webhooks</h2>
                        <p className="text-slate-400 text-sm">Receba atualizações de status quando o entregador passar pela catraca.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Endpoint URL Receptora</label>
                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://api.seuapp.com.br/webhooks/zeeo"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <input type="checkbox" defaultChecked className="rounded bg-slate-900 border-slate-700 text-fuchsia-500 focus:ring-fuchsia-500" />
                            Entrada Registrada (gate_entered)
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <input type="checkbox" defaultChecked className="rounded bg-slate-900 border-slate-700 text-fuchsia-500 focus:ring-fuchsia-500" />
                            Saída Registrada (gate_exited)
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="flex justify-end mt-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-primary-600 hover:from-blue-500 hover:to-primary-500 shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </div>
    );
};
