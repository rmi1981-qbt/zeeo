import { useState, useEffect } from 'react';
import { Bug, X, Download, Trash2, RefreshCw } from 'lucide-react';
import { bugLogger, LogEntry } from '../lib/bugLogger';

export function BugMonitor() {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        // Init logger when component mounts
        bugLogger.init();

        // Refresh logs every second if open
        const interval = setInterval(() => {
            if (isOpen) {
                setLogs(bugLogger.getLogs());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const handleOpen = () => {
        setLogs(bugLogger.getLogs());
        setIsOpen(true);
    };

    const handleDownload = () => {
        bugLogger.downloadLogs();
    };

    const handleClear = () => {
        bugLogger.clearLogs();
        setLogs([]);
    };

    if (!isOpen) {
        return (
            <button
                onClick={handleOpen}
                className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-500 text-white p-3 rounded-full shadow-lg z-50 transition-all hover:scale-110"
                title="Report Bug / View Logs"
            >
                <Bug size={24} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-950 rounded-t-xl">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bug className="text-red-500" />
                        Bug Monitor & Logs
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setLogs(bugLogger.getLogs())}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                            title="Refresh"
                        >
                            <RefreshCw size={20} />
                        </button>
                        <button
                            onClick={handleClear}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                            title="Clear Logs"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium"
                        >
                            <Download size={16} />
                            Download Logs
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg ml-2"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Log List */}
                <div className="flex-1 overflow-auto p-4 space-y-2 bg-slate-900 font-mono text-sm">
                    {logs.length === 0 ? (
                        <div className="text-center text-slate-500 py-12">
                            No logs recorded yet.
                        </div>
                    ) : (
                        [...logs].reverse().map((log, index) => (
                            <div key={index} className={`p-3 rounded border ${log.type === 'error' ? 'bg-red-950/30 border-red-900/50 text-red-200' :
                                    log.type === 'warn' ? 'bg-yellow-950/30 border-yellow-900/50 text-yellow-200' :
                                        log.type === 'network' ? 'bg-blue-950/30 border-blue-900/50 text-blue-200' :
                                            'bg-slate-800/50 border-slate-700 text-slate-300'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-xs text-slate-500 whitespace-nowrap mt-0.5">
                                        {log.timestamp.split('T')[1].slice(0, -1)}
                                    </span>
                                    <div className="flex-1">
                                        <div className="font-bold mb-1 uppercase text-xs tracking-wider opacity-70">
                                            {log.type}
                                        </div>
                                        <div className="break-all">{log.message}</div>
                                        {log.data && (
                                            <pre className="mt-2 text-xs bg-black/30 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(log.data, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
