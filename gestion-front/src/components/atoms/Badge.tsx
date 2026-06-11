import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    {
                        'bg-agro-100 text-agro-800': variant === 'default' || variant === 'success',
                        'bg-amber-100 text-amber-800': variant === 'warning',
                        'bg-danger-100 text-danger-800': variant === 'danger',
                        'bg-gray-100 text-gray-800': variant === 'neutral',
                    },
                    className
                )}
                {...props}
            />
        );
    }
);

Badge.displayName = 'Badge';

export { Badge };
