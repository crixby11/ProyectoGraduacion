import api from './axios'

export const getPerformanceReport = (params) => api.get('/reports/performance', { params })
export const downloadPerformanceReport = (params) => api.get('/reports/performance/export', { params, responseType: 'blob' })
