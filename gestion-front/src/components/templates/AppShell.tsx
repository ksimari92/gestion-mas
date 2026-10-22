import { ReactNode } from 'react';
import { Sidebar } from '../organisms/Sidebar';
import { Topbar } from '../organisms/Topbar';
import { BottomNav } from '../organisms/BottomNav';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { cn } from '../../utils/cn';

interface AppShellProps {
    children: ReactNode;
    /** Las pantallas densas (planilla) usan todo el ancho; el resto se centra. */
    fluid?: boolean;
}

/**
 * Layout de la herramienta: sidebar fijo en escritorio, navegación
 * inferior en mobile. El contenido queda sin padding lateral en modo
 * fluido para que la planilla llegue a los bordes.
 */
export const AppShell = ({ children, fluid = false }: AppShellProps) => {
    const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />

            <div className={cn('transition-[padding] duration-200 ease-out', collapsed ? 'lg:pl-16' : 'lg:pl-64')}>
                <Topbar />

                <main
                    className={cn(
                        'pb-28 lg:pb-8',
                        fluid ? 'px-0 lg:px-6 pt-4 lg:pt-6' : 'px-4 lg:px-6 pt-4 lg:pt-6'
                    )}
                >
                    <div className={cn(fluid ? 'w-full' : 'mx-auto w-full max-w-[1600px]')}>
                        {children}
                    </div>
                </main>
            </div>

            <BottomNav />
        </div>
    );
};
