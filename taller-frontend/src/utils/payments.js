const round2 = (n) => Math.round(n * 100) / 100

// Monto que realmente se abona a la factura: en efectivo el cliente puede
// entregar más que el saldo, y solo se registra hasta el saldo.
export function appliedAmount(method, amount, balance) {
  const given = Number(amount) || 0
  if (method === 'efectivo' && Number.isFinite(Number(balance)) && Number(balance) > 0) {
    return round2(Math.min(given, Number(balance)))
  }
  return round2(given)
}

// Datos que se envían al registrar: en efectivo se manda además lo que entregó el
// cliente (el servidor calcula y guarda el cambio); en otros métodos no aplica.
export function paymentPayload(d, balance) {
  return {
    ...d,
    amount: appliedAmount(d.method, d.amount, balance),
    amount_received: d.method === 'efectivo' ? round2(Number(d.amount) || 0) : undefined,
  }
}

// Cambio a devolver al pagar en efectivo: lo entregado menos el saldo de la factura.
export function cashChange(amount, balance) {
  const bal = Number(balance) || 0
  return bal > 0 ? Math.max(0, round2((Number(amount) || 0) - bal)) : 0
}
