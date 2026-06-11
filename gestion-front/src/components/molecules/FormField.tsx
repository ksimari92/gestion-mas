import React from 'react';
import { cn } from '../../utils/cn';

interface FormFieldProps {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

const FormField = ({ label, error, required, children, className }: FormFieldProps) => {
    return (
        <div className={cn('space-y-2', className)}>
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                {label}
                {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
            {error && (
                <p className="text-xs text-rose-500 font-medium">{error}</p>
            )}
        </div>
    );
};

FormField.displayName = 'FormField';

export { FormField };
