import { DeliveryEvent } from '@zeeo/shared';

const API_URL = 'http://localhost:8000';

export interface ApiDelivery {
    id: string;
    condo_id: string;
    unit?: string;
    status: 'created' | 'driver_assigned' | 'approaching' | 'at_gate' | 'authorized' | 'inside' | 'exited' | 'completed' | 'rejected' | 'pre_authorized';
    platform: 'ifood' | 'ubereats' | 'mercadolivre' | 'rappi' | 'other' | 'mock';
    driver_name?: string;
    driver_photo?: string;
    driver_plate?: string;
    driver_lat?: number;
    driver_lng?: number;
    eta?: string;
    created_at: string;
    updated_at?: string;
    current_gate?: { id: string; name: string; };
    // Authorization fields
    authorized_by?: string;
    authorized_method?: string;
    authorized_at?: string;
    entered_at?: string;
    exited_at?: string;
}

export interface StatusUpdatePayload {
    status: string;
    driver_lat?: number;
    driver_lng?: number;
    authorization_method?: string;
    actor_id?: string;
    actor_name?: string;
    actor_role?: string;
    authorized_by_resident_id?: string;
    authorized_by_resident_name?: string;
    gate_id?: string;
    gate_name?: string;
    notes?: string;
}

export const deliveryService = {
    async getDeliveries(condoId: string, unit?: string): Promise<ApiDelivery[]> {
        let url = `${API_URL}/deliveries/?condo_id=${condoId}`;
        if (unit) {
            url += `&unit=${encodeURIComponent(unit)}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch deliveries');
        return await response.json();
    },

    async createDelivery(data: Omit<ApiDelivery, 'id' | 'created_at' | 'updated_at'>): Promise<ApiDelivery> {
        const response = await fetch(`${API_URL}/deliveries/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create delivery');
        return await response.json();
    },

    async updateStatus(id: string, payload: StatusUpdatePayload): Promise<ApiDelivery> {
        const response = await fetch(`${API_URL}/deliveries/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update delivery status');
        return await response.json();
    },

    async getDeliveryEvents(deliveryId: string): Promise<DeliveryEvent[]> {
        const response = await fetch(`${API_URL}/deliveries/${deliveryId}/events`);
        if (!response.ok) throw new Error('Failed to fetch delivery events');
        return await response.json();
    },

    async getCondoEvents(condoId: string, limit: number = 50): Promise<DeliveryEvent[]> {
        const response = await fetch(`${API_URL}/deliveries/events?condo_id=${condoId}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch condo events');
        return await response.json();
    }
};
