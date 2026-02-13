import { useEffect, useState, useRef } from 'react';
import PerimeterMap from './PerimeterMap';

interface SimplePerimeterMapProps {
    initialCenter?: { lat: number; lng: number };
    initialPolygon?: { lat: number; lng: number }[];
    onPolygonChange: (polygon: { lat: number; lng: number }[]) => void;
}

const DEFAULT_CENTER = { lat: -23.5505, lng: -46.6333 };

export default function SimplePerimeterMap({
    initialCenter,
    initialPolygon,
    onPolygonChange
}: SimplePerimeterMapProps) {
    // Use DEFAULT_CENTER if initialCenter is undefined or null
    const centerToUse = initialCenter || DEFAULT_CENTER;

    const [center, setCenter] = useState(centerToUse);
    const lastCenterRef = useRef(centerToUse);

    // Update center when initialCenter changes (when user enters new address)
    useEffect(() => {
        const last = lastCenterRef.current;
        const current = centerToUse;

        // Compare values, not references, to avoid loops
        if (current.lat !== last.lat || current.lng !== last.lng) {
            console.log('SimplePerimeterMap: initialCenter changed', current);
            setCenter(current);
            lastCenterRef.current = current;
        }
    }, [centerToUse.lat, centerToUse.lng]); // Depend on values

    return (
        <div className="w-full h-full">
            <PerimeterMap
                initialCenter={center}
                initialPolygon={initialPolygon}
                onPolygonChange={(path: { lat: number; lng: number }[]) => {
                    // console.log('SimplePerimeterMap: Polygon changed', path.length);
                    onPolygonChange(path);
                }}
            />
        </div>
    );
}
