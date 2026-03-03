import { useState, useEffect, useCallback } from 'react';
import { Delivery, DeliveryStatus } from '@zeeo/shared';
import { deliveryService, ApiDelivery, StatusUpdatePayload } from '../services/deliveryService';
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

const mapApiToUi = (d: ApiDelivery): Delivery => {
    const hasBiometrics = d.driver_photo?.includes('#verified') || false;
    const cleanPhotoUrl = d.driver_photo?.replace('#verified', '');

    return {
        id: d.id,
        status: (d.status as DeliveryStatus) || 'created',
        source: 'webhook_provider',
        provider: (d.platform as any) || 'other',
        externalId: d.id,
        driver_snapshot: {
            name: d.driver_name || 'Desconhecido',
            plate: d.driver_plate || '---',
            photoUrl: cleanPhotoUrl,
            isBiometricVerified: hasBiometrics,
        },
        condoId: d.condo_id,
        target_unit_label: d.unit || 'Portaria',
        target_user_ids: [],
        location: (d.driver_lat && d.driver_lng) ? { lat: d.driver_lat, lng: d.driver_lng } : undefined,
        createdAt: d.created_at,
        updatedAt: d.updated_at || d.created_at,
        current_gate: d.current_gate,
        authorized_by: d.authorized_by,
        authorized_method: d.authorized_method as any,
        authorized_at: d.authorized_at,
        entered_at: d.entered_at,
        exited_at: d.exited_at,
    };
};

export function useDeliveries(condoId: string) {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);

    const fetchDeliveries = useCallback(async () => {
        try {
            if (!condoId || condoId === 'mock') return;
            // For the gatekeeper dashboard, we only want active deliveries
            const data = await deliveryService.getActiveDeliveries(condoId);
            setDeliveries(data.map(mapApiToUi));
        } catch (error) {
            console.error("Failed to load active deliveries", error);
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
        const uniqueChannelName = `deliveries_condo_${condoId}_${Math.random().toString(36).substring(7)}`;
        const subscription = supabase
            .channel(uniqueChannelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deliveries',
                    filter: `condo_id=eq.${condoId}`
                },
                (payload) => {
                    console.log('Realtime change:', payload);
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const baseData = payload.new as ApiDelivery;

                        // We fetch the full delivery from API to get parsed driver_lat/lng
                        // because realtime payload only sends raw WKB driver_location hex
                        deliveryService.getDelivery(baseData.id).then(newData => {
                            if (payload.eventType === 'INSERT') {
                                setDeliveries(prev => {
                                    const filtered = prev.filter(d => d.id !== newData.id);
                                    return [mapApiToUi(newData), ...filtered];
                                });
                            } else {
                                const oldData = payload.old as ApiDelivery;
                                setDeliveries(prev => {
                                    const exists = prev.some(d => d.id === newData.id);
                                    if (exists) {
                                        return prev.map(d => d.id === newData.id ? mapApiToUi(newData) : d);
                                    } else {
                                        // If it's an UPDATE but we don't have it yet (e.g. race condition), add it
                                        return [mapApiToUi(newData), ...prev];
                                    }
                                });

                                // Notifications
                                if ('Notification' in window && Notification.permission === 'granted') {
                                    if (newData.status !== oldData.status) {
                                        if (newData.status === 'approaching') {
                                            new Notification('Entrega Aproximando', {
                                                body: `O motorista ${newData.driver_name || ''} está chegando!`,
                                                icon: '/vite.svg'
                                            });
                                        } else if (newData.status === 'at_gate') {
                                            new Notification('Motorista no Portão', {
                                                body: `O motorista ${newData.driver_name || ''} chegou ao portão!`,
                                                icon: '/vite.svg'
                                            });
                                        }
                                    }
                                }
                            }
                        }).catch(err => {
                            console.error("Failed to sync realtime delivery", err);
                        });

                    } else if (payload.eventType === 'DELETE') {
                        setDeliveries(prev => prev.filter(d => d.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Native custom event from the Simulator App for instant feedback
        const handleLocationUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<{ deliveryId: string, lat: number, lng: number }>;
            const { deliveryId, lat, lng } = customEvent.detail;
            setDeliveries(prev => prev.map(d => {
                if (d.id === deliveryId) {
                    return { ...d, location: { lat, lng } };
                }
                return d;
            }));
        };
        window.addEventListener('delivery-location-updated', handleLocationUpdate);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('delivery-location-updated', handleLocationUpdate);
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

    const updateStatus = useCallback(async (id: string, payload: StatusUpdatePayload) => {
        try {
            // Optimistic Update
            setDeliveries(prev => prev.map(d => {
                if (d.id === id) {
                    const updated = { ...d, status: payload.status as DeliveryStatus };
                    if (payload.driver_lat !== undefined && payload.driver_lng !== undefined) {
                        updated.location = { lat: payload.driver_lat, lng: payload.driver_lng };
                    }
                    return updated;
                }
                return d;
            }));

            if (payload.status === 'inside' && !payload.driver_lat) {
                const loc = getRandomLocation('inside');
                payload.driver_lat = loc.lat;
                payload.driver_lng = loc.lng;
            }

            await deliveryService.updateStatus(id, payload);
            // No need to fetchDeliveries(), Realtime will catch it
        } catch (e) {
            console.error("Failed to update status", e);
            fetchDeliveries();
        }
    }, [fetchDeliveries]);

    return {
        deliveries,
        addMockDelivery,
        updateStatus,
        fetchDeliveries
    };
}
