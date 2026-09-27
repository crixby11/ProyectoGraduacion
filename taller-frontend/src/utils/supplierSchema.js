import { z } from 'zod'
import { isValidPhone } from './hn'

// Validación de proveedor compartida: página de Proveedores y alta rápida desde Inventario.
export const supplierSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  contact_name: z.string().optional(),
  phone: z.string().min(1, 'El teléfono es requerido').refine(isValidPhone, 'Teléfono inválido (8 dígitos, ej: 9999-9999)'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  rtn: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
})
