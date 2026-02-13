// import { Delivery, DeliveryStatus } from '@zeeo/shared'; // Assuming types might be shared or need redefinition

const API_URL = 'http://localhost:8000';

export interface ApiDelivery {
    id: string;
    condo_id: string;
    unit?: string;
    status: 'created' | 'driver_assigned' | 'approaching' | 'at_gate' | 'inside' | 'completed' | 'rejected' | 'pre_authorized';
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

    async updateStatus(id: string, status: string, lat?: number, lng?: number): Promise<ApiDelivery> {
        const payload: any = { status };
        if (lat !== undefined) payload.driver_lat = lat;
        if (lng !== undefined) payload.driver_lng = lng;

        const response = await fetch(`${API_URL}/deliveries/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update delivery status');
        return await response.json();
    }
};
