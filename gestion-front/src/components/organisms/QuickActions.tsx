import { useNavigate } from 'react-router-dom';
import { UserPlus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface QuickActionProps {
    label: string;
    icon: any;
    color: string;
    onClick: () => void;
}

const QuickActionButton = ({ label, icon: Icon, color, onClick }: QuickActionProps) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center justify-center h-24 rounded-2xl shadow-sm transition-transform active:scale-95",
            color
        )}
    >
        <Icon size={28} className="text-white" />
        <span className="text-white font-semibold text-sm mt-2">{label}</span>
    </button>
);

export const QuickActions = () => {
    const navigate = useNavigate();

    const actions = [
        {
            label: '+ Cliente',
            icon: UserPlus,
            color: 'bg-blue-600',
            path: '/clients/new'
        },
        {
            label: '+ Ingreso',
            icon: TrendingUp,
            color: 'bg-emerald-600',
            path: '/income?new=true'
        },
        {
            label: '+ Gasto',
            icon: TrendingDown,
            color: 'bg-rose-600',
            path: '/expenses?new=true'
        }
    ];

    return (
        <div className="grid grid-cols-3 gap-4 mt-6 text-[9px]">
            {actions.map((action) => (
                <QuickActionButton
                    key={action.path}
                    label={action.label}
                    icon={action.icon}
                    color={action.color}
                    onClick={() => navigate(action.path)}
                />
            ))}
        </div>
    );
};
