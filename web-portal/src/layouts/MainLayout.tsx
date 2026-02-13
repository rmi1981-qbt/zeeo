import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

const MainLayout: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans">
            <Header />
            <main className="flex-1 relative overflow-hidden flex flex-col">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
