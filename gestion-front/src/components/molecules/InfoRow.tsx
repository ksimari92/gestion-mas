import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InfoRowProps {
    label: string;
    value: ReactNode;
    className?: string;
    valueClassName?: string;
}

export const InfoRow = ({ label, value, className, valueClassName }: InfoRowProps) => {
    return (
        <div className={cn('flex justify-between items-center py-2 border-b border-gray-100 last:border-0', className)}>
            <span className="text-sm text-gray-500 font-medium">{label}</span>
            <span className={cn('text-sm font-semibold text-gray-900', valueClassName)}>
                {value}
            </span>
        </div>
    );
};
