import api from './axios'

export const login = (credentials) => api.post('/login', credentials)
export const logout = () => api.post('/logout')
export const getMe = () => api.get('/me')
export const changePassword = (data) => api.post('/change-password', data)
