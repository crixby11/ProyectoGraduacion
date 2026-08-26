import api from './axios'

export const getQuotes = (params) => api.get('/quotes', { params })
export const getQuote = (id) => api.get(`/quotes/${id}`)
export const createQuote = (data) => api.post('/quotes', data)
export const updateQuote = (id, data) => api.put(`/quotes/${id}`, data)
export const deleteQuote = (id) => api.delete(`/quotes/${id}`)
export const changeQuoteStatus = (id, status, workOrderId) =>
  api.patch(`/quotes/${id}/status`, { status, work_order_id: workOrderId })

export const getQuotePdf = (id) => api.get(`/quotes/${id}/pdf`, { responseType: 'blob' })
export const getQuoteWhatsappLink = (id) => api.get(`/quotes/${id}/whatsapp`)

export const addQuoteService = (id, data) => api.post(`/quotes/${id}/services`, data)
export const updateQuoteService = (qId, svcId, data) => api.put(`/quotes/${qId}/services/${svcId}`, data)
export const removeQuoteService = (qId, svcId) => api.delete(`/quotes/${qId}/services/${svcId}`)
export const addQuotePart = (id, data) => api.post(`/quotes/${id}/parts`, data)
export const updateQuotePart = (qId, partId, data) => api.put(`/quotes/${qId}/parts/${partId}`, data)
export const removeQuotePart = (qId, partId) => api.delete(`/quotes/${qId}/parts/${partId}`)
