import api from './axios'

export const getServices = (params) => api.get('/services', { params })
export const getService = (id) => api.get(`/services/${id}`)
export const createService = (data) => api.post('/services', data)
export const updateService = (id, data) => api.put(`/services/${id}`, data)
export const deleteService = (id) => api.delete(`/services/${id}`)
