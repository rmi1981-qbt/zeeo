import * as turf from '@turf/turf';
import { Geofence, GeoPoint } from '@zeeo/shared';

export class GeofenceService {
    /**
     * Verifica se um ponto (Lat/Lng) está dentro de uma Geofence (Polígono).
     */
    static isPointInGeofence(point: GeoPoint, geofence: Geofence): boolean {
        if (!geofence || !geofence.coordinates || geofence.coordinates.length === 0) {
            return false;
        }

        try {
            const pt = turf.point([point.lng, point.lat]); // Turf usa ordem [lng, lat]
            const poly = turf.polygon(geofence.coordinates);

            return turf.booleanPointInPolygon(pt, poly);
        } catch (error) {
            console.error('Error validating geofence:', error);
            return false;
        }
    }

    /**
     * Valida se o polígono é fechado e válido.
     */
    static validatePolygon(coordinates: number[][][]): boolean {
        // Implementar validações extras se necessário (ex: no mínimo 3 pontos, fechado)
        if (coordinates.length < 1) return false;
        const ring = coordinates[0];
        if (ring.length < 4) return false; // Triângulo fechado precisa de 4 pontos (A,B,C,A)
        return true;
    }
}
