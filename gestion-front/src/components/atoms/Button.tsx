import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, fullWidth, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target',
                    {
                        'bg-agro-600 text-white hover:bg-agro-700 focus-visible:ring-agro-600': variant === 'primary',
                        'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500': variant === 'secondary',
                        'bg-danger text-white hover:bg-danger-600 focus-visible:ring-danger': variant === 'danger',
                        'border border-gray-300 bg-transparent hover:bg-gray-100/50 text-gray-700': variant === 'outline',
                        'bg-transparent hover:bg-gray-100 text-gray-700': variant === 'ghost',
                        'h-9 px-4 text-sm': size === 'sm',
                        'h-11 px-6 text-base': size === 'md',
                        'h-14 px-8 text-lg': size === 'lg',
                        'w-full': fullWidth,
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
