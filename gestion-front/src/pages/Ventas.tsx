import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, DollarSign, Package, User, X, AlertCircle, MoreVertical, Edit, Trash2, Check } from 'lucide-react';
import { Select } from '../components/atoms/Select';
import { api } from '../services/api';
import { SaleWithStatus, Client, SaleStatus } from '../types';
import { cn } from '../utils/cn';
import { IncomeEntry } from '../components/organisms/IncomeEntry';

type StatusFilter = 'TODOS' | SaleStatus;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(value);

const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

export const Ventas = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');
    const [showNewSaleModal, setShowNewSaleModal] = useState(false);
    const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<SaleWithStatus | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<SaleWithStatus | null>(null);
    const [selectedSaleForDelete, setSelectedSaleForDelete] = useState<SaleWithStatus | null>(null);

    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setShowNewSaleModal(true);
            const nextSearchParams = new URLSearchParams(searchParams);
            nextSearchParams.delete('new');
            setSearchParams(nextSearchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const { data: sales = [], isLoading: isLoadingSales } = useQuery({
        queryKey: ['sales'],
        queryFn: api.sales.getAll,
    });

    const { data: clientsList = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: api.clients.getAll,
    });

    const createSaleMutation = useMutation({
        mutationFn: api.sales.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setShowNewSaleModal(false);
        },
    });

    const createPaymentMutation = useMutation({
        mutationFn: api.payments.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setSelectedSaleForPayment(null);
        },
    });

    const updateSaleMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => api.sales.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setSelectedSaleForEdit(null);
        },
    });

    const deleteSaleMutation = useMutation({
        mutationFn: (id: number) => api.sales.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setSelectedSaleForDelete(null);
        },
    });

    const filteredSales = sales.filter(s => {
        const matchesStatus = statusFilter === 'TODOS' || s.status === statusFilter;
        const matchesSearch = s.client_name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col pb-24">
            <header className="bg-white px-6 py-8 border-b border-gray-100 shadow-sm sticky top-0 z-30">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-agro-950 tracking-tighter leading-none mb-1">Ventas</h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestión de facturación</p>
                    </div>
                    <button
                        onClick={() => setShowNewSaleModal(true)}
                        className="p-3 bg-agro-600 text-white rounded-2xl shadow-lg shadow-agro-900/20 active:scale-95 transition-all"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-agro-600" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:bg-white focus:border-agro-100 outline-none font-bold transition-all placeholder:text-gray-300"
                        />
                    </div>

                    <Select
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val as StatusFilter)}
                        options={[
                            { value: 'TODOS', label: 'TODOS LOS REGISTROS' },
                            { value: 'IMPAGO', label: 'FACTURAS IMPAGAS' },
                            { value: 'PARCIAL', label: 'FACTURAS PARCIALES' },
                            { value: 'SALDADO', label: 'FACTURAS SALDADAS' },
                        ]}
                        className="flex-1"
                    />
                </div>
            </header>

            <main className="flex-1 p-4 space-y-4 pt-6">
                {isLoadingSales ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-blue-50/10 rounded-[2rem] animate-pulse" />
                    ))
                ) : filteredSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                        <div className="p-8 bg-gray-100 rounded-full mb-4">
                            <Package size={60} strokeWidth={1} />
                        </div>
                        <p className="font-black uppercase tracking-widest text-xs">Sin registros que mostrar</p>
                    </div>
                ) : (
                    filteredSales.map((sale) => (
                        <SaleCard
                            key={sale.id}
                            sale={sale}
                            onAddPayment={() => setSelectedSaleForPayment(sale)}
                            onEdit={() => setSelectedSaleForEdit(sale)}
                            onDelete={() => setSelectedSaleForDelete(sale)}
                        />
                    ))
                )}
            </main>

            {showNewSaleModal && (
                <IncomeEntry
                    clients={clientsList}
                    onClose={() => setShowNewSaleModal(false)}
                    onSave={(data) => createSaleMutation.mutateAsync(data)}
                    isSubmitting={createSaleMutation.isPending}
                />
            )}

            {selectedSaleForPayment && (
                <AddPaymentModal
                    sale={selectedSaleForPayment}
                    onClose={() => setSelectedSaleForPayment(null)}
                    onSave={(data) => createPaymentMutation.mutate(data)}
                    isSubmitting={createPaymentMutation.isPending}
                />
            )}

            {selectedSaleForEdit && (
                <NewSaleModal
                    clients={clientsList}
                    editSale={selectedSaleForEdit}
                    onClose={() => setSelectedSaleForEdit(null)}
                    onSave={(data) => updateSaleMutation.mutate({ id: selectedSaleForEdit.id, data })}
                    isSubmitting={updateSaleMutation.isPending}
                />
            )}

            {selectedSaleForDelete && (
                <DeleteConfirmModal
                    title="Eliminar Venta"
                    description={`¿Estás seguro de que quieres eliminar la venta #${selectedSaleForDelete.id} de ${selectedSaleForDelete.client_name}?`}
                    warning="Esta acción eliminará todos los cobros asociados."
                    onClose={() => setSelectedSaleForDelete(null)}
                    onConfirm={() => deleteSaleMutation.mutate(selectedSaleForDelete.id)}
                    isSubmitting={deleteSaleMutation.isPending}
                />
            )}
        </div>
    );
};

