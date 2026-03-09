export const getProviderColors = (provider: string = '') => {
    const normalizedProvider = provider.toLowerCase().replace(/\s+/g, '');
    switch (normalizedProvider) {
        case 'ifood': return { bg: 'bg-[#ea1d2c]', shadow: 'shadow-red-600/50', compactBg: 'bg-red-600/20', text: 'text-white' };
        case 'mercadolivre': return { bg: 'bg-[#fff159]', shadow: 'shadow-yellow-400/50', compactBg: 'bg-yellow-400/20', text: 'text-black' };
        case 'uber':
        case 'ubereats': return { bg: 'bg-black', shadow: 'shadow-black/50', compactBg: 'bg-slate-800', text: 'text-white' };
        default: return { bg: 'bg-slate-600', shadow: 'shadow-slate-600/50', compactBg: 'bg-slate-700/50', text: 'text-white' };
    }
};
