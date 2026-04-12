import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vc_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
}

// ── Branches ──────────────────────────────────────────────
export const branchAPI = {
  getAll: () => api.get('/branches'),
}

// ── Veterinarians ─────────────────────────────────────────
export const vetAPI = {
  search:          (params) => api.get('/veterinarians', { params }),
  getById:         (id)     => api.get(`/veterinarians/${id}`),
  getAvailability: (id, date) => api.get(`/veterinarians/${id}/availability`, { params: { date } }),
  getAppointments: (id)     => api.get(`/veterinarians/${id}/appointments`),
}

// ── Appointments ──────────────────────────────────────────
export const appointmentAPI = {
  getByOwner: (ownerId) => api.get('/appointments', { params: { ownerId } }),
  getById:    (id)      => api.get(`/appointments/${id}`),
  create:     (data)    => api.post('/appointments', data),
  cancel:     (id)      => api.put(`/appointments/${id}/cancel`),
  complete:   (id)      => api.put(`/appointments/${id}/complete`),
}

// ── Pets ──────────────────────────────────────────────────
export const petAPI = {
  getByOwner:       (ownerId) => api.get(`/pets/owner/${ownerId}`),
  getById:          (id)      => api.get(`/pets/${id}`),
  create:           (data)    => api.post('/pets', data),
  getAllergies:      (id)      => api.get(`/pets/${id}/allergies`),
  getVaccinations:  (id)      => api.get(`/pets/${id}/vaccinations`),
  getMedicalHistory:(id)      => api.get(`/pets/${id}/medical-timeline`),
}

// ── Visits ────────────────────────────────────────────────
export const visitAPI = {
  create:        (data)             => api.post('/visits', data),
  getByAppt:     (apptId)           => api.get(`/visits/appointment/${apptId}`),
  getById:       (id)               => api.get(`/visits/${id}`),
  addDiagnosis:  (visitId, data)    => api.post(`/visits/${visitId}/diagnoses`, data),
  getDiagnoses:  (visitId)          => api.get(`/visits/${visitId}/diagnoses`),
  addPrescription:(visitId, data)   => api.post(`/visits/${visitId}/prescriptions`, data),
  createInvoice: (visitId, data)    => api.post(`/visits/${visitId}/invoice`, data),
  getInvoice:    (visitId)          => api.get(`/visits/${visitId}/invoice`),
  payInvoice:    (visitId, data)    => api.post(`/visits/${visitId}/invoice/pay`, data),
  rate:          (visitId, data)    => api.post(`/visits/${visitId}/rating`, data),
  refer:         (visitId, data)    => api.post(`/visits/${visitId}/referral`, data),
}

// ── Memberships ───────────────────────────────────────────
export const membershipAPI = {
  getPlans:    ()     => api.get('/memberships/plans'),
  enroll:      (data) => api.post('/memberships/enroll', data),
  cancel:      (data) => api.put('/memberships/cancel', data),
  getByOwner:  (id)   => api.get(`/memberships/owner/${id}`),
}

// ── Inventory ─────────────────────────────────────────────
export const inventoryAPI = {
  getMedications: ()         => api.get('/inventory/medications'),
  getStock:       (branchId) => api.get(`/inventory/branch/${branchId}`),
  getLowStock:    (branchId) => api.get(`/inventory/branch/${branchId}/low-stock`),
}

export default api
