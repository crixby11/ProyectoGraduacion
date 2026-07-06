import api from './axios'

export const getInventory = (params) => api.get('/inventory', { params })
export const getInventoryItem = (id) => api.get(`/inventory/${id}`)
export const createInventoryItem = (data) => api.post('/inventory', data)
export const updateInventoryItem = (id, data) => api.put(`/inventory/${id}`, data)
export const deleteInventoryItem = (id) => api.delete(`/inventory/${id}`)
export const adjustInventory = (id, data) => api.post(`/inventory/${id}/adjust`, data)
export const getInventoryMovements = (id, params) => api.get(`/inventory/${id}/movements`, { params })
export const getLowStock = () => api.get('/inventory/low-stock')
export const getCategories = () => api.get('/inventory/categories')
