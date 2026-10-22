import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    AlertCircle, Download, FolderPlus, Loader2, Plus, Search, X,
} from 'lucide-react';
import { ExpenseGrid } from '../components/organisms/ExpenseGrid';
import { ExpenseCards } from '../components/organisms/ExpenseCards';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { CATEGORY_OPTIONS } from '../constants/expenses';
import { Expense, ExpenseCategory, ExpenseFilters, ExpenseInput } from '../types';
import { exportExpensesToCsv } from '../utils/export';
import { formatAmount, formatCurrency } from '../utils/format';
import { cn } from '../utils/cn';

export const Costos = () => {
    const queryClient = useQueryClient();
    const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
    const dateFrom = useWorkspaceStore((s) => s.dateFrom);
    const dateTo = useWorkspaceStore((s) => s.dateTo);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<ExpenseCategory | ''>('');
    const [addToken, setAddToken] = useState(0);
    const [receipt, setReceipt] = useState<Expense | null>(null);
    const [error, setError] = useState<string | null>(null);

    // La búsqueda pega contra la API; se espera a que el usuario deje de tipear.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const filters: ExpenseFilters = useMemo(() => ({
        project_id: activeProjectId ?? undefined,
        category: category || undefined,
        from: dateFrom ?? undefined,
        to: dateTo ?? undefined,
        q: search || undefined,
    }), [activeProjectId, category, dateFrom, dateTo, search]);

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.projects.getAll(),
    });

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses', filters],
        queryFn: () => api.expenses.getAll(filters),
    });

    const activeProject = typeof activeProjectId === 'number'
        ? projects.find((p) => p.id === activeProjectId)
        : undefined;

    const stages = activeProject?.stages ?? [];

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
    };

    // La grilla ya revierte la celda; acá sólo se informa qué pasó.
    const handleError = (err: unknown) => {
        const message =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'No se pudo guardar el cambio. Revisá la conexión.';
        setError(message);
    };

    const createMutation = useMutation({
        mutationFn: (input: ExpenseInput) => api.expenses.create(input),
        onSuccess: invalidate,
        onError: handleError,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, patch }: { id: number; patch: ExpenseInput }) => api.expenses.update(id, patch),
        onSuccess: invalidate,
        onError: handleError,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.expenses.delete(id),
        onSuccess: invalidate,
        onError: handleError,
    });

    const total = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
    const budget = activeProject?.budget ?? null;
    const remaining = budget != null ? budget - (activeProject?.total_spent ?? 0) : null;
    const costPerUnit = activeProject?.size ? (activeProject.total_spent ?? 0) / activeProject.size : null;

    const hasFilters = Boolean(search || category || dateFrom || dateTo);

    const exportName = [
        'costos',
        activeProject?.name.toLowerCase().replace(/\s+/g, '-') ?? (activeProjectId === 'none' ? 'sin-proyecto' : 'todos'),
        dateFrom ?? '',
        dateTo ?? '',
    ].filter(Boolean).join('_');

    return (
        <>
            <div className="flex flex-col gap-4 lg:h-[calc(100vh-7.5rem)]">
                {/* Encabezado */}
                <div className="px-4 lg:px-0 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">
                            Costos de producción
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {activeProject
                                ? `Gastos de ${activeProject.name} agrupados por etapa`
                                : activeProjectId === 'none'
                                    ? 'Gastos sin proyecto asignado'
                                    : 'Gastos de todos los proyectos'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => exportExpensesToCsv(expenses, exportName)}
                            disabled={expenses.length === 0}
                            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                        >
                            <Download size={16} /> Exportar
                        </button>
                        {/* En mobile el alta vive en la vista de tarjetas, no acá */}
                        <button
                            onClick={() => setAddToken((t) => t + 1)}
                            className="hidden lg:inline-flex h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold hover:bg-agro-800 transition-colors items-center gap-2 shadow-sm"
                        >
                            <Plus size={16} strokeWidth={2.5} /> Agregar gasto
                        </button>
                    </div>
                </div>

                {/* Indicadores */}
                <div className="px-4 lg:px-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatTile label="Total del período" value={formatCurrency(total)} accent />
                    <StatTile label="Gastos cargados" value={String(expenses.length)} />
                    <StatTile
                        label={budget != null ? 'Presupuesto restante' : 'Presupuesto'}
                        value={remaining != null ? formatCurrency(remaining) : 'Sin definir'}
                        muted={remaining == null}
                        negative={remaining != null && remaining < 0}
                    />
                    <StatTile
                        label={activeProject?.size_unit ? `Costo por ${activeProject.size_unit}` : 'Costo unitario'}
                        value={costPerUnit != null ? formatCurrency(costPerUnit) : 'Sin definir'}
                        muted={costPerUnit == null}
                    />
                </div>

                {/* Filtros de la planilla */}
                <div className="px-4 lg:px-0 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[14rem] max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Buscar por descripción, proveedor o comprobante…"
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-agro-600 focus:ring-2 focus:ring-agro-600/15 transition-colors"
                        />
                    </div>

                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ExpenseCategory | '')}
                        className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:border-agro-600"
                    >
                        <option value="">Todas las categorías</option>
                        {CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>

                    {hasFilters && (
                        <button
                            onClick={() => { setSearchInput(''); setCategory(''); }}
                            className="h-10 px-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-agro-600 hover:bg-agro-50 transition-colors inline-flex items-center gap-1.5"
                        >
                            <X size={14} /> Limpiar
                        </button>
                    )}

                    <span className="ml-auto text-sm font-semibold text-slate-400 tabular-nums hidden sm:block">
                        {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} · $ {formatAmount(total)}
                    </span>
                </div>

                {/* Aviso cuando todavía no hay proyectos configurados */}
                {projects.length === 0 && (
                    <div className="mx-4 lg:mx-0 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <FolderPlus size={18} className="mt-0.5 shrink-0 text-amber-600" />
                        <div className="text-sm">
                            <p className="font-bold text-amber-900">Todavía no hay proyectos</p>
                            <p className="text-amber-800/80">
                                Creá una campaña con sus etapas (siembra, riego, cosecha…) para agrupar los costos y medir el gasto por etapa.{' '}
                                <Link to="/proyectos" className="font-bold underline underline-offset-2">Crear proyecto</Link>
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mx-4 lg:mx-0 flex items-center gap-3 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3">
                        <AlertCircle size={18} className="shrink-0 text-danger-800" />
                        <p className="text-sm font-medium text-danger-800 flex-1">{error}</p>
                        <button onClick={() => setError(null)} className="text-danger-800/60 hover:text-danger-800">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Planilla (escritorio) */}
                <div className="hidden lg:flex flex-1 min-h-0">
                    <div className="w-full h-full">
                        <ExpenseGrid
                            expenses={expenses}
                            stages={stages}
                            projectId={typeof activeProjectId === 'number' ? activeProjectId : null}
                            isLoading={isLoading}
                            addToken={addToken}
                            onCreate={(input) => createMutation.mutateAsync(input)}
                            onUpdate={(id, patch) => updateMutation.mutateAsync({ id, patch })}
                            onDelete={(id) => deleteMutation.mutateAsync(id)}
                            onOpenReceipt={setReceipt}
                        />
                    </div>
                </div>

                {/* Tarjetas (mobile) */}
                <div className="lg:hidden px-4 pb-4">
                    <ExpenseCards
                        expenses={expenses}
                        stages={stages}
                        isLoading={isLoading}
                        projectId={typeof activeProjectId === 'number' ? activeProjectId : null}
                        onCreate={(input) => createMutation.mutateAsync(input)}
                        onDelete={(id) => deleteMutation.mutateAsync(id)}
                    />
                </div>
            </div>

            {receipt && <ReceiptModal expense={receipt} onClose={() => setReceipt(null)} />}
        </>
    );
};

