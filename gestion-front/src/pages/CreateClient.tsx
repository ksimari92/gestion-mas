import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { FormField } from '../components/molecules/FormField';

export default function CreateClient() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { errors, isValid }
    } = useForm({
        defaultValues: {
            name: '',
            cuit: ''
        },
        mode: 'onChange'
    });

    const mutation = useMutation({
        mutationFn: api.clients.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            navigate('/clients');
        },
        onError: (error: any) => {
            console.error('Error creating client:', error);
        }
    });

    const onSubmit = (data: { name: string; cuit: string }) => {
        mutation.mutate(data);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50">
            <header className="bg-white/80 backdrop-blur-md px-4 py-6 flex items-center gap-4 sticky top-0 z-40 border-b border-gray-100/50">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors active:scale-90"
                >
                    <ChevronLeft className="h-6 w-6 text-agro-600" strokeWidth={3} />
                </button>
                <div>
                    <h1 className="text-xl font-black text-agro-950 tracking-tight leading-none mb-1">Nuevo Cliente</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alta de cuenta personal</p>
                </div>
            </header>

            <main className="flex-1 p-4 space-y-6 mt-4">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50 relative overflow-hidden group">
                    <form id="create-client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Información Personal *</label>
                            <FormField
                                label="Nombre / Razón Social"
                                error={errors.name?.message}
                                required
                            >
                                <Input
                                    {...register('name', { required: 'El nombre es obligatorio' })}
                                    placeholder="Ej: Juan Pérez"
                                    className="h-14 text-base bg-gray-50/50 border-gray-50 focus:bg-white rounded-2xl"
                                    disabled={mutation.isPending}
                                />
                            </FormField>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Identificación Fiscal</label>
                            <FormField
                                label="CUIT (opcional)"
                                error={errors.cuit?.message}
                            >
                                <Input
                                    {...register('cuit')}
                                    placeholder="Ej: 20-12345678-9"
                                    maxLength={13}
                                    className="h-14 text-base bg-gray-50/50 border-gray-50 focus:bg-white rounded-2xl"
                                    disabled={mutation.isPending}
                                />
                            </FormField>
                        </div>
                    </form>

                    <div className="mt-12 flex items-start gap-3 p-4 bg-agro-50/50 rounded-2xl border border-agro-100">
                        <div className="w-8 h-8 rounded-full bg-agro-100 flex items-center justify-center shrink-0">
                            <span className="text-agro-600 text-xs font-black">i</span>
                        </div>
                        <p className="text-[10px] font-bold text-agro-900/60 uppercase tracking-tight leading-relaxed">
                            Al crear el cliente podrás registrar ventas y llevar un seguimiento detallado de sus deudas.
                        </p>
                    </div>
                </div>
            </main>

            <footer className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 sticky bottom-24 z-30 mx-4 mb-4 rounded-2xl shadow-lg">
                <Button
                    type="submit"
                    form="create-client-form"
                    className="w-full bg-agro-600 hover:bg-agro-700 h-14 text-xs font-black uppercase tracking-widest text-white rounded-2xl shadow-xl shadow-agro-900/20 active:scale-95 transition-all disabled:opacity-50"
                    disabled={!isValid || mutation.isPending}
                >
                    {mutation.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} />
                            <span>Procesando...</span>
                        </div>
                    ) : (
                        'Guardar Cliente'
                    )}
                </Button>
            </footer>
        </div>
    );
}
