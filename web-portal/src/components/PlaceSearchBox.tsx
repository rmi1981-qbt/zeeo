import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';


interface PlaceSearchBoxProps {
    onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

export default function PlaceSearchBox({ onPlaceSelect }: PlaceSearchBoxProps) {
    const places = useMapsLibrary('places');
    const geocoding = useMapsLibrary('geocoding');

    const [query, setQuery] = useState('');
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showDropdown, setShowDropdown] = useState(false);

    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const geocoder = useRef<google.maps.Geocoder | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize services
    useEffect(() => {
        if (!places || !geocoding) return;

        autocompleteService.current = new places.AutocompleteService();
        geocoder.current = new geocoding.Geocoder();

        // PlacesService needs a map or div element
        const div = document.createElement('div');
        placesService.current = new places.PlacesService(div);
    }, [places, geocoding]);

    // Fetch predictions when query changes
    useEffect(() => {
        if (!query || !autocompleteService.current) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            autocompleteService.current!.getPlacePredictions(
                {
                    input: query,
                    componentRestrictions: { country: 'br' },
                },
                (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results);
                        setShowDropdown(true);
                        setSelectedIndex(-1);
                    } else {
                        setPredictions([]);
                        setShowDropdown(false);
                    }
                }
            );
        }, 300); // Debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Handle place selection (either from list or Enter key)
    const selectPlace = async (prediction?: google.maps.places.AutocompletePrediction) => {
        if (!placesService.current && !geocoder.current) return;

        setLoading(true);
        setShowDropdown(false);

        try {
            if (prediction) {
                // User selected from dropdown
                placesService.current!.getDetails(
                    {
                        placeId: prediction.place_id,
                        fields: ['geometry', 'name', 'formatted_address'],
                    },
                    (place, status) => {
                        setLoading(false);
                        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                            setQuery(place.formatted_address || '');
                            onPlaceSelect(place);
                        }
                    }
                );
            } else if (query && geocoder.current) {
                // User pressed Enter without selecting - use Geocoding API
                geocoder.current.geocode(
                    { address: query + ', Brasil' },
                    (results, status) => {
                        setLoading(false);
                        if (status === 'OK' && results && results[0]) {
                            const result = results[0];
                            setQuery(result.formatted_address);
                            onPlaceSelect({
                                geometry: result.geometry,
                                formatted_address: result.formatted_address,
                                name: result.formatted_address,
                            });
                        }
                    }
                );
            }
        } catch (error) {
            console.error('Error selecting place:', error);
            setLoading(false);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown) {
            if (e.key === 'Enter') {
                e.preventDefault();
                selectPlace();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && predictions[selectedIndex]) {
                    selectPlace(predictions[selectedIndex]);
                } else {
                    selectPlace(); // Geocode the raw query
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                setSelectedIndex(-1);
                break;
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={inputRef}>
            {/* Search Input */}
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl shadow-xl flex items-center p-1">
                <Search size={18} className="text-slate-400 ml-2" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                    placeholder="Buscar endereço..."
                    className="bg-transparent border-none text-white text-sm focus:ring-0 focus:outline-none w-full px-3 py-2 placeholder:text-slate-500"
                />
                {loading && <Loader2 size={18} className="text-blue-400 animate-spin mr-2" />}
            </div>

            {/* Predictions Dropdown */}
            {showDropdown && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                    {predictions.map((prediction, index) => (
                        <button
                            key={prediction.place_id}
                            onClick={() => selectPlace(prediction)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-800/50 transition-colors ${selectedIndex === index ? 'bg-slate-800/50' : ''
                                }`}
                        >
                            <MapPin size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-white font-medium truncate">
                                    {prediction.structured_formatting.main_text}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                    {prediction.structured_formatting.secondary_text}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
