import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity, CheckCircle2, ShieldCheck, AlertCircle,
    ArrowUpRight, RefreshCw, BarChart3
} from 'lucide-react';
const HubMonitoring: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
    // Mock API Status
    const apiStatus = [
        { name: 'Gateway Recebimento', status: 'operational', uptime: '99.9%', latency: '45ms' },
        { name: 'Motor de Preditiva', status: 'operational', uptime: '99.9%', latency: '120ms' },
        { name: 'Identificação Facial (Edge)', status: 'degraded', uptime: '98.5%', latency: '450ms' },
        { name: 'Webhooks (Condomínio)', status: 'operational', uptime: '99.8%', latency: '85ms' },
    ];

    // Mock Recent Logs
    const recentLogs = [
        { id: 1, type: 'success', source: 'iFood', message: 'Entrega preditiva injetada com sucesso', time: 'Há 2 min' },
        { id: 2, type: 'success', source: 'Biometria', message: 'Reconhecimento facial positivo (Motorista: João S.)', time: 'Há 5 min' },
        { id: 3, type: 'error', source: 'ERP Local', message: 'Timeout na tentativa de sincronização de morador', time: 'Há 12 min' },
        { id: 4, type: 'success', source: 'WhatsApp', message: 'Morador confirmou recebimento (Apto 52B)', time: 'Há 15 min' },
        { id: 5, type: 'success', source: 'iFood', message: 'Entrega preditiva injetada com sucesso', time: 'Há 22 min' },
    ];

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative bg-slate-950">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-display font-bold text-white mb-2 tracking-tight flex items-center gap-3"
                        >
                            Monitoramento do <span className="text-blue-400">Hub</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-slate-400"
                        >
                            Acompanhe em tempo real a saúde, volumetria e status das integrações conectadas ao condomínio.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700/50 backdrop-blur-sm"
                    >
                        {(['today', 'week', 'month'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${timeRange === range
                                    ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {range === 'today' ? 'Hoje' : range === 'week' ? '7 Dias' : '30 Dias'}
                            </button>
                        ))}
                    </motion.div>
                </div>

                {/* Dashboard Stats Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                >
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3 className="text-slate-400 font-medium">Eventos de Integração</h3>
                        </div>
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl font-bold text-white">1,242</h2>
                            <div className="flex items-center text-emerald-400 text-sm font-medium mb-1">
                                <ArrowUpRight size={16} className="mr-1" />
                                12%
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-slate-400 font-medium">Acessos Fast-pass</h3>
                        </div>
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl font-bold text-white">498</h2>
                            <div className="flex items-center text-emerald-400 text-sm font-medium mb-1">
                                <ArrowUpRight size={16} className="mr-1" />
                                5%
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-slate-400 font-medium">Falhas de Biometria</h3>
                        </div>
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl font-bold text-white">13</h2>
                            <div className="flex items-center text-rose-400 text-sm font-medium mb-1">
                                <ArrowUpRight size={16} className="mr-1" />
                                2%
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                <RefreshCw size={24} />
                            </div>
                            <h3 className="text-slate-400 font-medium">Taxa de Conversão</h3>
                        </div>
                        <div className="flex items-end gap-3">
                            <h2 className="text-4xl font-bold text-white">92%</h2>
                            <div className="flex items-center text-emerald-400 text-sm font-medium mb-1">
                                <ArrowUpRight size={16} className="mr-1" />
                                1.5%
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - System Health */}
                    <div className="lg:col-span-1 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Activity className="text-primary-500" size={20} />
                                    Saúde do Hub
                                </h2>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Operacional
                                </span>
                            </div>

                            <div className="space-y-4">
                                {apiStatus.map((service, idx) => (
                                    <div key={idx} className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-semibold text-slate-200">{service.name}</span>
                                            {service.status === 'operational' ? (
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                            ) : (
                                                <AlertCircle size={16} className="text-amber-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>Uptime: <span className="text-slate-300 ml-1">{service.uptime}</span></span>
                                            <span>Latência: <span className="text-slate-300 ml-1">{service.latency}</span></span>
                                        </div>
                                        {/* Progress Bar mapped roughly to latency for visual flair */}
                                        <div className="w-full h-1 bg-slate-800 rounded-full mt-3 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${service.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                style={{ width: service.status === 'operational' ? '92%' : '45%' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column - Top Volume & Logs */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <BarChart3 className="text-blue-500" size={20} />
                                    Últimos Eventos Inbound
                                </h2>
                                <button className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                    Ver Todos
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800">
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Origem</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mensagem</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Tempo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {recentLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-800/20 transition-colors group">
                                                <td className="py-4 px-4">
                                                    {log.type === 'success' ? (
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                                            <CheckCircle2 size={16} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                                                            <AlertCircle size={16} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                        {log.source}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-sm text-slate-300 font-medium">
                                                    {log.message}
                                                </td>
                                                <td className="py-4 px-4 text-sm text-slate-500 text-right whitespace-nowrap">
                                                    {log.time}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HubMonitoring;
