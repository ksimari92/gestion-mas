import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle, Check, FolderKanban, Loader2, Plus, Table2, Trash2, X,
} from 'lucide-react';
import { api } from '../services/api';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { stageColor } from '../constants/expenses';
import { Project } from '../types';
import { formatCurrency } from '../utils/format';
import { cn } from '../utils/cn';

/** Plantillas ofrecidas al crear. La agro es sólo el default del rubro. */
const TEMPLATES: { key: string; label: string; hint: string; stages: string[] }[] = [
    {
        key: 'siembra_cosecha',
        label: 'Siembra · Riego · Cosecha',
        hint: 'Ciclo agrícola básico',
        stages: ['Siembra', 'Riego', 'Cosecha'],
    },
    {
        key: 'agro',
        label: 'Ciclo agrícola completo',
        hint: 'Con preparación de suelo y poscosecha',
        stages: ['Preparación de suelo', 'Siembra', 'Riego', 'Fertilización y sanidad', 'Cosecha', 'Poscosecha'],
    },
    {
        key: 'generico',
        label: 'En blanco',
        hint: 'Definís las etapas a mano',
        stages: [],
    },
];

export const Proyectos = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

    const [showForm, setShowForm] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.projects.getAll(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.projects.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
        onError: (err: unknown) => {
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'No se pudo eliminar el proyecto.'
            );
        },
    });

    const openInGrid = (project: Project) => {
        setActiveProject(project.id);
        navigate('/costos');
    };

    return (
        <>
            <div className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Proyectos</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Campañas, lotes u obras. Cada uno agrupa sus costos por etapa.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold hover:bg-agro-800 transition-colors inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={16} strokeWidth={2.5} /> Nuevo proyecto
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-3 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3">
                        <AlertCircle size={18} className="shrink-0 text-danger-800" />
                        <p className="text-sm font-medium text-danger-800 flex-1">{error}</p>
                        <button onClick={() => setError(null)} className="text-danger-800/60 hover:text-danger-800">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {isLoading && (
                    <div className="h-40 grid place-items-center text-slate-400">
                        <Loader2 size={22} className="animate-spin" />
                    </div>
                )}

                {!isLoading && projects.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                        <FolderKanban size={32} className="mx-auto text-slate-300" />
                        <p className="mt-3 text-base font-bold text-slate-800">Todavía no creaste ningún proyecto</p>
                        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                            Un proyecto puede ser una campaña de papa, un lote, una obra o cualquier
                            unidad de costo que quieras seguir por separado.
                        </p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-5 h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold inline-flex items-center gap-2"
                        >
                            <Plus size={16} strokeWidth={2.5} /> Crear el primero
                        </button>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project) => {
                        const spent = project.total_spent ?? 0;
                        const progress = project.budget ? Math.min(100, (spent / project.budget) * 100) : null;
                        const overBudget = project.budget != null && spent > project.budget;

                        return (
                            <article
                                key={project.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-agro-600/30 hover:shadow-sm transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="text-base font-black text-slate-900 truncate">{project.name}</h2>
                                        <p className="text-xs text-slate-400 truncate">
                                            {[
                                                project.code,
                                                project.size ? `${project.size} ${project.size_unit ?? ''}`.trim() : null,
                                                `${project.expense_count ?? 0} gastos`,
                                            ].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    {confirmDelete === project.id ? (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => { setConfirmDelete(null); deleteMutation.mutate(project.id); }}
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
                                            onClick={() => setConfirmDelete(project.id)}
                                            className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-danger-800 hover:bg-danger-50 transition-colors"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-4 flex items-baseline justify-between gap-2">
                                    <span className="text-xl font-black tabular-nums text-slate-900">
                                        {formatCurrency(spent)}
                                    </span>
                                    {project.budget != null && (
                                        <span className={cn('text-xs font-bold', overBudget ? 'text-danger-800' : 'text-slate-400')}>
                                            de {formatCurrency(project.budget)}
                                        </span>
                                    )}
                                </div>

                                {progress != null && (
                                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full', overBudget ? 'bg-danger-800' : 'bg-agro-600')}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {project.stages.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Sin etapas configuradas</span>
                                    )}
                                    {project.stages.map((stage, index) => (
                                        <span
                                            key={stage.id}
                                            className="inline-flex items-center gap-1.5 px-2 h-6 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600"
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: stage.color ?? stageColor(index) }}
                                            />
                                            {stage.name}
                                        </span>
                                    ))}
                                </div>

                                <button
                                    onClick={() => openInGrid(project)}
                                    className="mt-4 w-full h-9 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:border-agro-600 hover:text-agro-600 transition-colors inline-flex items-center justify-center gap-2"
                                >
                                    <Table2 size={15} /> Ver planilla de costos
                                </button>
                            </article>
                        );
                    })}
                </div>
            </div>

            {showForm && <ProjectForm onClose={() => setShowForm(false)} />}
        </>
    );
};

