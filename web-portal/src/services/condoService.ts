import { supabase } from '../lib/supabase';

export interface Condo {
    id: string;
    name: string;
    perimeter: any; // GeoJSON
    address?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    created_at: string;
}

export const condoService = {
    async saveCondo(data: Omit<Condo, 'id' | 'created_at'> & { perimeter: { lat: number, lng: number }[] }) {
        if (data.perimeter.length < 3) throw new Error('Perimeter must have at least 3 points');

        // Close the polygon if not closed
        const points = [...data.perimeter];
        if (points[0].lat !== points[points.length - 1].lat || points[0].lng !== points[points.length - 1].lng) {
            points.push(points[0]);
        }

        // Convert to WKT (Well-Known Text) for PostGIS Geography
        // Format: POLYGON((lng lat, lng lat, ...))
        const coordsStr = points.map(p => `${p.lng} ${p.lat}`).join(',');
        const wkt = `POLYGON((${coordsStr}))`;

        const { data: result, error } = await supabase
            .from('condominiums')
            .insert({
                name: data.name,
                perimeter: wkt, // Send WKT string
                address: data.address,
                number: data.number,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
                zip_code: data.zip_code
            })
            .select() // This might fail if it tries to return geography, but let's see. 
            // Better to not select or select only ID.
            .select('id, name, created_at')
            .single();

        if (error) throw error;
        return result;
    },

    async getCondos() {
        // Use the RPC function to get valid GeoJSON
        const { data, error } = await supabase.rpc('get_condos');

        if (error) throw error;
        return data as Condo[];
    }
};
