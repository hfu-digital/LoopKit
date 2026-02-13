'use client';

import { LoopKitProvider } from '@loopkit/react';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://localhost:3001">
            {children}
        </LoopKitProvider>
    );
}