// ---------------------------------------------------------------------------

const ProjectForm = ({ onClose }: { onClose: () => void }) => {
    const queryClient = useQueryClient();
    const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [size, setSize] = useState('');
    const [sizeUnit, setSizeUnit] = useState('ha');
    const [budget, setBudget] = useState('');
    const [templateKey, setTemplateKey] = useState(TEMPLATES[0].key);
    const [stages, setStages] = useState<string[]>(TEMPLATES[0].stages);
    const [newStage, setNewStage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const createMutation = useMutation({
        mutationFn: () =>
            api.projects.create({
                name: name.trim(),
                code: code.trim() || null,
                size: size ? Number(size) : null,
                size_unit: sizeUnit.trim() || null,
                budget: budget ? Number(budget) : null,
                stages,
            }),
        onSuccess: (project) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setActiveProject(project.id);
            onClose();
        },
        onError: (err: unknown) => {
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'No se pudo crear el proyecto.'
            );
        },
    });

    const pickTemplate = (key: string) => {
        setTemplateKey(key);
        setStages(TEMPLATES.find((t) => t.key === key)?.stages ?? []);
    };

    const addStage = () => {
        const value = newStage.trim();
        if (!value) return;
        setStages((prev) => [...prev, value]);
        setNewStage('');
    };

    return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl bg-white p-6 space-y-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900">Nuevo proyecto</h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <Field label="Nombre">
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Papa · Lote 4 · Campaña 2026"
                        className={inputClass}
                    />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                    <Field label="Código">
                        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="L4-26" className={inputClass} />
                    </Field>
                    <Field label="Superficie">
                        <input
                            inputMode="decimal"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            placeholder="120"
                            className={cn(inputClass, 'tabular-nums')}
                        />
                    </Field>
                    <Field label="Unidad">
                        <input
                            value={sizeUnit}
                            onChange={(e) => setSizeUnit(e.target.value)}
                            placeholder="ha"
                            className={inputClass}
                        />
                    </Field>
                </div>

                <Field label="Presupuesto (opcional)">
                    <input
                        inputMode="decimal"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="0"
                        className={cn(inputClass, 'tabular-nums')}
                    />
                </Field>

                <div>
                    <span className="block mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Etapas
                    </span>
                    <div className="grid gap-2">
                        {TEMPLATES.map((template) => (
                            <button
                                key={template.key}
                                onClick={() => pickTemplate(template.key)}
                                className={cn(
                                    'flex items-center gap-3 px-3 h-12 rounded-xl border text-left transition-colors',
                                    templateKey === template.key
                                        ? 'border-agro-600 bg-agro-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                )}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className={cn('text-sm font-bold truncate', templateKey === template.key ? 'text-agro-600' : 'text-slate-700')}>
                                        {template.label}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">{template.hint}</p>
                                </div>
                                {templateKey === template.key && <Check size={16} className="shrink-0 text-agro-600" />}
                            </button>
                        ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {stages.map((stage, index) => (
                            <span
                                key={`${stage}-${index}`}
                                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 h-7 rounded-lg bg-slate-100 text-xs font-bold text-slate-700"
                            >
                                {stage}
                                <button
                                    onClick={() => setStages((prev) => prev.filter((_, i) => i !== index))}
                                    className="p-0.5 text-slate-400 hover:text-danger-800"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>

                    <div className="mt-2 flex gap-2">
                        <input
                            value={newStage}
                            onChange={(e) => setNewStage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStage(); } }}
                            placeholder="Agregar etapa…"
                            className={cn(inputClass, 'h-10')}
                        />
                        <button
                            onClick={addStage}
                            className="h-10 px-3 shrink-0 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:border-agro-600 hover:text-agro-600 transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {error && <p className="text-sm font-medium text-danger-800">{error}</p>}

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => createMutation.mutate()}
                        disabled={!name.trim() || createMutation.isPending}
                        className="flex-1 h-11 rounded-xl bg-agro-600 text-white text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                    >
                        {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                        Crear proyecto
                    </button>
                </div>
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
