import { Home, Users, TrendingUp, ShoppingCart } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';

export const BottomNav = () => {
    const navItems = [
        { to: '/', icon: Home, label: 'Inicio' },
        { to: '/clients', icon: Users, label: 'Clientes' },
        { to: '/income', icon: TrendingUp, label: 'Ventas' },
        { to: '/expenses', icon: ShoppingCart, label: 'Gastos' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-4 pointer-events-none">
            <nav className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl h-20 flex items-center justify-around px-6 pointer-events-auto overflow-hidden">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            cn(
                                'relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 active:scale-95',
                                isActive ? 'text-agro-600' : 'text-slate-400 hover:text-slate-600'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={cn(
                                    "p-2.5 rounded-2xl transition-all duration-300",
                                    isActive ? "bg-agro-50" : "bg-transparent"
                                )}>
                                    <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 3 : 2} />
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-[0.15em] transition-all mt-1",
                                    isActive ? "opacity-100" : "opacity-60"
                                )}>
                                    {label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-agro-600 rounded-full blur-[1px]" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};
