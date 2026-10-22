import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from 'react';
import { ChevronDown, ChevronRight, Copy, Paperclip, Plus, Trash2, X } from 'lucide-react';
import { Expense, ExpenseInput, ProjectStage } from '../../types';
import {
    CATEGORY_OPTIONS, SOURCE_OPTIONS, DEFAULT_CATEGORY, DEFAULT_SOURCE, stageColor,
} from '../../constants/expenses';
import {
    formatAmount, formatDateShort, formatNumber,
    parseDateInput, parseNumberInput, todayISO,
} from '../../utils/format';
import { cn } from '../../utils/cn';

type ColumnType = 'date' | 'text' | 'number' | 'currency' | 'select';
type ColumnKey = keyof ExpenseInput;

interface Column {
    key: ColumnKey;
    label: string;
    type: ColumnType;
    width: number;
    align?: 'left' | 'right';
    options?: { value: string; label: string }[];
    /** Se muestra en la celda vacía de la fila de alta. */
    placeholder?: string;
}

interface FlatRow {
    key: string;
    kind: 'expense' | 'ghost';
    stageKey: string;
    stageId: number | null;
    expense?: Expense;
}

interface Group {
    key: string;
    stageId: number | null;
    name: string;
    color: string;
    rows: Expense[];
    subtotal: number;
}

interface ExpenseGridProps {
    expenses: Expense[];
    stages: ProjectStage[];
    /** Proyecto al que se asignan las filas nuevas. null = sin proyecto. */
    projectId: number | null;
    isLoading?: boolean;
    /** Cada incremento lleva el foco a la primera fila de alta y la abre para escribir. */
    addToken?: number;
    onCreate: (input: ExpenseInput) => Promise<unknown>;
    onUpdate: (id: number, patch: ExpenseInput) => Promise<unknown>;
    onDelete: (id: number) => Promise<unknown>;
    onOpenReceipt: (expense: Expense) => void;
}

const buildColumns = (stages: ProjectStage[]): Column[] => {
    const columns: Column[] = [
        { key: 'expense_date', label: 'Fecha', type: 'date', width: 92, placeholder: 'dd/mm/aa' },
    ];

    if (stages.length > 0) {
        columns.push({
            key: 'stage_id',
            label: 'Etapa',
            type: 'select',
            width: 132,
            options: [
                { value: '', label: '— Sin etapa —' },
                ...stages.map((s) => ({ value: String(s.id), label: s.name })),
            ],
        });
    }

    columns.push(
        { key: 'category', label: 'Categoría', type: 'select', width: 124, options: CATEGORY_OPTIONS },
        { key: 'description', label: 'Descripción', type: 'text', width: 240, placeholder: 'Escribí acá para agregar…' },
        { key: 'supplier', label: 'Proveedor', type: 'text', width: 150 },
        { key: 'quantity', label: 'Cant.', type: 'number', width: 78, align: 'right' },
        { key: 'unit', label: 'Unidad', type: 'text', width: 76 },
        { key: 'unit_cost', label: 'P. unitario', type: 'currency', width: 108, align: 'right' },
        { key: 'amount', label: 'Total', type: 'currency', width: 124, align: 'right' },
        { key: 'payment_source', label: 'Origen', type: 'select', width: 112, options: SOURCE_OPTIONS },
        { key: 'invoice_number', label: 'Comprob. Nº', type: 'text', width: 112 },
    );

    return columns;
};

/** Convierte lo tipeado en el valor que espera la API. */
const parseCellValue = (column: Column, raw: string): unknown => {
    switch (column.type) {
        case 'date':
            return parseDateInput(raw);
        case 'number':
        case 'currency':
            return parseNumberInput(raw);
        case 'select':
            return raw === '' ? null : column.key === 'stage_id' ? Number(raw) : raw;
        default:
            return raw.trim() === '' ? null : raw.trim();
    }
};

/** Texto que se muestra en la celda. */
const displayValue = (column: Column, value: unknown): string => {
    if (value == null || value === '') return '';
    switch (column.type) {
        case 'date':
            return formatDateShort(String(value));
        case 'number':
            return formatNumber(Number(value));
        case 'currency':
            return formatAmount(Number(value));
        case 'select':
            return column.options?.find((o) => o.value === String(value))?.label ?? String(value);
        default:
            return String(value);
    }
};

