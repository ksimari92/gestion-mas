import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Loader2, Sprout, X } from 'lucide-react';
import { Client, ClientInput } from '../../types';
import { formatCuit, formatRenspa, isValidCuit, isValidRenspaFormat } from '../../utils/identifiers';
import { cn } from '../../utils/cn';

/** Alcanza con los campos editables: no se necesita la fila completa. */
type EditableClient = Partial<Client> & { name: string };

interface ClientFormProps {
    /** Cliente a editar; si no viene, es un alta. */
    client?: EditableClient | null;
    onClose: () => void;
    onSubmit: (data: ClientInput) => Promise<unknown>;
}

const emptyForm: ClientInput = {
    name: '',
    cuit: '',
    renspa: '',
    senasa_holder: '',
    establishment: '',
    locality: '',
    province: '',
    dtv_notes: '',
};

/**
 * Alta y edición de clientes. Lo obligatorio es el nombre; el CUIT es
 * opcional pero si se carga se valida. Los datos del DTV viven detrás de un
 * desplegable para no estorbar el alta rápida.
 */
export const ClientForm = ({ client, onClose, onSubmit }: ClientFormProps) => {
    const [form, setForm] = useState<ClientInput>(
        client
            ? {
                name: client.name,
                cuit: client.cuit ?? '',
                renspa: client.renspa ?? '',
                senasa_holder: client.senasa_holder ?? '',
                establishment: client.establishment ?? '',
                locality: client.locality ?? '',
                province: client.province ?? '',
                dtv_notes: client.dtv_notes ?? '',
            }
            : emptyForm
    );

    const hasDtv = Boolean(
        client?.renspa || client?.senasa_holder || client?.establishment ||
        client?.locality || client?.province || client?.dtv_notes
    );

    const [showDtv, setShowDtv] = useState(hasDtv);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (key: keyof ClientInput, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const cuitValue = form.cuit ?? '';
    const renspaValue = form.renspa ?? '';

    // Se avisa recién cuando el campo tiene largo suficiente, para no marcar
    // en rojo mientras todavía se está escribiendo.
    const cuitError = cuitValue.replace(/\D/g, '').length >= 11 && !isValidCuit(cuitValue)
        ? 'El dígito verificador no cierra: revisá el número'
        : null;

    const renspaError = renspaValue.trim().length >= 11 && !isValidRenspaFormat(formatRenspa(renspaValue))
        ? 'Formato esperado: 23.045.0.00123/01'
        : null;

    const canSubmit = form.name.trim() !== '' && !cuitError && !renspaError && !saving;

    const submit = async () => {
        if (!canSubmit) return;
        setSaving(true);
        setError(null);
        try {
            await onSubmit({
                ...form,
                name: form.name.trim(),
                cuit: cuitValue.trim() ? formatCuit(cuitValue) : null,
                renspa: renspaValue.trim() ? formatRenspa(renspaValue) : null,
            });
            onClose();
        } catch (err) {
            setError(
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                'No se pudo guardar el cliente.'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 space-y-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900">
                        {client ? 'Editar cliente' : 'Nuevo cliente'}
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-xl text-slate-400 hover:bg-slate-100">
                        <X size={18} />
                    </button>
                </div>

                <Field label="Nombre o razón social" required>
                    <input
                        autoFocus
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                        placeholder="Distribuidora del Norte SRL"
                        className={inputClass}
                    />
                </Field>

                <Field label="CUIT" hint="Opcional" error={cuitError}>
                    <input
                        value={cuitValue}
                        onChange={(e) => set('cuit', e.target.value)}
                        onBlur={() => cuitValue.trim() && !cuitError && set('cuit', formatCuit(cuitValue))}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                        placeholder="30-71414989-6"
                        maxLength={13}
                        className={cn(inputClass, 'tabular-nums', cuitError && errorRing)}
                    />
                </Field>

                {/* Datos del DTV: plegados salvo que el cliente ya los tenga */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <button
                        onClick={() => setShowDtv((v) => !v)}
                        className="w-full flex items-center gap-2.5 px-4 h-12 text-left hover:bg-slate-50 transition-colors"
                    >
                        {showDtv ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                        <Sprout size={16} className="text-agro-600" />
                        <span className="text-sm font-bold text-slate-700">Datos para el DTV</span>
                        <span className="text-xs text-slate-400">
                            {hasDtv && !showDtv ? 'cargados' : 'opcional'}
                        </span>
                    </button>

                    {showDtv && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
                            <p className="text-xs text-slate-400 pt-2">
                                Documento de Tránsito Vegetal (SENASA). Se guardan una vez y se
                                reutilizan al emitir cada documento.
                            </p>

                            <Field label="RENSPA" error={renspaError}>
                                <input
                                    value={renspaValue}
                                    onChange={(e) => set('renspa', e.target.value)}
                                    onBlur={() => renspaValue.trim() && !renspaError && set('renspa', formatRenspa(renspaValue))}
                                    placeholder="23.045.0.00123/01"
                                    className={cn(inputClass, 'tabular-nums', renspaError && errorRing)}
                                />
                            </Field>

                            <Field label="Titular ante SENASA" hint="Si difiere del nombre comercial">
                                <input
                                    value={form.senasa_holder ?? ''}
                                    onChange={(e) => set('senasa_holder', e.target.value)}
                                    placeholder="Distribuidora del Norte SRL"
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Establecimiento">
                                <input
                                    value={form.establishment ?? ''}
                                    onChange={(e) => set('establishment', e.target.value)}
                                    placeholder="Finca La Esperanza"
                                    className={inputClass}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Localidad">
                                    <input
                                        value={form.locality ?? ''}
                                        onChange={(e) => set('locality', e.target.value)}
                                        placeholder="Rosario de Lerma"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Provincia">
                                    <input
                                        value={form.province ?? ''}
                                        onChange={(e) => set('province', e.target.value)}
                                        placeholder="Salta"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Observaciones">
                                <textarea
                                    value={form.dtv_notes ?? ''}
                                    onChange={(e) => set('dtv_notes', e.target.value)}
                                    rows={2}
                                    placeholder="Retira con camión propio"
                                    className={cn(inputClass, 'h-auto py-2.5 resize-none')}
                                />
                            </Field>
                        </div>
                    )}
                </div>

                {error && <p className="text-sm font-medium text-danger-800">{error}</p>}

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={submit}
                        disabled={!canSubmit}
                        className="flex-1 h-11 rounded-xl bg-agro-600 text-white text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {client ? 'Guardar cambios' : 'Crear cliente'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const inputClass =
    'w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-agro-600 focus:ring-2 focus:ring-agro-600/15 transition-colors';

const errorRing = 'border-danger-800 focus:border-danger-800 focus:ring-danger-800/15';

const Field = ({ label, hint, error, required, children }: {
    label: string;
    hint?: string;
    error?: string | null;
    required?: boolean;
    children: ReactNode;
}) => (
    <label className="block">
        <span className="flex items-baseline gap-1.5 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {label}{required && <span className="text-danger-800"> *</span>}
            </span>
            {hint && <span className="text-[11px] text-slate-300">{hint}</span>}
        </span>
        {children}
        {error && <span className="block mt-1 text-xs font-semibold text-danger-800">{error}</span>}
    </label>
);
