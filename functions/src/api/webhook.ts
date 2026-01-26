import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GeofenceService } from '../services/geofence';
import { UnitService } from '../services/lookup';
import { Delivery, Condo } from '@zeeo/shared';

// Definição do Payload esperado do Webhook (Exemplo Genérico baseado em iFood/Loggi)
interface WebhookPayload {
    orderId: string;
    driver: {
        name: string;
        plate: string;
        photoUrl?: string;
    };
    destination: {
        address: {
            text: string;
            coordinates?: {
                lat: number;
                lng: number;
            }
        };
        complement?: string; // Ex: "Apto 101"
    };
}

export const handleDeliveryWebhook = functions.https.onRequest(async (req, res) => {
    try {
        const payload = req.body as WebhookPayload;
        const db = admin.firestore();

        console.log('[ZEEO] Webhook Recebido:', JSON.stringify(payload));

        if (!payload.destination) {
            res.status(400).send('Invalid Payload: Missing destination');
            return;
        }

        // 1. Identificação do Condomínio (Simplificada por Address Texto para MVP ou GeoMatch)
        // Num caso real, buscaríamos todos os condos da cidade e faríamos PointInPolygon.
        // Para este MVP, vamos simular busca por endereço textual exato ou um ID passado no header (mock).

        let targetCondo: Condo | null = null;

        // Cenario A: Busca por Coordinates (Geofence Match)
        if (payload.destination.address.coordinates) {
            const { lat, lng } = payload.destination.address.coordinates;

            // NOTA: Em produção, usar GeoHash para filtrar candidatos antes!
            // Aqui, varremos (limitado) para demo.
            const condosSnap = await db.collection('condos').limit(50).get();

            for (const doc of condosSnap.docs) {
                const condo = doc.data() as Condo;
                if (GeofenceService.isPointInGeofence({ lat, lng }, condo.geofence)) {
                    targetCondo = { ...condo, id: doc.id };
                    break;
                }
            }
        }

        // Cenario B: Fallback por String Address
        if (!targetCondo) {
            const hasCandidates = await db.collection('condos')
                .where('address_normalized', '==', payload.destination.address.text) // Idealmente slugified
                .limit(1)
                .get();

            if (!hasCandidates.empty) {
                const d = hasCandidates.docs[0];
                targetCondo = { ...(d.data() as Condo), id: d.id };
            }
        }

        if (!targetCondo) {
            console.log('[ZEEO] Address not covered:', payload.destination.address.text);
            res.status(200).send('Address not covered by Zeeo');
            return;
        }

        // 2. Reverse Lookup (Unidade e Moradores)
        // Extrai "101" de "Apto 101" (RegEx simples)
        const rawComplement = payload.destination.complement || "";
        // Regex tenta pegar números. Ajustar conforme padrão do iFood.
        const unitMatch = rawComplement.match(/\d+/);
        const unitLabel = unitMatch ? unitMatch[0] : rawComplement;

        const { unit, residentIds } = await UnitService.resolveDestination(targetCondo.id, unitLabel);

        // 3. Criação da Entrega (Fast Track)
        const newDelivery: Delivery = {
            id: db.collection('deliveries').doc().id, // Auto-gen ID
            status: 'pre_authorized',
            source: 'webhook_provider',
            provider: 'ifood', // Mock provider
            externalId: payload.orderId,
            condoId: targetCondo.id,
            target_unit_label: payload.destination.complement || "N/A",
            target_user_ids: residentIds,
            driver_snapshot: {
                name: payload.driver.name,
                plate: payload.driver.plate,
                photoUrl: payload.driver.photoUrl
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Salva no Firestore
        await db.collection('deliveries').doc(newDelivery.id).set(newDelivery);

        console.log(`[ZEEO] Delivery Created: ${newDelivery.id} for Condo: ${targetCondo.name}`);

        // (Opcional) Trigger Push Notifications Here
        // const tokens = await UnitService.getPushTokens(residentIds);
        // await sendPush(tokens, ...);

        res.status(201).json({ success: true, deliveryId: newDelivery.id });

    } catch (error) {
        console.error('[ZEEO] Webhook Error:', error);
        res.status(500).send('Internal Server Error');
    }
});
