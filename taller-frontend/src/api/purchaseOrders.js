import api from './axios'

export const getPurchaseOrders = (params) => api.get('/purchase-orders', { params })
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`)
export const createPurchaseOrder = (data) => api.post('/purchase-orders', data)
export const receivePurchaseOrder = (id) => api.post(`/purchase-orders/${id}/receive`)
export const cancelPurchaseOrder = (id) => api.patch(`/purchase-orders/${id}/cancel`)

// Archivos (cotización/factura física del proveedor)
export const getPurchaseOrderFiles = (poId) => api.get(`/purchase-orders/${poId}/files`)
export const uploadPurchaseOrderFile = (poId, formData) =>
  api.post(`/purchase-orders/${poId}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deletePurchaseOrderFile = (poId, fileId) => api.delete(`/purchase-orders/${poId}/files/${fileId}`)
