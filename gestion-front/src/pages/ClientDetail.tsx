import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, TrendingDown, DollarSign, Clock, ReceiptText, Edit, Trash2, MoreVertical, Loader2, Check } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';
import { ClientStatement } from '../types';
import { cn } from '../utils/cn';
import { Modal } from '../components/atoms/Modal';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { FormField } from '../components/molecules/FormField';
import { useForm } from 'react-hook-form';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(value);

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

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

    const { register: regClient, handleSubmit: handleClient, reset: resetClient } = useForm();
    const { register: regSale, handleSubmit: handleSale, reset: resetSale } = useForm();

    const { data: statement, isLoading, isError } = useQuery<ClientStatement>({
        queryKey: ['client-statement', id],
        queryFn: () => api.clients.getStatement(Number(id)),
        enabled: !!id,
    });

    const updateClientMutation = useMutation({
        mutationFn: (data: any) => api.clients.update(Number(id), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client-statement', id] });
            queryClient.invalidateQueries({ queryKey: ['client-account-state'] });
            setIsEditClientOpen(false);
        }
    });

    const deleteClientMutation = useMutation({
        mutationFn: () => api.clients.delete(Number(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client-account-state'] });
            navigate('/clients');
        }
    });

    const updateSaleMutation = useMutation({
        mutationFn: (data: any) => api.sales.update(selectedSale.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-statement', id] });
            queryClient.invalidateQueries({ queryKey: ['client-account-state'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setIsEditSaleOpen(false);
            setDropdownOpen(null);
        }
    });

    const deleteSaleMutation = useMutation({
        mutationFn: (saleId: number) => api.sales.delete(saleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-statement', id] });
            queryClient.invalidateQueries({ queryKey: ['client-account-state'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setIsDeleteSaleOpen(false);
            setDropdownOpen(null);
        }
    });

    const onEditClient = () => {
        if (statement) {
            resetClient({ name: statement.client.name, cuit: statement.client.cuit || '' });
            setIsEditClientOpen(true);
        }
    };

    const onEditSale = (sale: any) => {
        setSelectedSale(sale);
        resetSale({
            bag_quantity: sale.bag_quantity,
            price_per_bag: sale.price_per_bag,
            sale_date: sale.sale_date.split('T')[0],
            client_id: Number(id)
        });
        setIsEditSaleOpen(true);
    };

    const onDeleteSale = (sale: any) => {
        setSelectedSale(sale);
        setIsDeleteSaleOpen(true);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50/50 p-4 space-y-6 animate-pulse">
                <div className="h-20 bg-white rounded-2xl border border-gray-100 shadow-sm" />
                <div className="grid grid-cols-3 gap-3">
                    <div className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm" />
                    <div className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm" />
                    <div className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm" />
                </div>
                <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-44 bg-white rounded-[2rem] border border-gray-100 shadow-sm" />)}
                </div>
            </div>
        );
    }

    if (isError || !statement) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100 max-w-sm">
                    <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <TrendingDown className="text-rose-500 w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tighter mb-2">Algo salió mal</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">No pudimos cargar la cuenta</p>
                    <button
                        onClick={() => navigate('/clients')}
                        className="w-full bg-agro-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-agro-900/20 active:scale-95 transition-all"
                    >
                        Volver a Clientes
                    </button>
                </div>
            </div>
        );
    }

    const { client, summary, sales } = statement;

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col pb-20">
            <header className="sticky top-0 bg-white/80 backdrop-blur-md px-4 py-6 flex items-center gap-4 z-40 border-b border-gray-100/50">
                <button
                    onClick={() => navigate('/clients')}
                    className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors active:scale-90"
                >
                    <ChevronLeft className="h-6 w-6 text-agro-600" strokeWidth={3} />
                </button>
                <div>
                    <h1 className="text-xl font-black text-agro-950 tracking-tight leading-none mb-1">Estado de Cuenta</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{client.name}</p>
                </div>
            </header>

            <main className="p-4 space-y-8 mt-2">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 relative overflow-hidden group">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="bg-agro-50 w-16 h-16 rounded-full flex items-center justify-center text-agro-600 font-black text-3xl border-2 border-white shadow-sm shrink-0">
                            {(client.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter truncate leading-tight">
                                {client.name}
                            </h2>
                            {client.cuit ? (
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">CUIT: {client.cuit}</p>
                            ) : (
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mt-0.5 italic lowercase">sin cuit registrado</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onEditClient}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 text-gray-400 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95 border border-gray-100/50"
                        >
                            <Edit size={12} /> Editar
                        </button>
                        <button
                            onClick={() => setIsDeleteClientOpen(true)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50/50 text-rose-400 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 border border-rose-100/30"
                        >
                            <Trash2 size={12} /> Eliminar
                        </button>
                    </div>
                </div>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Resumen General</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Total</p>
                            <p className="text-xs font-black text-slate-700 tracking-tight leading-none">{formatCurrency(summary.total_billed)}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm text-center">
                            <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-1.5">Pagado</p>
                            <p className="text-xs font-black text-green-700 tracking-tight leading-none">{formatCurrency(summary.total_paid)}</p>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm text-center">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1.5">Pendiente</p>
                            <p className="text-xs font-black text-rose-600 tracking-tight leading-none">{formatCurrency(summary.pending_balance)}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Últimas Ventas</h3>
                        <span className="text-[10px] font-black text-agro-600 uppercase">{sales.length} registros</span>
                    </div>

                    <div className="space-y-4">
                        {sales.length === 0 ? (
                            <div className="bg-white p-12 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                                <Clock className="mx-auto text-gray-200 mb-2 w-8 h-8" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">No hay operaciones<br />registradas aún</p>
                            </div>
                        ) : (
                            sales.map((sale) => {
                                const progress = Math.min((sale.amount_paid_so_far / sale.total_amount) * 100, 100);
                                const isPaid = sale.is_fully_paid || progress >= 99.9;

                                return (
                                    <div key={sale.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 flex flex-col gap-5 relative group active:scale-[0.99] transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-2xl flex items-center justify-center border",
                                                    isPaid ? "bg-green-50 text-green-600 border-green-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                                )}>
                                                    {isPaid ? <Check size={20} strokeWidth={3} /> : <ReceiptText size={20} />}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight leading-none mb-1">Venta #{sale.id}</h4>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(sale.sale_date)}</p>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setDropdownOpen(dropdownOpen === sale.id ? null : sale.id)}
                                                    className="p-2 hover:bg-gray-50 rounded-full transition-colors active:scale-90"
                                                >
                                                    <MoreVertical className="h-5 w-5 text-gray-300" />
                                                </button>

                                                {dropdownOpen === sale.id && (
                                                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-40 animate-in fade-in slide-in-from-top-2">
                                                        <button
                                                            onClick={() => onEditSale(sale)}
                                                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase text-gray-600 hover:bg-agro-50 flex items-center gap-3"
                                                        >
                                                            <Edit size={14} /> Editar
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteSale(sale)}
                                                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase text-red-600 hover:bg-red-50 flex items-center gap-3"
                                                        >
                                                            <Trash2 size={14} /> Eliminar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50/50 p-5 rounded-2xl flex items-center justify-between border border-gray-50">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto Neto</p>
                                                <p className="text-2xl font-black text-agro-700 tracking-tighter leading-none">
                                                    {formatCurrency(sale.total_amount)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Detalle</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase">
                                                    {sale.bag_quantity} Bolsas <span className="text-gray-300">|</span> {formatCurrency(sale.price_per_bag)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 px-1">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-gray-400">Estado de Cobro</span>
                                                <span className={cn(isPaid ? "text-green-600" : "text-amber-600")}>
                                                    {Math.round(progress)}%
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                                        isPaid ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-amber-400"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">Cobrado</span>
                                                    <p className="text-xs font-black text-slate-700 tracking-tighter">{formatCurrency(sale.amount_paid_so_far)}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">Deuda</span>
                                                    <p className="text-xs font-black text-rose-600 tracking-tighter">{formatCurrency(sale.pending)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-50 -mx-6" />

                                        <div className="space-y-4">
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Historial de Cobros</h5>
                                            {sale.payments.length === 0 ? (
                                                <div className="py-2 px-1">
                                                    <p className="text-[10px] font-bold text-gray-300 uppercase italic">Sin pagos vinculados</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {sale.payments.map((payment) => (
                                                        <div key={payment.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-colors hover:bg-gray-50/50">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                                                                    <DollarSign size={18} strokeWidth={3} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900 leading-tight tracking-tight">
                                                                        {formatCurrency(payment.amount_paid)}
                                                                    </p>
                                                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter px-1.5 py-0.5 bg-green-50 rounded inline-block mt-1">
                                                                        {payment.payment_method}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">{formatDate(payment.created_at)}</p>
                                                                <p className="text-[9px] font-bold text-gray-300 uppercase">Por {payment.received_by.split(' ')[0]}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>

            <Modal isOpen={isEditClientOpen} onClose={() => setIsEditClientOpen(false)} title="Editar Perfil">
                <form onSubmit={handleClient((d) => updateClientMutation.mutate(d))} className="space-y-6">
                    <FormField label="Nombre" required>
                        <Input {...regClient('name', { required: true })} />
                    </FormField>
                    <FormField label="CUIT">
                        <Input {...regClient('cuit')} />
                    </FormField>
                    <Button type="submit" className="w-full bg-agro-600 text-white" disabled={updateClientMutation.isPending}>
                        {updateClientMutation.isPending ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                    </Button>
                </form>
            </Modal>

            <Modal isOpen={isEditSaleOpen} onClose={() => setIsEditSaleOpen(false)} title="Editar Venta">
                <form onSubmit={handleSale((d) => updateSaleMutation.mutate(d))} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Bolsas" required>
                            <Input type="number" {...regSale('bag_quantity', { required: true, valueAsNumber: true })} />
                        </FormField>
                        <FormField label="Precio" required>
                            <Input type="number" step="0.01" {...regSale('price_per_bag', { required: true, valueAsNumber: true })} />
                        </FormField>
                    </div>
                    <FormField label="Fecha" required>
                        <Input type="date" {...regSale('sale_date', { required: true })} />
                    </FormField>
                    <Button type="submit" className="w-full bg-agro-600 text-white" disabled={updateSaleMutation.isPending}>
                        {updateSaleMutation.isPending ? <Loader2 className="animate-spin" /> : 'Actualizar Venta'}
                    </Button>
                </form>
            </Modal>

            <Modal isOpen={isDeleteSaleOpen} onClose={() => setIsDeleteSaleOpen(false)} title="Eliminar Venta">
                <div className="space-y-6">
                    <p className="text-sm text-slate-600 font-medium">
                        ¿Estás seguro de que quieres eliminar la venta <span className="font-black text-slate-900">#{selectedSale?.id}</span>?
                        <br /><br />
                        <span className="text-red-600 font-bold uppercase text-[10px] tracking-widest border border-red-100 bg-red-50 px-2 py-1 rounded">Atención:</span> Esta acción también eliminará todos los cobros asociados a esta venta.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteSaleOpen(false)} className="flex-1">Cancelar</Button>
                        <Button onClick={() => deleteSaleMutation.mutate(selectedSale.id)} className="flex-1 bg-red-600 text-white" disabled={deleteSaleMutation.isPending}>
                            {deleteSaleMutation.isPending ? <Loader2 className="animate-spin" /> : 'Eliminar Venta'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteClientOpen} onClose={() => setIsDeleteClientOpen(false)} title="Eliminar Cliente">
                <div className="space-y-6">
                    <p className="text-sm text-slate-600 font-medium">
                        ¿Estás seguro de que quieres eliminar a <span className="font-black text-slate-900">{client.name}</span>?
                        Esta acción es permanente.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsDeleteClientOpen(false)} className="flex-1">Cancelar</Button>
                        <Button onClick={() => deleteClientMutation.mutate()} className="flex-1 bg-red-600 text-white" disabled={deleteClientMutation.isPending}>
                            {deleteClientMutation.isPending ? <Loader2 className="animate-spin" /> : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
