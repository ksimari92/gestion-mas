import { Search } from 'lucide-react';
import { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
    onSearch?: (value: string) => void;
}

export const SearchBar = ({ className, onSearch, onChange, ...props }: SearchBarProps) => {
    return (
        <div className={cn('relative', className)}>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="search"
                className="block w-full p-3 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-agro-600 focus:border-agro-600 focus:outline-none shadow-sm touch-target"
                placeholder="Buscar..."
                onChange={(e) => {
                    onChange?.(e);
                    onSearch?.(e.target.value);
                }}
                {...props}
            />
        </div>
    );
};
