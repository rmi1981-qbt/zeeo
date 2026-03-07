import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Building2, SlidersHorizontal, Blocks, Activity, Home, Users, Shield } from 'lucide-react';

type MenuItem = {
    label: string;
    path: string;
    icon: React.ReactNode;
    visible: boolean;
};

type SettingsDropdownProps = {
    selectedCondo: string | null;
    isPlatformAdmin: boolean;
};

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ selectedCondo, isPlatformAdmin }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const menuItems: MenuItem[] = [
        {
            label: 'Cadastro de Condomínio',
            path: '/condo-setup',
            icon: <Building2 size={16} />,
            visible: isPlatformAdmin, // Apenas para admins da plataforma
        },
        {
            label: 'Listar Condomínios',
            path: '/condo-selection',
            icon: <Building2 size={16} />,
            visible: true, // Disponível para todos
        },
        {
            label: 'Configurações do Condomínio',
            path: `/settings/${selectedCondo}`,
            icon: <SlidersHorizontal size={16} />,
            visible: !!selectedCondo, // Disponível para todos os admins quando há condomínio selecionado
        },
        {
            label: 'Hub de Integrações',
            path: '/integrations',
            icon: <Blocks size={16} />,
            visible: !!selectedCondo, // Disponível para gerenciar integrações do condomínio selecionado
        },
        {
            label: 'Monitoramento do Hub',
            path: '/hub-monitoring',
            icon: <Activity size={16} />,
            visible: !!selectedCondo,
        },
        {
            label: 'Gestão de Unidades',
            path: '/units',
            icon: <Home size={16} />,
            visible: !!selectedCondo,
        },
        {
            label: 'Gestão de Moradores',
            path: '/residents',
            icon: <Users size={16} />,
            visible: !!selectedCondo,
        },
        {
            label: 'Equipe do Condomínio',
            path: '/condo-employees',
            icon: <Shield size={16} />,
            visible: !!selectedCondo,
        },
    ];

    const visibleItems = menuItems.filter(item => item.visible);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleItemClick = (path: string) => {
        setIsOpen(false);
        navigate(path);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botão de Configurações */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                title="Configurações"
            >
                <Settings size={20} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                        <div className="py-2">
                            {visibleItems.map((item, index) => (
                                <motion.button
                                    key={item.path}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => handleItemClick(item.path)}
                                    className="w-full px-4 py-3 flex items-center space-x-3 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors group"
                                >
                                    <div className="text-slate-500 group-hover:text-primary-400 transition-colors">
                                        {item.icon}
                                    </div>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsDropdown;
