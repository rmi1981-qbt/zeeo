const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Resident {
    id: string;
    unit_id: string;
    name: string;
    phone?: string;
    document?: string;
    can_authorize_deliveries: boolean;
    is_active: boolean;
    created_at: string;
}

export interface ResidentCreate {
    name: string;
    phone?: string;
    document?: string;
    can_authorize_deliveries?: boolean;
    is_active?: boolean;
}

export interface ResidentEmployee {
    id: string;
    unit_id: string;
    name: string;
    document?: string;
    role?: string;
    can_authorize_deliveries: boolean;
    is_active: boolean;
    created_at: string;
}

export interface ResidentEmployeeCreate {
    name: string;
    document?: string;
    role?: string;
    can_authorize_deliveries?: boolean;
    is_active?: boolean;
}

export const residentService = {
    // Residents
    async getResidents(condoId: string, unitId: string): Promise<Resident[]> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/residents`);
        if (!response.ok) throw new Error('Failed to fetch residents');
        return response.json();
    },

    async createResident(condoId: string, unitId: string, data: ResidentCreate): Promise<Resident> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/residents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create resident');
        return response.json();
    },

    async updateResident(condoId: string, unitId: string, residentId: string, data: ResidentCreate): Promise<Resident> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/residents/${residentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update resident');
        return response.json();
    },

    async deleteResident(condoId: string, unitId: string, residentId: string): Promise<void> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/residents/${residentId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete resident');
    },

    // Resident Employees
    async getResidentEmployees(condoId: string, unitId: string): Promise<ResidentEmployee[]> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/employees`);
        if (!response.ok) throw new Error('Failed to fetch resident employees');
        return response.json();
    },

    async createResidentEmployee(condoId: string, unitId: string, data: ResidentEmployeeCreate): Promise<ResidentEmployee> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create resident employee');
        return response.json();
    },

    async updateResidentEmployee(condoId: string, unitId: string, employeeId: string, data: ResidentEmployeeCreate): Promise<ResidentEmployee> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/employees/${employeeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update resident employee');
        return response.json();
    },

    async deleteResidentEmployee(condoId: string, unitId: string, employeeId: string): Promise<void> {
        const response = await fetch(`${API_URL}/condos/${condoId}/units/${unitId}/employees/${employeeId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete resident employee');
    }
};
