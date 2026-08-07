import api from './axios'

export const getActivityLogs = (params) => api.get('/activity-logs', { params })
export const getActivityLogNames = () => api.get('/activity-logs/log-names')
