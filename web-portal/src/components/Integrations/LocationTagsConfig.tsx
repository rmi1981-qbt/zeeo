import React, { useState } from 'react';
import { Plus, Tag, Trash2, Edit2, Search, X } from 'lucide-react';

interface LocationTag {
    id: string;
    brand: string;
    model: string;
    factory_id: string;
    system_id: string;
    status: 'available' | 'in_use' | 'maintenance' | 'lost';
    created_at: string;
}

// Mock Data
const MOCK_TAGS: LocationTag[] = [
    { id: '1', brand: 'Samsung', model: 'SmartTag 2', factory_id: 'S2-001A', system_id: 'A01', status: 'available', created_at: '2026-03-01T10:00:00Z' },
    { id: '2', brand: 'Apple', model: 'AirTag', factory_id: 'AT-992B', system_id: 'A02', status: 'in_use', created_at: '2026-03-01T10:00:00Z' },
    { id: '3', brand: 'Generic BLE', model: 'Tag V1', factory_id: 'GB-111C', system_id: 'B01', status: 'maintenance', created_at: '2026-03-02T10:00:00Z' }
];

export const LocationTagsConfig: React.FC = () => {
    const [tags, setTags] = useState<LocationTag[]>(MOCK_TAGS);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<LocationTag>>({
        brand: '',
        model: '',
        factory_id: '',
        system_id: '',
        status: 'available'
    });

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Simple validation
        if (!formData.brand || !formData.system_id || !formData.factory_id) return;

        const newTag: LocationTag = {
            id: Math.random().toString(36).substring(7),
            brand: formData.brand || '',
            model: formData.model || '',
            factory_id: formData.factory_id || '',
            system_id: formData.system_id.toUpperCase() || '',
            status: formData.status as 'available' | 'in_use' | 'maintenance' | 'lost',
            created_at: new Date().toISOString()
        };

        setTags([newTag, ...tags]);
        setIsAdding(false);
        setFormData({ brand: '', model: '', factory_id: '', system_id: '', status: 'available' });
    };

    const deleteTag = (id: string) => {
        setTags(tags.filter(t => t.id !== id));
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'available': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'in_use': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'maintenance': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'lost': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'available': return 'Disponível';
            case 'in_use': return 'Em Uso';
            case 'maintenance': return 'Manutenção';
            case 'lost': return 'Perdida';
            default: return status;
        }
    };

    const filteredTags = tags.filter(t =>
        t.system_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                            <Tag className="text-orange-400" size={20} />
                            Gestão de Inventário de TAGs
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Cadastre e gerencie as TAGs físicas que serão entregues na portaria.</p>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} />
                        Nova TAG
                    </button>
                </div>



                {isAdding && (
                    <div className="bg-slate-950 border border-orange-500/30 rounded-xl p-5 mb-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-200">Cadastrar Nova TAG</h4>
                            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-slate-300">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="lg:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">ID Sistema (ex: A01)</label>
                                <input
                                    type="text"
                                    maxLength={3}
                                    placeholder="XYZ"
                                    required
                                    value={formData.system_id?.toUpperCase()}
                                    onChange={e => setFormData({ ...formData, system_id: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none uppercase font-mono"
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Marca</label>
                                <input
                                    type="text"
                                    placeholder="Apple"
                                    required
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Modelo</label>
                                <input
                                    type="text"
                                    placeholder="AirTag"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-slate-400 mb-1">Factory ID / S/N</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="S/N de fábrica"
                                        required
                                        value={formData.factory_id}
                                        onChange={e => setFormData({ ...formData, factory_id: e.target.value })}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none font-mono"
                                    />
                                    <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors">
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por ID (ex: A01) ou Marca..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-slate-600 focus:outline-none"
                    />
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-300">
                            <tr>
                                <th className="px-4 py-3 border-b border-slate-800">Cód (Sistema)</th>
                                <th className="px-4 py-3 border-b border-slate-800">Identificação</th>
                                <th className="px-4 py-3 border-b border-slate-800">Factory S/N</th>
                                <th className="px-4 py-3 border-b border-slate-800">Status Atual</th>
                                <th className="px-4 py-3 border-b border-slate-800 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                            {filteredTags.length > 0 ? filteredTags.map(tag => (
                                <tr key={tag.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono font-bold tracking-widest text-xs">
                                            {tag.system_id}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-300">{tag.brand}</div>
                                        <div className="text-xs text-slate-500">{tag.model}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                        {tag.factory_id}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(tag.status)}`}>
                                            {getStatusText(tag.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <button className="p-1.5 text-slate-500 hover:text-blue-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" title="Editar TAG">
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteTag(tag.id)}
                                            className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" title="Remover TAG">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                        Nenhuma TAG encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};
