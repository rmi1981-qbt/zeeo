const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Unit {
    id: string;
    condo_id: string;
    block?: string;
    number?: string;
    label?: string;
    lat?: number;
    lng?: number;
    created_at: string;
}

export interface UnitCreate {
    block?: string;
    number?: string;
    label?: string;
    lat?: number;
    lng?: number;
}

export const unitService = {
    async getUnits(condoId: string): Promise<Unit[]> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units`);
        if (!response.ok) throw new Error('Failed to fetch units');
        return response.json();
    },

    async createUnit(condoId: string, data: UnitCreate): Promise<Unit> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create unit');
        return response.json();
    },

    async updateUnit(condoId: string, unitId: string, data: UnitCreate): Promise<Unit> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update unit');
        return response.json();
    },

    async deleteUnit(condoId: string, unitId: string): Promise<void> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete unit');
    }
};
