import * as admin from 'firebase-admin';
import { Unit } from '@zeeo/shared';

export class UnitService {

    /**
     * Realiza o "Reverse Lookup": Encontra a Unidade e os Moradores baseando-se no Label (ex: "101")
     * e no ID do Condomínio.
     */
    static async resolveDestination(condoId: string, unitLabel: string): Promise<{
        unit: Unit | null,
        residentIds: string[]
    }> {
        const db = admin.firestore();

        // Normalização básica para busca (pode ser melhorada com slugify)
        // Assumindo que o "label" no banco está "101" e o input é "101"

        const snapshot = await db.collection(`condos/${condoId}/units`)
            .where('label', '==', unitLabel)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { unit: null, residentIds: [] };
        }

        const doc = snapshot.docs[0];
        const unitData = doc.data() as Unit; // Cast cuidadoso aqui

        // Garante retorno do ID junto com dados
        const unit: Unit = { ...unitData, id: doc.id };

        return {
            unit,
            residentIds: unit.residentIds || []
        };
    }

    /**
     * Busca os tokens de push dos usuários para notificação.
     */
    static async getPushTokens(userIds: string[]): Promise<string[]> {
        if (userIds.length === 0) return [];

        const db = admin.firestore();
        // Firestore 'in' query suporta até 10 itens. Se userIds > 10, precisaria quebrar em chunks.
        // Para MVP assumimos < 10 moradores por unidade.

        const usersSnap = await db.collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', userIds)
            .get();

        let tokens: string[] = [];

        usersSnap.forEach(doc => {
            const userData = doc.data();
            if (userData.pushTokens && Array.isArray(userData.pushTokens)) {
                tokens = tokens.concat(userData.pushTokens);
            }
        });

        return tokens;
    }
}
