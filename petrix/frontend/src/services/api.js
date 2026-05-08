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
  login:       (data) => api.post('/auth/login', data),
  register:    (data) => api.post('/auth/register', data),
  registerVet: (data) => api.post('/auth/register/vet', data),
  registerManager: (data) => api.post('/auth/register/manager', data),
}

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
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
  getByOwner:        (ownerId, params) => api.get('/appointments', { params: { ownerId, ...params } }),
  getVisitSummaries: (ownerId) => api.get(`/appointments/owner/${ownerId}/visit-summaries`),
  getById:           (id)      => api.get(`/appointments/${id}`),
  create:            (data)    => api.post('/appointments', data),
  cancel:            (id)      => api.put(`/appointments/${id}/cancel`),
  complete:          (id)      => api.put(`/appointments/${id}/complete`),
}

// ── Pets ──────────────────────────────────────────────────
export const petAPI = {
  getByOwner:       (ownerId) => api.get(`/pets/owner/${ownerId}`),
  getById:          (id)      => api.get(`/pets/${id}`),
  create:           (data)    => api.post('/pets', data),
  update:           (id, data) => api.put(`/pets/${id}`, data),
  delete:           (id)      => api.delete(`/pets/${id}`),
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
  getPrescriptions:(visitId)        => api.get(`/visits/${visitId}/prescriptions`),
  createInvoice: (visitId, data)    => api.post(`/visits/${visitId}/invoice`, data),
  getInvoice:    (visitId)          => api.get(`/visits/${visitId}/invoice`),
  payInvoice:    (visitId, data)    => api.post(`/visits/${visitId}/invoice/pay`, data),
  getRating:     (visitId)          => api.get(`/visits/${visitId}/rating`),
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
  getMedications: ()               => api.get('/inventory/medications'),
  getStock:       (branchId)       => api.get(`/inventory/branch/${branchId}`),
  getLowStock:    (branchId)       => api.get(`/inventory/branch/${branchId}/low-stock`),
  logWaste:       (data)           => api.post('/inventory/waste', data),
  getWasteLogs:   (branchId)       => api.get(`/inventory/waste/${branchId}`),
  getReport:      (branchId)       => api.get(`/inventory/reports/branch/${branchId}`),
  getConsumptionReport: (branchId) => api.get(`/inventory/reports/consumption/${branchId}`),
}

// ── Boarding ─────────────────────────────────────────────
export const boardingAPI = {
  getRooms:            (params)    => api.get('/boarding/rooms', { params }),
  createRoom:          (data)      => api.post('/boarding/rooms', data),
  updateRoom:          (id, data)  => api.put(`/boarding/rooms/${id}`, data),
  getAvailableRooms:   (params)    => api.get('/boarding/rooms/available', { params }),
  createReservation:   (data)      => api.post('/boarding/reservations', data),
  getReservations:     (params)    => api.get('/boarding/reservations', { params }),
  cancelReservation:   (id)        => api.put(`/boarding/reservations/${id}/cancel`),
  completeReservation: (id)        => api.put(`/boarding/reservations/${id}/complete`),
  addFeedingLog:       (id, data)  => api.post(`/boarding/reservations/${id}/feeding-logs`, data),
  getFeedingLogs:      (id)        => api.get(`/boarding/reservations/${id}/feeding-logs`),
  getVetActiveStays:   (vetId)     => api.get(`/boarding/vet/${vetId}/active-stays`),
  getOwnerPets:        (ownerId)   => api.get(`/boarding/owner/${ownerId}/pets`),
  getOwnerReservations:(ownerId)   => api.get(`/boarding/owner/${ownerId}/reservations`),
  createOwnerReservation: (ownerId, data) => api.post(`/boarding/owner/${ownerId}/reservations`, data),
  cancelOwnerReservation: (ownerId, id)   => api.put(`/boarding/owner/${ownerId}/reservations/${id}/cancel`),
  getOwnerFeedingLogs: (ownerId, id)      => api.get(`/boarding/owner/${ownerId}/reservations/${id}/feeding-logs`),
}

// ── Vaccinations ──────────────────────────────────────────
export const vaccinationAPI = {
  createPlan:    (data)            => api.post('/vaccinations/plans', data),
  createRecord:  (data)            => api.post('/vaccinations/records', data),
  deleteRecord:  (id)              => api.delete(`/vaccinations/records/${id}`),
  getOverdue:    (params)          => api.get('/vaccinations/overdue', { params }),
  getReport:     (params)          => api.get('/reports/vaccinations', { params }),
}

export const managerAPI = {
  getBranchStats: (branchId) => api.get(`/manager/branch/${branchId}/stats`),
  getBranchVets:  (branchId) => api.get(`/manager/branch/${branchId}/vets`),
}

export default api
