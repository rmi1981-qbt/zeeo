import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Store, Zap, Video,
    Smartphone, Search,
    ChevronRight, CheckCircle2, Settings, X, BookOpen, ShieldAlert
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { ApiDocumentationModal } from '../../components/Integrations/ApiDocumentationModal';
import { IntegrationConfigModal } from '../../components/Integrations/IntegrationConfigModal';
import { CondoSharingConfig } from '../../components/Integrations/CondoSharingConfig';
import { DeliveryAppConfigView } from '../../components/Integrations/DeliveryAppConfigView';

export type IntegrationType = 'global_logistics' | 'global_biometrics' | 'local_system' | 'local_communication';

export interface Integration {
    id: string;
    name: string;
    category: string;
    type: IntegrationType;
    description: string;
    status: 'connected' | 'available' | 'configuring';
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    features: string[];
}

const INTEGRATIONS: Integration[] = [
    {
        id: 'erp',
        name: 'Sistema do Condomínio',
        category: 'Controle de Acesso / ERP',
        type: 'local_system',
        description: 'Sincronização de base de moradores e validação primária em fluxos de pré-autorização.',
        status: 'available',
        icon: <Store size={32} className="text-blue-500" />,
        color: 'from-blue-500/20 to-indigo-600/20',
        borderColor: 'border-blue-500/30',
        features: ['Sincronia de Moradores', 'Validação Primária', 'Eventos de Portaria']
    },
    {
        id: 'app_condominio',
        name: 'App do Condomínio',
        category: 'Comunicação',
        type: 'local_communication',
        description: 'Canal principal de comunicação com o morador (Push/Webhooks).',
        status: 'available',
        icon: <Smartphone size={32} className="text-purple-500" />,
        color: 'from-purple-500/20 to-fuchsia-600/20',
        borderColor: 'border-purple-500/30',
        features: ['Push Notifications', 'Aprovação in-app', 'Geração de QR Code Local']
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        category: 'Comunicação',
        type: 'local_communication',
        description: 'Canal secundário de comunicação e aprovação via chatbot.',
        status: 'available',
        icon: <Smartphone size={32} className="text-emerald-500" />,
        color: 'from-emerald-500/20 to-green-600/20',
        borderColor: 'border-emerald-500/30',
        features: ['Mensagens Ativas', 'Validação OTP', 'Fallback Reforçado']
    },
    {
        id: 'intelbras',
        name: 'Intelbras / Hikvision',
        category: 'Biometria de Entregadores',
        type: 'global_biometrics',
        description: 'Totens e câmeras para reconhecimento facial preditivo de entregadores.',
        status: 'available',
        icon: <Video size={32} className="text-teal-500" />,
        color: 'from-teal-500/20 to-cyan-600/20',
        borderColor: 'border-teal-500/30',
        features: ['Abertura Lógica', 'Sincronia CCTV', 'Ranking de Biometria']
    },
    {
        id: 'ifood',
        name: 'iFood',
        category: 'Delivery Hub',
        type: 'global_logistics',
        description: 'Sincronização de pedidos e biometria preditiva de entregadores federada.',
        status: 'connected',
        icon: <Store size={32} className="text-red-500" />,
        color: 'from-red-500/20 to-rose-600/20',
        borderColor: 'border-red-500/30',
        features: ['Webhooks de Pedidos', 'Biometria Federada (App Solicitante)', 'Predição de Chegada']
    },
    {
        id: 'mercadolivre',
        name: 'Mercado Livre',
        category: 'E-commerce Hub',
        type: 'global_logistics',
        description: 'Aviso prévio de rotas de entrega e fast-track para vans logísticas.',
        status: 'available',
        icon: <Zap size={32} className="text-yellow-400" />,
        color: 'from-yellow-400/20 to-amber-500/20',
        borderColor: 'border-yellow-400/30',
        features: ['Rastreio de Frota', 'Autorização em Lote', 'Logs de Veículo']
    },
    {
        id: 'uber',
        name: 'Uber',
        category: 'Mobilidade Hub',
        type: 'global_logistics',
        description: 'Conexão com corridas de moradores e entregas Flash.',
        status: 'configuring',
        icon: <Smartphone size={32} className="text-white" />,
        color: 'from-slate-100/10 to-slate-400/10',
        borderColor: 'border-slate-400/30',
        features: ['Sincronia de Placas', 'Geofencing Preditivo', 'Biometria Federada (App Solicitante)']
    }
];

type ViewMode = 'hub' | 'delivery' | 'condo';

