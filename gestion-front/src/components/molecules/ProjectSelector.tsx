import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, FolderKanban, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';

/**
 * Selector de proyecto activo. Es el filtro transversal de toda la
 * herramienta: lo que se elija acá alcanza a la planilla y al panel.
 */
export const ProjectSelector = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
    const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.projects.getAll(),
    });

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onEscape);
        };
    }, [open]);

    const activeProject = typeof activeProjectId === 'number'
        ? projects.find((p) => p.id === activeProjectId)
        : undefined;

    const label = activeProject
        ? activeProject.name
        : activeProjectId === 'none'
            ? 'Sin proyecto'
            : 'Todos los proyectos';

    const select = (value: number | 'none' | null) => {
        setActiveProject(value);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'flex items-center gap-2 h-10 pl-3 pr-2 rounded-xl border text-sm font-semibold',
                    'bg-white border-slate-200 text-slate-800 hover:border-slate-300 transition-colors',
                    'max-w-[16rem] sm:max-w-xs',
                    open && 'border-agro-600 ring-2 ring-agro-600/15'
                )}
            >
                <FolderKanban size={16} className="shrink-0 text-agro-600" />
                <span className="truncate">{label}</span>
                <ChevronDown size={16} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute left-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto p-1.5">
                        <Option label="Todos los proyectos" selected={activeProjectId === null} onClick={() => select(null)} />
                        <Option label="Sin proyecto asignado" selected={activeProjectId === 'none'} onClick={() => select('none')} />

                        {projects.length > 0 && <div className="my-1.5 border-t border-slate-100" />}

                        {projects.map((project) => (
                            <Option
                                key={project.id}
                                label={project.name}
                                hint={[
                                    project.code,
                                    project.size ? `${project.size} ${project.size_unit ?? ''}`.trim() : null,
                                    project.total_spent ? formatCurrency(project.total_spent) : null,
                                ].filter(Boolean).join(' · ')}
                                selected={activeProjectId === project.id}
                                onClick={() => select(project.id)}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => { setOpen(false); navigate('/proyectos'); }}
                        className="w-full flex items-center gap-2 px-4 h-11 text-sm font-semibold text-agro-600 border-t border-slate-100 hover:bg-agro-50 transition-colors"
                    >
                        <Plus size={16} /> Administrar proyectos
                    </button>
                </div>
            )}
        </div>
    );
};

interface OptionProps {
    label: string;
    hint?: string;
    selected: boolean;
    onClick: () => void;
}

const Option = ({ label, hint, selected, onClick }: OptionProps) => (
    <button
        onClick={onClick}
        className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors',
            selected ? 'bg-agro-50' : 'hover:bg-slate-50'
        )}
    >
        <div className="min-w-0 flex-1">
            <p className={cn('text-sm truncate', selected ? 'font-bold text-agro-600' : 'font-medium text-slate-700')}>
                {label}
            </p>
            {hint && <p className="text-xs text-slate-400 truncate">{hint}</p>}
        </div>
        {selected && <Check size={16} className="shrink-0 text-agro-600" />}
    </button>
);
