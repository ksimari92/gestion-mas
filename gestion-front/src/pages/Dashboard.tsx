import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
    AlertTriangle, ArrowRight, CheckCircle2, Clock, FolderPlus,
    Loader2, Table2, TrendingDown, TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { BarList, StageMeter, MonthlyColumns } from '../components/charts/BarList';
import { CATEGORY_LABELS } from '../constants/expenses';
import { VIZ } from '../constants/viz';
import { formatCurrency, formatDateLong } from '../utils/format';
import { cn } from '../utils/cn';

export const Dashboard = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
    const dateFrom = useWorkspaceStore((s) => s.dateFrom);
    const dateTo = useWorkspaceStore((s) => s.dateTo);

    const filters = useMemo(() => ({
        project_id: activeProjectId ?? undefined,
        from: dateFrom ?? undefined,
        to: dateTo ?? undefined,
    }), [activeProjectId, dateFrom, dateTo]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['metrics', 'dashboard', filters],
        queryFn: () => api.metrics.getDashboard(filters),
        placeholderData: (previous) => previous, // sin parpadeo de esqueleto al refiltrar
    });

    const { data: movements = [] } = useQuery({
        queryKey: ['metrics', 'movements', filters],
        queryFn: () => api.metrics.getMovements(8, filters),
    });

    if (isLoading || !data) {
        return (
            <div className="h-64 grid place-items-center text-slate-400">
                <Loader2 size={24} className="animate-spin" />
            </div>
        );
    }

    const { costs, budget, unit_cost, benchmark, receivables, cash, project } = data;
    const hasAnyData = costs.count > 0 || receivables.total_billed > 0;

    // ── Alertas: cada una lleva a la pantalla donde se resuelve ──────────────
    const overStages = costs.by_stage.filter(
        (s) => s.planned_budget != null && s.planned_budget > 0 && s.total > s.planned_budget
    );

    const alerts: { key: string; text: string; detail: string; to: string; severity: 'critical' | 'warning' }[] = [];

    if (budget && budget.remaining < 0) {
        alerts.push({
            key: 'budget',
            severity: 'critical',
            text: 'El proyecto superó su presupuesto',
            detail: `${formatCurrency(Math.abs(budget.remaining))} por encima de lo planificado`,
            to: '/proyectos',
        });
    }

    overStages.forEach((stage) => {
        alerts.push({
            key: `stage-${stage.stage_id}`,
            severity: 'critical',
            text: `La etapa ${stage.name} se pasó de presupuesto`,
            detail: `${formatCurrency(stage.total - (stage.planned_budget ?? 0))} de más`,
            to: '/costos',
        });
    });

    if (receivables.overdue_amount > 0) {
        alerts.push({
            key: 'overdue',
            severity: 'warning',
            text: `${formatCurrency(receivables.overdue_amount)} sin cobrar hace más de ${benchmark.aging_threshold_days} días`,
            detail: `${receivables.overdue_count} ${receivables.overdue_count === 1 ? 'venta' : 'ventas'} con saldo pendiente`,
            to: '/clients',
        });
    }

    if (costs.without_stage.count > 0 && project) {
        alerts.push({
            key: 'no-stage',
            severity: 'warning',
            text: `${costs.without_stage.count} ${costs.without_stage.count === 1 ? 'gasto' : 'gastos'} sin etapa asignada`,
            detail: `${formatCurrency(costs.without_stage.total)} que no suman a ningún avance`,
            to: '/costos',
        });
    }

    if (costs.without_project.count > 0 && !project) {
        alerts.push({
            key: 'no-project',
            severity: 'warning',
            text: `${costs.without_project.count} ${costs.without_project.count === 1 ? 'gasto' : 'gastos'} sin proyecto`,
            detail: `${formatCurrency(costs.without_project.total)} fuera de toda campaña`,
            to: '/costos',
        });
    }

    // ── Contexto del hero: la comparación es lo que vuelve útil al número ────
    const unitLabel = unit_cost?.unit ?? 'unidad';
    const peerDelta = unit_cost && benchmark.peer_average
        ? ((unit_cost.value - benchmark.peer_average) / benchmark.peer_average) * 100
        : null;

    const periodLabel = dateFrom || dateTo
        ? `${dateFrom ? formatDateLong(dateFrom) : 'inicio'} → ${dateTo ? formatDateLong(dateTo) : 'hoy'}`
        : costs.by_month.length > 0
            ? 'Todo el historial cargado'
            : 'Sin período acotado';

    if (!hasAnyData) {
        return <EmptyState hasProject={Boolean(project)} />;
    }

    return (
        <div className={cn('space-y-5 transition-opacity', isFetching && 'opacity-60')}>
            {/* Encabezado con contexto */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        Hola, {user?.name?.split(' ')[0] ?? 'equipo'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {project ? project.name : activeProjectId === 'none' ? 'Gastos sin proyecto' : 'Todos los proyectos'}
                        <span className="text-slate-300"> · </span>
                        {periodLabel}
                    </p>
                </div>
                <Link
                    to="/costos"
                    className="h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold hover:bg-agro-800 transition-colors inline-flex items-center gap-2 shadow-sm"
                >
                    <Table2 size={16} /> Ir a la planilla
                </Link>
            </div>

            {/* Alertas primero: es lo único que pide una acción */}
            {alerts.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <h2 className="px-4 pt-3.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Requiere tu atención
                    </h2>
                    <ul className="divide-y divide-slate-100">
                        {alerts.map((alert) => (
                            <li key={alert.key}>
                                <button
                                    onClick={() => navigate(alert.to)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <AlertTriangle
                                        size={17}
                                        className="shrink-0"
                                        style={{ color: alert.severity === 'critical' ? VIZ.critical : VIZ.warning }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-800 truncate">{alert.text}</p>
                                        <p className="text-xs text-slate-500 truncate">{alert.detail}</p>
                                    </div>
                                    <ArrowRight size={16} className="shrink-0 text-slate-300" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : (
                <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <CheckCircle2 size={17} style={{ color: VIZ.data }} className="shrink-0" />
                    <p className="text-sm font-semibold text-slate-600">
                        Sin desvíos de presupuesto ni saldos demorados.
                    </p>
                </div>
            )}

            {/* Hero + indicadores con contexto */}
            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div className="rounded-2xl border border-agro-600/20 bg-agro-50 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-agro-600/70">
                        {unit_cost ? `Costo por ${unitLabel}` : 'Costo total del período'}
                    </p>
                    <p className="mt-1 text-[2.75rem] leading-none font-black text-agro-600">
                        {formatCurrency(unit_cost ? unit_cost.value : costs.total)}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                        {unit_cost
                            ? `${formatCurrency(costs.total)} sobre ${unit_cost.size} ${unitLabel}`
                            : `${costs.count} ${costs.count === 1 ? 'gasto cargado' : 'gastos cargados'}`}
                    </p>
                    {peerDelta != null && benchmark.peer_average != null ? (
                        <p className="mt-1 text-xs font-bold inline-flex items-center gap-1 flex-wrap"
                            style={{ color: peerDelta > 0 ? VIZ.critical : VIZ.data }}>
                            {peerDelta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            {peerDelta > 0 ? '+' : ''}{peerDelta.toFixed(0)}%
                            {/* Se nombra contra qué compara: un promedio anónimo no deja
                                juzgar si la comparación es justa. */}
                            <span className="font-medium text-slate-400">
                                vs {benchmark.peers.length === 1
                                    ? benchmark.peers[0].name
                                    : `el promedio de ${benchmark.peers.length} campañas`}
                                {' '}({formatCurrency(benchmark.peer_average)}/{unitLabel})
                            </span>
                        </p>
                    ) : unit_cost ? (
                        <p className="mt-1 text-xs text-slate-400">
                            Todavía no hay otra campaña medida en {unitLabel} para comparar
                        </p>
                    ) : null}
                </div>

                <StatTile
                    label="Presupuesto"
                    value={budget ? `${budget.pct ?? 0}%` : 'Sin definir'}
                    muted={!budget}
                    footer={
                        budget ? (
                            <>
                                <div className="h-1.5 w-full rounded-sm mt-2 mb-1.5" style={{ backgroundColor: budget.remaining < 0 ? VIZ.criticalTrack : VIZ.track }}>
                                    <div
                                        className="h-full"
                                        style={{
                                            width: `${Math.min(budget.pct ?? 0, 100)}%`,
                                            backgroundColor: budget.remaining < 0 ? VIZ.critical : VIZ.data,
                                            borderRadius: '0 4px 4px 0',
                                        }}
                                    />
                                </div>
                                <span className={budget.remaining < 0 ? 'font-bold' : ''} style={budget.remaining < 0 ? { color: VIZ.critical } : undefined}>
                                    {budget.remaining >= 0
                                        ? `Quedan ${formatCurrency(budget.remaining)}`
                                        : `${formatCurrency(Math.abs(budget.remaining))} por encima`}
                                </span>
                            </>
                        ) : (
                            <Link to="/proyectos" className="font-semibold text-agro-600 hover:underline">
                                Definilo en Proyectos
                            </Link>
                        )
                    }
                />

                <StatTile
                    label="Por cobrar"
                    value={formatCurrency(receivables.pending)}
                    footer={
                        <>
                            {receivables.overdue_amount > 0 ? (
                                <span className="font-bold inline-flex items-center gap-1" style={{ color: VIZ.warning }}>
                                    <Clock size={12} />
                                    {formatCurrency(receivables.overdue_amount)} hace +{benchmark.aging_threshold_days} días
                                </span>
                            ) : receivables.pending > 0 ? (
                                <span>Todo dentro de los {benchmark.aging_threshold_days} días</span>
                            ) : (
                                <span>Sin saldos pendientes</span>
                            )}
                            {project && (
                                <span className="block mt-0.5 text-slate-400">
                                    De toda la empresa: las ventas no se asignan a una campaña
                                </span>
                            )}
                        </>
                    }
                />

                <StatTile
                    label="Cobrado menos gastado"
                    value={formatCurrency(cash.net)}
                    negative={cash.net < 0}
                    footer={
                        <span>
                            {formatCurrency(cash.income)} cobrado · {formatCurrency(cash.expenses)} gastado
                        </span>
                    }
                />
            </section>

            {/* Dónde se va la plata */}
            <section className="grid gap-4 lg:grid-cols-2">
                <Card
                    title="Avance por etapa"
                    subtitle={project ? 'Ejecutado contra lo presupuestado' : 'Elegí un proyecto para ver sus etapas'}
                    action={<Link to="/costos" className="text-xs font-bold text-agro-600 hover:underline">Ver planilla</Link>}
                >
                    <StageMeter
                        stages={costs.by_stage}
                        emptyMessage={project ? 'Este proyecto todavía no tiene etapas' : 'Seleccioná un proyecto arriba para ver el avance por etapa'}
                    />
                </Card>

                <Card
                    title="En qué se va el gasto"
                    subtitle="Participación de cada categoría en el período"
                >
                    <BarList
                        items={costs.by_category.map((row) => ({
                            key: row.category,
                            label: CATEGORY_LABELS[row.category] ?? row.category,
                            value: row.total,
                            hint: `${row.count}`,
                        }))}
                    />
                </Card>
            </section>

            {/* Ritmo y cobranzas */}
            <section className="grid gap-4 lg:grid-cols-2">
                <Card title="Ritmo de gasto" subtitle="Total cargado por mes">
                    <MonthlyColumns months={costs.by_month} />
                </Card>

                <Card
                    title="Quién debe"
                    subtitle="Saldos pendientes de toda la empresa, del mayor al menor"
                    action={<Link to="/clients" className="text-xs font-bold text-agro-600 hover:underline">Ver clientes</Link>}
                >
                    {receivables.top_debtors.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-400">Nadie tiene saldo pendiente</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 -my-2">
                            {receivables.top_debtors.map((debtor) => (
                                <li key={debtor.client_id}>
                                    <Link
                                        to={`/clients/${debtor.client_id}`}
                                        className="flex items-center justify-between gap-3 py-2.5 group"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-agro-600 transition-colors">
                                                {debtor.name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                más antiguo: {debtor.oldest_days} {debtor.oldest_days === 1 ? 'día' : 'días'}
                                            </p>
                                        </div>
                                        <span
                                            className="shrink-0 text-sm font-bold tabular-nums"
                                            style={debtor.oldest_days > benchmark.aging_threshold_days ? { color: VIZ.warning } : { color: '#0f172a' }}
                                        >
                                            {formatCurrency(debtor.pending)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </section>

            {/* Actividad */}
            <Card
                title={project ? 'Últimos gastos del proyecto' : 'Últimos movimientos'}
                subtitle={project ? `Lo más reciente cargado en ${project.name}` : 'Cobros y gastos más recientes'}
            >
                {movements.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                        {project ? 'Este proyecto todavía no tiene gastos cargados' : 'Sin movimientos todavía'}
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-100 -my-2">
                        {movements.map((mov) => (
                            <li key={mov.id} className="flex items-center justify-between gap-3 py-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span
                                        className="shrink-0 w-7 h-7 rounded-lg grid place-items-center"
                                        style={{
                                            backgroundColor: mov.type === 'INGRESO' ? VIZ.track : 'rgba(100,116,139,0.1)',
                                            color: mov.type === 'INGRESO' ? VIZ.data : '#64748b',
                                        }}
                                    >
                                        {mov.type === 'INGRESO' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{mov.description}</p>
                                        <p className="text-xs text-slate-400 truncate">
                                            {mov.created_at ? formatDateLong(mov.created_at.slice(0, 10)) : '—'} · {mov.userName}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className="shrink-0 text-sm font-bold tabular-nums"
                                    style={{ color: mov.type === 'INGRESO' ? VIZ.data : '#0f172a' }}
                                >
                                    {mov.type === 'INGRESO' ? '+' : '−'}{formatCurrency(mov.amount)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
};

// ---------------------------------------------------------------------------

const Card = ({ title, subtitle, action, children }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
}) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-900">{title}</h2>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
);

const StatTile = ({ label, value, footer, muted, negative }: {
    label: string;
    value: string;
    footer?: ReactNode;
    muted?: boolean;
    negative?: boolean;
}) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p
            className={cn('mt-1 text-2xl font-black', muted && 'text-slate-300')}
            style={!muted ? { color: negative ? VIZ.critical : '#0f172a' } : undefined}
        >
            {value}
        </p>
        {footer && <div className="mt-auto pt-2 text-xs text-slate-500">{footer}</div>}
    </div>
);

const EmptyState = ({ hasProject }: { hasProject: boolean }) => (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <FolderPlus size={32} className="mx-auto text-slate-300" />
        <p className="mt-3 text-base font-bold text-slate-800">Todavía no hay nada que mostrar</p>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {hasProject
                ? 'Cargá los primeros gastos en la planilla y el panel empieza a mostrar el avance por etapa, el costo por hectárea y los desvíos.'
                : 'Creá una campaña con sus etapas y cargá los primeros gastos. El panel se arma solo a partir de ahí.'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
            <Link
                to="/proyectos"
                className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:border-agro-600 hover:text-agro-600 transition-colors inline-flex items-center gap-2"
            >
                <FolderPlus size={16} /> Crear proyecto
            </Link>
            <Link
                to="/costos"
                className="h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold inline-flex items-center gap-2"
            >
                <Table2 size={16} /> Cargar gastos
            </Link>
        </div>
    </div>
);
