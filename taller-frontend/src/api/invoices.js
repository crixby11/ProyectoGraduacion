import api from './axios'

export const getInvoices = (params) => api.get('/invoices', { params })
export const getInvoice = (id) => api.get(`/invoices/${id}`)
export const generateInvoice = (workOrderId) => api.post(`/invoices/generate/${workOrderId}`)
export const updateInvoice = (id, data) => api.patch(`/invoices/${id}`, data)
export const getInvoicePdf = (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
export const getWhatsappLink = (id) => api.get(`/invoices/${id}/whatsapp`)
