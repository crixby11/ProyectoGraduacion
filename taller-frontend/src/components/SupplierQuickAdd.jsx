import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createSupplier } from '../api/suppliers'
import Modal from './ui/Modal'
import { supplierSchema } from '../utils/supplierSchema'
import { fmtPhone } from '../utils/hn'

// Alta rápida de proveedor desde otro formulario (ej. Inventario), sin salir de él.
// Los datos completos (notas, activar/desactivar) se editan luego en Proveedores.
export default function SupplierQuickAdd({ open, onClose, onCreated }) {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(supplierSchema),
  })

  const save = useMutation({
    mutationFn: (d) => createSupplier(d),
    onSuccess: (res) => {
      toast.success('Proveedor creado')
      reset()
      onCreated(res.data)
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al crear el proveedor'),
  })

  const close = () => { reset(); onClose() }

  return (
    <Modal open={open} onClose={close} title="Nuevo proveedor" size="md">
      <form
        onSubmit={(e) => { e.stopPropagation(); handleSubmit((d) => save.mutate(d))(e) }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nombre del proveedor *</label>
            <input {...register('name')} className="input" placeholder="Ej: Repuestos García, AutoZone..." autoFocus />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Teléfono *</label>
            <input
              {...register('phone')}
              onChange={(e) => setValue('phone', fmtPhone(e.target.value), { shouldValidate: true })}
              className="input" placeholder="9999-9999" maxLength={9}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Persona de contacto</label>
            <input {...register('contact_name')} className="input" />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input {...register('email')} type="email" className="input" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">RTN</label>
            <input {...register('rtn')} className="input" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={close} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={save.isPending} className="btn-primary">
            {save.isPending ? 'Guardando...' : 'Guardar proveedor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
