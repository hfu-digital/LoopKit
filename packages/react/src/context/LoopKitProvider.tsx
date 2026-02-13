import { createContext, useContext, type ReactNode } from 'react';

export interface LoopKitConfig {
    apiUrl: string;
    fetcher?: typeof fetch;
}

const LoopKitContext = createContext<LoopKitConfig | null>(null);

export function useLoopKitConfig(): LoopKitConfig {
    const ctx = useContext(LoopKitContext);
    if (!ctx) {
        throw new Error('useLoopKitConfig must be used within a <LoopKitProvider>');
    }
    return ctx;
}

export interface LoopKitProviderProps {
    apiUrl: string;
    fetcher?: typeof fetch;
    children: ReactNode;
}

export function LoopKitProvider({ apiUrl, fetcher, children }: LoopKitProviderProps) {
    const value: LoopKitConfig = { apiUrl, fetcher };
    return <LoopKitContext.Provider value={value}>{children}</LoopKitContext.Provider>;
}
