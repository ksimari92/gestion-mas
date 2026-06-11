import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    className?: string;
    placeholder?: string;
}

export const Select = ({ value, onChange, options, className, placeholder }: SelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none transition-all flex items-center justify-between text-agro-900 shadow-sm hover:bg-gray-100/50 active:scale-[0.98]",
                    isOpen && "border-agro-100 bg-white shadow-md",
                )}
            >
                <span className="truncate">
                    {selectedOption ? selectedOption.label : placeholder || 'Seleccionar...'}
                </span>
                <ChevronDown
                    size={18}
                    strokeWidth={3}
                    className={cn("text-agro-600 transition-transform duration-200", isOpen && "rotate-180")}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto overflow-x-hidden scrollbar-hide">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-between",
                                    option.value === value
                                        ? "bg-agro-50 text-agro-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-agro-900"
                                )}
                            >
                                {option.label}
                                {option.value === value && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-agro-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
