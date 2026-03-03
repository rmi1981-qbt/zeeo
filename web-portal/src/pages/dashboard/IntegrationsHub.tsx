import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Store, Zap, ShieldCheck, Video,
    Smartphone, AlertCircle, Search,
    ChevronRight, CheckCircle2, Lock
} from 'lucide-react';

// Mock data for integrations
const INTEGRATIONS = [
    {
        id: 'ifood',
        name: 'iFood',
        category: 'Delivery Hub',
        description: 'Sincronização de pedidos e biometria preditiva de entregadores.',
        status: 'connected',
        icon: <Store size={32} className="text-red-500" />,
        color: 'from-red-500/20 to-rose-600/20',
        borderColor: 'border-red-500/30',
        features: ['Webhooks de Pedidos', 'Biometria Federada', 'Predição de Chegada']
    },
    {
        id: 'mercadolivre',
        name: 'Mercado Livre',
        category: 'E-commerce Hub',
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
        category: 'Mobilidade',
        description: 'Conexão com corridas de moradores para liberação automática de portões.',
        status: 'configuring',
        icon: <Smartphone size={32} className="text-white" />,
        color: 'from-slate-100/10 to-slate-400/10',
        borderColor: 'border-slate-400/30',
        features: ['Sincronia de Placas', 'Geofencing Preditivo', 'Checkout Automático']
    },
    {
        id: 'intelbras',
        name: 'Intelbras / Hikvision',
        category: 'Hardware Legado',
        description: 'Integração direta com o sistema de catracas e cancelas do condomínio.',
        status: 'available',
        icon: <Video size={32} className="text-emerald-500" />,
        color: 'from-emerald-500/20 to-teal-600/20',
        borderColor: 'border-emerald-500/30',
        features: ['Abertura Lógica', 'Sincronia CCTV']
    }
];

import { useAuth } from '../../contexts/AuthContext';
import { CondominiumWebhookConfig } from '../../components/Integrations/CondominiumWebhookConfig';
import { ApiDocumentationModal } from '../../components/Integrations/ApiDocumentationModal';

const IntegrationsHub: React.FC = () => {
    const { selectedCondo } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isApiDocOpen, setIsApiDocOpen] = useState(false);

    const filteredIntegrations = INTEGRATIONS.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative bg-slate-950">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight"
                        >
                            Hub de <span className="text-primary-400">Integrações</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-slate-400 max-w-2xl"
                        >
                            Conecte o Zeeo diretamente às APIs logísticas, de mobilidade e e-commerce para habilitar predição de chegada e biometria federada.
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
                            className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 backdrop-blur-sm transition-all mb-4"
                        />

                        <button
                            onClick={() => setIsApiDocOpen(true)}
                            className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/30 text-slate-300 hover:text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
                        >
                            Ver Documentação API
                        </button>
                    </motion.div>
                </div>

                {/* Webhook Config Form */}
                {selectedCondo && (
                    <CondominiumWebhookConfig condoId={selectedCondo} />
                )}

                {/* Dashboard Stats Panel (Mock) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
                >
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Eventos Sincronizados Hoje</p>
                            <p className="text-3xl font-bold text-white mt-1">142</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary-500/20 text-primary-400 flex items-center justify-center">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Acessos Fast-pass Verificados</p>
                            <p className="text-3xl font-bold text-white mt-1">98</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <AlertCircle size={28} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Falhas de Biometria (Bloqueados)</p>
                            <p className="text-3xl font-bold text-white mt-1">3</p>
                        </div>
                    </div>
                </motion.div>

                {/* Integrations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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

                                <h3 className="text-2xl font-bold text-white mb-2">{integration.name}</h3>
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
                                    {integration.status === 'connected' ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                                                <div className="flex items-center space-x-3">
                                                    <Lock size={16} className="text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-300">Exigir Biometria Preditiva</span>
                                                </div>
                                                <div className="w-11 h-6 bg-primary-600 rounded-full relative cursor-pointer flex items-center px-1">
                                                    <div className="w-4 h-4 bg-white rounded-full absolute right-1"></div>
                                                </div>
                                            </div>
                                            <button className="w-full py-3 rounded-xl font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
                                                Gerenciar Conexão
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 shadow-[0_0_20px_rgba(var(--primary-500),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-500),0.5)] transition-all flex items-center justify-center group">
                                            Autorizar Conexão
                                            <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* API Documentation Modal */}
            <ApiDocumentationModal
                isOpen={isApiDocOpen}
                onClose={() => setIsApiDocOpen(false)}
            />
        </div>
    );
};

export default IntegrationsHub;