/** Texto que se carga en el input al empezar a editar. */
const editValue = (column: Column, value: unknown): string => {
    if (value == null) return '';
    if (column.type === 'number' || column.type === 'currency') return String(value);
    return String(value);
};

const emptyDraft = (projectId: number | null, stageId: number | null): ExpenseInput => ({
    expense_date: todayISO(),
    category: DEFAULT_CATEGORY,
    payment_source: DEFAULT_SOURCE,
    project_id: projectId,
    stage_id: stageId,
});

/** Columnas que la API no acepta vacías: no se pueden borrar con Supr. */
const REQUIRED_KEYS = new Set<ColumnKey>(['description', 'amount', 'expense_date', 'category', 'payment_source']);

/** Una fila de alta se guarda cuando tiene descripción y un importe resoluble. */
const isDraftComplete = (draft: ExpenseInput): boolean => {
    const hasDescription = Boolean(draft.description && String(draft.description).trim() !== '');
    const hasTotal = draft.amount != null && Number(draft.amount) > 0;
    const hasUnitMath =
        draft.quantity != null && draft.unit_cost != null &&
        Number(draft.quantity) * Number(draft.unit_cost) > 0;
    return hasDescription && (hasTotal || hasUnitMath);
};

export const ExpenseGrid = ({
    expenses, stages, projectId, isLoading, addToken,
    onCreate, onUpdate, onDelete, onOpenReceipt,
}: ExpenseGridProps) => {
    const columns = useMemo(() => buildColumns(stages), [stages]);

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [active, setActive] = useState<{ rowKey: string; colKey: ColumnKey } | null>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [selectOnOpen, setSelectOnOpen] = useState(true);
    const [ghostDrafts, setGhostDrafts] = useState<Record<string, ExpenseInput>>({});
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});

    const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
    const gridRef = useRef<HTMLDivElement>(null);

    // Agrupación por etapa, respetando el orden configurado en el proyecto.
    const groups = useMemo<Group[]>(() => {
        if (stages.length === 0) {
            const subtotal = expenses.reduce((acc, e) => acc + e.amount, 0);
            return [{ key: 'all', stageId: null, name: 'Todos los gastos', color: stageColor(0), rows: expenses, subtotal }];
        }

        const ordered = [...stages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const result: Group[] = ordered.map((stage, index) => {
            const rows = expenses.filter((e) => e.stage_id === stage.id);
            return {
                key: `stage-${stage.id}`,
                stageId: stage.id,
                name: stage.name,
                color: stage.color ?? stageColor(index),
                rows,
                subtotal: rows.reduce((acc, e) => acc + e.amount, 0),
            };
        });

        const orphans = expenses.filter((e) => !e.stage_id || !ordered.some((s) => s.id === e.stage_id));
        if (orphans.length > 0) {
            result.push({
                key: 'stage-none',
                stageId: null,
                name: 'Sin etapa',
                color: '#94A3B8',
                rows: orphans,
                subtotal: orphans.reduce((acc, e) => acc + e.amount, 0),
            });
        }

        return result;
    }, [expenses, stages]);

    const total = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);

    // Orden visual de las filas navegables (incluye las filas de alta).
    const flatRows = useMemo<FlatRow[]>(() => {
        const rows: FlatRow[] = [];
        groups.forEach((group) => {
            if (collapsed[group.key]) return;
            group.rows.forEach((expense) => {
                rows.push({
                    key: `exp-${expense.id}`,
                    kind: 'expense',
                    stageKey: group.key,
                    stageId: group.stageId,
                    expense,
                });
            });
            rows.push({ key: `ghost-${group.key}`, kind: 'ghost', stageKey: group.key, stageId: group.stageId });
        });
        return rows;
    }, [groups, collapsed]);

    const getDraftFor = useCallback(
        (rowKey: string, stageId: number | null) => ghostDrafts[rowKey] ?? emptyDraft(projectId, stageId),
        [ghostDrafts, projectId]
    );

    // El foco del DOM vive siempre en el contenedor de la grilla, no en cada celda:
    // así al saltar de celda con Tab no se pierden las teclas del próximo tipeo.
    // Al cambiar de celda sólo se la trae a la vista.
    useEffect(() => {
        if (!active || editing) return;
        const node = cellRefs.current.get(`${active.rowKey}|${active.colKey}`);
        node?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [active, editing]);

    const moveTo = useCallback(
        (rowOffset: number, colOffset: number) => {
            if (!active) return;
            const rowIndex = flatRows.findIndex((r) => r.key === active.rowKey);
            const colIndex = columns.findIndex((c) => c.key === active.colKey);
            if (rowIndex === -1 || colIndex === -1) return;

            let nextRow = rowIndex + rowOffset;
            let nextCol = colIndex + colOffset;

            if (nextCol >= columns.length) { nextCol = 0; nextRow += 1; }
            if (nextCol < 0) { nextCol = columns.length - 1; nextRow -= 1; }

            nextRow = Math.max(0, Math.min(flatRows.length - 1, nextRow));
            setActive({ rowKey: flatRows[nextRow].key, colKey: columns[nextCol].key });
        },
        [active, flatRows, columns]
    );

    /** Guarda el valor de una celda: PUT parcial si la fila existe, POST si se completó una fila de alta. */
    const commit = useCallback(
        async (row: FlatRow, column: Column, rawValue: string) => {
            const parsed = parseCellValue(column, rawValue);

            // Vaciar una columna obligatoria se ignora en lugar de fallar contra la API.
            if (parsed == null && REQUIRED_KEYS.has(column.key)) return;

            if (row.kind === 'expense' && row.expense) {
                const currentValue = row.expense[column.key as keyof Expense];
                if ((currentValue ?? null) === (parsed ?? null)) return;
                setSavingRows((prev) => ({ ...prev, [row.key]: true }));
                try {
                    await onUpdate(row.expense.id, { [column.key]: parsed } as ExpenseInput);
                } catch {
                    // El error lo reporta la pantalla; la fila vuelve al valor del servidor.
                } finally {
                    setSavingRows((prev) => ({ ...prev, [row.key]: false }));
                }
                return;
            }

            const nextDraft: ExpenseInput = { ...getDraftFor(row.key, row.stageId), [column.key]: parsed };

            // El total se deriva de cantidad × precio unitario mientras no se escriba a mano.
            if ((column.key === 'quantity' || column.key === 'unit_cost') &&
                nextDraft.quantity != null && nextDraft.unit_cost != null) {
                nextDraft.amount = Math.round(Number(nextDraft.quantity) * Number(nextDraft.unit_cost) * 100) / 100;
            }

            if (!isDraftComplete(nextDraft)) {
                setGhostDrafts((prev) => ({ ...prev, [row.key]: nextDraft }));
                return;
            }

            setSavingRows((prev) => ({ ...prev, [row.key]: true }));
            try {
                await onCreate(nextDraft);
                setGhostDrafts((prev) => {
                    const next = { ...prev };
                    delete next[row.key];
                    return next;
                });
            } catch {
                setGhostDrafts((prev) => ({ ...prev, [row.key]: nextDraft }));
            } finally {
                setSavingRows((prev) => ({ ...prev, [row.key]: false }));
            }
        },
        [getDraftFor, onCreate, onUpdate]
    );

    const duplicateRow = useCallback(
        async (expense: Expense) => {
            try {
                await onCreate({
                    expense_date: expense.expense_date,
                    category: expense.category,
                    description: expense.description,
                    detail: expense.detail,
                    supplier: expense.supplier,
                    quantity: expense.quantity,
                    unit: expense.unit,
                    unit_cost: expense.unit_cost,
                    amount: expense.amount,
                    payment_source: expense.payment_source,
                    invoice_number: expense.invoice_number,
                    project_id: expense.project_id,
                    stage_id: expense.stage_id,
                });
            } catch {
                // Reportado por la pantalla contenedora.
            }
        },
        [onCreate]
    );

    /**
     * Abre la celda en modo edición cargando el valor actual.
     * Con `sync` el input se monta y toma el foco dentro del mismo evento de
     * teclado: sin eso, el carácter que abrió la edición llega antes que el input.
     */
    const startEdit = useCallback(
        (row: FlatRow, column: Column, seed?: string, sync = true) => {
            const value = row.kind === 'expense' && row.expense
                ? row.expense[column.key as keyof Expense]
                : getDraftFor(row.key, row.stageId)[column.key];
            const nextDraft = seed != null && column.type !== 'select' ? seed : editValue(column, value);

            const apply = () => {
                setActive({ rowKey: row.key, colKey: column.key });
                setDraft(nextDraft);
                setSelectOnOpen(seed == null);
                setEditing(true);
            };

            if (sync) flushSync(apply);
            else apply();
        },
        [getDraftFor]
    );

    // El botón "Agregar gasto" del encabezado abre la primera fila de alta.
    const lastAddToken = useRef(addToken);
    useEffect(() => {
        if (addToken === undefined || addToken === lastAddToken.current) return;
        lastAddToken.current = addToken;
        const ghost = flatRows.find((row) => row.kind === 'ghost');
        const descriptionColumn = columns.find((column) => column.key === 'description');
        if (ghost && descriptionColumn) {
            cellRefs.current.get(`${ghost.key}|description`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            startEdit(ghost, descriptionColumn, undefined, false);
        }
    }, [addToken, flatRows, columns, startEdit]);

    /** Teclado de la grilla: se escucha en el contenedor, no en cada celda. */
    const handleGridKeyDown = useCallback(
        (event: ReactKeyboardEvent) => {
            if (editing || !active) return;

            const row = flatRows.find((r) => r.key === active.rowKey);
            const column = columns.find((c) => c.key === active.colKey);
            if (!row || !column) return;

            if (event.key === 'Enter' || event.key === 'F2') {
                event.preventDefault();
                startEdit(row, column);
                return;
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                moveTo(0, event.shiftKey ? -1 : 1);
                return;
            }

            if (event.key === 'ArrowDown') { event.preventDefault(); moveTo(1, 0); return; }
            if (event.key === 'ArrowUp') { event.preventDefault(); moveTo(-1, 0); return; }
            if (event.key === 'ArrowRight') { event.preventDefault(); moveTo(0, 1); return; }
            if (event.key === 'ArrowLeft') { event.preventDefault(); moveTo(0, -1); return; }

            if ((event.key === 'Delete' || event.key === 'Backspace') && row.kind === 'expense') {
                event.preventDefault();
                if (REQUIRED_KEYS.has(column.key)) return; // no se pueden vaciar
                void commit(row, column, '');
                return;
            }

            if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey) && row.kind === 'expense') {
                event.preventDefault();
                void duplicateRow(row.expense!);
                return;
            }

            // Empezar a editar tipeando, como en una planilla.
            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                startEdit(row, column, event.key);
            }
        },
        [editing, active, flatRows, columns, moveTo, commit, duplicateRow, startEdit]
    );

    /**
     * Cierra la edición devolviendo el foco al contenedor dentro del mismo
     * evento, antes de mover la celda activa. El guardado va después: la
     * navegación no espera a la red.
     */
    const finishEdit = useCallback(
        (row: FlatRow, column: Column, value: string, move: 'down' | 'right' | 'none') => {
            flushSync(() => setEditing(false));
            gridRef.current?.focus({ preventScroll: true });
            if (move === 'down') moveTo(1, 0);
            if (move === 'right') moveTo(0, 1);
            void commit(row, column, value);
        },
        [commit, moveTo]
    );

    const cancelEdit = useCallback(() => {
        flushSync(() => setEditing(false));
        gridRef.current?.focus({ preventScroll: true });
    }, []);

    const activateCell = useCallback((rowKey: string, colKey: ColumnKey) => {
        flushSync(() => setEditing(false));
        setActive({ rowKey, colKey });
        gridRef.current?.focus({ preventScroll: true });
    }, []);

    const totalWidth = columns.reduce((acc, c) => acc + c.width, 0) + 88;

    return (
        <div className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div
                ref={gridRef}
                tabIndex={0}
                onKeyDown={handleGridKeyDown}
                className="flex-1 min-h-0 overflow-auto outline-none"
            >
                <table className="border-collapse text-sm" style={{ width: totalWidth, minWidth: '100%' }}>
                    <colgroup>
                        {columns.map((column) => (
                            <col key={column.key} style={{ width: column.width }} />
                        ))}
                        <col style={{ width: 88 }} />
                    </colgroup>

                    <thead className="sticky top-0 z-20">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        'h-9 px-2.5 bg-slate-100 border-b border-r border-slate-200',
                                        'text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap',
                                        column.align === 'right' ? 'text-right' : 'text-left'
                                    )}
                                >
                                    {column.label}
                                </th>
                            ))}
                            <th className="sticky right-0 z-10 h-9 px-2.5 bg-slate-100 border-b border-l border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {''}
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {isLoading && (
                            <tr>
                                <td colSpan={columns.length + 1} className="h-32 text-center text-slate-400">
                                    Cargando gastos…
                                </td>
                            </tr>
                        )}

                        {!isLoading && groups.map((group) => (
                            <GroupBlock
                                key={group.key}
                                group={group}
                                total={total}
                                columns={columns}
                                collapsed={Boolean(collapsed[group.key])}
                                onToggle={() => setCollapsed((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                                active={active}
                                editing={editing}
                                draft={draft}
                                selectOnOpen={selectOnOpen}
                                savingRows={savingRows}
                                confirmDelete={confirmDelete}
                                ghostDraft={getDraftFor(`ghost-${group.key}`, group.stageId)}
                                hasGhostDraft={Boolean(ghostDrafts[`ghost-${group.key}`])}
                                cellRefs={cellRefs}
                                onActivate={activateCell}
                                onStartEdit={startEdit}
                                onDraftChange={setDraft}
                                onFinishEdit={finishEdit}
                                onCancelEdit={cancelEdit}
                                onRequestDelete={setConfirmDelete}
                                onConfirmDelete={async (id) => {
                                    setConfirmDelete(null);
                                    try { await onDelete(id); } catch { /* reportado por la pantalla */ }
                                }}
                                onDuplicate={duplicateRow}
                                onOpenReceipt={onOpenReceipt}
                            />
                        ))}

                        {!isLoading && expenses.length === 0 && groups.length === 1 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="h-16 px-4 text-slate-400 text-sm">
                                    Todavía no hay gastos cargados. Escribí en la fila con el signo <Plus size={12} className="inline" /> para agregar el primero.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totales fijos al pie */}
            <div className="shrink-0 flex items-center justify-between gap-4 h-12 px-4 bg-slate-900 text-white">
                <div className="flex items-center gap-4 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-white/50">
                        {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
                    </span>
                    <span className="hidden md:inline text-white/40">
                        Enter edita · Tab avanza · Ctrl+D duplica · Supr borra el contenido
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/50">Total</span>
                    <span className="text-lg font-black tabular-nums">$ {formatAmount(total)}</span>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------

interface GroupBlockProps {
    group: Group;
    total: number;
    columns: Column[];
    collapsed: boolean;
    onToggle: () => void;
    active: { rowKey: string; colKey: ColumnKey } | null;
    editing: boolean;
    draft: string;
    selectOnOpen: boolean;
    savingRows: Record<string, boolean>;
    confirmDelete: number | null;
    ghostDraft: ExpenseInput;
    hasGhostDraft: boolean;
    cellRefs: MutableRefObject<Map<string, HTMLElement>>;
    onActivate: (rowKey: string, colKey: ColumnKey) => void;
    onStartEdit: (row: FlatRow, column: Column, seed?: string) => void;
    onDraftChange: (value: string) => void;
    onFinishEdit: (row: FlatRow, column: Column, value: string, move: 'down' | 'right' | 'none') => void;
    onCancelEdit: () => void;
    onRequestDelete: (id: number | null) => void;
    onConfirmDelete: (id: number) => void;
    onDuplicate: (expense: Expense) => void;
    onOpenReceipt: (expense: Expense) => void;
}

const GroupBlock = ({
    group, total, columns, collapsed, onToggle, active, editing, draft, selectOnOpen,
    savingRows, confirmDelete, ghostDraft, hasGhostDraft, cellRefs, onActivate, onStartEdit,
    onDraftChange, onFinishEdit, onCancelEdit, onRequestDelete, onConfirmDelete,
    onDuplicate, onOpenReceipt,
}: GroupBlockProps) => {
    const share = total > 0 ? Math.round((group.subtotal / total) * 100) : 0;
    const ghostRow: FlatRow = { key: `ghost-${group.key}`, kind: 'ghost', stageKey: group.key, stageId: group.stageId };

    return (
        <>
            {/* Cabecera de etapa con subtotal */}
            <tr className="sticky top-9 z-10">
                <td colSpan={columns.length + 1} className="p-0">
                    <div className="flex items-center gap-3 h-10 px-3 bg-slate-50 border-y border-slate-200">
                        <button
                            onClick={onToggle}
                            className="flex items-center gap-2 text-slate-700 hover:text-agro-600 transition-colors"
                        >
                            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                            <span className="text-[13px] font-bold uppercase tracking-wide">{group.name}</span>
                        </button>
                        <span className="text-xs font-semibold text-slate-400">
                            {group.rows.length} {group.rows.length === 1 ? 'ítem' : 'ítems'}
                        </span>
                        <div className="ml-auto flex items-baseline gap-3">
                            {share > 0 && <span className="text-xs font-semibold text-slate-400">{share}%</span>}
                            <span className="text-sm font-black tabular-nums text-slate-800">
                                $ {formatAmount(group.subtotal)}
                            </span>
                        </div>
                    </div>
                </td>
            </tr>

            {!collapsed && group.rows.map((expense) => {
                const row: FlatRow = {
                    key: `exp-${expense.id}`,
                    kind: 'expense',
                    stageKey: group.key,
                    stageId: group.stageId,
                    expense,
                };
                const isSaving = savingRows[row.key];

                return (
                    <tr key={row.key} className={cn('group/row hover:bg-agro-50/40', isSaving && 'opacity-60')}>
                        {columns.map((column) => (
                            <GridCell
                                key={column.key}
                                row={row}
                                column={column}
                                value={expense[column.key as keyof Expense]}
                                isActive={active?.rowKey === row.key && active?.colKey === column.key}
                                isEditing={editing && active?.rowKey === row.key && active?.colKey === column.key}
                                draft={draft}
                                selectOnOpen={selectOnOpen}
                                cellRefs={cellRefs}
                                onActivate={onActivate}
                                onStartEdit={onStartEdit}
                                onDraftChange={onDraftChange}
                                onFinishEdit={onFinishEdit}
                                onCancelEdit={onCancelEdit}
                            />
                        ))}
                        <td className="sticky right-0 border-b border-l border-slate-100 px-2 bg-white group-hover/row:bg-agro-50">
                            <div className="flex items-center justify-end gap-0.5">
                                {expense.has_receipt && (
                                    <button
                                        onClick={() => onOpenReceipt(expense)}
                                        title="Ver comprobante"
                                        className="p-1.5 rounded-lg text-agro-600 hover:bg-agro-100 transition-colors"
                                    >
                                        <Paperclip size={14} />
                                    </button>
                                )}
                                {confirmDelete === expense.id ? (
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={() => onConfirmDelete(expense.id)}
                                            className="px-2 h-7 rounded-lg bg-danger-800 text-white text-[11px] font-bold"
                                        >
                                            Borrar
                                        </button>
                                        <button
                                            onClick={() => onRequestDelete(null)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onDuplicate(expense)}
                                            title="Duplicar fila (Ctrl+D)"
                                            className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover/row:opacity-100 transition-all"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            onClick={() => onRequestDelete(expense.id)}
                                            title="Eliminar gasto"
                                            className="p-1.5 rounded-lg text-slate-300 hover:text-danger-800 hover:bg-danger-50 opacity-0 group-hover/row:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                );
            })}

            {/* Fila de alta: se escribe encima y la fila se crea sola */}
            {!collapsed && (
                <tr className={cn('bg-agro-50/30', savingRows[ghostRow.key] && 'opacity-60')}>
                    {columns.map((column) => (
                        <GridCell
                            key={column.key}
                            row={ghostRow}
                            column={column}
                            value={ghostDraft[column.key]}
                            isGhost
                            isDirty={hasGhostDraft}
                            isActive={active?.rowKey === ghostRow.key && active?.colKey === column.key}
                            isEditing={editing && active?.rowKey === ghostRow.key && active?.colKey === column.key}
                            draft={draft}
                            selectOnOpen={selectOnOpen}
                            cellRefs={cellRefs}
                            onActivate={onActivate}
                            onStartEdit={onStartEdit}
                            onDraftChange={onDraftChange}
                            onFinishEdit={onFinishEdit}
                            onCancelEdit={onCancelEdit}
                        />
                    ))}
                    <td className="sticky right-0 border-b border-l border-slate-200 px-2 bg-agro-50/95">
                        <div className="flex items-center justify-end text-agro-600/50">
                            <Plus size={14} />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

// ---------------------------------------------------------------------------

interface GridCellProps {
    row: FlatRow;
    column: Column;
    value: unknown;
    isActive: boolean;
    isEditing: boolean;
    isGhost?: boolean;
    isDirty?: boolean;
    draft: string;
    /** false cuando la edición se abrió tipeando: el cursor va al final. */
    selectOnOpen: boolean;
    cellRefs: MutableRefObject<Map<string, HTMLElement>>;
    onActivate: (rowKey: string, colKey: ColumnKey) => void;
    onStartEdit: (row: FlatRow, column: Column, seed?: string) => void;
    onDraftChange: (value: string) => void;
    onFinishEdit: (row: FlatRow, column: Column, value: string, move: 'down' | 'right' | 'none') => void;
    onCancelEdit: () => void;
}

const GridCell = ({
    row, column, value, isActive, isEditing, isGhost, isDirty, draft, selectOnOpen,
    cellRefs, onActivate, onStartEdit, onDraftChange, onFinishEdit, onCancelEdit,
}: GridCellProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);
    const cellKey = `${row.key}|${column.key}`;

    // useLayoutEffect (no useEffect): flushSync ejecuta los efectos de layout de
    // forma síncrona, así el input ya tiene el foco al volver del handler.
    useLayoutEffect(() => {
        if (!isEditing) return;
        if (column.type === 'select') {
            selectRef.current?.focus();
            return;
        }
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        if (selectOnOpen) input.select();
        else input.setSelectionRange(input.value.length, input.value.length);
    }, [isEditing, column.type, selectOnOpen]);

    const rendered = displayValue(column, value);
    const showPlaceholder = rendered === '' && isGhost && column.placeholder && !isDirty;

    return (
        <td
            className={cn(
                'p-0 border-b border-r',
                isGhost ? 'border-slate-200' : 'border-slate-100',
                isActive && 'relative z-[5]'
            )}
        >
            {isEditing ? (
                column.type === 'select' ? (
                    <select
                        ref={selectRef}
                        value={draft}
                        onChange={(e) => {
                            onDraftChange(e.target.value);
                            onFinishEdit(row, column, e.target.value, 'none');
                        }}
                        onBlur={() => onCancelEdit()}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.preventDefault(); onCancelEdit(); }
                        }}
                        className="w-full h-8 px-2 text-[13px] bg-white outline-none ring-2 ring-inset ring-agro-600"
                    >
                        {column.options?.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        onBlur={() => onFinishEdit(row, column, draft, 'none')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); onFinishEdit(row, column, draft, 'down'); }
                            else if (e.key === 'Tab') { e.preventDefault(); onFinishEdit(row, column, draft, 'right'); }
                            else if (e.key === 'Escape') { e.preventDefault(); onCancelEdit(); }
                        }}
                        placeholder={column.placeholder}
                        className={cn(
                            'w-full h-8 px-2 text-[13px] bg-white outline-none ring-2 ring-inset ring-agro-600 tabular-nums',
                            column.align === 'right' && 'text-right'
                        )}
                    />
                )
            ) : (
                <div
                    ref={(node) => {
                        if (node) cellRefs.current.set(cellKey, node);
                        else cellRefs.current.delete(cellKey);
                    }}
                    role="gridcell"
                    onMouseDown={() => onActivate(row.key, column.key)}
                    onDoubleClick={() => onStartEdit(row, column)}
                    className={cn(
                        'h-8 px-2.5 flex items-center cursor-cell outline-none truncate text-[13px]',
                        column.align === 'right' ? 'justify-end tabular-nums' : 'justify-start',
                        column.key === 'amount' && 'font-bold text-slate-900',
                        column.key === 'description' && 'font-medium text-slate-800',
                        !isActive && 'text-slate-600',
                        isActive && 'ring-2 ring-inset ring-agro-600 bg-white',
                        showPlaceholder && 'text-slate-400 italic'
                    )}
                >
                    <span className="truncate">
                        {rendered || (showPlaceholder ? column.placeholder : '')}
                    </span>
                </div>
            )}
        </td>
    );
};
