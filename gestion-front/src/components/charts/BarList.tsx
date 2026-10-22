import { VIZ, BAR_THICKNESS } from '../../constants/viz';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

export interface BarListItem {
    key: string;
    label: string;
    value: number;
    /** Texto chico bajo la etiqueta: cantidad de ítems, unidad, lo que aporte. */
    hint?: string;
}

interface BarListProps {
    items: BarListItem[];
    /** Si no se pasa, se usa el mayor valor de la lista. */
    max?: number;
    emptyMessage?: string;
}

/**
 * Barras horizontales que son a la vez tabla: etiqueta, barra, valor y
 * participación siempre visibles. Una sola tinta — la longitud ya codifica
 * la magnitud, colorear por tamaño la duplicaría.
 */
export const BarList = ({ items, max, emptyMessage = 'Sin datos en el período' }: BarListProps) => {
    if (items.length === 0) {
        return <p className="py-8 text-center text-sm text-slate-400">{emptyMessage}</p>;
    }

    const total = items.reduce((acc, item) => acc + item.value, 0);
    const scaleMax = max ?? Math.max(...items.map((i) => i.value), 1);

    return (
        <ul className="space-y-3">
            {items.map((item) => {
                const share = total > 0 ? (item.value / total) * 100 : 0;
                const width = scaleMax > 0 ? Math.max((item.value / scaleMax) * 100, item.value > 0 ? 1.5 : 0) : 0;

                return (
                    <li key={item.key}>
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                            <span className="text-sm font-semibold text-slate-700 truncate">
                                {item.label}
                                {item.hint && (
                                    <span className="ml-1.5 hidden sm:inline text-xs font-medium text-slate-400">{item.hint}</span>
                                )}
                            </span>
                            <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                                {formatCurrency(item.value)}
                                <span className="ml-2 text-xs font-semibold text-slate-400">
                                    {share.toFixed(share < 10 ? 1 : 0)}%
                                </span>
                            </span>
                        </div>
                        <div
                            className="w-full rounded-sm"
                            style={{ height: BAR_THICKNESS, backgroundColor: VIZ.track }}
                        >
                            <div
                                className="h-full"
                                style={{
                                    width: `${width}%`,
                                    backgroundColor: VIZ.data,
                                    borderRadius: '0 4px 4px 0',
                                }}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

interface StageMeterProps {
    stages: {
        stage_id: number;
        name: string;
        total: number;
        count: number;
        planned_budget: number | null;
    }[];
    emptyMessage?: string;
}

/**
 * Medidor por etapa: lo ejecutado contra lo presupuestado.
 * Cuando una etapa se pasa, el relleno toma el color de excedido y suma
 * ícono y texto — el color por sí solo no alcanza para daltonismo.
 */
export const StageMeter = ({ stages, emptyMessage = 'Este proyecto todavía no tiene etapas' }: StageMeterProps) => {
    if (stages.length === 0) {
        return <p className="py-8 text-center text-sm text-slate-400">{emptyMessage}</p>;
    }

    const anyBudget = stages.some((s) => (s.planned_budget ?? 0) > 0);
    // Sin presupuestos por etapa, la escala común es la etapa más cara.
    const scaleMax = Math.max(...stages.map((s) => Math.max(s.total, s.planned_budget ?? 0)), 1);

    return (
        <ul className="space-y-4">
            {stages.map((stage) => {
                const planned = stage.planned_budget ?? 0;
                const over = planned > 0 && stage.total > planned;
                const pct = planned > 0 ? (stage.total / planned) * 100 : null;

                const fillWidth = planned > 0
                    ? Math.min((stage.total / Math.max(planned, stage.total)) * 100, 100)
                    : (stage.total / scaleMax) * 100;

                const plannedMarker = planned > 0 && over
                    ? (planned / stage.total) * 100
                    : null;

                return (
                    <li key={stage.stage_id}>
                        <div className="flex items-baseline justify-between gap-3 mb-1.5">
                            <span className="text-sm font-semibold text-slate-700 truncate">
                                {stage.name}
                                <span className="ml-1.5 hidden sm:inline text-xs font-medium text-slate-400">
                                    {stage.count} {stage.count === 1 ? 'gasto' : 'gastos'}
                                </span>
                            </span>
                            <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">
                                {formatCurrency(stage.total)}
                                {planned > 0 && (
                                    <span className="ml-2 text-xs font-semibold text-slate-400">
                                        de {formatCurrency(planned)}
                                    </span>
                                )}
                            </span>
                        </div>

                        <div
                            className="relative w-full rounded-sm"
                            style={{
                                height: BAR_THICKNESS,
                                backgroundColor: over ? VIZ.criticalTrack : VIZ.track,
                            }}
                        >
                            <div
                                className="h-full"
                                style={{
                                    width: `${Math.max(fillWidth, stage.total > 0 ? 1.5 : 0)}%`,
                                    backgroundColor: over ? VIZ.critical : VIZ.data,
                                    borderRadius: '0 4px 4px 0',
                                }}
                            />
                            {/* Marca de lo presupuestado cuando la barra la superó */}
                            {plannedMarker != null && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5"
                                    style={{ left: `${plannedMarker}%`, backgroundColor: VIZ.surface }}
                                    aria-hidden
                                />
                            )}
                        </div>

                        {/* El estado nunca viaja sólo en el color */}
                        {over && (
                            <p className="mt-1 text-xs font-bold" style={{ color: VIZ.critical }}>
                                ⚠ Sobre presupuesto · {formatCurrency(stage.total - planned)} de más
                                {pct != null && ` (${Math.round(pct)}%)`}
                            </p>
                        )}
                    </li>
                );
            })}

            {!anyBudget && (
                <li className="pt-1 text-xs text-slate-400">
                    Cargá un presupuesto por etapa en Proyectos para ver el avance contra lo planificado.
                </li>
            )}
        </ul>
    );
};

interface MonthlyColumnsProps {
    months: { month: string; total: number; count: number }[];
}

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const monthLabel = (iso: string) => {
    const [year, month] = iso.split('-');
    const index = Number(month) - 1;
    return { short: MONTH_LABELS[index] ?? month, year: year?.slice(2) ?? '' };
};

/**
 * Ritmo de gasto por mes. Serie única: sin leyenda — el título ya dice qué es.
 * Con pocos meses se etiqueta cada columna; con muchos, sólo el pico.
 */
export const MonthlyColumns = ({ months }: MonthlyColumnsProps) => {
    if (months.length === 0) {
        return <p className="py-8 text-center text-sm text-slate-400">Sin gastos en el período</p>;
    }

    const max = Math.max(...months.map((m) => m.total), 1);
    const peakIndex = months.reduce((best, m, i) => (m.total > months[best].total ? i : best), 0);
    const labelAll = months.length <= 6;

    return (
        <div>
            <div className="flex items-end justify-between gap-2 h-44">
                {months.map((entry, index) => {
                    const height = (entry.total / max) * 100;
                    const showLabel = labelAll || index === peakIndex || index === months.length - 1;
                    const { short, year } = monthLabel(entry.month);

                    return (
                        <div
                            key={entry.month}
                            className="group/col flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5"
                            title={`${short} ${year} · ${formatCurrency(entry.total)} · ${entry.count} ${entry.count === 1 ? 'gasto' : 'gastos'}`}
                        >
                            {showLabel && (
                                <span className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap">
                                    {Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(entry.total)}
                                </span>
                            )}
                            <div
                                className="w-full transition-opacity group-hover/col:opacity-80"
                                style={{
                                    height: `${Math.max(height, entry.total > 0 ? 2 : 0)}%`,
                                    maxWidth: 28,
                                    backgroundColor: VIZ.data,
                                    borderRadius: '4px 4px 0 0',
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Línea base: hairline sólida, recesiva */}
            <div className="h-px w-full" style={{ backgroundColor: VIZ.axis }} />

            <div className="flex justify-between gap-2 pt-1.5">
                {months.map((entry) => {
                    const { short, year } = monthLabel(entry.month);
                    return (
                        <span
                            key={entry.month}
                            className={cn(
                                'flex-1 min-w-0 text-center text-[11px] font-semibold tabular-nums truncate',
                                'text-slate-400'
                            )}
                        >
                            {short}&nbsp;{year}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};
