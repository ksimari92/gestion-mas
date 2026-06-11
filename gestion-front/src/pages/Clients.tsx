import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, User, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';


export const Clients = () => {
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: api.clients.getAll,
    });

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col pb-24">
            <header className="bg-white px-6 py-8 border-b border-gray-100 shadow-sm sticky top-0 z-30">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-agro-950 tracking-tighter leading-none mb-1">Clientes</h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestión de cartera</p>
                    </div>
                    <Link to="/clients/new">
                        <div className="p-3 bg-agro-600 text-white rounded-2xl shadow-lg shadow-agro-900/20 active:scale-95 transition-all">
                            <Plus size={24} strokeWidth={3} />
                        </div>
                    </Link>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-agro-600" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:bg-white focus:border-agro-100 outline-none font-bold transition-all placeholder:text-gray-300"
                    />
                </div>
            </header>

            <main className="flex-1 p-4 space-y-4 pt-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 text-agro-600 animate-spin mb-4" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando clientes...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                        <div className="p-8 bg-gray-100 rounded-full mb-4">
                            <User size={60} strokeWidth={1} />
                        </div>
                        <p className="font-black uppercase tracking-widest text-xs">Sin coincidencias</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredClients.map((client) => (
                            <div
                                key={client.id}
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-50 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group hover:border-agro-100"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-14 h-14 rounded-full bg-agro-50 flex items-center justify-center text-agro-600 font-black text-2xl border-2 border-white shadow-sm shrink-0 group-hover:bg-agro-100 transition-colors">
                                        {(client.name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-slate-900 text-lg tracking-tighter truncate leading-tight group-hover:text-agro-700 transition-colors">
                                            {client.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] truncate">
                                                {client.cuit ? `CUIT: ${client.cuit}` : 'Sin CUIT'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-2 rounded-2xl text-gray-300 group-hover:bg-agro-50 group-hover:text-agro-600 transition-all">
                                    <ChevronRight size={20} strokeWidth={3} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
