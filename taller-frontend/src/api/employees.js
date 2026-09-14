import api from './axios'

export const getEmployees = (params) => api.get('/employees', { params })
export const getEmployee = (id) => api.get(`/employees/${id}`)
export const createEmployee = (data) => api.post('/employees', data)
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data)
export const createEmployeeBonus = (employeeId, data) => api.post(`/employees/${employeeId}/bonuses`, data)
export const sendEmployeeWeeklyReminder = (employeeId) => api.post(`/employees/${employeeId}/weekly-reminder`)
export const updateEmployeeBonus = (employeeId, bonusId, data) => api.put(`/employees/${employeeId}/bonuses/${bonusId}`, data)

// Estadísticas
export const getEmployeeStats = (params) => api.get('/employees/stats', { params })
export const getEmployeeStat  = (id, params) => api.get(`/employees/${id}/stats`, { params })

// Archivos
export const getEmployeeFiles = (employeeId) => api.get(`/employees/${employeeId}/files`)
export const uploadEmployeeFile = (employeeId, formData) =>
  api.post(`/employees/${employeeId}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteEmployeeFile = (employeeId, fileId) => api.delete(`/employees/${employeeId}/files/${fileId}`)
export const getEmployeeFileDownloadUrl = (employeeId, fileId) =>
  `${import.meta.env.VITE_API_URL}/employees/${employeeId}/files/${fileId}/download`
