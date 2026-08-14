import api from './axios'

export const getGeneralFiles = () => api.get('/general-files')
export const uploadGeneralFile = (formData) => api.post('/general-files', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const deleteGeneralFile = (id) => api.delete(`/general-files/${id}`)