const SaleCard = ({ sale, onAddPayment, onEdit, onDelete }: {
    sale: SaleWithStatus,
    onAddPayment: () => void,
    onEdit: () => void,
    onDelete: () => void
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const progress = Math.min((sale.amount_paid_so_far / sale.total_amount) * 100, 100);
    const isSaldado = sale.status === 'SALDADO';

    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 relative overflow-hidden group active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start mb-5">
                <div className="min-w-0 pr-4">
                    <h3 className="font-black text-slate-900 text-lg tracking-tighter truncate leading-tight mb-0.5">
                        {sale.client_name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-agro-600 uppercase tracking-widest">{formatDate(sale.sale_date)}</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{sale.bag_quantity} Bolsas</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        isSaldado ? "bg-green-50 text-green-700 border-green-100" :
                            sale.status === 'PARCIAL' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                "bg-red-50 text-red-700 border-red-100"
                    )}>
                        {sale.status}
                    </div>

                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <MoreVertical size={18} className="text-gray-300" />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-40 animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => { onEdit(); setDropdownOpen(false); }}
                                    className="w-full px-5 py-3 text-left text-[10px] font-black uppercase text-gray-600 hover:bg-agro-50 flex items-center gap-3"
                                >
                                    <Edit size={14} /> Editar
                                </button>
                                <button
                                    onClick={() => { onDelete(); setDropdownOpen(false); }}
                                    className="w-full px-5 py-3 text-left text-[10px] font-black uppercase text-red-600 hover:bg-red-50 flex items-center gap-3"
                                >
                                    <Trash2 size={14} /> Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-50 flex items-end justify-between mb-5">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Venta</p>
                    <p className="text-2xl font-black text-agro-700 tracking-tighter leading-none">
                        {formatCurrency(sale.total_amount)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pagado</p>
                    <p className="text-sm font-black text-slate-700 tracking-tight leading-none">
                        {formatCurrency(sale.amount_paid_so_far)}
                    </p>
                </div>
            </div>

            <div className="space-y-3 px-1 mb-5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-gray-400">Progreso de Pago</span>
                    <span className={isSaldado ? "text-green-600" : "text-amber-600"}>{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-100">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            isSaldado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" :
                                progress > 0 ? "bg-amber-400" : "bg-gray-200"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <User size={14} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase leading-none mb-0.5">Vendedor</p>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{sale.created_by.split(' ')[0]}</p>
                    </div>
                </div>

                {!isSaldado && (
                    <button
                        onClick={onAddPayment}
                        className="bg-agro-50 text-agro-700 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all border border-agro-100 shadow-sm shadow-agro-900/5 hover:bg-agro-100"
                    >
                        <DollarSign size={14} strokeWidth={3} />
                        Cobrar
                    </button>
                )}
            </div>

            {!isSaldado && (
                <div className="absolute top-0 right-0 p-1">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                </div>
            )}
        </div>
    );
};

