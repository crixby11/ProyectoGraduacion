import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createWorkOrder, addService, addPart } from '../api/workOrders'
import { changeQuoteStatus } from '../api/quotes'

/**
 * Hook que encapsula la conversión de una cotización aprobada en OT.
 * Copia los servicios/repuestos cotizados (estimados) como punto de partida —
 * la OT resultante queda totalmente editable después, ya que el trabajo real
 * puede diferir de lo cotizado.
 *
 * @param {object} options
 * @param {function} [options.onClose] — callback para cerrar el modal/detalle tras convertir
 */
export function useConvertQuoteToWorkOrder({ onClose } = {}) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (quote) => {
      const woRes = await createWorkOrder({
        quote_id:       quote.id,
        customer_id:    quote.customer_id    || undefined,
        vehicle_id:     quote.vehicle_id     || undefined,
        employee_id:    quote.employee_id    || undefined,
        customer_name:  quote.customer_name  || quote.customer?.name  || undefined,
        customer_phone: quote.customer_phone || quote.customer?.phone || undefined,
        service_type:   quote.service_type   || undefined,
        problem:        quote.description    || undefined,
        received_at:    new Date().toISOString(),
      })
      const wo = woRes.data

      // Copiar líneas cotizadas a la OT — best-effort, no revierte la OT si una línea falla
      // (ej. stock real insuficiente al momento de convertir, que es un error legítimo aquí).
      for (const s of quote.services ?? []) {
        try {
          await addService(wo.id, {
            service_id: s.service_id || undefined,
            employee_id: s.employee_id || undefined,
            service_name: s.service_name,
            description: s.description || undefined,
            hours: s.hours,
            hourly_rate: s.hourly_rate,
          })
        } catch {
          toast.error(`No se pudo copiar el servicio "${s.service_name}" a la OT`)
        }
      }
      for (const p of quote.parts ?? []) {
        try {
          await addPart(wo.id, {
            inventory_id: p.inventory_id || undefined,
            part_name: p.part_name,
            part_sku: p.part_sku || undefined,
            quantity: p.quantity,
            unit_price: p.unit_price,
          })
        } catch {
          toast.error(`No se pudo copiar el repuesto "${p.part_name}" (revisa el stock disponible)`)
        }
      }

      // La cotización queda inmutable como historial — la OT es la fuente de verdad viva.
      try {
        await changeQuoteStatus(quote.id, 'convertida', wo.id)
      } catch {
        toast.error('OT creada, pero no se pudo actualizar el estado de la cotización', { duration: 5000 })
      }

      return wo
    },
    onSuccess: (wo) => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['inventory-all'] })
      toast.success(`OT ${wo.number} generada desde la cotización`)
      onClose?.()
      navigate(`/work-orders/${wo.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Error al convertir la cotización'),
  })
}