const IntegrationsHub: React.FC = () => {
    const { selectedCondo, profile } = useAuth();
    const isSuperAdmin = profile?.is_platform_admin === true;

    // For now, default purely based on super admin. If not super admin, assume condo admin.
    const [currentView, setCurrentView] = useState<ViewMode>(isSuperAdmin ? 'hub' : 'condo');

    const [searchQuery, setSearchQuery] = useState('');
    const [isApiDocOpen, setIsApiDocOpen] = useState(false);
    const [selectedDocIntegration, setSelectedDocIntegration] = useState<Integration | null>(null);
    const [activeConfigModal, setActiveConfigModal] = useState<Integration | null>(null);
    const [activePriorityModal, setActivePriorityModal] = useState<Integration | null>(null);
    const [integrationsList, setIntegrationsList] = useState<Integration[]>(INTEGRATIONS);

    // Force condo view if user loses superadmin status
    React.useEffect(() => {
        if (!isSuperAdmin) {
            setCurrentView('condo');
        }
    }, [isSuperAdmin]);

    const ViewSwitcher = () => {
        if (!isSuperAdmin) return null;

        return (
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-2 mb-8 flex flex-wrap justify-center gap-2 relative z-20 overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setCurrentView('hub')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${currentView === 'hub' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <ShieldAlert size={18} />
                    Visão: Hub Admin
                </button>
                <button
                    onClick={() => setCurrentView('delivery')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${currentView === 'delivery' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <Smartphone size={18} />
                    Visão: App Delivery
                </button>
                <button
                    onClick={() => setCurrentView('condo')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${currentView === 'condo' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <Store size={18} />
                    Visão: Condomínio
                </button>
            </div>
        );
    };

    // Filter logic
    const filteredIntegrations = integrationsList.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase());

        if (currentView === 'condo' || currentView === 'hub') {
            return matchesSearch;
        }

        return false;
    });

    const toggleIntegrationStatus = (id: string, newStatus: 'connected' | 'available' | 'configuring') => {
        setIntegrationsList(prev => prev.map(int =>
            int.id === id ? { ...int, status: newStatus } : int
        ));
    };

    const renderIntegrationsGrid = () => (
        <>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 relative z-10">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight"
                    >
                        {currentView === 'hub' ? (
                            <>Zeeo <span className="text-primary-400">Hub</span> de Integrações</>
                        ) : (
                            <>Conexões do <span className="text-emerald-400">Condomínio</span></>
                        )}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-slate-400 max-w-2xl"
                    >
                        {currentView === 'hub' ?
                            'Gerencie os parceiros logísticos e e-commerce conectados na rede Zeeo globalmente.' :
                            'Conecte o seu condomínio aos parceiros da Zeeo para receber predições de chegada e habilitar fallback biométrico.'}
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative max-w-sm w-full"
                >
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar integrações..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 backdrop-blur-sm transition-all"
                    />
                </motion.div>
            </div>

            {currentView === 'condo' && <CondoSharingConfig />}

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10 mt-10">

                {filteredIntegrations.map((integration, index) => (
                    <motion.div
                        key={integration.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + (index * 0.1) }}
                        className={`relative overflow-hidden group bg-slate-900/40 backdrop-blur-xl border ${integration.borderColor} rounded-3xl hover:-translate-y-1 transition-all duration-300`}
                    >
                        {/* Color Glow */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${integration.color} rounded-full blur-[60px] opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />

                        <div className="p-8 relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`h-16 w-16 rounded-2xl border ${integration.borderColor} bg-slate-900/80 flex items-center justify-center shadow-lg`}>
                                    {integration.icon}
                                </div>

                                {/* Status Badge */}
                                {integration.status === 'connected' && (
                                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Conectado
                                    </div>
                                )}
                                {integration.status === 'available' && (
                                    <div className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                                        Disponível
                                    </div>
                                )}
                                {integration.status === 'configuring' && (
                                    <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                                        Em Configuração
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-2xl font-bold text-white mb-2">{integration.name}</h3>
                                <button
                                    onClick={() => {
                                        setSelectedDocIntegration(integration);
                                        setIsApiDocOpen(true);
                                    }}
                                    className="p-2 bg-slate-800/50 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 border border-slate-700 hover:border-blue-500/50 rounded-xl transition-all"
                                    title={`Documentação da API para ${integration.name}`}
                                >
                                    <BookOpen size={18} />
                                </button>
                            </div>
                            <p className="text-sm text-primary-300 font-medium mb-4">{integration.category}</p>

                            <p className="text-slate-400 mb-8 flex-1">
                                {integration.description}
                            </p>

                            {/* Features List */}
                            <ul className="space-y-3 mb-8">
                                {integration.features.map((feature, i) => (
                                    <li key={i} className="flex items-center text-sm text-slate-300">
                                        <CheckCircle2 size={16} className="text-emerald-500 mr-3 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {/* Action Buttons */}
                            <div className="mt-auto pt-4 border-t border-slate-800/50">
                                {(integration.type === 'local_system' || integration.type === 'local_communication') ? (
                                    // Ações para integrações focadas em ERP/Comunicação Híbrida
                                    <button
                                        onClick={() => setActiveConfigModal(integration)}
                                        className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center group"
                                    >
                                        <Settings size={18} className="mr-2" />
                                        {currentView === 'hub' ? 'Configurar Provedor Central' : 'Configurar Conexão'}
                                    </button>
                                ) : (
                                    // Ações para integrações globais e biométricas puros
                                    integration.status === 'connected' ? (
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => setActiveConfigModal(integration)}
                                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Settings size={16} />
                                                {currentView === 'hub' ? 'Gerenciar Hub API Keys' : 'Gerenciar Recebimento'}
                                            </button>
                                            {integration.type === 'global_biometrics' && currentView === 'condo' && (
                                                <button
                                                    onClick={() => setActivePriorityModal(integration)}
                                                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    Configurar Prioridade Biométrica
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleIntegrationStatus(integration.id, 'available')}
                                                className="w-full py-3 rounded-xl font-semibold text-rose-300 hover:text-white bg-slate-800/50 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/30 transition-colors"
                                            >
                                                Desconectar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => toggleIntegrationStatus(integration.id, 'connected')}
                                            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-[0_0_20px_rgba(var(--primary-500),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-500),0.5)] transition-all flex items-center justify-center group"
                                        >
                                            {currentView === 'hub' ? 'Habilitar Hub Global' : 'Autorizar Recebimento'}
                                            <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </>
    );

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative bg-slate-950">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <ViewSwitcher />

                {currentView === 'delivery' ? (
                    <DeliveryAppConfigView />
                ) : (
                    renderIntegrationsGrid()
                )}
            </div>

            <ApiDocumentationModal
                isOpen={isApiDocOpen}
                onClose={() => setIsApiDocOpen(false)}
                integrationName={selectedDocIntegration?.name}
            />
            {/* Modal de Configuração Avançada (Granular) */}
            <IntegrationConfigModal
                isOpen={!!activeConfigModal}
                onClose={() => setActiveConfigModal(null)}
                integration={activeConfigModal}
                condoId={selectedCondo}
                currentView={currentView}
            />

            {/* Modal de Prioridade Biométrica (Mock Visual) */}
            {activePriorityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl relative"
                    >
                        <button
                            onClick={() => setActivePriorityModal(null)}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2 pr-10">Ranking Biométrica Autônoma</h2>
                        <p className="text-slate-400 text-sm mb-6">Arraste as fontes ou ordene o nível de busca descentralizada para reconhecimento facial nas catracas/totens.</p>

                        <div className="space-y-3 mb-8">
                            {[
                                { name: '1º Minha Base In-house', desc: 'Sistema do Condomínio Local', color: 'blue' },
                                { name: '2º Hub de Apps Solicitantes', desc: 'Checar na do iFood/Uber via Token (Dinâmico)', color: 'emerald' },
                                { name: '3º Condomínios Parceiros (Pool)', desc: 'Buscar em condomínios da Zeeo na minha região', color: 'purple' },
                                { name: '4º Serpro / Governamental', desc: 'Checar identidade no CNH/RG Federado', color: 'slate' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 p-4 rounded-xl cursor-grab hover:border-slate-600 transition-colors">
                                    <div className="flex-col flex items-center gap-1 text-slate-500">
                                        <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                                        <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                                        <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-${item.color}-400 font-bold mb-0.5`}>{item.name}</div>
                                        <div className="text-xs text-slate-500">{item.desc}</div>
                                    </div>
                                    <div className="w-12 h-6 bg-primary-600 rounded-full relative cursor-pointer flex items-center px-1">
                                        <div className="w-4 h-4 bg-white rounded-full absolute right-1"></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setActivePriorityModal(null)}
                            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500"
                        >
                            Salvar Ranking
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default IntegrationsHub;
