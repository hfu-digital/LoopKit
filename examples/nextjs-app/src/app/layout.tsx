import type { Metadata } from 'next';
import { Providers } from './providers';
import '@hfu.digital/loopkit-react/styles.css';

export const metadata: Metadata = {
    title: 'LoopKit Example',
    description: 'Example Next.js app using @hfu.digital/loopkit-react',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
