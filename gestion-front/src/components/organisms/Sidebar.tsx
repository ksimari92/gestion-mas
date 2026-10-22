import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Table2, TrendingUp, Users, FolderKanban,
    PanelLeftClose, PanelLeftOpen, LogOut, Sprout
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Panel', end: true },
    { to: '/costos', icon: Table2, label: 'Costos' },
    { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
    { to: '/income', icon: TrendingUp, label: 'Ventas' },
    { to: '/clients', icon: Users, label: 'Clientes' },
];

export const Sidebar = () => {
    const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    return (
        <aside
            className={cn(
                'hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-agro-600 text-white',
                'transition-[width] duration-200 ease-out',
                collapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Marca */}
            <div className={cn('flex items-center gap-3 h-16 px-4 border-b border-white/10', collapsed && 'justify-center px-0')}>
                <div className="shrink-0 w-9 h-9 rounded-xl bg-white/10 grid place-items-center">
                    <Sprout size={20} strokeWidth={2.5} />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight truncate">Gestión MAS</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Producción</p>
                    </div>
                )}
            </div>

            {/* Navegación */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 rounded-xl h-11 text-sm font-medium transition-colors',
                                collapsed ? 'justify-center px-0' : 'px-3',
                                isActive
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                            )
                        }
                    >
                        <Icon size={19} strokeWidth={2.2} className="shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Usuario y colapso */}
            <div className="border-t border-white/10 p-2 space-y-1">
                {!collapsed && user && (
                    <div className="px-3 py-2">
                        <p className="text-sm font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-white/50 truncate">{user.email}</p>
                    </div>
                )}
                <button
                    onClick={logout}
                    title={collapsed ? 'Cerrar sesión' : undefined}
                    className={cn(
                        'w-full flex items-center gap-3 rounded-xl h-10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors',
                        collapsed ? 'justify-center px-0' : 'px-3'
                    )}
                >
                    <LogOut size={18} strokeWidth={2.2} className="shrink-0" />
                    {!collapsed && <span>Cerrar sesión</span>}
                </button>
                <button
                    onClick={toggleSidebar}
                    title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                    className={cn(
                        'w-full flex items-center gap-3 rounded-xl h-10 text-sm font-medium text-white/40 hover:text-white hover:bg-white/10 transition-colors',
                        collapsed ? 'justify-center px-0' : 'px-3'
                    )}
                >
                    {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    {!collapsed && <span>Colapsar</span>}
                </button>
            </div>
        </aside>
    );
};
