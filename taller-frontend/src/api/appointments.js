import api from './axios'

export const getAppointments = (params) => api.get('/appointments', { params })
export const getAppointment = (id) => api.get(`/appointments/${id}`)
export const createAppointment = (data) => api.post('/appointments', data)
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data)
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`)
export const sendReminder = (id) => api.post(`/appointments/${id}/reminder`)
