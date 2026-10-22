import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle, ChevronRight, Loader2, Pencil, Plus, Search, Sprout, Trash2, Users, X,
} from 'lucide-react';
import { api } from '../services/api';
import { ClientForm } from '../components/organisms/ClientForm';
import { Client, ClientInput } from '../types';
import { formatCurrency } from '../utils/format';
import { digitsOnly } from '../utils/identifiers';
import { cn } from '../utils/cn';

export const Clients = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Client | null>(null);
    const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: () => api.clients.getAll(),
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
    };

    const createMutation = useMutation({
        mutationFn: (data: ClientInput) => api.clients.create(data),
        onSuccess: invalidate,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: ClientInput }) => api.clients.update(id, data),
        onSuccess: invalidate,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.clients.delete(id),
        onSuccess: invalidate,
        onError: (err: unknown) => {
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'No se pudo eliminar el cliente.'
            );
        },
    });

    // La búsqueda alcanza al CUIT y al RENSPA, no sólo al nombre:
    // en el campo se busca por el número que figura en el papel.
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return clients;
        const termDigits = digitsOnly(term);

        return clients.filter((client) => {
            const haystack = [
                client.name, client.cuit, client.renspa, client.senasa_holder,
                client.establishment, client.locality, client.province,
            ].filter(Boolean).join(' ').toLowerCase();

            if (haystack.includes(term)) return true;
            if (termDigits.length >= 3) {
                const numbers = digitsOnly([client.cuit, client.renspa].filter(Boolean).join(''));
                return numbers.includes(termDigits);
            }
            return false;
        });
    }, [clients, search]);

    const totalPending = clients.reduce((acc, c) => acc + (c.pending_balance ?? 0), 0);
    const withDtv = clients.filter((c) => c.has_dtv_data).length;

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
        if (searchParams.get('new')) {
            searchParams.delete('new');
            setSearchParams(searchParams, { replace: true });
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Clientes</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
                        {withDtv > 0 && ` · ${withDtv} con datos de DTV`}
                        {totalPending > 0 && ` · ${formatCurrency(totalPending)} por cobrar`}
                    </p>
                </div>
                <button
                    onClick={() => { setEditing(null); setShowForm(true); }}
                    className="h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold hover:bg-agro-800 transition-colors inline-flex items-center gap-2 shadow-sm"
                >
                    <Plus size={16} strokeWidth={2.5} /> Nuevo cliente
                </button>
            </div>

            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, CUIT o RENSPA…"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-agro-600 focus:ring-2 focus:ring-agro-600/15 transition-colors"
                />
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

            {isLoading ? (
                <div className="h-40 grid place-items-center text-slate-400">
                    <Loader2 size={22} className="animate-spin" />
                </div>
            ) : clients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <Users size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-base font-bold text-slate-800">Todavía no hay clientes</p>
                    <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                        Cargá nombre y CUIT. Si al cliente le emitís DTV, podés guardar
                        su RENSPA y establecimiento para no volver a buscarlos.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-5 h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold inline-flex items-center gap-2"
                    >
                        <Plus size={16} strokeWidth={2.5} /> Crear el primero
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <p className="py-14 text-center text-sm text-slate-400">
                    Ningún cliente coincide con «{search}»
                </p>
            ) : (
                <>
                    {/* Escritorio: tabla densa */}
                    <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <Th>Cliente</Th>
                                    <Th>CUIT</Th>
                                    <Th>RENSPA</Th>
                                    <Th align="right">Ventas</Th>
                                    <Th align="right">Saldo</Th>
                                    <Th align="right"> </Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((client) => (
                                    <tr key={client.id} className="group hover:bg-agro-50/40 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <button
                                                onClick={() => navigate(`/clients/${client.id}`)}
                                                className="flex items-center gap-2.5 text-left min-w-0 w-full"
                                            >
                                                <span className="shrink-0 w-8 h-8 rounded-lg bg-agro-50 text-agro-600 grid place-items-center text-xs font-black">
                                                    {(client.name || '?').charAt(0).toUpperCase()}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block font-bold text-slate-800 truncate group-hover:text-agro-600 transition-colors">
                                                        {client.name}
                                                    </span>
                                                    {client.establishment && (
                                                        <span className="block text-xs text-slate-400 truncate">
                                                            {client.establishment}
                                                            {client.locality ? ` · ${client.locality}` : ''}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums text-slate-600 whitespace-nowrap">
                                            {client.cuit ?? <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            {client.renspa ? (
                                                <span className="inline-flex items-center gap-1.5 tabular-nums text-slate-600">
                                                    <Sprout size={13} className="text-agro-600 shrink-0" />
                                                    {client.renspa}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                                            {client.sale_count ?? 0}
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums font-bold whitespace-nowrap">
                                            {(client.pending_balance ?? 0) > 0 ? (
                                                <span className="text-slate-900">{formatCurrency(client.pending_balance!)}</span>
                                            ) : (
                                                <span className="text-slate-300">Sin saldo</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <RowActions
                                                confirming={confirmDelete === client.id}
                                                onEdit={() => { setEditing(client); setShowForm(true); }}
                                                onAskDelete={() => { setError(null); setConfirmDelete(client.id); }}
                                                onCancelDelete={() => setConfirmDelete(null)}
                                                onConfirmDelete={() => { setConfirmDelete(null); deleteMutation.mutate(client.id); }}
                                                onOpen={() => navigate(`/clients/${client.id}`)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: tarjetas */}
                    <div className="md:hidden space-y-2">
                        {filtered.map((client) => (
                            <div key={client.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                <button
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                    className="w-full flex items-center gap-3 text-left"
                                >
                                    <span className="shrink-0 w-10 h-10 rounded-xl bg-agro-50 text-agro-600 grid place-items-center text-sm font-black">
                                        {(client.name || '?').charAt(0).toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold text-slate-900 truncate">{client.name}</span>
                                        <span className="block text-xs text-slate-400 truncate">
                                            {client.cuit ?? 'Sin CUIT'}
                                            {client.renspa && ` · RENSPA ${client.renspa}`}
                                        </span>
                                    </span>
                                    {(client.pending_balance ?? 0) > 0 && (
                                        <span className="shrink-0 text-sm font-black tabular-nums text-slate-900">
                                            {formatCurrency(client.pending_balance!)}
                                        </span>
                                    )}
                                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {showForm && (
                <ClientForm
                    client={editing}
                    onClose={closeForm}
                    onSubmit={(data) =>
                        editing
                            ? updateMutation.mutateAsync({ id: editing.id, data })
                            : createMutation.mutateAsync(data)
                    }
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------

const Th = ({ children, align }: { children: ReactNode; align?: 'right' }) => (
    <th
        className={cn(
            'px-4 h-9 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap',
            align === 'right' ? 'text-right' : 'text-left'
        )}
    >
        {children}
    </th>
);

const RowActions = ({ confirming, onEdit, onAskDelete, onCancelDelete, onConfirmDelete, onOpen }: {
    confirming: boolean;
    onEdit: () => void;
    onAskDelete: () => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
    onOpen: () => void;
}) => {
    if (confirming) {
        return (
            <div className="flex items-center justify-end gap-1">
                <button onClick={onConfirmDelete} className="px-2 h-7 rounded-lg bg-danger-800 text-white text-[11px] font-bold">
                    Borrar
                </button>
                <button onClick={onCancelDelete} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-end gap-0.5">
            <button
                onClick={onEdit}
                title="Editar cliente"
                className="p-1.5 rounded-lg text-slate-300 hover:text-agro-600 hover:bg-agro-50 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Pencil size={14} />
            </button>
            <button
                onClick={onAskDelete}
                title="Eliminar cliente"
                className="p-1.5 rounded-lg text-slate-300 hover:text-danger-800 hover:bg-danger-50 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 size={14} />
            </button>
            <button
                onClick={onOpen}
                title="Ver cuenta corriente"
                className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    );
};
