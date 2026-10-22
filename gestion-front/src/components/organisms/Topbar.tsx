import { Sprout } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ProjectSelector } from '../molecules/ProjectSelector';
import { DateRangeFilter } from '../molecules/DateRangeFilter';

/** Barra superior: contexto de trabajo (proyecto + período) compartido por todas las pantallas. */
export const Topbar = () => {
    const user = useAuthStore((s) => s.user);
    const initials = (user?.name ?? '?')
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

    return (
        <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200">
            <div className="h-full px-4 lg:px-6 flex items-center gap-3">
                {/* Marca sólo en mobile: en desktop la lleva el sidebar */}
                <div className="lg:hidden flex items-center gap-2 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-agro-600 grid place-items-center text-white">
                        <Sprout size={18} strokeWidth={2.5} />
                    </div>
                </div>

                <ProjectSelector />

                <div className="hidden md:block ml-auto">
                    <DateRangeFilter />
                </div>

                <div className="ml-auto md:ml-3 shrink-0 w-9 h-9 rounded-full bg-agro-50 text-agro-600 grid place-items-center text-xs font-black">
                    {initials}
                </div>
            </div>
        </header>
    );
};
