import api from './axios'

export const getWorkOrders = (params) => api.get('/work-orders', { params })
export const getWorkOrder = (id) => api.get(`/work-orders/${id}`)
export const createWorkOrder = (data) => api.post('/work-orders', data)
export const updateWorkOrder = (id, data) => api.put(`/work-orders/${id}`, data)
export const deleteWorkOrder = (id) => api.delete(`/work-orders/${id}`)
export const changeStatus = (id, status) => api.patch(`/work-orders/${id}/status`, { status })

export const getWorkOrderPdf = (id) => api.get(`/work-orders/${id}/pdf`, { responseType: 'blob' })
export const getNotes = (id) => api.get(`/work-orders/${id}/notes`)
export const addNote = (id, data) => api.post(`/work-orders/${id}/notes`, data)

export const addService = (id, data) => api.post(`/work-orders/${id}/services`, data)
export const updateService = (woId, svcId, data) => api.put(`/work-orders/${woId}/services/${svcId}`, data)
export const removeService = (woId, svcId) => api.delete(`/work-orders/${woId}/services/${svcId}`)
export const addPart = (id, data) => api.post(`/work-orders/${id}/parts`, data)
export const updatePart = (woId, partId, data) => api.put(`/work-orders/${woId}/parts/${partId}`, data)
export const removePart = (woId, partId) => api.delete(`/work-orders/${woId}/parts/${partId}`)
