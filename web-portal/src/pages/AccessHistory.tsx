import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { History, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AccessLog {
    id: string;
    driver_name: string;
    platform: string;
    target_unit_label: string;
    status: string;
    authorized_method: string;
    authorized_by: string;
    created_at: string;
    updated_at: string;
}

const AccessHistory: React.FC = () => {
    const { selectedCondo } = useAuth();
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            if (!selectedCondo) return;
            setLoading(true);
            try {
                // Fetch deliveries that are in a terminal state or have events
                // For simplicity, we fetch all deliveries for the condo ordered by latest updated
                // We'll limit to 100 for this view initially
                const { data, error } = await supabase
                    .from('deliveries')
                    .select('id, driver_name, platform, unit, status, authorized_method, authorized_by, created_at, updated_at')
                    .eq('condo_id', selectedCondo)
                    .order('updated_at', { ascending: false })
                    .limit(100);

                if (error) throw error;

                setLogs(data.map((d: any) => ({
                    id: d.id,
                    driver_name: d.driver_name || 'Desconhecido',
                    platform: d.platform,
                    target_unit_label: d.unit || 'Portaria',
                    status: d.status,
                    authorized_method: d.authorized_method,
                    authorized_by: d.authorized_by,
                    created_at: d.created_at,
                    updated_at: d.updated_at
                })));
            } catch (err) {
                console.error("Error fetching access history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [selectedCondo]);

    const filteredLogs = logs.filter(log =>
        log.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.target_unit_label?.toLowerCase().includes(search.toLowerCase()) ||
        log.status?.toLowerCase().includes(search.toLowerCase())
    );

    const translateStatus = (status: string) => {
        const map: Record<string, string> = {
            'created': 'Criado',
            'approaching': 'Chegando',
            'at_gate': 'Na Portaria',
            'pending_authorization': 'Aguardando Morador',
            'authorized': 'Autorizado',
            'pre_authorized': 'Pré-autorizado',
            'denied': 'Negado',
            'rejected': 'Rejeitado',
            'inside': 'Dentro',
            'exited': 'Saiu',
            'completed': 'Finalizado'
        };
        return map[status] || status;
    };

    const translateMethod = (method: string) => {
        if (!method) return '-';
        const map: Record<string, string> = {
            'whatsapp': 'WhatsApp',
            'push': 'Push App',
            'phone_call': 'Ligação Telefônica',
            'manual': 'Ação Manual do Porteiro',
            'app_zeeo': 'App Zeo'
        };
        return map[method] || method;
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
            <Header />

            <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/concierge" className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <History className="text-primary-500" />
                                Histórico de Acessos
                            </h1>
                            <p className="text-slate-400 text-sm">Registro completo de entradas e saídas</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nome, unidade ou status..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors w-80 text-white"
                        />
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800/50 uppercase text-xs font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Data/Hora</th>
                                    <th className="px-6 py-4">Unidade</th>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Plataforma</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Método</th>
                                    <th className="px-6 py-4">Autorizador</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Caregando histórico...</td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Nenhum registro encontrado.</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                                                {new Date(log.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white">{log.target_unit_label}</td>
                                            <td className="px-6 py-4 text-slate-300">{log.driver_name}</td>
                                            <td className="px-6 py-4 text-slate-400 capitalize">{log.platform}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${['authorized', 'pre_authorized', 'completed', 'inside', 'exited'].includes(log.status) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    ['denied', 'rejected'].includes(log.status) ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                        'bg-slate-800 text-slate-400 border border-slate-700'
                                                    }`}>
                                                    {translateStatus(log.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">{translateMethod(log.authorized_method)}</td>
                                            <td className="px-6 py-4 font-medium text-slate-300">{log.authorized_by || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AccessHistory;
