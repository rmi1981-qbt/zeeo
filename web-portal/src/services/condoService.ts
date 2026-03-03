const API_URL = 'http://localhost:8000'; // Make sure this matches your backend

export interface Condo {
    id: string;
    name: string;
    perimeter: any; // GeoJSON
    address?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    lat?: number;
    lng?: number;
    created_at: string;
}

export interface Gate {
    id: string;
    name: string;
    lat: number;
    lng: number;
    is_main: boolean;
    created_at: string;
    condo_id: string;
}

export const condoService = {
    // ... existing methods ...

    async saveCondo(data: Omit<Condo, 'id' | 'created_at'> & { perimeter: { lat: number, lng: number }[] }) {
        if (data.perimeter.length < 3) throw new Error('Perimeter must have at least 3 points');

        // Prepare payload for Python Backend
        // Backend handles WKT conversion. We just send points.
        // We map 'perimeter' (points) to 'perimeter_points' expected by Schema
        const payload = {
            name: data.name,
            address: data.address,
            number: data.number,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zip_code: data.zip_code,
            lat: data.lat,
            lng: data.lng,
            perimeter_points: data.perimeter
        };

        const response = await fetch(`${API_URL}/condos/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save condo');
        }

        return await response.json();
    },

    async updateCondo(id: string, data: Omit<Condo, 'id' | 'created_at'> & { perimeter: { lat: number, lng: number }[] }) {
        const payload = {
            name: data.name,
            address: data.address,
            number: data.number,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zip_code: data.zip_code,
            lat: data.lat,
            lng: data.lng,
            perimeter_points: data.perimeter
        };

        const response = await fetch(`${API_URL}/condos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update condo');
        }

        return await response.json();
    },

    async getCondo(id: string) {
        const response = await fetch(`${API_URL}/condos/${id}`);

        if (!response.ok) {
            throw new Error('Failed to fetch condo');
        }

        return await response.json() as Condo;
    },

    async getCondos() {
        const response = await fetch(`${API_URL}/condos/`);

        if (!response.ok) {
            throw new Error('Failed to fetch condos');
        }

        return await response.json() as Condo[];
    },

    async deleteCondo(id: string) {
        const response = await fetch(`${API_URL}/condos/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(`Failed to delete condo: ${errorData.detail || response.statusText} (${response.status})`);
        }

        return true;
    },

    // --- Gate Methods ---

    async getGates(condoId: string) {
        const response = await fetch(`${API_URL}/condos/${condoId}/gates`);
        if (!response.ok) throw new Error('Failed to fetch gates');
        return await response.json() as Gate[];
    },

    async createGate(condoId: string, data: { name: string; lat: number; lng: number; is_main: boolean }) {
        const response = await fetch(`${API_URL}/condos/${condoId}/gates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create gate');
        return await response.json() as Gate;
    },

    async updateGate(condoId: string, gateId: string, data: { name?: string; lat?: number; lng?: number; is_main?: boolean }) {
        const response = await fetch(`${API_URL}/condos/${condoId}/gates/${gateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update gate');
        return await response.json() as Gate;
    },

    async deleteGate(condoId: string, gateId: string) {
        const response = await fetch(`${API_URL}/condos/${condoId}/gates/${gateId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete gate');
        return true;
    }
};
