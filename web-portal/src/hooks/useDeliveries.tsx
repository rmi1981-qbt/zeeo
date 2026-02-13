import { useState, useEffect, useCallback } from 'react';
import { Delivery, DeliveryStatus } from '@zeeo/shared';
import { deliveryService, ApiDelivery } from '../services/deliveryService';
import { supabase } from '../lib/supabase';

// --- Utils ---
const getRandomLocation = (type: 'inside' | 'outside') => {
    // Keep for fallback/mock location logic if needed, or remove if fully real
    const CENTER = { lat: -23.5505, lng: -46.6333 };
    const r = type === 'inside' ? 0.001 : 0.005;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * r;
    return {
        lat: CENTER.lat + distance * Math.cos(angle),
        lng: CENTER.lng + distance * Math.sin(angle)
    };
};

const mapApiToUi = (d: ApiDelivery): Delivery => ({
    id: d.id,
    status: (d.status as DeliveryStatus) || 'created',
    source: 'webhook_provider',
    provider: (d.platform as any) || 'other',
    externalId: d.id,
    driver_snapshot: {
        name: d.driver_name || 'Desconhecido',
        plate: d.driver_plate || '---',
        photoUrl: d.driver_photo,
    },
    condoId: d.condo_id,
    target_unit_label: d.unit || 'Portaria',
    target_user_ids: [],
    location: (d.driver_lat && d.driver_lng) ? { lat: d.driver_lat, lng: d.driver_lng } : undefined,
    createdAt: d.created_at,
    updatedAt: d.updated_at || d.created_at,
    current_gate: d.current_gate
});

export function useDeliveries(condoId: string) {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);

    const fetchDeliveries = useCallback(async () => {
        try {
            if (!condoId || condoId === 'mock') return;
            const data = await deliveryService.getDeliveries(condoId);
            setDeliveries(data.map(mapApiToUi));
        } catch (error) {
            console.error("Failed to load deliveries", error);
        }
    }, [condoId]);

    // Initial Load & Realtime Subscription
    useEffect(() => {
        if (!condoId) return;

        fetchDeliveries();

        // Request Notification Permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Subscribe to real-time changes
        const subscription = supabase
            .channel(`public:deliveries:condo_id=eq.${condoId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `condo_id=eq.${condoId}`
                },
                (payload) => {
                    // console.log('Realtime change:', payload);
                    if (payload.eventType === 'INSERT') {
                        setDeliveries(prev => [mapApiToUi(payload.new as ApiDelivery), ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        const newData = payload.new as ApiDelivery;
                        const oldData = payload.old as ApiDelivery;

                        setDeliveries(prev => prev.map(d =>
                            d.id === newData.id ? mapApiToUi(newData) : d
                        ));

                        // Notifications
                        if ('Notification' in window && Notification.permission === 'granted') {
                            // Status Change to 'approaching' or 'at_gate'
                            if (newData.status !== oldData.status) {
                                if (newData.status === 'approaching') {
                                    new Notification('Entrega Aproximando', {
                                        body: `O motorista ${newData.driver_name || ''} está chegando!`,
                                        icon: '/vite.svg' // Replace with app icon
                                    });
                                } else if (newData.status === 'at_gate') {
                                    new Notification('Motorista no Portão', {
                                        body: `O motorista ${newData.driver_name || ''} chegou ao portão!`,
                                        icon: '/vite.svg'
                                    });
                                }
                            }
                        }

                    } else if (payload.eventType === 'DELETE') {
                        setDeliveries(prev => prev.filter(d => d.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [condoId, fetchDeliveries]);

    const addMockDelivery = useCallback(async () => {
        // Mock data just for testing the API
        const NAMES = ['Carlos Oliveira', 'Fernanda Santos', 'Roberto Silva', 'Mariana Costa', 'João Pereira'];
        const PLATES = ['ABC-1234', 'XYZ-9876', 'KJI-5544', 'BRA-2024', 'ZEE-0000'];
        const PHOTOS = [
            'https://randomuser.me/api/portraits/men/32.jpg',
            'https://randomuser.me/api/portraits/women/44.jpg',
            'https://randomuser.me/api/portraits/men/64.jpg',
            'https://randomuser.me/api/portraits/women/12.jpg',
            'https://randomuser.me/api/portraits/men/85.jpg'
        ];
        const PROVIDERS = ['ifood', 'uber', 'rappi', 'mercadolivre'];

        const randomIdx = Math.floor(Math.random() * NAMES.length);
        const loc = getRandomLocation('outside');

        const newDelivery = {
            condo_id: condoId,
            status: 'approaching' as const,
            platform: PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)] as any,
            driver_name: NAMES[randomIdx],
            driver_plate: PLATES[randomIdx],
            driver_photo: PHOTOS[randomIdx],
            driver_lat: loc.lat,
            driver_lng: loc.lng,
            unit: `Apto ${Math.floor(Math.random() * 800) + 100}`
        };

        try {
            await deliveryService.createDelivery(newDelivery);
            // No need to fetchDeliveries(), Realtime will catch it
        } catch (e) {
            console.error("Failed to create mock delivery", e);
        }
    }, [condoId]);

    const updateStatus = useCallback(async (id: string, newStatus: DeliveryStatus) => {
        try {
            // Optimistic Update
            setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));

            let lat, lng;
            if (newStatus === 'inside') {
                const loc = getRandomLocation('inside');
                lat = loc.lat;
                lng = loc.lng;
            }

            await deliveryService.updateStatus(id, newStatus, lat, lng);
            // No need to fetchDeliveries(), Realtime will catch it
        } catch (e) {
            console.error("Failed to update status", e);
            // Revert optimistic update?
            fetchDeliveries();
        }
    }, [fetchDeliveries]);

    return {
        deliveries,
        addMockDelivery,
        updateStatus
    };
}