// ---------------------------------------------------------------------------

interface StatTileProps {
    label: string;
    value: string;
    accent?: boolean;
    muted?: boolean;
    negative?: boolean;
}

const StatTile = ({ label, value, accent, muted, negative }: StatTileProps) => (
    <div
        className={cn(
            'rounded-2xl border px-4 py-3',
            accent ? 'border-agro-600/20 bg-agro-50' : 'border-slate-200 bg-white'
        )}
    >
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{label}</p>
        <p
            className={cn(
                'mt-1 text-lg lg:text-xl font-black tabular-nums truncate',
                negative ? 'text-danger-800' : muted ? 'text-slate-300' : accent ? 'text-agro-600' : 'text-slate-900'
            )}
        >
            {value}
        </p>
    </div>
);

const ReceiptModal = ({ expense, onClose }: { expense: Expense; onClose: () => void }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['receipt', expense.id],
        queryFn: () => api.expenses.getReceipt(expense.id),
    });

    return (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 flex items-center justify-between gap-4 px-5 h-14 bg-white border-b border-slate-200">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{expense.description}</p>
                        <p className="text-xs text-slate-400">Comprobante</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">
                    {isLoading && (
                        <div className="h-48 grid place-items-center text-slate-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    )}
                    {data && (
                        data.receipt_mime_type?.startsWith('image/') ? (
                            <img
                                src={`data:${data.receipt_mime_type};base64,${data.receipt_base64}`}
                                alt="Comprobante"
                                className="w-full rounded-xl"
                            />
                        ) : (
                            <a
                                href={`data:${data.receipt_mime_type};base64,${data.receipt_base64}`}
                                download={`comprobante-${expense.id}`}
                                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold"
                            >
                                <Download size={16} /> Descargar comprobante
                            </a>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
