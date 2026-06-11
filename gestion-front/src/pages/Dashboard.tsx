import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp, TrendingDown, LogOut, Eye, EyeOff,
    UserPlus, Wallet, ArrowUpRight, ArrowDownLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { cn } from '../utils/cn';
import { useAuthStore } from '../stores/authStore';

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // Fallback for YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            }
            return '---';
        }
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    } catch (e) {
        return '---';
    }
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(value);

export const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [amountsVisible, setAmountsVisible] = React.useState(true);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

    const { data: metrics, isLoading: isMetricsLoading } = useQuery({
        queryKey: ['metrics', 'cash-flow'],
        queryFn: api.metrics.getCashFlow,
    });

    const { data: movements, isLoading: isMovementsLoading } = useQuery({
        queryKey: ['metrics', 'movements'],
        queryFn: () => api.metrics.getMovements(10),
    });

    if (isMetricsLoading || isMovementsLoading) {
        return (
            <div className="p-4 space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-32 bg-gray-200 rounded-lg" />
                    <div className="h-10 w-10 bg-gray-200 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
                </div>
                <div className="h-40 bg-gray-200 rounded-2xl" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-200 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    const quickActions = [
        { label: '+ Ingreso', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', path: '/income?new=true' },
        { label: '- Gasto', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100', path: '/expenses?new=true' },
        { label: 'Clientes', icon: UserPlus, color: 'text-agro-600', bg: 'bg-agro-100', path: '/clients' },
    ];

    const balanceCards = [
        {
            label: 'Saldo en Caja',
            amount: metrics?.net_balance ?? 0,
            icon: Wallet,
            color: 'text-agro-600',
            bg: 'bg-agro-50',
            path: '/income'
        },
        {
            label: 'Cuentas por Cobrar',
            amount: metrics?.total_income ?? 0,
            icon: ArrowUpRight,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            path: '/income'
        },
        {
            label: 'Gastos del Mes',
            amount: metrics?.total_expenses ?? 0,
            icon: ArrowDownLeft,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            path: '/expenses'
        },
    ];

    return (
        <div className="p-4 space-y-8 bg-gray-50/50 min-h-screen pb-24">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-agro-950 tracking-tight">Hola, {user?.name.split(' ')[0]}!</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumen de cuenta</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={20} />
                    </button>
                    <div className="h-10 w-10 bg-agro-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                        <span className="text-white font-bold">{initial}</span>
                    </div>
                </div>
            </header>

            {/* A. Quick Actions Section */}
            <section className="grid grid-cols-3 gap-4">
                {quickActions.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => navigate(action.path)}
                        className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
                    >
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-white transition-colors",
                            action.bg
                        )}>
                            <action.icon className={action.color} size={24} />
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter text-center">
                            {action.label}
                        </span>
                    </button>
                ))}
            </section>

            {/* B. Balances Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        Mis Saldos
                        <button
                            onClick={() => setAmountsVisible(!amountsVisible)}
                            className="text-gray-300 hover:text-agro-600 transition-colors"
                        >
                            {amountsVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                    </h3>
                </div>

                <div className="flex flex-col gap-3 overflow-x-hidden">
                    {balanceCards.map((card) => (
                        <div
                            key={card.label}
                            onClick={() => navigate(card.path)}
                            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:border-agro-100"
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-2xl", card.bg)}>
                                    <card.icon className={card.color} size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{card.label}</p>
                                    <h4 className="text-xl font-black text-slate-900 tracking-tighter">
                                        {amountsVisible ? formatCurrency(card.amount) : '••••••'}
                                    </h4>
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                                <ChevronRight size={18} strokeWidth={3} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* C. Recent Movements Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Movimientos Recientes</h3>
                    <button
                        onClick={() => navigate('/income')}
                        className="text-[10px] font-black text-agro-600 uppercase tracking-widest"
                    >
                        Ver todo
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {movements?.map((mov) => (
                        <div
                            key={mov.id}
                            onClick={() => navigate(mov.type === 'INGRESO' ? '/income' : '/expenses')}
                            className="p-4 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                    mov.type === 'INGRESO' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                )}>
                                    {mov.type === 'INGRESO' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-slate-900 text-sm truncate leading-tight">{mov.description}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                        {formatDate(mov.created_at)} • {mov.userName}
                                    </p>
                                </div>
                            </div>
                            <span className={cn(
                                "font-black tracking-tighter text-sm whitespace-nowrap",
                                mov.type === 'INGRESO' ? "text-green-600" : "text-red-600"
                            )}>
                                {mov.type === 'INGRESO' ? '+' : '-'}{amountsVisible ? formatCurrency(mov.amount) : '••••'}
                            </span>
                        </div>
                    ))}
                    {(!movements || movements.length === 0) && (
                        <div className="p-10 text-center">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin movimientos recientes</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
