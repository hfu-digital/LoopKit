'use client';

import { LoopKitProvider } from '@hfu.digital/loopkit-react';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://localhost:3001">
            {children}
        </LoopKitProvider>
    );
}
