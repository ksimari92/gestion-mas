import { CalendarRange, X } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { cn } from '../../utils/cn';

const PRESETS = [
    { label: 'Mes actual', build: () => monthRange(0) },
    { label: 'Mes anterior', build: () => monthRange(-1) },
    { label: 'Últimos 90 días', build: () => lastDays(90) },
    { label: 'Año actual', build: () => yearRange() },
];

const iso = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

function monthRange(offset: number): [string, string] {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return [iso(start), iso(end)];
}

function lastDays(days: number): [string, string] {
    const now = new Date();
    const start = new Date(now.getTime() - days * 86400000);
    return [iso(start), iso(now)];
}

function yearRange(): [string, string] {
    const now = new Date();
    return [iso(new Date(now.getFullYear(), 0, 1)), iso(new Date(now.getFullYear(), 11, 31))];
}

/** Rango de fechas del workspace: presets rápidos más entrada manual. */
export const DateRangeFilter = () => {
    const { dateFrom, dateTo, setDateRange, clearDateRange } = useWorkspaceStore();
    const hasRange = Boolean(dateFrom || dateTo);

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div
                className={cn(
                    'flex items-center gap-1.5 h-10 px-3 rounded-xl border bg-white transition-colors',
                    hasRange ? 'border-agro-600/40' : 'border-slate-200'
                )}
            >
                <CalendarRange size={16} className={hasRange ? 'text-agro-600' : 'text-slate-400'} />
                <input
                    type="date"
                    value={dateFrom ?? ''}
                    onChange={(e) => setDateRange(e.target.value || null, dateTo)}
                    className="w-[7.5rem] bg-transparent text-sm text-slate-700 outline-none"
                    aria-label="Desde"
                />
                <span className="text-slate-300">→</span>
                <input
                    type="date"
                    value={dateTo ?? ''}
                    onChange={(e) => setDateRange(dateFrom, e.target.value || null)}
                    className="w-[7.5rem] bg-transparent text-sm text-slate-700 outline-none"
                    aria-label="Hasta"
                />
                {hasRange && (
                    <button
                        onClick={clearDateRange}
                        className="ml-0.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Limpiar rango"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="hidden xl:flex items-center gap-1">
                {PRESETS.map(({ label, build }) => (
                    <button
                        key={label}
                        onClick={() => {
                            const [from, to] = build();
                            setDateRange(from, to);
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-agro-600 hover:bg-agro-50 transition-colors"
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
};
