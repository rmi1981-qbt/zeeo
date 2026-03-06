import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Store, Smartphone, Zap, CheckCircle2 } from 'lucide-react';
import { Integration } from '../../pages/dashboard/IntegrationsHub';

interface HubOverviewGraphProps {
    integrations: Integration[];
    onOpenConfig: (integration: Integration) => void;
    onToggleStatus: (id: string, currentStatus: "connected" | "available" | "configuring") => void;
}

export const HubOverviewGraph: React.FC<HubOverviewGraphProps> = ({ integrations, onOpenConfig, onToggleStatus }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<{ id: string; d: string; grad: string }[]>([]);

    // Quadrantes: Direita (Apps), Esquerda (Condos), Cima (Comunicação), Baixo (Segurança/Biometria)
    const deliveryNodes = integrations.filter(i => i.type === 'global_logistics');
    const condoNodes = integrations.filter(i => i.type === 'local_system' && i.id !== 'location_tags'); 
    const commNodes = integrations.filter(i => i.type === 'local_communication');
    const securityNodes = integrations.filter(i => i.type === 'global_biometrics' || i.id === 'location_tags');

    const updateLines = () => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const centerNode = containerRef.current.querySelector('.node-center');
        if (!centerNode) return;
        
        const centerRect = centerNode.getBoundingClientRect();
        const startX = centerRect.left + centerRect.width / 2 - containerRect.left;
        const startY = centerRect.top + centerRect.height / 2 - containerRect.top;

        const newLines: { id: string; d: string; grad: string }[] = [];
        
        const peripheralNodes = containerRef.current.querySelectorAll('.node-peripheral');
        peripheralNodes.forEach((node) => {
            const rect = node.getBoundingClientRect();
            const nodeX = rect.left + rect.width / 2 - containerRect.left;
            const nodeY = rect.top + rect.height / 2 - containerRect.top;
            
            // Generate a smooth curving line (bezier) linking to the center
            const dx = nodeX - startX;
            const dy = nodeY - startY;

            let cX1, cY1, cX2, cY2;
            let grad = 'url(#lineGradLeft)';

            // Dominant axis determines bezier control points and gradient
            if (Math.abs(dy) > Math.abs(dx)) {
                 // Vertical emphasis (Top/Bottom nodes)
                 cX1 = startX; cY1 = startY + dy / 2;
                 cX2 = nodeX; cY2 = nodeY - dy / 2;
                 grad = dy > 0 ? 'url(#lineGradBottom)' : 'url(#lineGradTop)';
            } else {
                 // Horizontal emphasis (Left/Right nodes)
                 cX1 = startX + dx / 2; cY1 = startY;
                 cX2 = nodeX - dx / 2; cY2 = nodeY;
                 grad = dx > 0 ? 'url(#lineGradRight)' : 'url(#lineGradLeft)';
            }

            const pathData = `M ${startX} ${startY} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${nodeX} ${nodeY}`;
            newLines.push({ id: node.id, d: pathData, grad: grad });
        });
        
        setLines(newLines);
    };

    useEffect(() => {
        updateLines();
        window.addEventListener('resize', updateLines);
        return () => window.removeEventListener('resize', updateLines);
    }, [integrations]);

    const CentralNode = () => (
        <div className="flex justify-center items-center w-full h-full">
            <motion.div 
                className="node-center relative z-20"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                {/* Glowing Background Pulses */}
                <div className="absolute inset-0 bg-primary-500 rounded-full blur-[80px] opacity-20 animate-pulse" />
                <motion.div 
                    className="absolute inset-0 border border-primary-500/30 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                
                {/* Core Capsule */}
                <div className="relative bg-slate-900 border-2 border-primary-500 shadow-[0_0_20px_rgba(var(--primary-500),0.4)] rounded-full p-6 flex flex-col items-center justify-center w-48 h-48 z-10">
                    <Shield size={40} className="text-primary-400 mb-2" />
                    <h2 className="text-lg font-black text-white tracking-widest text-center leading-tight">ZEEO<br/>CORE</h2>
                    <p className="text-[9px] text-primary-300/80 text-center mt-2 uppercase tracking-widest font-bold bg-primary-900/40 px-2.5 py-1 rounded-full border border-primary-500/20">
                        Motor de Decisão
                    </p>
                </div>
            </motion.div>
        </div>
    );

    const NodeCard = ({ integration, side }: { integration: Integration, side: 'left'|'right'|'bottom'|'top' }) => {
        const isConnected = integration.status === 'connected';
        
        return (
            <motion.div 
                id={`node-${integration.id}`}
                className="node-peripheral relative z-20 w-[280px] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl transition-all hover:border-slate-500/50 hover:shadow-2xl hover:-translate-y-1"
                initial={{ opacity: 0, x: side === 'left' ? -20 : side === 'right' ? 20 : 0, y: side === 'bottom' ? 20 : side === 'top' ? -20 : 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className={`h-1.5 w-full bg-gradient-to-r ${integration.color}`} />
                <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <div className={`p-1.5 rounded-lg bg-slate-800 border ${integration.borderColor} flex items-center justify-center transform scale-90 origin-top-left`}>
                            {integration.icon}
                        </div>
                        
                        {/* Status / Quick Toggle */}
                        <div 
                            onClick={() => onToggleStatus(integration.id, isConnected ? 'available' : 'connected')}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${isConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{isConnected ? 'ON' : 'OFF'}</span>
                        </div>
                    </div>
                    
                    <h3 className="font-bold text-slate-100 text-base leading-tight">{integration.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">{integration.description}</p>
                    
                    {/* Simplified Feature List for Overview */}
                    <div className="mt-3 mb-3 space-y-1">
                        {integration.features.slice(0,2).map((f, i) => (
                            <div key={i} className="flex items-center text-[11px] text-slate-300">
                                <CheckCircle2 size={12} className="text-emerald-500 mr-2 shrink-0" />
                                <span className="truncate">{f}</span>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => onOpenConfig(integration)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 mt-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-[12px] font-semibold text-slate-300 hover:text-white transition-colors"
                    >
                        <Settings size={14} />
                        Configurar Conexão
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="relative w-full h-[calc(100vh-160px)] min-h-[650px] flex items-center justify-center bg-slate-950 overflow-hidden" ref={containerRef}>
            
            {/* Background Grid Pattern (Cyber aesthetic) */}
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            {/* SVG Connecting Lines Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                    <linearGradient id="lineGradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="lineGradRight" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="lineGradBottom" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="lineGradTop" x1="50%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%" stopColor="#eab308" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    </linearGradient>
                </defs>
                
                {lines.map((line) => {
                    return (
                        <g key={line.id}>
                            {/* Base Path */}
                            <path 
                                d={line.d} 
                                fill="none" 
                                stroke="#1e293b" 
                                strokeWidth="3" 
                                strokeDasharray="6 6"
                            />
                            {/* Pulsing Data Path Overlay */}
                            <motion.path 
                                d={line.d} 
                                fill="none" 
                                stroke={line.grad}
                                strokeWidth="3" 
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Layout Grid - 4 Quadrants */}
            <div className="relative w-full h-full grid grid-cols-[1fr,auto,1fr] grid-rows-[1fr,auto,1fr] gap-x-12 gap-y-12 z-10 max-w-[1500px] mx-auto overflow-y-auto custom-scrollbar pt-6 pb-6 px-4">
                
                {/* Top Row: Comunicação */}
                <div className="col-start-1 col-span-3 row-start-1 flex flex-col justify-end items-center gap-4">
                    <div className="text-slate-500 font-bold tracking-widest uppercase text-xs flex items-center gap-2">
                        <Smartphone size={14} /> COMUNICAÇÃO (MORADORES)
                    </div>
                    <div className="flex justify-center items-end gap-6 flex-wrap">
                        {commNodes.map((node) => (
                             <NodeCard key={node.id} integration={node} side="top" /> 
                        ))}
                    </div>
                </div>

                {/* Left Column: Condos */}
                <div className="col-start-1 row-start-2 flex justify-end items-center gap-6">
                    <div className="text-slate-500 font-bold tracking-widest uppercase text-xs flex items-center gap-2 [writing-mode:vertical-lr] rotate-180 shrink-0">
                        CONDOMÍNIOS <Store size={14} />
                    </div>
                    <div className="flex flex-col gap-4">
                        {condoNodes.map((node) => (
                             <NodeCard key={node.id} integration={node} side="left" />
                        ))}
                    </div>
                </div>

                {/* Center Column: Hub */}
                <div className="col-start-2 row-start-2 flex items-center justify-center shrink-0">
                    <CentralNode />
                </div>

                {/* Right Column: Delivery Apps / Injectors */}
                <div className="col-start-3 row-start-2 flex justify-start items-center gap-6">
                    <div className="flex flex-col gap-4">
                        {deliveryNodes.map((node) => (
                             <NodeCard key={node.id} integration={node} side="right" />
                        ))}
                    </div>
                    <div className="text-slate-500 font-bold tracking-widest uppercase text-xs flex items-center gap-2 [writing-mode:vertical-lr] shrink-0">
                        APPS DE DELIVERY <Zap size={14} />
                    </div>
                </div>

                {/* Bottom Row: Security & Biometrics */}
                <div className="col-start-1 col-span-3 row-start-3 flex flex-col justify-start items-center gap-4">
                    <div className="flex justify-center items-start gap-6 flex-wrap mt-4">
                        {securityNodes.map((node) => (
                             <NodeCard key={node.id} integration={node} side="bottom" />
                        ))}
                    </div>
                    <div className="text-slate-500 font-bold tracking-widest uppercase text-xs flex items-center gap-2">
                        <Shield size={14} /> SEGURANÇA, DOCUMENTAÇÃO E BIOMETRIA
                    </div>
                </div>
            </div>
        </div>
    );
};
