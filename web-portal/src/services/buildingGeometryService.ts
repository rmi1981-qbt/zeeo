const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export interface BuildingPolygon {
    coordinates: { lat: number; lng: number }[];
    center: { lat: number; lng: number };
}

class BuildingGeometryService {
    private readonly GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

    /**
     * Attempts to fetch building polygon from Google Geocoding API
     * Returns null if no building geometry is available
     */
    async getBuildingPolygon(address: string): Promise<BuildingPolygon | null> {
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn('Google Maps API key not configured');
            return null;
        }

        try {
            const params = new URLSearchParams({
                address: address,
                key: GOOGLE_MAPS_API_KEY,
                extra_computations: 'BUILDING_AND_ENTRANCES'
            });

            const response = await fetch(`${this.GEOCODING_URL}?${params}`);

            if (!response.ok) {
                console.error('Geocoding API request failed');
                return null;
            }

            const data = await response.json();

            if (data.status !== 'OK' || !data.results || data.results.length === 0) {
                return null;
            }

            const result = data.results[0];

            // Check if building geometry is available
            if (result.geometry?.building) {
                const building = result.geometry.building;

                // Building polygon is in the "building" field as an array of lat/lng
                if (building.polygon && Array.isArray(building.polygon)) {
                    const coordinates = building.polygon.map((point: any) => ({
                        lat: point.lat,
                        lng: point.lng
                    }));

                    const center = result.geometry.location;

                    return {
                        coordinates,
                        center: {
                            lat: center.lat,
                            lng: center.lng
                        }
                    };
                }
            }

            // Fallback: check if there's a viewport we can use (less precise)
            // This won't be a perfect building outline but better than nothing
            if (result.geometry?.viewport) {
                const viewport = result.geometry.viewport;
                const center = result.geometry.location;

                // Create a simple rectangle from viewport bounds
                const coordinates = [
                    { lat: viewport.northeast.lat, lng: viewport.northeast.lng },
                    { lat: viewport.northeast.lat, lng: viewport.southwest.lng },
                    { lat: viewport.southwest.lat, lng: viewport.southwest.lng },
                    { lat: viewport.southwest.lat, lng: viewport.northeast.lng }
                ];

                return {
                    coordinates,
                    center: {
                        lat: center.lat,
                        lng: center.lng
                    }
                };
            }

            return null;
        } catch (error) {
            console.error('Error fetching building geometry:', error);
            return null;
        }
    }

    /**
     * Gets coordinates for an address (simpler, always works)
     */
    async getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn('Google Maps API key not configured');
            return null;
        }

        try {
            const params = new URLSearchParams({
                address: address,
                key: GOOGLE_MAPS_API_KEY
            });

            const response = await fetch(`${this.GEOCODING_URL}?${params}`);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            if (data.status !== 'OK' || !data.results || data.results.length === 0) {
                return null;
            }

            const location = data.results[0].geometry.location;
            return {
                lat: location.lat,
                lng: location.lng
            };
        } catch (error) {
            console.error('Error fetching coordinates:', error);
            return null;
        }
    }
}

export const buildingGeometryService = new BuildingGeometryService();
