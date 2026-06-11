import { useNavigate } from 'react-router-dom';
import { User, MoreVertical, Edit2, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Client } from '../../types';
import { api } from '../../services/api';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { FormField } from '../molecules/FormField';
import { useForm } from 'react-hook-form';

interface ClientListProps {
    clients: Client[];
    isLoading: boolean;
}

export const ClientList = ({ clients, isLoading }: ClientListProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: { name: '', cuit: '' }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.clients.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client-account-state'] });
            setIsEditModalOpen(false);
            setDropdownOpen(null);
        },
        onError: (error: any) => {
            alert('Error al actualizar: ' + (error.response?.data?.error || error.message));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.clients.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client-account-state'] });
            setIsDeleteModalOpen(false);
            setDropdownOpen(null);
        },
        onError: (error: any) => {
            alert('Error al eliminar: ' + (error.response?.data?.error || error.message));
        }
    });

    const onEdit = (client: Client) => {
        setSelectedClient(client);
        reset({ name: client.name, cuit: client.cuit || '' });
        setIsEditModalOpen(true);
    };

    const onDelete = (client: Client) => {
        setSelectedClient(client);
        setIsDeleteModalOpen(true);
    };

    const onSubmitEdit = (data: any) => {
        if (selectedClient) {
            updateMutation.mutate({ id: selectedClient.id, data });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-white rounded-[2rem] border border-gray-100 animate-pulse shadow-sm" />
                ))}
            </div>
        );
    }

    if (clients.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm mx-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                    <User className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">No hay clientes</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">La lista está vacía</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col gap-4 pb-4">
                {clients.map((client) => (
                    <div
                        key={client.id}
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 flex flex-col gap-5 relative active:scale-[0.98] transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-agro-50 flex items-center justify-center text-agro-600 font-black text-2xl border-2 border-white shadow-sm overflow-hidden shrink-0">
                                {(client.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0 pr-10">
                                <h3 className="font-black text-slate-900 text-lg truncate leading-tight">{client.name}</h3>
                                {client.cuit && (
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">CUIT: {client.cuit}</p>
                                )}
                            </div>

                            <div className="absolute top-6 right-6">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDropdownOpen(dropdownOpen === client.id ? null : client.id);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <MoreVertical className="h-5 w-5 text-gray-400" />
                                </button>

                                {dropdownOpen === client.id && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase text-gray-600 hover:bg-agro-50 hover:text-agro-600 flex items-center gap-3"
                                        >
                                            <Edit2 size={16} /> Editar
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase text-red-600 hover:bg-red-50 flex items-center gap-3"
                                        >
                                            <Trash2 size={16} /> Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-gray-50 -mx-5" />

                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-agro-600 uppercase tracking-[0.2em]">Ver Detalle</span>
                            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                                <ChevronRight size={18} strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Editar */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Cliente"
            >
                <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
                    <FormField label="Nombre" error={errors.name?.message} required>
                        <Input {...register('name', { required: 'El nombre es obligatorio' })} />
                    </FormField>
                    <FormField label="CUIT" error={errors.cuit?.message}>
                        <Input {...register('cuit')} />
                    </FormField>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-agro-600 text-white"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Guardar'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Eliminar */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Eliminar Cliente"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        ¿Estás seguro de que quieres eliminar a <span className="font-bold text-agro-950">{selectedClient?.name}</span>?
                        Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="secondary"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => selectedClient && deleteMutation.mutate(selectedClient.id)}
                            className="flex-1 bg-red-600 text-white hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
