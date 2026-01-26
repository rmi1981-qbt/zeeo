import { useState } from 'react';
import Concierge from './pages/Concierge';
import MapEditor from './components/MapEditor';

function App() {
    const [view, setView] = useState<'concierge' | 'admin'>('concierge');

    return (
        <div className="min-h-screen">
            {/* Simple toggle for demo purposes */}
            <div className="fixed bottom-0 right-0 p-2 z-[100] opacity-20 hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => setView('concierge')} className="bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-1 text-xs rounded shadow-lg">Portaria</button>
                <button onClick={() => setView('admin')} className="bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-1 text-xs rounded shadow-lg">Admin (Mapa)</button>
            </div>

            {view === 'concierge' ? (
                <Concierge />
            ) : (
                <div className="h-screen w-full bg-slate-950 p-8 flex flex-col">
                    <MapEditor onGeofenceChange={(geo) => console.log('Geofence Updated:', geo)} />
                </div>
            )}
        </div>
    );
}

export default App;
