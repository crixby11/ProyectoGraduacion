import api from './axios'

export const addSupplierPurchasePayment = (purchaseId, data) =>
  api.post(`/supplier-purchases/${purchaseId}/payments`, data)
