import axios from 'axios'

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
})

export const getInventory = (branchId, token) =>
  axios.get(`/api/inventory/branch/${branchId}`, { headers: authHeaders(token) })

export const getInventoryFiltered = (branchId, filters, token) =>
  axios.get(`/api/inventory/branch/${branchId}/filtered`, {
    params: {
      name: filters.name,
      category: filters.category,
      expirationStatus: filters.expirationStatus,
    },
    headers: authHeaders(token),
  })

export const getLowStock = (branchId, token) =>
  axios.get(`/api/inventory/branch/${branchId}/low-stock`, { headers: authHeaders(token) })

export const restockMedication = (data, token) =>
  axios.put('/api/inventory/restock', data, { headers: authHeaders(token) })

export const expireMedication = (data, token) =>
  axios.put('/api/inventory/expire', data, { headers: authHeaders(token) })

export const logWaste = (data, token) =>
  axios.post('/api/inventory/waste', data, { headers: authHeaders(token) })

export const getReport = (branchId, token) =>
  axios.get(`/api/inventory/reports/branch/${branchId}`, { headers: authHeaders(token) })

export const addMedication = (data, token) =>
  axios.post('/api/inventory/medications', data, { headers: authHeaders(token) })

export const deleteMedication = (medId, token) =>
  axios.delete(`/api/inventory/medications/${medId}`, { headers: authHeaders(token) })
