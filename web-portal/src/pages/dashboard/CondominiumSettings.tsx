import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { condoService, type Condo } from '../../services/condoService';
import { cepService } from '../../services/cepService';
import { ArrowLeft, Save, Loader2, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import PerimeterMap from '../../components/PerimeterMap';

type CondoDetails = {
    id: string;
    name: string;
    address: string;
    number?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
    perimeter: any;
};

export default function CondominiumSettings() {
    const [searchParams] = useSearchParams();
    const condoId = searchParams.get('id');
    const { profile, memberships } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [condo, setCondo] = useState<CondoDetails | null>(null);
    const [perimeterPath, setPerimeterPath] = useState<{ lat: number; lng: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lookingUpCep, setLookingUpCep] = useState(false);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -23.5505, lng: -46.6333 });

    // Parse GeoJSON perimeter to Google Maps coordinates
    const parsePerimeter = useCallback((perimeter: any): { lat: number; lng: number }[] => {
        if (!perimeter) return [];

        try {
            // GeoJSON Polygon format: { type: "Polygon", coordinates: [[[lng, lat], ...]] }
            if (perimeter.type === 'Polygon' && perimeter.coordinates && perimeter.coordinates.length > 0) {
                const ring = perimeter.coordinates[0];
                const coords = ring.map((c: number[]) => ({
                    lat: c[1],
                    lng: c[0]
                }));
                // Remove last point if it duplicates the first (GeoJSON convention)
                if (coords.length > 1 &&
                    coords[0].lat === coords[coords.length - 1].lat &&
                    coords[0].lng === coords[coords.length - 1].lng) {
                    coords.pop();
                }
                return coords;
            }
        } catch (e) {
            console.warn('Failed to parse perimeter:', e);
        }
        return [];
    }, []);

    useEffect(() => {
        async function fetchCondo() {
            if (!condoId) {
                setLoading(false);
                return;
            }

            try {
                // Fetch via backend API (respects same data flow)
                const response = await fetch(`http://localhost:8000/condos/${condoId}`);
                if (!response.ok) {
                    throw new Error('Condomínio não encontrado');
                }
                const data = await response.json();
                setCondo(data);

                // Parse perimeter for the map
                const coords = parsePerimeter(data.perimeter);
                setPerimeterPath(coords);

                // Calculate map center from perimeter or geocode address
                if (coords.length > 0) {
                    const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / coords.length;
                    const avgLng = coords.reduce((sum, p) => sum + p.lng, 0) / coords.length;
                    setMapCenter({ lat: avgLat, lng: avgLng });
                } else if (data.city && data.state) {
                    // Try geocoding the address
                    try {
                        const geocoder = new google.maps.Geocoder();
                        const fullAddress = [data.address, data.number, data.neighborhood, data.city, data.state, 'Brasil'].filter(Boolean).join(', ');
                        const result = await geocoder.geocode({ address: fullAddress });
                        if (result.results[0]) {
                            const loc = result.results[0].geometry.location;
                            setMapCenter({ lat: loc.lat(), lng: loc.lng() });
                        }
                    } catch (e) {
                        console.warn('Geocoding failed:', e);
                    }
                }
            } catch (error) {
                console.error('Error fetching condo:', error);
                showToast({ type: 'error', title: 'Erro', message: 'Não foi possível carregar o condomínio' });
            }

            setLoading(false);
        }

        fetchCondo();
    }, [condoId, parsePerimeter, showToast]);

    // CEP Lookup
    const handleCEPLookup = async (cep: string) => {
        if (!condo) return;
        const cleanCEP = cep.replace(/\D/g, '');
        if (cleanCEP.length !== 8) return;

        setLookingUpCep(true);
        try {
            const addressData = await cepService.lookupCEP(cleanCEP);
            if (addressData) {
                setCondo({
                    ...condo,
                    address: addressData.street || condo.address,
                    neighborhood: addressData.neighborhood || condo.neighborhood,
                    city: addressData.city || condo.city,
                    state: addressData.state || condo.state,
                    zip_code: addressData.zipCode || condo.zip_code
                });
                showToast({ type: 'success', title: 'CEP encontrado!', message: `${addressData.city}/${addressData.state}` });

                // Geocode the new address to update map center
                try {
                    const geocoder = new google.maps.Geocoder();
                    const fullAddress = [addressData.street, addressData.neighborhood, addressData.city, addressData.state, 'Brasil'].filter(Boolean).join(', ');
                    const result = await geocoder.geocode({ address: fullAddress });
                    if (result.results[0]) {
                        const loc = result.results[0].geometry.location;
                        setMapCenter({ lat: loc.lat(), lng: loc.lng() });
                    }
                } catch (e) {
                    console.warn('Geocoding failed:', e);
                }
            } else {
                showToast({ type: 'error', title: 'CEP não encontrado', message: 'Verifique o CEP informado' });
            }
        } catch (error) {
            showToast({ type: 'error', title: 'Erro no CEP', message: error instanceof Error ? error.message : 'Erro desconhecido' });
        } finally {
            setLookingUpCep(false);
        }
    };

    const handleCEPChange = (value: string) => {
        if (!condo) return;
        // Only allow digits and dash
        const cleaned = value.replace(/[^\d-]/g, '');
        setCondo({ ...condo, zip_code: cleaned });

        // Auto-lookup when 8 digits entered
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length === 8) {
            handleCEPLookup(digits);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!condo) return;
        setSaving(true);

        try {
            await condoService.updateCondo(condo.id, {
                name: condo.name,
                address: condo.address,
                number: condo.number || undefined,
                neighborhood: condo.neighborhood || undefined,
                city: condo.city || undefined,
                state: condo.state || undefined,
                zip_code: condo.zip_code || undefined,
                perimeter: perimeterPath
            });

            showToast({ type: 'success', title: 'Alterações salvas!', message: 'As configurações foram atualizadas com sucesso.' });
        } catch (error) {
            console.error(error);
            showToast({ type: 'error', title: 'Erro ao salvar', message: error instanceof Error ? error.message : 'Erro desconhecido' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (!condo) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Condomínio não encontrado</h2>
                <button onClick={() => navigate('/condo-selection')} className="text-blue-400 hover:text-blue-300">
                    Voltar para seleção
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/condo-selection')}
                    className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Voltar para Seleção de Condomínios
                </button>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 mb-8">
                    <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        Configurações do Condomínio
                        <span className="text-xs font-normal bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">Admin</span>
                    </h1>

                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Nome */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Nome do Condomínio</label>
                            <input
                                type="text"
                                value={condo.name}
                                onChange={e => setCondo({ ...condo, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* CEP com busca automática */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">CEP</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={condo.zip_code || ''}
                                        onChange={e => handleCEPChange(e.target.value)}
                                        placeholder="00000-000"
                                        maxLength={9}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                                    />
                                    {lookingUpCep ? (
                                        <Loader2 className="absolute right-3 top-3.5 animate-spin text-blue-400" size={18} />
                                    ) : (
                                        <Search
                                            className="absolute right-3 top-3.5 text-slate-500 cursor-pointer hover:text-blue-400 transition-colors"
                                            size={18}
                                            onClick={() => handleCEPLookup(condo.zip_code || '')}
                                        />
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Digite o CEP para buscar o endereço automaticamente</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Estado (UF)</label>
                                <input
                                    type="text"
                                    value={condo.state || ''}
                                    onChange={e => setCondo({ ...condo, state: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Cidade</label>
                                <input
                                    type="text"
                                    value={condo.city || ''}
                                    onChange={e => setCondo({ ...condo, city: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Endereço */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Bairro</label>
                                <input
                                    type="text"
                                    value={condo.neighborhood || ''}
                                    onChange={e => setCondo({ ...condo, neighborhood: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Endereço</label>
                                <input
                                    type="text"
                                    value={condo.address || ''}
                                    onChange={e => setCondo({ ...condo, address: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Número</label>
                            <input
                                type="text"
                                value={condo.number || ''}
                                onChange={e => setCondo({ ...condo, number: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                style={{ maxWidth: '200px' }}
                            />
                        </div>

                        {/* Mapa de Perímetro */}
                        <div className="pt-6 border-t border-slate-800">
                            <h3 className="text-lg font-semibold text-white mb-4">Perímetro de Segurança</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Use as ferramentas de desenho para definir ou alterar o perímetro do condomínio.
                            </p>
                            <div className="h-[60vh] min-h-[500px]">
                                <PerimeterMap
                                    initialCenter={mapCenter}
                                    initialPolygon={perimeterPath}
                                    onPolygonChange={setPerimeterPath}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                <Save size={20} />
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
