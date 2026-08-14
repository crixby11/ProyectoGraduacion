import api from './axios'

export const getSupplierPayments = (params) => api.get('/supplier-payments', { params })
export const updateSupplierPayment = (id, data) => api.put(`/supplier-payments/${id}`, data)
