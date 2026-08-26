import api from './axios'

export const getPerformanceReport = (params) => api.get('/reports/performance', { params })
