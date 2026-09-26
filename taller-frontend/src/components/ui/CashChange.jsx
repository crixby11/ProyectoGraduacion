import { fmtMoney } from '../../utils/date'
import { cashChange } from '../../utils/payments'

// Campo de solo lectura con el cambio a devolver, calculado como
// (monto entregado - saldo de la factura). Siempre visible; solo el efectivo
// puede dar cambio, con los demás métodos el monto no puede pasar del saldo
// y queda en L 0.00. No se guarda, es ayuda en pantalla.
export default function CashChange({ method, amount, balance }) {
  const bal = Number(balance) || 0
  const change = method === 'efectivo' ? cashChange(amount, balance) : 0

  return (
    <div>
      <label className="label">Cambio a devolver (L)</label>
      <input
        readOnly
        tabIndex={-1}
        value={fmtMoney(change)}
        className={`input font-semibold cursor-default ${change > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}`}
      />
      {change > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          Se registrará un pago de {fmtMoney(bal)} (el saldo de la factura).
        </p>
      )}
    </div>
  )
}
