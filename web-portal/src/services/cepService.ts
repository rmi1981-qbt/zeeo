export interface CEPResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    ibge: string;
    gia: string;
    ddd: string;
    siafi: string;
    erro?: boolean;
}

export interface AddressData {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
}

class CEPService {
    private readonly BASE_URL = 'https://viacep.com.br/ws';

    /**
     * Validates CEP format (8 digits)
     */
    validateCEP(cep: string): boolean {
        const cleanCEP = cep.replace(/\D/g, '');
        return cleanCEP.length === 8;
    }

    /**
     * Formats CEP with dash (XXXXX-XXX)
     */
    formatCEP(cep: string): string {
        const cleanCEP = cep.replace(/\D/g, '');
        if (cleanCEP.length !== 8) return cep;
        return `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5)}`;
    }

    /**
     * Looks up address by CEP
     * Returns null if CEP is invalid or not found
     */
    async lookupCEP(cep: string): Promise<AddressData | null> {
        const cleanCEP = cep.replace(/\D/g, '');

        if (!this.validateCEP(cleanCEP)) {
            throw new Error('CEP deve conter 8 dígitos');
        }

        try {
            const response = await fetch(`${this.BASE_URL}/${cleanCEP}/json/`);

            if (!response.ok) {
                throw new Error('Erro ao buscar CEP');
            }

            const data: CEPResponse = await response.json();

            if (data.erro) {
                return null; // CEP not found
            }

            return {
                street: data.logradouro,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf,
                zipCode: this.formatCEP(data.cep)
            };
        } catch (error) {
            if (error instanceof Error && error.message === 'CEP deve conter 8 dígitos') {
                throw error;
            }
            throw new Error('Erro ao buscar CEP. Verifique sua conexão.');
        }
    }
}

export const cepService = new CEPService();
