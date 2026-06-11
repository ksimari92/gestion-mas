import { ReactNode } from 'react';
import { BottomNav } from '../organisms/BottomNav';

interface MobileLayoutProps {
    children: ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Content Area */}
            <main className="w-full max-w-2xl mx-auto">
                {children}
            </main>

            {/* Fixed Bottom Navigation */}
            <BottomNav />
        </div>
    );
};
