export type LogType = 'error' | 'warn' | 'info' | 'network';

export interface LogEntry {
    timestamp: string;
    type: LogType;
    message: string;
    data?: any;
}

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalFetch = window.fetch;

export const bugLogger = {
    init() {
        // Intercept Console Error
        console.error = (...args) => {
            bugLogger.addLog('error', args.map(a => String(a)).join(' '));
            originalConsoleError.apply(console, args);
        };

        // Intercept Console Warn
        console.warn = (...args) => {
            bugLogger.addLog('warn', args.map(a => String(a)).join(' '));
            originalConsoleWarn.apply(console, args);
        };

        // Intercept Global Errors
        window.onerror = (message, source, lineno, colno, error) => {
            bugLogger.addLog('error', `Global Error: ${message} at ${source}:${lineno}:${colno}`, { stack: error?.stack });
        };

        // Intercept Unhandled Promise Rejections
        window.onunhandledrejection = (event) => {
            bugLogger.addLog('error', `Unhandled Rejection: ${event.reason}`, { reason: event.reason });
        };

        // Intercept Fetch
        window.fetch = async (...args) => {
            const [resource, config] = args;
            const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : String(resource);
            const method = config?.method || 'GET';

            try {
                const response = await originalFetch(...args);

                if (!response.ok) {
                    // Clone response to read body without consuming it
                    try {
                        const clone = response.clone();
                        const text = await clone.text();
                        bugLogger.addLog('network', `Fetch Error ${response.status}: ${method} ${url}`, {
                            status: response.status,
                            statusText: response.statusText,
                            body: text
                        });
                    } catch (e) {
                        bugLogger.addLog('network', `Fetch Error ${response.status}: ${method} ${url}`, { status: response.status });
                    }
                }
                return response;
            } catch (error) {
                bugLogger.addLog('network', `Fetch Failed: ${method} ${url}`, { error: String(error) });
                throw error;
            }
        };

        bugLogger.addLog('info', 'Bug Logger Initialized');
    },

    addLog(type: LogType, message: string, data?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            type,
            message,
            data
        };
        logs.push(entry);
        if (logs.length > MAX_LOGS) logs.shift();
    },

    getLogs() {
        return [...logs];
    },

    clearLogs() {
        logs.length = 0;
    },

    downloadLogs() {
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};
