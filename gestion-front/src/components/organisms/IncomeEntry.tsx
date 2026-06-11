import React, { useState, useMemo } from 'react';
import {
    X, Search, User, Calendar,
    Package, DollarSign, ChevronRight,
    Check, ArrowLeft, Loader2, AlertCircle
} from 'lucide-react';
import { Client } from '../../types';
import { cn } from '../../utils/cn';

interface IncomeEntryProps {
    clients: Client[];
    onClose: () => void;
    onSave: (data: any) => void;
    isSubmitting: boolean;
}

export const IncomeEntry = ({ clients, onClose, onSave, isSubmitting }: IncomeEntryProps) => {
    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Smart Defaults
    const [formData, setFormData] = useState({
        client_id: '',
        client_name: '',
        sale_date: new Date().toISOString().split('T')[0],
        bag_quantity: '',
        price_per_bag: ''
    });

    const filteredClients = useMemo(() => {
        return clients.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.cuit && c.cuit.includes(searchTerm))
        );
    }, [clients, searchTerm]);

    const total = (Number(formData.bag_quantity) || 0) * (Number(formData.price_per_bag) || 0);
    const isValid = formData.client_id && Number(formData.bag_quantity) > 0 && Number(formData.price_per_bag) > 0;

    const handleSelectClient = (client: Client) => {
        setFormData(prev => ({ ...prev, client_id: String(client.id), client_name: client.name }));
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        await onSave({
            client_id: Number(formData.client_id),
            sale_date: formData.sale_date,
            bag_quantity: Number(formData.bag_quantity),
            price_per_bag: Number(formData.price_per_bag)
        });

        setIsSuccess(true);
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(value);

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-agro-950/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white rounded-[2rem] p-10 flex flex-col items-center justify-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                        <Check className="text-green-600 w-10 h-10" strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-black text-agro-950 uppercase tracking-tighter">Venta Exitosa</h2>
                    <p className="text-gray-400 font-bold text-sm">Registrado correctamente</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-agro-950/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-gray-50 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <ArrowLeft className="text-gray-600" size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-black text-agro-950 uppercase tracking-tight">Nueva Venta</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paso {step} de 3</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Progress Bar */}
                    <div className="flex gap-1 mb-8">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                                    step >= s ? "bg-agro-600" : "bg-gray-200"
                                )}
                            />
                        ))}
                    </div>

                    {/* Step 1: Select Client */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente por nombre o CUIT..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 font-bold focus:border-agro-500 outline-none shadow-sm transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                                {filteredClients.map((client) => (
                                    <button
                                        key={client.id}
                                        onClick={() => handleSelectClient(client)}
                                        className="w-full bg-white p-4 rounded-2xl border-2 border-transparent hover:border-agro-100 hover:bg-agro-50/30 flex items-center justify-between transition-all group active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-agro-100 transition-colors">
                                                <User className="text-gray-400 group-hover:text-agro-600" size={24} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-black text-slate-900 leading-tight">{client.name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{client.cuit || 'Sin CUIT'}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-gray-300 group-hover:text-agro-600 transition-colors" size={20} />
                                    </button>
                                ))}
                                {filteredClients.length === 0 && (
                                    <div className="text-center py-10">
                                        <AlertCircle className="mx-auto text-gray-300 mb-2" size={40} />
                                        <p className="text-gray-400 font-bold">No se encontraron clientes</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Sale Details */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-agro-50 p-4 rounded-2xl border border-agro-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <User className="text-agro-600" size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-agro-600 uppercase tracking-widest">Cliente Seleccionado</p>
                                    <p className="font-black text-slate-900 leading-tight">{formData.client_name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Cantidad de Bolsas</label>
                                    <div className="relative">
                                        <Package className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={formData.bag_quantity}
                                            onChange={(e) => setFormData({ ...formData, bag_quantity: e.target.value })}
                                            className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-14 pr-4 py-5 font-black text-xl text-slate-900 focus:border-agro-500 outline-none shadow-sm transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Precio por Bolsa</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            value={formData.price_per_bag}
                                            onChange={(e) => setFormData({ ...formData, price_per_bag: e.target.value })}
                                            className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-14 pr-4 py-5 font-black text-xl text-slate-900 focus:border-agro-500 outline-none shadow-sm transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Fecha de Operación</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="date"
                                            value={formData.sale_date}
                                            onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                                            className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-14 pr-4 py-4 font-bold text-slate-900 focus:border-agro-500 outline-none shadow-sm transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                disabled={!formData.bag_quantity || !formData.price_per_bag}
                                className="w-full bg-agro-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-agro-900/20 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                            >
                                Continuar
                            </button>
                        </div>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <h3 className="text-center text-xs font-black text-gray-400 uppercase tracking-widest">Resumen de la Venta</h3>

                                <div className="bg-white rounded-[2rem] p-8 border-2 border-gray-100 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center pb-6 border-b border-gray-50">
                                        <span className="text-[10px] font-black text-gray-400 uppercase">Cliente</span>
                                        <span className="font-black text-slate-900">{formData.client_name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-50">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Concepto</p>
                                            <p className="font-black text-slate-900">{formData.bag_quantity} bolsas</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Unitario</p>
                                            <p className="font-black text-slate-900">{formatCurrency(Number(formData.price_per_bag))}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-agro-600 uppercase tracking-widest">Total a Cobrar</span>
                                        <span className="text-3xl font-black text-agro-950 tracking-tighter">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-agro-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-agro-900/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            <Check size={24} strokeWidth={3} />
                                            Confirmar y Registrar
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                    Al confirmar, se actualizará el saldo del cliente
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
