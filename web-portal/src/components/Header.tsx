import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { condoService, type Condo } from '../services/condoService';
import SettingsDropdown from './SettingsDropdown';
import { MapPin, Bell, LogOut, ChevronDown, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header: React.FC = () => {
    const { user, profile, signOut, selectedCondo, selectCondo, memberships } = useAuth();
    const navigate = useNavigate();
    const [condos, setCondos] = useState<Condo[]>([]);
    const [isCondoSelectorOpen, setIsCondoSelectorOpen] = useState(false);

    // Derived state
    const currentCondo = condos.find(c => c.id === selectedCondo);
    const isPlatformAdmin = profile?.is_platform_admin || false;
    // Check if user is admin of current condo (if selected)
    const isCondoAdmin = memberships.find(m => m.condominium_id === selectedCondo && m.role === 'admin');
    const canManage = isPlatformAdmin || !!isCondoAdmin;

    // Load available condos
    useEffect(() => {
        async function loadCondos() {
            try {
                // In a real scenario with RLS, this service should return only allowed condos.
                // For Platform Admin it might return all.
                const data = await condoService.getCondos();
                setCondos(data);
            } catch (err) {
                console.error('Failed to load condos for header:', err);
            }
        }
        if (user) {
            loadCondos();
        }
    }, [user]);

    const handleSelectCondo = (condoId: string) => {
        selectCondo(condoId);
        setIsCondoSelectorOpen(false);
        // Optionally navigate to dashboard or stay on current page
        // navigate('/'); 
    };

    return (
        <header className="h-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-50 gap-4 sticky top-0 w-full">

            {/* Left: Logo and Condo Selector */}
            <div className="flex items-center space-x-6 min-w-[200px]">
                {/* Logo */}
                <Link to="/" className="text-2xl font-display font-bold text-white shrink-0 hover:opacity-80 transition-opacity">
                    Zeeo <span className="text-primary-500">.</span>
                </Link>

                <div className="h-6 w-px bg-slate-700 hidden md:block" />

                {/* Condo Selector */}
                <div className="relative">
                    <button
                        onClick={() => setIsCondoSelectorOpen(!isCondoSelectorOpen)}
                        className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 rounded-full border border-slate-700 hover:border-slate-600 text-slate-300 text-sm transition-all"
                    >
                        <MapPin size={14} className="shrink-0 text-primary-400" />
                        <span className="truncate max-w-[150px] lg:max-w-[250px] font-medium">
                            {currentCondo ? currentCondo.name : 'Selecione um Condomínio'}
                        </span>
                        <ChevronDown size={14} className={`shrink-0 transition-transform ${isCondoSelectorOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Mobile Icon Only */}
                    <button
                        onClick={() => setIsCondoSelectorOpen(!isCondoSelectorOpen)}
                        className="md:hidden flex items-center justify-center h-10 w-10 bg-slate-800 rounded-full text-primary-400"
                    >
                        <Building2 size={20} />
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                        {isCondoSelectorOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden py-1 z-50"
                            >
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Meus Condomínios
                                </div>
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {condos.length > 0 ? (
                                        condos.map(condo => (
                                            <button
                                                key={condo.id}
                                                onClick={() => handleSelectCondo(condo.id)}
                                                className={`w-full text-left px-4 py-3 flex items-start space-x-3 hover:bg-slate-800 transition-colors ${selectedCondo === condo.id ? 'bg-slate-800/50 border-l-2 border-primary-500' : ''}`}
                                            >
                                                <Building2 className={`shrink-0 mt-0.5 ${selectedCondo === condo.id ? 'text-primary-400' : 'text-slate-500'}`} size={16} />
                                                <div className="overflow-hidden">
                                                    <p className={`text-sm font-medium truncate ${selectedCondo === condo.id ? 'text-white' : 'text-slate-300'}`}>
                                                        {condo.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {condo.city}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-slate-500">
                                            Nenhum condomínio encontrado.
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-slate-800 mt-1 p-2">
                                    <button
                                        onClick={() => {
                                            setIsCondoSelectorOpen(false);
                                            navigate('/condo-selection');
                                        }}
                                        className="w-full text-center py-2 text-xs text-primary-400 hover:text-primary-300 font-medium"
                                    >
                                        Ver Todos / Gerenciar
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Right: Actions and Profile */}
            <div className="flex items-center space-x-3 md:space-x-6 shrink-0">

                {/* Settings (Admin Only) */}
                {canManage && (
                    <SettingsDropdown
                        selectedCondo={selectedCondo}
                        isPlatformAdmin={isPlatformAdmin}
                    />
                )}

                {/* Notifications */}
                <button className="h-9 w-9 rounded-full hover:bg-slate-800 flex items-center justify-center relative transition-colors">
                    <Bell size={20} className="text-slate-400" />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900" />
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-3 border-l border-slate-700">
                    <div className="flex flex-col items-end hidden md:flex">
                        <span className="text-sm font-medium text-white max-w-[150px] truncate">
                            {profile?.full_name || 'Usuário'}
                        </span>
                        <span className="text-xs text-slate-500">
                            {isPlatformAdmin ? 'Admin Global' : 'Usuário'}
                        </span>
                    </div>

                    <div className="h-9 w-9 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold text-white shadow-lg ring-2 ring-slate-800">
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>

                    <button
                        onClick={signOut}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
