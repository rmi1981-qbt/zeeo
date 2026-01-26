import { useState, useEffect, useCallback } from 'react';
import { Delivery, DeliveryStatus } from '@zeeo/shared';

// --- Mock Utils ---
const NAMES = ['Carlos Oliveira', 'Fernanda Santos', 'Roberto Silva', 'Mariana Costa', 'João Pereira'];
const PLATES = ['ABC-1234', 'XYZ-9876', 'KJI-5544', 'BRA-2024', 'ZEE-0000'];
const PHOTOS = [
    'https://randomuser.me/api/portraits/men/32.jpg',
    'https://randomuser.me/api/portraits/women/44.jpg',
    'https://randomuser.me/api/portraits/men/64.jpg',
    'https://randomuser.me/api/portraits/women/12.jpg',
    'https://randomuser.me/api/portraits/men/85.jpg'
];
const PROVIDERS: ('ifood' | 'uber' | 'rappi' | 'mercadolivre')[] = ['ifood', 'uber', 'rappi', 'mercadolivre'];

// Center Point (Condo Entrance) - Example SP
const CENTER = { lat: -23.5505, lng: -46.6333 };

const getRandomLocation = (type: 'inside' | 'outside') => {
    const r = type === 'inside' ? 0.001 : 0.005; // Small radius for inside, larger for outside
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * r;

    return {
        lat: CENTER.lat + distance * Math.cos(angle),
        lng: CENTER.lng + distance * Math.sin(angle)
    };
};

export function useDeliveries(condoId: string) {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);

    // Initial Load
    useEffect(() => {
        // In a real app, this would be onSnapshot from Firestore
        setDeliveries([
            {
                id: '1',
                status: 'arriving', // Critical attention
                source: 'webhook_provider',
                provider: 'ifood',
                externalId: '123',
                driver_snapshot: { name: 'Carlos Oliveira', plate: 'ABC-1234', photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg', documentHash: 'valid' },
                condoId,
                target_unit_label: 'Apto 101',
                target_user_ids: ['user1'],
                location: getRandomLocation('outside'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '2',
                status: 'pre_authorized', // Critical attention
                source: 'webhook_provider',
                provider: 'uber',
                externalId: '456',
                driver_snapshot: { name: 'Fernanda Santos', plate: 'XYZ-9876', photoUrl: 'https://randomuser.me/api/portraits/women/44.jpg' },
                condoId,
                target_unit_label: 'Apto 502',
                target_user_ids: ['user2'],
                location: getRandomLocation('outside'),
                createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '4',
                status: 'at_gate', // Testing Planner
                source: 'webhook_provider',
                provider: 'mercadolivre',
                externalId: '789',
                driver_snapshot: { name: 'Marcos Souza', plate: 'MLX-9988' },
                condoId,
                target_unit_label: 'Apto 22',
                target_user_ids: ['user3'],
                location: getRandomLocation('outside'), // Still outside, but at gate
                createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '3',
                status: 'inside', // Inside the condo
                source: 'app_zeeo',
                provider: 'other',
                driver_snapshot: { name: 'João Pereira', plate: 'KJI-5544' },
                condoId,
                target_unit_label: 'Manutenção',
                target_user_ids: ['admin'],
                location: getRandomLocation('inside'),
                createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                updatedAt: new Date().toISOString()
            }
        ]);
    }, [condoId]);

    const addMockDelivery = useCallback(() => {
        const randomIdx = Math.floor(Math.random() * NAMES.length);
        const newDelivery: Delivery = {
            id: Math.random().toString(36).substr(2, 9),
            status: 'arriving', // Always starts as arriving for impact
            source: 'webhook_provider',
            provider: PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)],
            externalId: Math.random().toString(),
            driver_snapshot: {
                name: NAMES[randomIdx],
                plate: PLATES[randomIdx],
                photoUrl: PHOTOS[randomIdx],
                documentHash: Math.random() > 0.5 ? 'valid' : undefined
            },
            condoId,
            target_unit_label: `Apto ${Math.floor(Math.random() * 800) + 100}`,
            target_user_ids: ['mock_user'],
            location: getRandomLocation('outside'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setDeliveries(prev => [newDelivery, ...prev]);
    }, [condoId]);

    const updateStatus = useCallback((id: string, newStatus: DeliveryStatus) => {
        setDeliveries(prev => prev.map(d => {
            if (d.id !== id) return d;

            // If moving to inside, update location to inside
            let newLocation = d.location;
            if (newStatus === 'inside') {
                newLocation = getRandomLocation('inside');
            }

            return {
                ...d,
                status: newStatus,
                location: newLocation,
                updatedAt: new Date().toISOString()
            };
        }));
    }, []);

    return {
        deliveries,
        addMockDelivery,
        updateStatus
    };
}
