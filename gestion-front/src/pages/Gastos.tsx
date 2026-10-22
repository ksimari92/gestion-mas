import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
    Plus, DollarSign, Calendar, Paperclip,
    User, X, AlertCircle, Image as ImageIcon,
    Loader2, ExternalLink, MoreVertical, Edit, Trash2, Check
} from 'lucide-react';
import { Select } from '../components/atoms/Select';
import { api } from '../services/api';
import { Expense, ExpenseCategory, PaymentSource } from '../types';
import { cn } from '../utils/cn';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    insumos: 'Insumos / Materias primas',
    logistica: 'Logística / Flete',
    servicios: 'Servicios',
    alquiler: 'Alquiler',
    mantenimiento: 'Mantenimiento',
    personal: 'Personal',
    impuestos: 'Impuestos',
    otro: 'Otro',
};

const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
    insumos: '🛍️',
    logistica: '🚛',
    servicios: '⚡',
    alquiler: '🏠',
    mantenimiento: '🔧',
    personal: '👷',
    impuestos: '📋',
    otro: '📦',
};

const SOURCE_LABELS: Record<PaymentSource, string> = {
    caja_chica: 'Caja chica',
    banco: 'Banco',
    personal: 'Pago personal',
};

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

export const Gastos = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'todas'>('todas');
    const [showNewModal, setShowNewModal] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState<{ id: number; description: string } | null>(null);
    const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<Expense | null>(null);
    const [selectedExpenseForDelete, setSelectedExpenseForDelete] = useState<Expense | null>(null);

    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setShowNewModal(true);
            const nextSearchParams = new URLSearchParams(searchParams);
            nextSearchParams.delete('new');
            setSearchParams(nextSearchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: () => api.expenses.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: api.expenses.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setShowNewModal(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => api.expenses.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setSelectedExpenseForEdit(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.expenses.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['metrics'] });
            setSelectedExpenseForDelete(null);
        }
    });

    const filteredExpenses = categoryFilter === 'todas'
        ? expenses
        : expenses.filter(e => e.category === categoryFilter);

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col pb-24">
            <header className="bg-white px-6 py-8 border-b border-gray-100 shadow-sm sticky top-0 z-30">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-agro-950 tracking-tighter leading-none mb-1">Gastos</h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Egresos y facturas</p>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="p-3 bg-agro-600 text-white rounded-2xl shadow-lg shadow-agro-900/20 active:scale-95 transition-all"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>

                <Select
                    value={categoryFilter}
                    onChange={(val) => setCategoryFilter(val as any)}
                    options={[
                        { value: 'todas', label: 'TODOS LOS GASTOS' },
                        ...(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => ({
                            value: cat,
                            label: CATEGORY_LABELS[cat].toUpperCase()
                        }))
                    ]}
                />
            </header>

            <main className="flex-1 p-4 space-y-4 pt-6">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-blue-50/10 rounded-[2rem] animate-pulse" />
                    ))
                ) : filteredExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                        <div className="p-8 bg-gray-100 rounded-full mb-4">
                            <DollarSign size={60} strokeWidth={1} />
                        </div>
                        <p className="font-black uppercase tracking-widest text-xs">Sin gastos que mostrar</p>
                    </div>
                ) : (
                    filteredExpenses.map((expense) => (
                        <ExpenseCard
                            key={expense.id}
                            expense={expense}
                            onViewReceipt={() => setViewingReceipt({ id: expense.id, description: expense.description })}
                            onEdit={() => setSelectedExpenseForEdit(expense)}
                            onDelete={() => setSelectedExpenseForDelete(expense)}
                        />
                    ))
                )}
            </main>

            {/* Modals */}
            {showNewModal && (
                <NewExpenseModal
                    onClose={() => setShowNewModal(false)}
                    onSave={(data) => createMutation.mutate(data)}
                    isSubmitting={createMutation.isPending}
                />
            )}

            {viewingReceipt && (
                <ReceiptViewer
                    expenseId={viewingReceipt.id}
                    description={viewingReceipt.description}
                    onClose={() => setViewingReceipt(null)}
                />
            )}

            {selectedExpenseForEdit && (
                <NewExpenseModal
                    editExpense={selectedExpenseForEdit}
                    onClose={() => setSelectedExpenseForEdit(null)}
                    onSave={(data) => updateMutation.mutate({ id: selectedExpenseForEdit.id, data })}
                    isSubmitting={updateMutation.isPending}
                />
            )}

            {selectedExpenseForDelete && (
                <DeleteConfirmModal
                    title="Eliminar Gasto"
                    description={`¿Estás seguro de que quieres eliminar "${selectedExpenseForDelete.description}"?`}
                    onClose={() => setSelectedExpenseForDelete(null)}
                    onConfirm={() => deleteMutation.mutate(selectedExpenseForDelete.id)}
                    isSubmitting={deleteMutation.isPending}
                />
            )}
        </div>
    );
};

