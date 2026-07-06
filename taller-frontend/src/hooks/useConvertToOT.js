import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createWorkOrder } from '../api/workOrders'
import { updateAppointment } from '../api/appointments'

/**
 * Hook que encapsula la conversión de una cita en OT.
 * Usado tanto en Calendar.jsx como en Appointments.jsx.
 *
 * @param {object} options
 * @param {function} [options.onClose] — callback para cerrar el modal/detalle tras convertir
 */
export function useConvertToOT({ onClose } = {}) {
  const qc       = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (apt) => {
      const woRes = await createWorkOrder({
        customer_id:    apt.customer_id    || undefined,
        vehicle_id:     apt.vehicle_id     || undefined,
        employee_id:    apt.employee_id    || undefined,
        customer_name:  apt.customer_name  || apt.customer?.name  || undefined,
        customer_phone: apt.customer_phone || apt.customer?.phone || undefined,
        problem:        apt.notes          || apt.description      || undefined,
        received_at:    apt.start_at,
      })
      // La OT ya existe — el update de la cita es best-effort.
      // Si falla, la OT sigue siendo válida y se navega a ella de todas formas.
      try {
        await updateAppointment(apt.id, {
          status:        'completada',
          work_order_id: woRes.data.id,
        })
      } catch {
        toast.error('OT creada, pero no se pudo actualizar el estado de la cita', { duration: 5000 })
      }
      return woRes.data
    },
    onSuccess: (wo) => {
      // Invalida todas las queries relacionadas con citas y dashboard
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['appointments-list'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`OT ${wo.number} generada`)
      onClose?.()
      navigate(`/work-orders/${wo.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al generar OT'),
  })
}
