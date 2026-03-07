import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { condoEmployeeService, CondoEmployee } from '../../services/condoEmployeeService';
import { Users, UserPlus, Trash2, Edit2, Shield, Search, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function CondoEmployeeManagement() {
    const { selectedCondo } = useAuth();
    const { showToast } = useToast();

    // Data State
    const [employees, setEmployees] = useState<CondoEmployee[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<CondoEmployee | null>(null);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        document: '',
        role: '',
        access_level: 'padrao', // padrao, restrito, total
        is_active: true
    });

    // Load Employees
    const loadEmployees = useCallback(async () => {
        if (!selectedCondo) return;
        setLoading(true);
        try {
            const fetchedEmployees = await condoEmployeeService.getCondoEmployees(selectedCondo);
            setEmployees(fetchedEmployees);
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar funcionários do condomínio' });
        } finally {
            setLoading(false);
        }
    }, [selectedCondo, showToast]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    // Derived filtering
    const filteredEmployees = employees.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.document?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Form Handlers
    const openCreateForm = () => {
        setEditingEmployee(null);
        setFormData({
            name: '',
            document: '',
            role: '',
            access_level: 'padrao',
            is_active: true
        });
        setIsFormOpen(true);
    };

    const openEditForm = (employee: CondoEmployee) => {
        setEditingEmployee(employee);
        setFormData({
            name: employee.name,
            document: employee.document || '',
            role: employee.role || '',
            access_level: employee.access_level || 'padrao',
            is_active: employee.is_active
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingEmployee(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCondo) return;
        if (!formData.name) {
            showToast({ type: 'error', title: 'Erro', message: 'O nome é obrigatório' });
            return;
        }

        setSaving(true);
        try {
            if (editingEmployee) {
                await condoEmployeeService.updateCondoEmployee(selectedCondo, editingEmployee.id, formData);
                showToast({ type: 'success', title: 'Sucesso', message: 'Funcionário atualizado' });
            } else {
                await condoEmployeeService.createCondoEmployee(selectedCondo, formData);
                showToast({ type: 'success', title: 'Sucesso', message: 'Funcionário cadastrado' });
            }
            closeForm();
            loadEmployees();
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao salvar funcionário' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (employee: CondoEmployee) => {
        if (!selectedCondo) return;
        if (!confirm(`Tem certeza que deseja remover ${employee.name}?`)) return;

        try {
            await condoEmployeeService.deleteCondoEmployee(selectedCondo, employee.id);
            showToast({ type: 'success', title: 'Removido', message: 'Funcionário excluído com sucesso' });
            loadEmployees();
        } catch (error) {
            showToast({ type: 'error', title: 'Erro', message: 'Falha ao excluir funcionário' });
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="text-blue-400" />
                        Funcionários do Condomínio
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Gerencie a equipe de portaria, zeladoria, limpeza, administração e outros funcionários fixos.</p>
                </div>
                {!isFormOpen && (
                    <button
                        onClick={openCreateForm}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <UserPlus size={18} />
                        Cadastrar Funcionário
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Lista */}
                <div className={`w-full ${isFormOpen ? 'lg:w-1/3' : 'lg:w-full'} flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300`}>
                    <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nome, cargo ou documento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {filteredEmployees.length === 0 ? (
                            <div className="text-center p-8 text-slate-500 flex flex-col items-center">
                                <Users size={48} className="mb-4 opacity-20" />
                                <p>Nenhum funcionário encontrado.</p>
                            </div>
                        ) : (
                            <div className={isFormOpen ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}>
                                {filteredEmployees.map(employee => (
                                    <div key={employee.id} className="flex flex-col p-4 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-lg ${employee.is_active ? 'bg-slate-800 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    <Shield size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white flex items-center gap-2">
                                                        {employee.name}
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-400">
                                                        {employee.role || 'Sem cargo definido'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => openEditForm(employee)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(employee)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto grid grid-cols-2 items-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-800">
                                            <div>
                                                <span className="block text-slate-600 mb-0.5">Acesso</span>
                                                <span className="text-slate-300 font-medium capitalize">{employee.access_level}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-600 mb-0.5">Status</span>
                                                {employee.is_active ? (
                                                    <span className="text-emerald-400 font-medium">Ativo</span>
                                                ) : (
                                                    <span className="text-rose-400 font-medium">Bloqueado</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Formulário Lateral */}
                {isFormOpen && (
                    <div className="w-full lg:w-2/3 flex flex-col h-full border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-2xl animate-in slide-in-from-right-8 duration-300">
                        <div className="p-6 border-b border-slate-800 bg-slate-950/30">
                            <h2 className="text-xl font-bold text-white">
                                {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                {editingEmployee ? 'Atualize as informações do membro da equipe.' : 'Cadastre um novo membro da equipe do condomínio.'}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="employee-form" onSubmit={handleSave} className="space-y-5 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                        placeholder="Ex: João da Silva"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Documento (CPF/RG)</label>
                                        <input
                                            type="text"
                                            value={formData.document}
                                            onChange={e => setFormData({ ...formData, document: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Apenas números ou formato padrão"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Cargo / Função</label>
                                        <input
                                            type="text"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Ex: Porteiro, Zelador, Síndico"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-3">Nível de Acesso da Função</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <label className={`cursor-pointer p-4 rounded-xl border text-center transition-all ${
                                            formData.access_level === 'restrito' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="access_level" 
                                                value="restrito"
                                                checked={formData.access_level === 'restrito'}
                                                onChange={e => setFormData({ ...formData, access_level: e.target.value })}
                                                className="sr-only"
                                            />
                                            <div className="font-medium text-slate-200 mb-1">Restrito</div>
                                            <div className="text-xs text-slate-500">Acesso via aplicativo apenas, sem painel web.</div>
                                        </label>
                                        <label className={`cursor-pointer p-4 rounded-xl border text-center transition-all ${
                                            formData.access_level === 'padrao' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="access_level" 
                                                value="padrao"
                                                checked={formData.access_level === 'padrao'}
                                                onChange={e => setFormData({ ...formData, access_level: e.target.value })}
                                                className="sr-only"
                                            />
                                            <div className="font-medium text-slate-200 mb-1">Padrão</div>
                                            <div className="text-xs text-slate-500">Porteiros. Acesso ao painel web para liberações.</div>
                                        </label>
                                        <label className={`cursor-pointer p-4 rounded-xl border text-center transition-all ${
                                            formData.access_level === 'total' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                name="access_level" 
                                                value="total"
                                                checked={formData.access_level === 'total'}
                                                onChange={e => setFormData({ ...formData, access_level: e.target.value })}
                                                className="sr-only"
                                            />
                                            <div className="font-medium text-slate-200 mb-1">Administrativo</div>
                                            <div className="text-xs text-slate-500">Síndico ou gerente. Acesso total às configurações.</div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800 mt-6">
                                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900"
                                        />
                                        <div>
                                            <div className="font-medium text-slate-200 text-base">Funcionário Ativo</div>
                                            <div className="text-sm text-slate-500">Desmarque para revogar imediatamente o acesso ao sistema (o histórico será mantido).</div>
                                        </div>
                                    </label>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={saving}
                                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="employee-form"
                                disabled={saving}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 min-w-[140px]"
                            >
                                {saving ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Registro'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