const ExpenseCard = ({ expense, onViewReceipt, onEdit, onDelete }: {
    expense: Expense,
    onViewReceipt: () => void,
    onEdit: () => void,
    onDelete: () => void
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 group relative active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                    <div className="text-2xl bg-gray-50/50 w-14 h-14 flex items-center justify-center rounded-2xl border border-gray-50 shadow-sm shrink-0">
                        {CATEGORY_ICONS[expense.category]}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-lg tracking-tighter truncate leading-tight mb-0.5">
                            {expense.description}
                        </h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">
                            {CATEGORY_LABELS[expense.category].split(' / ')[0]}
                        </p>
                        <div className="bg-agro-50 text-agro-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter inline-block">
                            {SOURCE_LABELS[expense.payment_source]}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-right mr-1">
                        <p className="text-xl font-black text-agro-700 tracking-tighter leading-none">
                            {formatCurrency(expense.amount)}
                        </p>
                    </div>

                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
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

            {expense.detail && (
                <div className="mb-5 pl-5 border-l-2 border-gray-100 ml-7 py-0.5">
                    <p className="text-xs text-gray-500 font-medium italic">
                        "{expense.detail}"
                    </p>
                </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">Fecha</span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                            <Calendar size={12} className="text-agro-200" />
                            {formatDate(expense.expense_date)}
                        </p>
                    </div>
                    <div className="flex flex-col border-l border-gray-50 pl-4">
                        <span className="text-[9px] font-black text-gray-300 uppercase leading-none mb-1">Autor</span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                            <User size={12} className="text-agro-200" />
                            {expense.registered_by.split(' ')[0]}
                        </p>
                    </div>
                </div>
                {expense.has_receipt && (
                    <button
                        onClick={onViewReceipt}
                        className="bg-blue-50 text-blue-600 p-3 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 shadow-sm active:scale-90"
                        title="Ver comprobante"
                    >
                        <Paperclip size={18} strokeWidth={3} />
                    </button>
                )}
            </div>
        </div>
    );
};

const NewExpenseModal = ({ editExpense, onClose, onSave, isSubmitting }: {
    editExpense?: Expense,
    onClose: () => void,
    onSave: (data: any) => void,
    isSubmitting: boolean
}) => {
    const [formData, setFormData] = useState({
        description: editExpense?.description || '',
        detail: editExpense?.detail || '',
        amount: editExpense ? String(editExpense.amount) : '',
        category: (editExpense?.category as ExpenseCategory) || 'insumos',
        payment_source: (editExpense?.payment_source as PaymentSource) || (localStorage.getItem('last_expense_source') as PaymentSource) || 'caja_chica',
        expense_date: editExpense ? editExpense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0],
        receipt_base64: null as string | null,
        receipt_mime_type: null as string | null
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError('El archivo no puede superar los 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setFormData(prev => ({ ...prev, receipt_base64: base64, receipt_mime_type: file.type }));
            setPreviewUrl(base64);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.amount || !formData.category || !formData.payment_source || !formData.expense_date) {
            setError('Todos los campos marcados con * son obligatorios');
            return;
        }
        if (Number(formData.amount) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        localStorage.setItem('last_expense_source', formData.payment_source);
        onSave({
            ...formData,
            amount: Number(formData.amount)
        });

        setIsSuccess(true);
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-agro-950/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white rounded-[3rem] p-10 flex flex-col items-center justify-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-xs">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                        <Check className="text-green-600 w-10 h-10" strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-black text-agro-950 uppercase tracking-tighter text-center">Gasto Registrado</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-agro-950/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-8 pb-10 shadow-2xl relative z-10 animate-slide-up max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pt-2 pb-2 z-10">
                    <h2 className="text-xl font-black text-agro-950 uppercase tracking-tight">{editExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Descripción *</label>
                        <input
                            type="text"
                            placeholder="Ej: Bolsas de empaque"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold focus:border-agro-500 outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Detalle / Nota</label>
                        <textarea
                            rows={2}
                            placeholder="Aclaraciones adicionales..."
                            value={formData.detail}
                            onChange={e => setFormData({ ...formData, detail: e.target.value })}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold focus:border-agro-500 outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Monto *</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-10 pr-4 py-3 font-bold focus:border-agro-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Fecha *</label>
                            <input
                                type="date"
                                value={formData.expense_date}
                                onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold focus:border-agro-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Categoría *</label>
                        <Select
                            value={formData.category}
                            onChange={(val) => setFormData({ ...formData, category: val as ExpenseCategory })}
                            options={(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([val, label]) => ({
                                value: val,
                                label: `${CATEGORY_ICONS[val]} ${label}`
                            }))}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Origen del Pago *</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.keys(SOURCE_LABELS) as PaymentSource[]).map((src) => (
                                <button
                                    key={src}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, payment_source: src })}
                                    className={cn(
                                        "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tighter border-2 transition-all",
                                        formData.payment_source === src
                                            ? "bg-agro-600 text-white border-agro-600 shadow-md"
                                            : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                                    )}
                                >
                                    {SOURCE_LABELS[src]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Comprobante (Opcional)</label>
                        <div className="flex items-center gap-4">
                            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                                <Paperclip className="text-gray-400 mb-1" size={20} />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Adjuntar archivo</span>
                            </label>

                            {previewUrl && (
                                <div className="relative w-20 h-20 group">
                                    {formData.receipt_mime_type === 'application/pdf' ? (
                                        <div className="w-full h-full bg-red-50 flex items-center justify-center rounded-xl border border-red-100 text-red-600 font-black text-xs">
                                            PDF
                                        </div>
                                    ) : (
                                        <img src={previewUrl} alt="Comprobante" className="w-full h-full object-cover rounded-xl border-2 border-agro-100 shadow-sm" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setPreviewUrl(null); setFormData(prev => ({ ...prev, receipt_base64: null, receipt_mime_type: null })); }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                            <AlertCircle size={16} />
                            <p className="text-xs font-bold">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 font-black uppercase tracking-widest text-xs text-gray-400"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] bg-agro-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-agro-900/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : editExpense ? 'Actualizar Gasto' : 'Registrar Gasto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteConfirmModal = ({ title, description, onClose, onConfirm, isSubmitting }: any) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-agro-950/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 pb-10 shadow-2xl relative z-10 animate-slide-up">
                <h2 className="text-xl font-black text-agro-950 uppercase tracking-tight mb-4">{title}</h2>
                <p className="text-sm text-gray-600 mb-6">{description}</p>
                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 font-black uppercase tracking-widest text-xs text-gray-400">Cancelar</button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex-[2] bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-900/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReceiptViewer = ({ expenseId, description, onClose }: { expenseId: number, description: string, onClose: () => void }) => {
    const { data: receipt, isLoading } = useQuery({
        queryKey: ['receipt', expenseId],
        queryFn: () => api.expenses.getReceipt(expenseId),
    });

    const openPdf = (base64: string) => {
        const byteCharacters = atob(base64.split(',')[1]);
        const byteNumbers = Array.from(byteCharacters).map(c => c.charCodeAt(0));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-[2rem] overflow-hidden shadow-2xl animate-scale-in">
                <div className="flex justify-between items-center p-6 border-b border-gray-50">
                    <div className="min-w-0 pr-4">
                        <h2 className="text-lg font-black text-gray-900 tracking-tight truncate">{description}</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comprobante registrado</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                    {isLoading ? (
                        <Loader2 className="animate-spin text-agro-600" size={48} />
                    ) : receipt ? (
                        receipt.receipt_mime_type === 'application/pdf' ? (
                            <div className="text-center space-y-6">
                                <div className="bg-red-50 p-8 rounded-[2rem] inline-block mb-4 border-l-4 border-red-500 shadow-sm">
                                    <ImageIcon className="text-red-500" size={64} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900">Documento PDF</h3>
                                <p className="text-sm text-gray-400 max-w-xs mx-auto">Para visualizar este documento correctamente, ábrelo en una nueva pestaña.</p>
                                <button
                                    onClick={() => openPdf(receipt.receipt_base64)}
                                    className="bg-agro-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-lg shadow-agro-900/20 active:scale-95 transition-all w-full"
                                >
                                    <ExternalLink size={18} strokeWidth={3} />
                                    Abrir Documento PDF
                                </button>
                            </div>
                        ) : (
                            <div className="w-full flex justify-center">
                                <img
                                    src={receipt.receipt_base64}
                                    alt="Comprobante"
                                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-gray-100"
                                />
                            </div>
                        )
                    ) : (
                        <div className="text-center text-gray-400">
                            <AlertCircle size={48} className="mx-auto mb-2 opacity-20" />
                            <p className="font-bold">No se pudo cargar el comprobante</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