// Re-including missing modals
const NewSaleModal = ({ clients, editSale, onClose, onSave, isSubmitting }: {
    clients: Client[],
    editSale?: SaleWithStatus,
    onClose: () => void,
    onSave: (data: any) => void,
    isSubmitting: boolean
}) => {
    const [formData, setFormData] = useState({
        client_id: editSale ? String(editSale.client_id) : '',
        sale_date: editSale ? editSale.sale_date.split('T')[0] : new Date().toISOString().split('T')[0],
        bag_quantity: editSale ? String(editSale.bag_quantity) : '',
        price_per_bag: editSale ? String(editSale.price_per_bag) : ''
    });
    const [error, setError] = useState('');

    const total = (Number(formData.bag_quantity) || 0) * (Number(formData.price_per_bag) || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.client_id || !formData.bag_quantity || !formData.price_per_bag || !formData.sale_date) {
            setError('Todos los campos son obligatorios');
            return;
        }
        onSave({
            ...formData,
            client_id: Number(formData.client_id),
            bag_quantity: Number(formData.bag_quantity),
            price_per_bag: Number(formData.price_per_bag)
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-agro-950/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-8 pb-10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-500">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black text-agro-950 uppercase tracking-tight leading-none mb-1">{editSale ? 'Editar Venta' : 'Nueva Venta'}</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registrar transacción</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-colors"><X size={20} strokeWidth={3} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cliente *</label>
                        <Select
                            value={formData.client_id}
                            onChange={(val) => setFormData({ ...formData, client_id: val })}
                            options={clients.map(c => ({ value: String(c.id), label: c.name }))}
                            placeholder="Seleccionar Cliente"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Fecha *</label>
                            <input
                                type="date"
                                value={formData.sale_date}
                                onChange={e => setFormData({ ...formData, sale_date: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 font-bold focus:border-agro-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Cant. Bolsas *</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.bag_quantity}
                                onChange={e => setFormData({ ...formData, bag_quantity: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-5 py-4 font-bold focus:border-agro-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Precio por Bolsa *</label>
                        <div className="relative">
                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                            <input
                                type="number"
                                placeholder="0"
                                value={formData.price_per_bag}
                                onChange={e => setFormData({ ...formData, price_per_bag: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-12 pr-5 py-4 font-bold focus:border-agro-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-5 bg-agro-50/50 rounded-2xl border border-agro-50 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-agro-600 uppercase tracking-widest leading-none mb-1">Monto Total</p>
                            <p className="text-2xl font-black text-agro-700 tracking-tighter">{formatCurrency(total)}</p>
                        </div>
                        <Check className="text-agro-200" size={32} strokeWidth={3} />
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 animate-pulse">
                            <AlertCircle size={20} />
                            <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-agro-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-agro-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Guardando...' : editSale ? 'Actualizar Venta' : 'Confirmar Venta'}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2 font-black uppercase tracking-widest text-[10px] text-gray-300 hover:text-gray-400 transition-colors"
                    >
                        Cancelar
                    </button>
                </form>
            </div>
        </div>
    );
};

const DeleteConfirmModal = ({ title, description, warning, onClose, onConfirm, isSubmitting }: any) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 pb-10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-500">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                    <Trash2 className="text-red-600" size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">{title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6 font-medium">{description}</p>
                {warning && (
                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-2xl mb-8 flex items-start gap-3">
                        <AlertCircle className="text-red-500 shrink-0" size={18} />
                        <div>
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-0.5">Atención</p>
                            <p className="text-xs text-red-600/70 font-bold leading-tight">{warning}</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Eliminando...' : 'Eliminar Registro'}
                    </button>
                    <button onClick={onClose} className="w-full py-4 font-black uppercase tracking-widest text-[10px] text-gray-300 hover:text-gray-400 transition-colors">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

const AddPaymentModal = ({ sale, onClose, onSave, isSubmitting }: {
    sale: SaleWithStatus,
    onClose: () => void,
    onSave: (data: any) => void,
    isSubmitting: boolean
}) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE'>(() => {
        return (localStorage.getItem('last_payment_method') as any) || 'EFECTIVO';
    });
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = Number(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            setError('Monto inválido');
            return;
        }
        if (paymentAmount > sale.pending + 0.01) {
            setError(`Límite: ${formatCurrency(sale.pending)}`);
            return;
        }

        localStorage.setItem('last_payment_method', method);
        onSave({
            sale_id: sale.id,
            amount_paid: paymentAmount,
            payment_method: method
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-agro-950/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-8 pb-10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-500">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black text-agro-950 uppercase tracking-tight leading-none mb-1">Registrar Cobro</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Abono a deuda</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-colors"><X size={20} strokeWidth={3} /></button>
                </div>

                <div className="p-6 bg-gray-50/50 rounded-[2rem] mb-8 border border-gray-50 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo a Pagar</p>
                        <p className="text-3xl font-black text-rose-600 tracking-tighter">{formatCurrency(sale.pending)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-agro-600/40 uppercase tracking-widest mb-1">Cliente</p>
                        <p className="text-xs font-black text-slate-400 uppercase truncate max-w-[120px]">{sale.client_name}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Importe a recibir *</label>
                        <div className="relative">
                            <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={28} />
                            <input
                                type="number"
                                inputMode="decimal"
                                placeholder="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-50 rounded-[2rem] pl-14 pr-6 py-6 text-3xl font-black text-agro-700 focus:border-agro-500 focus:bg-white outline-none transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Vía de cobro *</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMethod(m)}
                                    className={cn(
                                        "py-4 rounded-2xl text-[9px] font-black uppercase tracking-tighter transition-all border-2",
                                        method === m
                                            ? "bg-agro-600 text-white border-agro-600 shadow-lg shadow-agro-900/20"
                                            : "bg-white text-gray-400 border-gray-50 hover:border-gray-100"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 animate-bounce">
                            <AlertCircle size={20} />
                            <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-agro-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-agro-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Procesando...' : 'Confirmar Ingreso'}
                        </button>
                        <button type="button" onClick={onClose} className="w-full py-2 font-black uppercase tracking-widest text-[10px] text-gray-300 hover:text-gray-400 transition-colors">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
