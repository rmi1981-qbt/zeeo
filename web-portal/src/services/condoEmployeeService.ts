const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface CondoEmployee {
    id: string;
    condo_id: string;
    name: string;
    document?: string;
    role?: string;
    access_level?: string;
    is_active: boolean;
    created_at: string;
}

export interface CondoEmployeeCreate {
    name: string;
    document?: string;
    role?: string;
    access_level?: string;
    is_active?: boolean;
}

export const condoEmployeeService = {
    async getCondoEmployees(condoId: string): Promise<CondoEmployee[]> {
        const response = await fetch(`${API_URL}/condos/${condoId}/employees`);
        if (!response.ok) throw new Error('Failed to fetch condo employees');
        return response.json();
    },

    async createCondoEmployee(condoId: string, data: CondoEmployeeCreate): Promise<CondoEmployee> {
        const response = await fetch(`${API_URL}/condos/${condoId}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create condo employee');
        return response.json();
    },

    async updateCondoEmployee(condoId: string, employeeId: string, data: CondoEmployeeCreate): Promise<CondoEmployee> {
        const response = await fetch(`${API_URL}/condos/${condoId}/employees/${employeeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update condo employee');
        return response.json();
    },

    async deleteCondoEmployee(condoId: string, employeeId: string): Promise<void> {
        const response = await fetch(`${API_URL}/condos/${condoId}/employees/${employeeId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete condo employee');
    }
};
