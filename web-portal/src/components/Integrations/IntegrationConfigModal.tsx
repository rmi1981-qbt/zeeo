import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Link2, Activity } from 'lucide-react';
import { Integration } from '../../pages/dashboard/IntegrationsHub';
import { CondominiumWebhookConfig } from './CondominiumWebhookConfig';
import { LocationTagsConfig } from './LocationTagsConfig';

interface IntegrationConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    integration: Integration | null;
    condoId: string | null;
    currentView: 'hub' | 'delivery' | 'condo';
}

// Map endpoints/capabilities to integrations (Mocking Backend Configs)
const CAPABILITIES_MAP: Record<string, { id: string, name: string, description: string, reqWebhook?: boolean, defaultOn: boolean }[]> = {
    'ifood': [
        { id: 'recv_deliveries', name: 'Receber Entregas (Inbound)', description: 'Aceitar injeção automática de entregas preditivas do app solicitante.', defaultOn: true },
        { id: 'sync_gps', name: 'Sincronizar GPS da Rota', description: 'Receber atualizações de localização para calcular ETA na portaria.', defaultOn: true },
        { id: 'biometrics_check', name: 'Biometria Federada', description: 'Permitir que o totem consulte a foto do entregador na base deste parceiro.', defaultOn: true },
        { id: 'geo_index_sync', name: 'Sincronizar Geo-Index (Regras e Perímetro)', description: 'Compartilhar mapas e políticas do condomínio para exibir rotas e regras diretamente no app do entregador.', defaultOn: true }
    ],
    'uber': [
        { id: 'recv_deliveries', name: 'Sincronia de Entregas Flash', description: 'Aceitar injeção automática de corridas na portaria.', defaultOn: true },
        { id: 'sync_plates', name: 'Sincronia de Placas', description: 'Receber placa do veículo para autorização automática veicular.', defaultOn: true },
        { id: 'biometrics_check', name: 'Biometria Federada', description: 'Permitir que o totem consulte a face do prestador na base Uber.', defaultOn: true },
        { id: 'geo_index_sync', name: 'Sincronizar Geo-Index (Regras e Perímetro)', description: 'Compartilhar mapas e políticas do condomínio para exibir rotas e regras diretamente no app do entregador.', defaultOn: true }
    ],
    'mercadolivre': [
        { id: 'recv_deliveries', name: 'Aviso Prévio de Rotas', description: 'Receber a lista de pacotes/rotas destinadas ao condomínio no dia.', defaultOn: true },
        { id: 'batch_auth', name: 'Autorização em Lote (Fast-Track)', description: 'Liberar acesso automático da van com base em placa e rota cadastrada.', defaultOn: false },
        { id: 'geo_index_sync', name: 'Sincronizar Geo-Index (Regras e Perímetro)', description: 'Compartilhar mapas e políticas do condomínio com a roteirização do Mercado Livre.', defaultOn: true }
    ],
    'app_condominio': [
        { id: 'send_notifs', name: 'Enviar Notificações (Push)', description: 'Disparar alertas no app quando uma entrega chegar.', defaultOn: true, reqWebhook: true },
        { id: 'recv_approvals', name: 'Receber Aprovação/Negação', description: 'Processar a resposta do morador originada a partir do app.', defaultOn: true }
    ],
    'whatsapp': [
        { id: 'send_messages', name: 'Ativar WhatsApp Bot', description: 'Disparar mensagens ativas para moradores sem app instalado.', defaultOn: true, reqWebhook: true },
        { id: 'fallback_approval', name: 'Fallback Reforçado', description: 'Solicitar confirmação caso a placa ou biometria falhe a nível local.', defaultOn: true }
    ],
    'erp': [
        { id: 'sync_residents', name: 'Sincronizar Banco de Moradores', description: 'Manter a lista de blocos, unidades e CPFs espelhada com o ERP local.', defaultOn: true, reqWebhook: true },
        { id: 'gate_events', name: 'Eventos de Portaria', description: 'Avisar o ERP quando um processo de entrada ou saída for concluído no Zeeo.', defaultOn: false, reqWebhook: true }
    ],
    'intelbras': [
        { id: 'logical_open', name: 'Abertura Lógica de Catracas', description: 'Disparar acionamento de relê via rede local em totens.', defaultOn: true, reqWebhook: true },
        { id: 'cctv_sync', name: 'Sincronia CCTV', description: 'Gravar frames das câmeras em eventos sensíveis do gatekeeper.', defaultOn: false }
    ]
};

