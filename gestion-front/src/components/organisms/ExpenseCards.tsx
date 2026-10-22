import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseInput, PaymentSource, ProjectStage } from '../../types';
import {
    CATEGORY_ICONS, CATEGORY_OPTIONS, SOURCE_OPTIONS,
    DEFAULT_CATEGORY, DEFAULT_SOURCE, CATEGORY_LABELS, stageColor,
} from '../../constants/expenses';
import { formatAmount, formatCurrency, formatDateLong, todayISO } from '../../utils/format';
import { cn } from '../../utils/cn';

interface ExpenseCardsProps {
    expenses: Expense[];
    stages: ProjectStage[];
    projectId: number | null;
    isLoading?: boolean;
    onCreate: (input: ExpenseInput) => Promise<unknown>;
    onDelete: (id: number) => Promise<unknown>;
}

/**
 * Vista mobile de la planilla: las mismas filas como tarjetas, pensada
 * para cargar un gasto desde el campo sin sacar la computadora.
 */
export const ExpenseCards = ({ expenses, stages, projectId, isLoading, onCreate, onDelete }: ExpenseCardsProps) => {
    const [showForm, setShowForm] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const groups = useMemo(() => {
        if (stages.length === 0) {
            return [{ id: null as number | null, name: 'Todos los gastos', color: stageColor(0), rows: expenses }];
        }
        const ordered = [...stages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const result = ordered.map((stage, index) => ({
            id: stage.id as number | null,
            name: stage.name,
            color: stage.color ?? stageColor(index),
            rows: expenses.filter((e) => e.stage_id === stage.id),
        }));
        const orphans = expenses.filter((e) => !e.stage_id || !ordered.some((s) => s.id === e.stage_id));
        if (orphans.length > 0) {
            result.push({ id: null, name: 'Sin etapa', color: '#94A3B8', rows: orphans });
        }
        return result.filter((group) => group.rows.length > 0);
    }, [expenses, stages]);

    if (isLoading) {
        return (
            <div className="h-40 grid place-items-center text-slate-400">
                <Loader2 size={22} className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <button
                onClick={() => setShowForm(true)}
                className="w-full h-12 rounded-2xl bg-agro-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform"
            >
                <Plus size={18} strokeWidth={2.5} /> Agregar gasto
            </button>

            {groups.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-400">
                    No hay gastos cargados para este filtro.
                </p>
            )}

            {groups.map((group) => {
                const subtotal = group.rows.reduce((acc, e) => acc + e.amount, 0);
                return (
                    <section key={`${group.name}-${group.id ?? 'none'}`} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 px-1">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 truncate">
                                    {group.name}
                                </h2>
                            </div>
                            <span className="text-sm font-black tabular-nums text-slate-700 shrink-0">
                                $ {formatAmount(subtotal)}
                            </span>
                        </div>

                        <div className="space-y-2">
                            {group.rows.map((expense) => (
                                <article key={expense.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg leading-none mt-0.5">{CATEGORY_ICONS[expense.category]}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 truncate">{expense.description}</p>
                                            <p className="text-xs text-slate-400">
                                                {formatDateLong(expense.expense_date)} · {CATEGORY_LABELS[expense.category]}
                                                {expense.supplier ? ` · ${expense.supplier}` : ''}
                                            </p>
                                            {expense.quantity != null && expense.unit_cost != null && (
                                                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                                                    {formatAmount(expense.quantity)} {expense.unit ?? ''} × {formatCurrency(expense.unit_cost)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black tabular-nums text-slate-900">
                                                {formatCurrency(expense.amount)}
                                            </p>
                                            {confirmDelete === expense.id ? (
                                                <div className="mt-1 flex items-center gap-1 justify-end">
                                                    <button
                                                        onClick={async () => {
                                                            setConfirmDelete(null);
                                                            try { await onDelete(expense.id); } catch { /* informado arriba */ }
                                                        }}
                                                        className="px-2 h-7 rounded-lg bg-danger-800 text-white text-[11px] font-bold"
                                                    >
                                                        Borrar
                                                    </button>
                                                    <button onClick={() => setConfirmDelete(null)} className="p-1 text-slate-400">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDelete(expense.id)}
                                                    className="mt-1 p-1.5 rounded-lg text-slate-300 active:text-danger-800"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                );
            })}

            {showForm && (
                <QuickExpenseForm
                    stages={stages}
                    projectId={projectId}
                    onClose={() => setShowForm(false)}
                    onSubmit={onCreate}
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------

interface QuickExpenseFormProps {
    stages: ProjectStage[];
    projectId: number | null;
    onClose: () => void;
    onSubmit: (input: ExpenseInput) => Promise<unknown>;
}

const QuickExpenseForm = ({ stages, projectId, onClose, onSubmit }: QuickExpenseFormProps) => {
    const [form, setForm] = useState<ExpenseInput>({
        expense_date: todayISO(),
        category: DEFAULT_CATEGORY,
        payment_source: DEFAULT_SOURCE,
        project_id: projectId,
        stage_id: stages[0]?.id ?? null,
        description: '',
        amount: null,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = Boolean(form.description?.trim()) && Number(form.amount) > 0;

    const submit = async () => {
        if (!canSubmit || saving) return;
        setSaving(true);
        setError(null);
        try {
            await onSubmit(form);
            onClose();
        } catch {
            setError('No se pudo guardar el gasto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full rounded-t-3xl bg-white p-5 pb-8 space-y-3 animate-slide-up max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-slate-900">Nuevo gasto</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <Field label="Descripción">
                    <input
                        autoFocus
                        value={form.description ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Semilla de papa"
                        className={inputClass}
                    />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha">
                        <input
                            type="date"
                            value={form.expense_date ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Total">
                        <input
                            inputMode="decimal"
                            value={form.amount ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value === '' ? null : Number(e.target.value) }))}
                            placeholder="0"
                            className={cn(inputClass, 'tabular-nums')}
                        />
                    </Field>
                </div>

                {stages.length > 0 && (
                    <Field label="Etapa">
                        <select
                            value={form.stage_id ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, stage_id: e.target.value === '' ? null : Number(e.target.value) }))}
                            className={inputClass}
                        >
                            <option value="">Sin etapa</option>
                            {stages.map((stage) => (
                                <option key={stage.id} value={stage.id}>{stage.name}</option>
                            ))}
                        </select>
                    </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Categoría">
                        <select
                            value={form.category}
                            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                            className={inputClass}
                        >
                            {CATEGORY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Origen">
                        <select
                            value={form.payment_source}
                            onChange={(e) => setForm((f) => ({ ...f, payment_source: e.target.value as PaymentSource }))}
                            className={inputClass}
                        >
                            {SOURCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                {error && <p className="text-sm font-medium text-danger-800">{error}</p>}

                <button
                    onClick={submit}
                    disabled={!canSubmit || saving}
                    className="w-full h-12 rounded-2xl bg-agro-600 text-white text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />}
                    Guardar gasto
                </button>
            </div>
        </div>
    );
};

const inputClass =
    'w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-agro-600 focus:ring-2 focus:ring-agro-600/15';

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className="block">
        <span className="block mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        {children}
    </label>
);
