import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, fullWidth = true, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    'flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agro-600 disabled:cursor-not-allowed disabled:opacity-50 touch-target',
                    {
                        'border-danger focus-visible:ring-danger': error,
                        'w-full': fullWidth,
                    },
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';

export { Input };
