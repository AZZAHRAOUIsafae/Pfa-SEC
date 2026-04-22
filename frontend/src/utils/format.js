export const getTotalPaid = (f) =>
  f.payments.reduce((sum, p) => sum + p.amount, 0)

export const getReste = (f) =>
  f.total - getTotalPaid(f)

export const getStatus = (f) => {
  const paid = getTotalPaid(f)
  if (paid === 0) return "unpaid"
  if (paid < f.total) return "partial"
  return "paid"
}