import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
    AlertCircle, ArrowLeft, Check, Clock, Copy, Loader2, MoreVertical,
    Pencil, ReceiptText, Sprout, Trash2, X,
} from 'lucide-react';
import { api } from '../services/api';
import { ClientStatement } from '../types';
import { ClientForm } from '../components/organisms/ClientForm';
import { Modal } from '../components/atoms/Modal';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { FormField } from '../components/molecules/FormField';
import { VIZ } from '../constants/viz';
import { formatCurrency, formatDateLong } from '../utils/format';
import { cn } from '../utils/cn';

export const ClientDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditClientOpen, setIsEditClientOpen] = useState(false);
    const [isEditSaleOpen, setIsEditSaleOpen] = useState(false);
    const [isDeleteSaleOpen, setIsDeleteSaleOpen] = useState(false);
    const [isDeleteClientOpen, setIsDeleteClientOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { register: regSale, handleSubmit: handleSale, reset: resetSale } = useForm();

    const { data: statement, isLoading, isError } = useQuery<ClientStatement>({
        queryKey: ['client-statement', id],
        queryFn: () => api.clients.getStatement(Number(id)),
        enabled: !!id,
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['client-statement', id] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
    };

    const deleteClientMutation = useMutation({
        mutationFn: () => api.clients.delete(Number(id)),
        onSuccess: () => { invalidate(); navigate('/clients'); },
        onError: (err: unknown) => {
            setIsDeleteClientOpen(false);
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'No se pudo eliminar el cliente.'
            );
        },
    });

    const updateSaleMutation = useMutation({
        mutationFn: (data: any) => api.sales.update(selectedSale.id, data),
        onSuccess: () => { invalidate(); setIsEditSaleOpen(false); setDropdownOpen(null); },
    });

    const deleteSaleMutation = useMutation({
        mutationFn: (saleId: number) => api.sales.delete(saleId),
        onSuccess: () => { invalidate(); setIsDeleteSaleOpen(false); setDropdownOpen(null); },
    });

    const copy = async (label: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(label);
            setTimeout(() => setCopied(null), 1500);
        } catch {
            // Sin portapapeles disponible: el dato igual está visible en pantalla.
        }
    };

    if (isLoading) {
        return (
            <div className="h-64 grid place-items-center text-slate-400">
                <Loader2 size={24} className="animate-spin" />
            </div>
        );
    }

    if (isError || !statement) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
                <AlertCircle size={30} className="mx-auto text-slate-300" />
                <p className="mt-3 text-base font-bold text-slate-800">No pudimos cargar la cuenta</p>
                <Link
                    to="/clients"
                    className="mt-5 inline-flex h-10 px-4 rounded-xl bg-agro-600 text-white text-sm font-bold items-center gap-2"
                >
                    <ArrowLeft size={16} /> Volver a clientes
                </Link>
            </div>
        );
    }

    const { client, summary, sales } = statement;

    const dtvFields = [
        { label: 'RENSPA', value: client.renspa, copyable: true },
        { label: 'Titular ante SENASA', value: client.senasa_holder },
        { label: 'Establecimiento', value: client.establishment },
        { label: 'Localidad', value: client.locality },
        { label: 'Provincia', value: client.province },
    ].filter((field) => Boolean(field.value));

    const hasDtv = dtvFields.length > 0 || Boolean(client.dtv_notes);

    return (
        <div className="space-y-5">
            {/* Encabezado */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate('/clients')}
                        className="shrink-0 w-10 h-10 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-500 hover:border-agro-600 hover:text-agro-600 transition-colors"
                        title="Volver a clientes"
                    >
                        <ArrowLeft size={17} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 truncate">{client.name}</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {client.cuit ? `CUIT ${client.cuit}` : 'Sin CUIT cargado'}
                            {client.renspa && <span className="text-slate-300"> · </span>}
                            {client.renspa && `RENSPA ${client.renspa}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditClientOpen(true)}
                        className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-agro-600 hover:text-agro-600 transition-colors inline-flex items-center gap-2"
                    >
                        <Pencil size={15} /> Editar
                    </button>
                    <button
                        onClick={() => { setError(null); setIsDeleteClientOpen(true); }}
                        className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 hover:border-danger-800 hover:text-danger-800 transition-colors inline-flex items-center gap-2"
                    >
                        <Trash2 size={15} /> Eliminar
                    </button>
                </div>
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

            {/* Cuenta corriente */}
            <section className="grid gap-4 sm:grid-cols-3">
                <Tile label="Facturado" value={formatCurrency(summary.total_billed)} />
                <Tile label="Cobrado" value={formatCurrency(summary.total_paid)} accent />
                <Tile
                    label="Saldo pendiente"
                    value={formatCurrency(summary.pending_balance)}
                    negative={summary.pending_balance > 0}
                />
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                {/* Ventas */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 order-2 lg:order-1">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">Ventas</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {sales.length} {sales.length === 1 ? 'operación registrada' : 'operaciones registradas'}
                            </p>
                        </div>
                    </div>

                    {sales.length === 0 ? (
                        <div className="py-12 text-center">
                            <Clock size={26} className="mx-auto text-slate-300" />
                            <p className="mt-2 text-sm text-slate-400">Todavía no hay ventas para este cliente</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {sales.map((sale) => {
                                const progress = Math.min((sale.amount_paid_so_far / sale.total_amount) * 100, 100);
                                const isPaid = Boolean(sale.is_fully_paid) || progress >= 99.9;

                                return (
                                    <li key={sale.id} className="rounded-2xl border border-slate-200 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className="shrink-0 w-8 h-8 rounded-lg grid place-items-center"
                                                    style={{
                                                        backgroundColor: isPaid ? VIZ.track : VIZ.warningTrack,
                                                        color: isPaid ? VIZ.data : VIZ.warning,
                                                    }}
                                                >
                                                    {isPaid ? <Check size={15} strokeWidth={3} /> : <ReceiptText size={15} />}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800">
                                                        Venta #{sale.id}
                                                        <span className="ml-2 font-medium text-slate-400">
                                                            {formatDateLong(sale.sale_date)}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-slate-400 tabular-nums">
                                                        {sale.bag_quantity} × {formatCurrency(sale.price_per_bag)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-2 shrink-0">
                                                <span className="text-sm font-black tabular-nums text-slate-900">
                                                    {formatCurrency(sale.total_amount)}
                                                </span>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setDropdownOpen(dropdownOpen === sale.id ? null : sale.id)}
                                                        className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {dropdownOpen === sale.id && (
                                                        <div className="absolute right-0 top-8 z-30 w-40 rounded-xl border border-slate-200 bg-white shadow-xl py-1">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSale(sale);
                                                                    resetSale({
                                                                        bag_quantity: sale.bag_quantity,
                                                                        price_per_bag: sale.price_per_bag,
                                                                        sale_date: sale.sale_date,
                                                                    });
                                                                    setIsEditSaleOpen(true);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                            >
                                                                <Pencil size={14} /> Editar
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedSale(sale); setIsDeleteSaleOpen(true); }}
                                                                className="w-full px-3 py-2 text-left text-sm font-semibold text-danger-800 hover:bg-danger-50 flex items-center gap-2"
                                                            >
                                                                <Trash2 size={14} /> Eliminar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Estado de cobro: la barra acompaña, los números mandan */}
                                        <div className="mt-3">
                                            <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: isPaid ? VIZ.track : VIZ.warningTrack }}>
                                                <div
                                                    className="h-full"
                                                    style={{
                                                        width: `${Math.max(progress, progress > 0 ? 2 : 0)}%`,
                                                        backgroundColor: isPaid ? VIZ.data : VIZ.warning,
                                                        borderRadius: '0 4px 4px 0',
                                                    }}
                                                />
                                            </div>
                                            <div className="mt-1.5 flex items-center justify-between text-xs">
                                                <span className="font-semibold" style={{ color: isPaid ? VIZ.data : VIZ.warning }}>
                                                    {isPaid ? 'Saldada' : `Cobrado ${formatCurrency(sale.amount_paid_so_far)}`}
                                                </span>
                                                {!isPaid && (
                                                    <span className="font-bold text-slate-700 tabular-nums">
                                                        Debe {formatCurrency(sale.pending)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {sale.payments.length > 0 && (
                                            <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                                {sale.payments.map((payment) => (
                                                    <li key={payment.id} className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-500">
                                                            {payment.payment_method.toLowerCase()} · {payment.received_by.split(' ')[0]}
                                                        </span>
                                                        <span className="font-bold tabular-nums" style={{ color: VIZ.data }}>
                                                            +{formatCurrency(payment.amount_paid)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* Ficha de DTV */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 order-1 lg:order-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Sprout size={16} className="text-agro-600" />
                        <h2 className="text-sm font-black text-slate-900">Datos para el DTV</h2>
                    </div>

                    {!hasDtv ? (
                        <div className="text-sm text-slate-400">
                            <p>Este cliente no tiene cargados datos de Documento de Tránsito Vegetal.</p>
                            <button
                                onClick={() => setIsEditClientOpen(true)}
                                className="mt-3 text-sm font-bold text-agro-600 hover:underline"
                            >
                                Cargarlos ahora
                            </button>
                        </div>
                    ) : (
                        <dl className="space-y-3">
                            {dtvFields.map((field) => (
                                <div key={field.label}>
                                    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        {field.label}
                                    </dt>
                                    <dd className="mt-0.5 flex items-center gap-2">
                                        <span className={cn('text-sm font-semibold text-slate-800', field.copyable && 'tabular-nums')}>
                                            {field.value}
                                        </span>
                                        {field.copyable && (
                                            <button
                                                onClick={() => copy(field.label, String(field.value))}
                                                title="Copiar"
                                                className="p-1 rounded-md text-slate-300 hover:text-agro-600 hover:bg-agro-50 transition-colors"
                                            >
                                                {copied === field.label ? <Check size={13} /> : <Copy size={13} />}
                                            </button>
                                        )}
                                    </dd>
                                </div>
                            ))}
                            {client.dtv_notes && (
                                <div className="pt-1">
                                    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Observaciones
                                    </dt>
                                    <dd className="mt-0.5 text-sm text-slate-600">{client.dtv_notes}</dd>
                                </div>
                            )}
                        </dl>
                    )}
                </section>
            </div>

            {/* Modales */}
            {isEditClientOpen && (
                <ClientForm
                    client={client}
                    onClose={() => setIsEditClientOpen(false)}
                    onSubmit={async (data) => {
                        await api.clients.update(Number(id), data);
                        invalidate();
                    }}
                />
            )}

            <Modal isOpen={isEditSaleOpen} onClose={() => setIsEditSaleOpen(false)} title="Editar venta">
                <form onSubmit={handleSale((d) => updateSaleMutation.mutate(d))} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cantidad" required>
                            <Input type="number" {...regSale('bag_quantity', { required: true, valueAsNumber: true })} />
                        </FormField>
                        <FormField label="Precio unitario" required>
                            <Input type="number" step="0.01" {...regSale('price_per_bag', { required: true, valueAsNumber: true })} />
                        </FormField>
                    </div>
                    <FormField label="Fecha" required>
                        <Input type="date" {...regSale('sale_date', { required: true })} />
                    </FormField>
                    <Button type="submit" className="w-full bg-agro-600 text-white" disabled={updateSaleMutation.isPending}>
                        {updateSaleMutation.isPending ? <Loader2 className="animate-spin" /> : 'Guardar cambios'}
                    </Button>
                </form>
            </Modal>

            <Modal isOpen={isDeleteSaleOpen} onClose={() => setIsDeleteSaleOpen(false)} title="Eliminar venta">
                <div className="space-y-6">
                    <p className="text-sm text-slate-600">
                        ¿Eliminar la venta <span className="font-bold text-slate-900">#{selectedSale?.id}</span>?
                        Se borran también los cobros asociados y no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteSaleOpen(false)} className="flex-1">Cancelar</Button>
                        <Button
                            onClick={() => deleteSaleMutation.mutate(selectedSale.id)}
                            className="flex-1 bg-danger-800 text-white"
                            disabled={deleteSaleMutation.isPending}
                        >
                            {deleteSaleMutation.isPending ? <Loader2 className="animate-spin" /> : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteClientOpen} onClose={() => setIsDeleteClientOpen(false)} title="Eliminar cliente">
                <div className="space-y-6">
                    <p className="text-sm text-slate-600">
                        ¿Eliminar a <span className="font-bold text-slate-900">{client.name}</span>?
                        Se pierden también sus datos de DTV. Si tiene ventas registradas,
                        primero hay que eliminarlas.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteClientOpen(false)} className="flex-1">Cancelar</Button>
                        <Button
                            onClick={() => deleteClientMutation.mutate()}
                            className="flex-1 bg-danger-800 text-white"
                            disabled={deleteClientMutation.isPending}
                        >
                            {deleteClientMutation.isPending ? <Loader2 className="animate-spin" /> : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const Tile = ({ label, value, accent, negative }: {
    label: string;
    value: string;
    accent?: boolean;
    negative?: boolean;
}) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p
            className="mt-1 text-xl font-black tabular-nums"
            style={{ color: negative ? VIZ.critical : accent ? VIZ.data : '#0f172a' }}
        >
            {value}
        </p>
    </div>
);
