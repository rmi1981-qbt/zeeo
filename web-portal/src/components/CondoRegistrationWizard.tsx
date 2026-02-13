import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Building2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { cepService } from '../services/cepService';

import { condoService } from '../services/condoService';
import { buildingGeometryService } from '../services/buildingGeometryService';
import SimplePerimeterMap from './SimplePerimeterMap';

interface FormData {
    name: string;
    zip_code: string;
    address: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    perimeter: { lat: number; lng: number }[];
}

interface WizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

export default function CondoRegistrationWizard({ onComplete, onCancel }: WizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        zip_code: '',
        address: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        perimeter: []
    });

    const [cepLoading, setCepLoading] = useState(false);
    const [autoPolygon, setAutoPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [saving, setSaving] = useState(false);

    const { showToast } = useToast();

    const handleCEPLookup = async (cep: string) => {
        const cleanCEP = cep.replace(/\D/g, '');

        if (cleanCEP.length !== 8) {
            return;
        }

        setCepLoading(true);
        try {
            const data = await cepService.lookupCEP(cleanCEP);

            if (!data) {
                showToast({
                    type: 'error',
                    title: 'CEP não encontrado',
                    message: 'Verifique o CEP digitado e tente novamente.'
                });
                return;
            }

            // Update form with address data
            setFormData(prev => ({
                ...prev,
                zip_code: data.zipCode,
                address: data.street,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state
            }));

            showToast({
                type: 'success',
                title: 'Endereço encontrado!',
                message: `${data.street}, ${data.city} - ${data.state}`
            });

            // Use Google Maps Geocoding API directly
            const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

            // Try with CEP first
            console.log('Geocoding: Trying with CEP', cep);
            let geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cep + ', Brasil')}&key=${googleApiKey}`;
            let response = await fetch(geocodingUrl);
            let geocodeData = await response.json();

            let coords: { lat: number; lng: number } | null = null;

            if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
                const location = geocodeData.results[0].geometry.location;
                coords = { lat: location.lat, lng: location.lng };
                console.log('Geocoding: Found coordinates via CEP', coords);
            } else {
                // Fallback to full address
                const fullAddress = `${data.street}, ${data.neighborhood}, ${data.city}, ${data.state}, Brasil`;
                console.log('Geocoding: CEP failed, trying with full address');

                geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleApiKey}`;
                response = await fetch(geocodingUrl);
                geocodeData = await response.json();

                if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
                    const location = geocodeData.results[0].geometry.location;
                    coords = { lat: location.lat, lng: location.lng };
                    console.log('Geocoding: Found coordinates via full address', coords);
                }
            }

            if (coords) {
                console.log('CEP Lookup: Setting mapCenter to', coords);
                setMapCenter(coords);
            } else {
                console.warn('CEP Lookup: No coordinates found');
            }

        } catch (error) {
            showToast({
                type: 'error',
                title: 'Erro ao buscar CEP',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        } finally {
            setCepLoading(false);
        }
    };

    const handleStep1Next = () => {
        if (!formData.zip_code) {
            showToast({
                type: 'warning',
                title: 'CEP obrigatório',
                message: 'Digite um CEP para continuar.'
            });
            return;
        }

        if (!cepService.validateCEP(formData.zip_code)) {
            showToast({
                type: 'warning',
                title: 'CEP inválido',
                message: 'O CEP deve conter 8 dígitos.'
            });
            return;
        }

        setCurrentStep(2);
    };

    const handleStep2Next = () => {
        if (!formData.name) {
            showToast({
                type: 'warning',
                title: 'Nome obrigatório',
                message: 'Dê um nome ao condomínio.'
            });
            return;
        }

        setCurrentStep(3);

        // Try to get automatic building polygon
        tryAutoPolygon();
    };

    const tryAutoPolygon = async () => {
        const fullAddress = `${formData.name}, ${formData.address}, ${formData.city}, ${formData.state}, Brasil`;

        try {
            const polygon = await buildingGeometryService.getBuildingPolygon(fullAddress);

            if (polygon) {
                setAutoPolygon(polygon.coordinates);
                setMapCenter(polygon.center);
                showToast({
                    type: 'info',
                    title: 'Perímetro detectado automaticamente',
                    message: 'Você pode aceitar ou desenhar manualmente.'
                });
            }
        } catch (error) {
            console.error('Error getting auto polygon:', error);
        }
    };

    const handleSave = async () => {
        if (formData.perimeter.length < 3) {
            showToast({
                type: 'warning',
                title: 'Perímetro incompleto',
                message: 'Desenhe o perímetro do condomínio no mapa.'
            });
            return;
        }

        setSaving(true);
        try {
            await condoService.saveCondo({
                name: formData.name,
                address: formData.address,
                number: formData.number,
                neighborhood: formData.neighborhood,
                city: formData.city,
                state: formData.state,
                zip_code: formData.zip_code,
                lat: mapCenter?.lat,
                lng: mapCenter?.lng,
                perimeter: formData.perimeter
            });

            showToast({
                type: 'success',
                title: 'Condomínio cadastrado!',
                message: 'O cadastro foi realizado com sucesso.'
            });

            onComplete();
        } catch (error) {
            showToast({
                type: 'error',
                title: 'Erro ao salvar',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        } finally {
            setSaving(false);
        }
    };

    const steps = [
        { number: 1, title: 'CEP', description: 'Buscar endereço' },
        { number: 2, title: 'Dados', description: 'Informações do condomínio' },
        { number: 3, title: 'Perímetro', description: 'Área de segurança' }
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Progress Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-6">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between relative">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex-1 relative">
                                <div className="flex items-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all z-10 ${currentStep > step.number
                                        ? 'bg-emerald-500 text-white'
                                        : currentStep === step.number
                                            ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                                            : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {currentStep > step.number ? <Check size={20} /> : step.number}
                                    </div>

                                    <div className="ml-3 flex-1">
                                        <p className={`font-semibold text-sm ${currentStep >= step.number ? 'text-white' : 'text-slate-500'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-slate-500">{step.description}</p>
                                    </div>
                                </div>

                                {index < steps.length - 1 && (
                                    <div className={`absolute top-6 left-12 right-0 h-0.5 -z-0 ${currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-800'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    {currentStep === 1 && <Step1CEP key="step1" formData={formData} setFormData={setFormData} onLookup={handleCEPLookup} loading={cepLoading} onNext={handleStep1Next} onCancel={onCancel} />}
                    {currentStep === 2 && <Step2Details key="step2" formData={formData} setFormData={setFormData} onNext={handleStep2Next} onBack={() => setCurrentStep(1)} />}
                    {currentStep === 3 && <Step3Map key="step3" formData={formData} setFormData={setFormData} autoPolygon={autoPolygon} mapCenter={mapCenter} onSave={handleSave} onBack={() => setCurrentStep(2)} saving={saving} />}
                </AnimatePresence>
            </div>
        </div>
    );
}

// Step Components will be in separate files for better organization
// For now, importing them as placeholders

function Step1CEP({ formData, setFormData, onLookup, loading, onNext, onCancel }: any) {
    const [cepInput, setCepInput] = useState(formData.zip_code);

    const handleCEPChange = (value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length <= 8) {
            setCepInput(cleanValue);
            setFormData((prev: FormData) => ({ ...prev, zip_code: cleanValue }));

            if (cleanValue.length === 8) {
                onLookup(cleanValue);
            }
        }
    };

    const formatCEPDisplay = (cep: string) => {
        if (cep.length <= 5) return cep;
        return `${cep.slice(0, 5)}-${cep.slice(5)}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto px-8 py-16"
        >
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-4">
                    <MapPin className="text-blue-400" size={32} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Onde fica o condomínio?</h2>
                <p className="text-slate-400">Digite o CEP para buscar o endereço automaticamente</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">CEP</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formatCEPDisplay(cepInput)}
                            onChange={(e) => handleCEPChange(e.target.value)}
                            placeholder="00000-000"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 px-6 text-2xl text-white text-center tracking-wider focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            maxLength={9}
                            autoFocus
                        />
                        {loading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 className="animate-spin text-blue-400" size={24} />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">Use apenas números</p>
                </div>

                {formData.address && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                    >
                        <div className="flex items-start gap-3">
                            <Check className="text-emerald-400 flex-shrink-0 mt-1" size={20} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-400 mb-1">Endereço encontrado:</p>
                                <p className="text-white font-medium">{formData.address}{formData.number && `, ${formData.number}`}</p>
                                <p className="text-slate-400 text-sm">{formData.neighborhood} - {formData.city}/{formData.state}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            <div className="flex gap-4 mt-12">
                <button
                    onClick={onCancel}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-xl transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={onNext}
                    disabled={!formData.address || loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                    Continuar
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
}

function Step2Details({ formData, setFormData, onNext, onBack }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto px-8 py-16"
        >
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-4">
                    <Building2 className="text-blue-400" size={32} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Informações do Condomínio</h2>
                <p className="text-slate-400">Confirme e complete os dados cadastrais</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nome do Condomínio *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData((prev: FormData) => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Residencial Grand Garden"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        autoFocus
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-slate-400 mb-2">CEP</label>
                        <input
                            type="text"
                            value={formData.zip_code}
                            disabled
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-slate-500 cursor-not-allowed"
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Estado</label>
                        <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, state: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Cidade</label>
                    <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData((prev: FormData) => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Bairro</label>
                    <input
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData((prev: FormData) => ({ ...prev, neighborhood: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Logradouro</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, address: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Número</label>
                        <input
                            type="text"
                            value={formData.number}
                            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, number: e.target.value }))}
                            placeholder="S/N"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 mt-12">
                <button
                    onClick={onBack}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Voltar
                </button>
                <button
                    onClick={onNext}
                    disabled={!formData.name}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                    Ir para o Mapa
                    <ArrowRight size={20} />
                </button>
            </div>
        </motion.div>
    );
}

function Step3Map({ formData, setFormData, autoPolygon, mapCenter, onSave, onBack, saving }: any) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col"
        >
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                    <h3 className="text-lg font-bold text-white">Defina o Perímetro de Segurança</h3>
                    <p className="text-sm text-slate-400">Desenhe a área exata do condomínio no mapa</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onBack}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Voltar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving || !formData.perimeter || formData.perimeter.length < 3}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                        {saving ? 'Salvando...' : 'Finalizar Cadastro'}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                <SimplePerimeterMap
                    initialCenter={mapCenter || undefined}
                    initialPolygon={formData.perimeter && formData.perimeter.length > 0 ? formData.perimeter : (autoPolygon || undefined)}
                    onPolygonChange={(coords) => {
                        console.log('Step3Map: Polygon changed with', coords.length, 'points');
                        console.log('Step3Map: Updating formData.perimeter');
                        setFormData((prev: FormData) => {
                            const updated = { ...prev, perimeter: coords };
                            console.log('Step3Map: formData updated, perimeter length =', updated.perimeter.length);
                            return updated;
                        });
                    }}
                />
            </div>
        </motion.div>
    );
}
