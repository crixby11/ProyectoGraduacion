import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Save, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSettings, updateSettings } from '../api/settings'
import PageHeader from '../components/ui/PageHeader'

export default function Settings() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings().then((r) => r.data),
  })

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm()

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const save = useMutation({
    mutationFn: (d) => updateSettings(d),
    onSuccess: (res) => {
      qc.setQueryData(['settings'], res.data)
      reset(res.data)
      toast.success('Configuración guardada')
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error'),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Configuración del Taller"
        icon={Building2}
        subtitle="Datos del negocio que aparecen en PDFs y documentos"
      />

      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-6">
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800">Datos del negocio</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre del taller *</label>
              <input {...register('shop_name')} className="input" placeholder="Taller Mecánico" />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Dirección</label>
              <input {...register('shop_address')} className="input" placeholder="Col. Alameda, calle principal..." />
            </div>

            <div>
              <label className="label">Ciudad</label>
              <input {...register('shop_city')} className="input" placeholder="Tegucigalpa" />
            </div>

            <div>
              <label className="label">Teléfono</label>
              <input {...register('shop_phone')} className="input" placeholder="+504 0000-0000" />
            </div>

            <div>
              <label className="label">Email</label>
              <input {...register('shop_email')} type="email" className="input" placeholder="info@taller.com" />
            </div>

            <div>
              <label className="label">RTN</label>
              <input {...register('shop_rtn')} className="input" placeholder="0000-0000-000000" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Documentos</h2>
          <div>
            <label className="label">Mensaje al pie de facturas</label>
            <textarea
              {...register('invoice_notes')}
              rows={3}
              className="input"
              placeholder="Gracias por su preferencia. Garantía de 30 días en mano de obra..."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={save.isPending || !isDirty}
            className="btn-primary"
          >
            <Save size={16} />
            {save.isPending ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </div>
  )
}