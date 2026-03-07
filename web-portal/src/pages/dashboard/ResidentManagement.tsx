import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { unitService, Unit } from '../../services/unitService';
import { residentService, Resident, ResidentEmployee } from '../../services/residentService';
import { Users, UserPlus, Briefcase, Trash2, Edit2, Shield, Search, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function ResidentManagement() {
    const { selectedCondo } = useAuth();
    const { showToast } = useToast();

    // Data State
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [residents, setResidents] = useState<Resident[]>([]);
    const [employees, setEmployees] = useState<ResidentEmployee[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(true);
    const [loadingPeople, setLoadingPeople] = useState(false);

    // Filter State
    const [searchUnitTerm, setSearchUnitTerm] = useState('');

    // Form State (could be broken down, but keeping simple for MVP)
    const [activeTab, setActiveTab] = useState<'residents' | 'employees'>('residents');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Resident | ResidentEmployee | null>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        document: '',
        role: '',
        can_authorize_deliveries: false,
        is_active: true
    });
    const [saving, setSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        const fetchUnits = async () => {
            if (!selectedCondo) return;
            try {
                const fetchedUnits = await unitService.getUnits(selectedCondo);
                setUnits(fetchedUnits);
            } catch (error) {
                showToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar unidades' });
            } finally {
                setLoadingUnits(false);
            }
        };
        fetchUnits();
    }, [selectedCondo, showToast]);

    // Load People when Unit changes
    const loadPeople = useCallback(async () => {
        if (!selectedCondo || !selectedUnit) return;
        setLoadingPeople(true);
        try {
            const [fetchedResidents, fetchedEmployees] = await Promise.all([
                residentService.getResidents(selectedCondo, selectedUnit.id),
                residentService.getResidentEmployees(selectedCondo, selectedUnit.id)
            ]);
            setResidents(fetchedResidents);
            setEmployees(fetchedEmployees);
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar pessoas da unidade' });
        } finally {
            setLoadingPeople(false);
        }
    }, [selectedCondo, selectedUnit, showToast]);

    useEffect(() => {
        if (selectedUnit) {
            loadPeople();
            closeForm();
        }
    }, [selectedUnit, loadPeople]);

    // Derived filtering
    const filteredUnits = units.filter(u => 
        u.label?.toLowerCase().includes(searchUnitTerm.toLowerCase()) || 
        u.number?.toLowerCase().includes(searchUnitTerm.toLowerCase()) ||
        u.block?.toLowerCase().includes(searchUnitTerm.toLowerCase())
    );

    // Form Handlers
    const openCreateForm = () => {
        setEditingPerson(null);
        setFormData({
            name: '',
            phone: '',
            document: '',
            role: '',
            can_authorize_deliveries: false,
            is_active: true
        });
        setIsFormOpen(true);
    };

    const openEditForm = (person: Resident | ResidentEmployee) => {
        setEditingPerson(person);
        setFormData({
            name: person.name,
            phone: 'phone' in person ? person.phone || '' : '',
            document: person.document || '',
            role: 'role' in person ? person.role || '' : '',
            can_authorize_deliveries: person.can_authorize_deliveries,
            is_active: person.is_active
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingPerson(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCondo || !selectedUnit) return;
        if (!formData.name) {
            showToast({ type: 'error', title: 'Erro', message: 'O nome é obrigatório' });
            return;
        }

        setSaving(true);
        try {
            if (activeTab === 'residents') {
                const payload = {
                    name: formData.name,
                    phone: formData.phone,
                    document: formData.document,
                    can_authorize_deliveries: formData.can_authorize_deliveries,
                    is_active: formData.is_active
                };
                if (editingPerson) {
                    await residentService.updateResident(selectedCondo, selectedUnit.id, editingPerson.id, payload);
                } else {
                    await residentService.createResident(selectedCondo, selectedUnit.id, payload);
                }
            } else {
                const payload = {
                    name: formData.name,
                    document: formData.document,
                    role: formData.role,
                    can_authorize_deliveries: formData.can_authorize_deliveries,
                    is_active: formData.is_active
                };
                if (editingPerson) {
                    await residentService.updateResidentEmployee(selectedCondo, selectedUnit.id, editingPerson.id, payload);
                } else {
                    await residentService.createResidentEmployee(selectedCondo, selectedUnit.id, payload);
                }
            }
            
            showToast({ type: 'success', title: 'Sucesso', message: 'Registro salvo' });
            closeForm();
            loadPeople();
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao salvar registro' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (person: Resident | ResidentEmployee) => {
        if (!selectedCondo || !selectedUnit) return;
        if (!confirm(`Tem certeza que deseja remover ${person.name}?`)) return;

        try {
            if (activeTab === 'residents') {
                await residentService.deleteResident(selectedCondo, selectedUnit.id, person.id);
            } else {
                await residentService.deleteResidentEmployee(selectedCondo, selectedUnit.id, person.id);
            }
            showToast({ type: 'success', title: 'Removido', message: 'Registro excluído com sucesso' });
            loadPeople();
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao excluir registro' });
        }
    };

    if (loadingUnits) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Users className="text-blue-400" />
                    Gestão de Moradores
                </h1>
                <p className="text-slate-400 text-sm mt-1">Gerencie os residentes e funcionários vinculados às unidades do condomínio.</p>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                
                {/* Lateral Esquerda - Lista de Unidades */}
                <div className="w-full lg:w-1/4 flex flex-col gap-4 min-h-[300px] lg:h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar unidade..."
                                value={searchUnitTerm}
                                onChange={(e) => setSearchUnitTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredUnits.length === 0 ? (
                            <div className="text-center p-4 text-slate-500 text-sm">
                                Nenhuma unidade encontrada.
                            </div>
                        ) : (
                            filteredUnits.map(unit => (
                                <button
                                    key={unit.id}
                                    onClick={() => setSelectedUnit(unit)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                                        selectedUnit?.id === unit.id 
                                            ? 'bg-blue-600 text-white' 
                                            : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="font-medium">
                                        {unit.label || `${unit.block ? unit.block + ' - ' : ''}${unit.number}`}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Lateral Direita - Detalhes da Unidade Selecionada */}
                <div className="w-full lg:w-3/4 flex flex-col h-full border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                    {!selectedUnit ? (
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                            <div className="text-center">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Selecione uma unidade na lista ao lado para gerenciar seus moradores.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header Detalhes */}
                            <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {selectedUnit.label || `${selectedUnit.block ? selectedUnit.block + ' - ' : ''}${selectedUnit.number}`}
                                    </h2>
                                    <p className="text-slate-400 text-sm">Gerenciando pessoas desta unidade.</p>
                                </div>
                                {!isFormOpen && (
                                    <button
                                        onClick={openCreateForm}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                                    >
                                        {activeTab === 'residents' ? <UserPlus size={16} /> : <Briefcase size={16} />}
                                        Adicionar {activeTab === 'residents' ? 'Morador' : 'Funcionário'}
                                    </button>
                                )}
                            </div>

                            {/* Tabs */}
                            {!isFormOpen && (
                                <div className="flex border-b border-slate-800">
                                    <button
                                        onClick={() => setActiveTab('residents')}
                                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                                            activeTab === 'residents' 
                                                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                                                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                                        }`}
                                    >
                                        Moradores ({residents.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('employees')}
                                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${
                                            activeTab === 'employees' 
                                                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                                                : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                                        }`}
                                    >
                                        Funcionários (Particular) ({employees.length})
                                    </button>
                                </div>
                            )}

                            {/* Conteúdo (Lista ou Formulário) */}
                            <div className="flex-1 overflow-y-auto">
                                {loadingPeople ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                    </div>
                                ) : isFormOpen ? (
                                    <div className="p-6 max-w-2xl mx-auto">
                                        <h3 className="text-lg font-semibold text-white mb-6 border-b border-slate-800 pb-2">
                                            {editingPerson ? 'Editar' : 'Novo'} {activeTab === 'residents' ? 'Morador' : 'Funcionário da Unidade'}
                                        </h3>
                                        <form onSubmit={handleSave} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-400 mb-1">Documento (CPF/RG)</label>
                                                    <input
                                                        type="text"
                                                        value={formData.document}
                                                        onChange={e => setFormData({ ...formData, document: e.target.value })}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>

                                                {activeTab === 'residents' ? (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-400 mb-1">Telefone (WhatsApp)</label>
                                                        <input
                                                            type="text"
                                                            value={formData.phone}
                                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                            placeholder="Ex: 11999999999"
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                        <p className="text-[10px] text-slate-500 mt-1">Garante que o bot do WhatsApp reconheça o morador.</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-400 mb-1">Cargo / Função</label>
                                                        <input
                                                            type="text"
                                                            value={formData.role}
                                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                            placeholder="Ex: Diarista, Babá"
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-4 space-y-3 border-t border-slate-800">
                                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.can_authorize_deliveries}
                                                        onChange={e => setFormData({ ...formData, can_authorize_deliveries: e.target.checked })}
                                                        className="w-5 h-5 rounded border-slate-700 text-blue-500 focus:ring-blue-500/20 bg-slate-900"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-slate-200">Pode autorizar Entregas e Visitas</div>
                                                        <div className="text-xs text-slate-500">Permite que esta pessoa seja contatada pela portaria para liberações oficiais.</div>
                                                    </div>
                                                </label>

                                                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.is_active}
                                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                        className="w-5 h-5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-slate-200">Ativo</div>
                                                        <div className="text-xs text-slate-500">Desmarque para bloquear o acesso sem excluir o registro do histórico.</div>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="flex gap-3 pt-6">
                                                <button
                                                    type="button"
                                                    onClick={closeForm}
                                                    disabled={saving}
                                                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                                >
                                                    {saving ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Registro'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        {activeTab === 'residents' ? (
                                            residents.length === 0 ? (
                                                <div className="text-center p-8 text-slate-500">
                                                    Nenhum morador cadastrado nesta unidade.
                                                </div>
                                            ) : (
                                                <div className="grid gap-3">
                                                    {residents.map(person => (
                                                        <PersonCard 
                                                            key={person.id} 
                                                            person={person} 
                                                            onEdit={() => openEditForm(person)} 
                                                            onDelete={() => handleDelete(person)} 
                                                        />
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            employees.length === 0 ? (
                                                <div className="text-center p-8 text-slate-500">
                                                    Nenhum funcionário particular cadastrado nesta unidade.
                                                </div>
                                            ) : (
                                                <div className="grid gap-3">
                                                    {employees.map(person => (
                                                        <PersonCard 
                                                            key={person.id} 
                                                            person={person} 
                                                            onEdit={() => openEditForm(person)} 
                                                            onDelete={() => handleDelete(person)} 
                                                        />
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Subcomponent for list items
function PersonCard({ person, onEdit, onDelete }: { person: Resident | ResidentEmployee, onEdit: () => void, onDelete: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors group">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${person.is_active ? 'bg-slate-800 text-slate-300' : 'bg-rose-500/10 text-rose-400'}`}>
                    {'role' in person ? <Briefcase size={20} /> : <Users size={20} />}
                </div>
                <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                        {person.name}
                        {!person.is_active && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold tracking-wide uppercase">Bloqueado</span>}
                        {person.can_authorize_deliveries && <span title="Autorizador oficial"><Shield size={14} className="text-emerald-400" /></span>}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        {person.document && <span>Doc: <span className="text-slate-400">{person.document}</span></span>}
                        {'phone' in person ? (
                            (person as Resident).phone && <span>Tel: <span className="text-slate-400">{(person as Resident).phone}</span></span>
                        ) : (
                            (person as ResidentEmployee).role && <span>Função: <span className="text-slate-400">{(person as ResidentEmployee).role}</span></span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={onEdit}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Editar"
                >
                    <Edit2 size={18} />
                </button>
                <button 
                    onClick={onDelete}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Excluir"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}
