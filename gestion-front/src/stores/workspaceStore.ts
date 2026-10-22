import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Estado del workspace de escritorio: qué proyecto se está mirando,
 * el período activo y el estado del sidebar. Se persiste para que la
 * herramienta abra donde quedó.
 */
interface WorkspaceState {
    /** null = todos los proyectos; 'none' = gastos sin proyecto asignado. */
    activeProjectId: number | 'none' | null;
    sidebarCollapsed: boolean;
    dateFrom: string | null;
    dateTo: string | null;
    setActiveProject: (id: number | 'none' | null) => void;
    toggleSidebar: () => void;
    setDateRange: (from: string | null, to: string | null) => void;
    clearDateRange: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            activeProjectId: null,
            sidebarCollapsed: false,
            dateFrom: null,
            dateTo: null,
            setActiveProject: (activeProjectId) => set({ activeProjectId }),
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
            clearDateRange: () => set({ dateFrom: null, dateTo: null }),
        }),
        {
            name: 'workspace-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