export const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({ isOpen, onClose, integration, condoId, currentView }) => {
    const [capabilities, setCapabilities] = useState<{ [key: string]: boolean }>({});
    const [saving, setSaving] = useState(false);
    const [connectionMode, setConnectionMode] = useState<'hub_partner' | 'direct'>('hub_partner');
    useEffect(() => {
        if (integration && isOpen) {
            const availableCaps = CAPABILITIES_MAP[integration.id] || [];
            const initialCaps: { [key: string]: boolean } = {};
            availableCaps.forEach(cap => {
                initialCaps[cap.id] = cap.defaultOn;
            });
            setCapabilities(initialCaps);

            // Reset connection mode
            setConnectionMode('hub_partner');
        }
    }, [integration, isOpen]);

    const handleSave = async () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            onClose();
        }, 800);
    };

    if (!isOpen || !integration) return null;

    const availableCaps = CAPABILITIES_MAP[integration.id] || [];
    const hasWebhooks = availableCaps.some(c => c.reqWebhook);
    const isHybridComm = integration.type === 'local_system' || integration.type === 'local_communication';

    // Webhooks should only be configured if Hub Admin assigns them globally, or Condo assigns them directly (via direct P2P).
    const showWebhooks = hasWebhooks && (currentView === 'hub' || (currentView === 'condo' && connectionMode === 'direct'));

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center border ${integration.borderColor}`}>
                                {integration.icon}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    Configurar: <span className="text-primary-400">{integration.name}</span>
                                </h2>
                                <p className="text-sm text-slate-400">Controle granular de APIs, Webhooks e Permissões</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
                        {integration.id === 'location_tags' ? (
                            <LocationTagsConfig />
                        ) : (
                            <>
                                {/* Tipo de Conexão Section (Hybrid Comms for Condos) */}
                                {currentView === 'condo' && isHybridComm && (
                                    <div className="mb-8 p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                        <h3 className="text-lg font-bold text-white mb-2">Modelo de Conexão</h3>
                                        <p className="text-sm text-slate-400 mb-6">Escolha como o seu condomínio se conectará a este serviço.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div
                                                onClick={() => setConnectionMode('hub_partner')}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${connectionMode === 'hub_partner' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${connectionMode === 'hub_partner' ? 'border-blue-500' : 'border-slate-500'}`}>
                                                        {connectionMode === 'hub_partner' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                                    </div>
                                                    <h4 className="font-bold text-slate-200">Usar Parceiro Zeeo (Centralizado)</h4>
                                                </div>
                                                <p className="text-xs text-slate-400 pl-7">Conexão simplificada e homologada através do Zeeo Hub. Requer apenas identificação básica.</p>
                                            </div>

                                            <div
                                                onClick={() => setConnectionMode('direct')}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${connectionMode === 'direct' ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${connectionMode === 'direct' ? 'border-blue-500' : 'border-slate-500'}`}>
                                                        {connectionMode === 'direct' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                                    </div>
                                                    <h4 className="font-bold text-slate-200">Conexão Própria (Ponta a Ponta)</h4>
                                                </div>
                                                <p className="text-xs text-slate-400 pl-7">Para condomínios que possuem seus próprios contratos e provedores técnicos independentes da Zeeo.</p>
                                            </div>
                                        </div>

                                        {connectionMode === 'hub_partner' && (
                                            <div className="mt-6 pt-6 border-t border-slate-800">
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Identificador do Condomínio no Parceiro</label>
                                                <input type="text" placeholder={integration.id === 'whatsapp' ? '+55 (11) 99999-9999' : 'Ex: ID do Condomínio ou CNPJ'} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                                                <p className="text-xs text-slate-500 mt-2">Você utilizará a conexão estabelecida pelo Hub Zeeo de forma transparente.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Capabilities Section */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Activity className="text-blue-400" size={20} />
                                        <h3 className="text-lg font-bold text-slate-200">Funcionalidades Ativas</h3>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-6">Ative ou desative capacidades específicas que deseja receber e enviar para este provedor.</p>

                                    <div className="space-y-3">
                                        {availableCaps.length > 0 ? (
                                            availableCaps.map(cap => (
                                                <div key={cap.id} className="flex items-start justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                                                    <div className="pr-8">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-semibold text-slate-200">{cap.name}</h4>
                                                            {cap.reqWebhook && (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                                                                    {connectionMode === 'direct' ? 'Requer Webhook Local' : (isHybridComm ? 'Webhook Centralizado No Hub' : 'Requer Webhook')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-400">{cap.description}</p>
                                                    </div>

                                                    <div className="pt-2">
                                                        <div
                                                            onClick={() => setCapabilities(prev => ({ ...prev, [cap.id]: !prev[cap.id] }))}
                                                            className="w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer flex items-center px-1 transition-colors"
                                                            style={{ backgroundColor: capabilities[cap.id] ? '#3b82f6' : '#334155' }}
                                                        >
                                                            <motion.div
                                                                layout
                                                                className="w-4 h-4 bg-white rounded-full shadow-sm"
                                                                animate={{
                                                                    x: capabilities[cap.id] ? 24 : 0
                                                                }}
                                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-500">
                                                Nenhuma capacidade configurável reportada para esta integração.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Configurações Locais / Webhooks Section */}
                                {showWebhooks && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-4 border-t border-slate-800 pt-8">
                                            <Link2 className="text-emerald-400" size={20} />
                                            <h3 className="text-lg font-bold text-slate-200">
                                                Roteamento (Webhooks da Conexão {currentView === 'hub' ? 'Global' : 'Ponta a Ponta'})
                                            </h3>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-6">Esta integração requer que enviemos dados (Outbound). Configure as chaves oficiais e destino em sua infraestrutura.</p>

                                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                            {condoId && <CondominiumWebhookConfig condoId={condoId} />}

                                            <div className="mt-8 border-t border-slate-800 pt-6">
                                                <h4 className="text-md font-bold text-slate-200 mb-4">Chaves de Acesso da API do Provedor</h4>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                                                        <input type="password" placeholder="••••••••••••••••••••••••" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-300 mb-2">Client Secret / Secret Key</label>
                                                        <input type="password" placeholder="••••••••••••••••••••••••" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-primary-600 hover:from-blue-500 hover:to-primary-500 shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="ml-2">Aplicando...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Salvar Configuração</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
