import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2, Code2, Terminal, BookOpen } from 'lucide-react';

interface ApiDocumentationModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubProviderKey?: string;
}

export const ApiDocumentationModal: React.FC<ApiDocumentationModalProps> = ({ isOpen, onClose, hubProviderKey = '<SUA_API_KEY>' }) => {
    const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
    const [activeEndpoint, setActiveEndpoint] = useState<'create_delivery' | 'send_approval' | 'check_in_qr' | 'update_location'>('send_approval');

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
    };

    const endpoints = {
        'send_approval': {
            title: 'Enviar Aprovação do Morador',
            method: 'POST',
            path: '/hub/webhook/approval',
            desc: 'Para hubs parceiros ou apps de condomínio. Dispare este webhook para notificar o Zeeo quando o morador autorizar ou negar a entrada pelo seu app/whatsapp.',
            payload: `{
  "delivery_id": "uuid-da-entrega-recebida-via-webhook",
  "decision": "authorized", // ou "denied"
  "channel": "whatsapp", // identificador do canal
  "actor_id": "cpf-ou-id-morador", // opcional
  "notes": "Aprovado via mensagem" // opcional
}`,
            curl: `curl -X POST https://api.zeeo.com.br/hub/webhook/approval \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${hubProviderKey}" \\
  -d '{
    "delivery_id": "123e4567-e89b-12d3",
    "decision": "authorized",
    "channel": "app_condominio"
  }'`
        },
        'create_delivery': {
            title: 'Injetar Nova Entrega (Inbound)',
            method: 'POST',
            path: '/hub/inbound/{provider}/delivery',
            desc: 'Submete uma nova entrega preditiva para a portaria. O `{ provider }` deve ser exatamente o nome configurado na sua plataforma.',
            payload: `{
        "condo_id": "uuid-do-condominio",
            "target_unit": "A-12",
                "driver_name": "João Silva",
                    "vehicle_plate": "ABC1234",
                        "eta_mins": 10,
                            "driver_lat": -23.5505,
                                "driver_lng": -46.6333
    } `,
            curl: `curl -X POST https://api.zeeo.com.br/hub/inbound/meu_app/delivery \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${hubProviderKey}" \\
  -d '{
    "condo_id": "123e4567-e89b-12d3",
    "target_unit": "A-12",
    "driver_name": "João Silva"
  }'`
        },
        'update_location': {
            title: 'Atualizar Localização (GPS)',
            method: 'POST',
            path: '/hub/inbound/{provider}/location/{delivery_id}',
            desc: 'Atualiza em tempo real a posição geográfica do entregador. Permite cálculo de proximidade e alertas para a portaria.',
            payload: `{
  "driver_lat": -23.5510,
  "driver_lng": -46.6340
}`,
            curl: `curl -X POST https://api.zeeo.com.br/hub/inbound/meu_app/location/123e4567-e89b-12d3 \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${hubProviderKey}" \\
  -d '{
    "driver_lat": -23.5510,
    "driver_lng": -46.6340
  }'`
        },
        'check_in_qr': {
            title: 'Validação de QR Code (Check-in)',
            method: 'POST',
            path: '/hub/check-in/qr',
            desc: 'Aprova a entrada física de um entregador ao ler o QR Code ou digitar o Token gerado pelo app Zeeo na portaria. Converte automaticamente a entrega do status "authorized" para "inside".',
            payload: `{
  "condo_id": "uuid-do-condominio",
  "qr_code_token": "XB9PQ2"
}`,
            curl: `curl -X POST https://api.zeeo.com.br/hub/check-in/qr \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${hubProviderKey}" \\
  -d '{
    "condo_id": "123e4567-e89b-12d3",
    "qr_code_token": "XB9PQ2"
  }'`
        }
    };

    const activeData = endpoints[activeEndpoint];

    if (!isOpen) return null;

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
                    className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex flex-col items-center justify-center">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Documentação da API do Hub</h2>
                                <p className="text-xs text-slate-400">Integre seus sistemas de aprovação e logística ao Zeeo</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg hover:bg-slate-800">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex flex-1 overflow-hidden">

                        {/* Sidebar (Endpoints) */}
                        <div className="w-1/3 border-r border-slate-800 bg-slate-900/30 overflow-y-auto">
                            <div className="p-4 space-y-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 ml-2">Endpoints</h3>

                                <button
                                    onClick={() => setActiveEndpoint('send_approval')}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${activeEndpoint === 'send_approval' ? 'bg-blue-900/20 border-blue-500/50 text-blue-100' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">POST</span>
                                    </div>
                                    <div className="font-semibold text-sm">Enviar Aprovação</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1 w-full truncate">/hub/webhook/approval</div>
                                </button>

                                <button
                                    onClick={() => setActiveEndpoint('create_delivery')}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${activeEndpoint === 'create_delivery' ? 'bg-blue-900/20 border-blue-500/50 text-blue-100' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">POST</span>
                                    </div>
                                    <div className="font-semibold text-sm">Injetar Entrega</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1 w-full truncate">/hub/inbound...</div>
                                </button>

                                <button
                                    onClick={() => setActiveEndpoint('update_location')}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${activeEndpoint === 'update_location' ? 'bg-blue-900/20 border-blue-500/50 text-blue-100' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">POST</span>
                                    </div>
                                    <div className="font-semibold text-sm">Atualizar GPS</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1 w-full truncate">/hub/inbound...</div>
                                </button>

                                <button
                                    onClick={() => setActiveEndpoint('check_in_qr')}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${activeEndpoint === 'check_in_qr' ? 'bg-blue-900/20 border-blue-500/50 text-blue-100' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">POST</span>
                                    </div>
                                    <div className="font-semibold text-sm">Validar QR Code</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1 w-full truncate">/hub/check-in/qr</div>
                                </button>
                            </div>

                            <div className="p-4 mt-6">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-2">Autenticação</h3>
                                <p className="text-xs text-slate-400 leading-relaxed p-2">
                                    Todas as requisições para a API do Hub exigem o header <code className="bg-slate-800 text-pink-400 px-1 py-0.5 rounded font-mono">x-api-key</code> contendo a sua chave gerada pelo Zeeo.
                                </p>
                            </div>
                        </div>

                        {/* Main Doc Content */}
                        <div className="w-2/3 flex flex-col overflow-y-auto bg-slate-950">
                            <div className="p-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono text-xs font-bold tracking-wider">
                                        {activeData.method}
                                    </span>
                                    <span className="font-mono text-slate-300 text-sm">
                                        {activeData.path}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-4">{activeData.title}</h1>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                    {activeData.desc}
                                </p>

                                <div className="space-y-6">
                                    {/* JSON Payload Block */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                <Code2 size={16} /> JSON Payload
                                            </h3>
                                            <button
                                                onClick={() => handleCopy(activeData.payload, 'payload')}
                                                className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                {copiedStates['payload'] ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                {copiedStates['payload'] ? 'Copiado!' : 'Copiar'}
                                            </button>
                                        </div>
                                        <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 overflow-x-auto relative group">
                                            <pre className="text-xs text-slate-300 font-mono leading-relaxed">
                                                <code>{activeData.payload}</code>
                                            </pre>
                                        </div>
                                    </div>

                                    {/* cURL Block */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2 mt-8">
                                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                <Terminal size={16} /> Exemplo (cURL)
                                            </h3>
                                            <button
                                                onClick={() => handleCopy(activeData.curl, 'curl')}
                                                className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                {copiedStates['curl'] ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                {copiedStates['curl'] ? 'Copiado!' : 'Copiar'}
                                            </button>
                                        </div>
                                        <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 overflow-x-auto relative group">
                                            <pre className="text-xs text-blue-300 font-mono leading-relaxed">
                                                <code>{activeData.curl}</code>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div >
            </div >
        </AnimatePresence >
    );
};
