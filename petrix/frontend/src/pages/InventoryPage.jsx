import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getInventory,
  getInventoryFiltered,
  getLowStock,
} from '../api/inventoryApi'
import FilterBar from '../components/inventory/FilterBar'
import InventoryTable from '../components/inventory/InventoryTable'
import LowStockAlerts from '../components/inventory/LowStockAlerts'
import RestockModal from '../components/inventory/RestockModal'
import WasteModal from '../components/inventory/WasteModal'
import './InventoryPage.css'

function getErrorMessage(err) {
  if (typeof err.response?.data === 'string') {
    return err.response.data
  }
  return err.response?.data?.error || err.message
}

export default function InventoryPage() {
  const { user } = useAuth()
  const branchId = user?.branchId
  const token = user?.token || localStorage.getItem('vc_token')

  const [inventory, setInventory] = useState([])
  const [lowStockAlerts, setLowStockAlerts] = useState([])
  const [filters, setFilters] = useState({ name: '', category: '', expirationStatus: '' })
  const [selectedItem, setSelectedItem] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const normalizeAlerts = (alerts) =>
    alerts.map((alert) => ({
      name: alert.name,
      quantity: alert.quantity,
      reorderLevel: alert.reorderLevel ?? alert.reorder_level,
    }))

  const fetchInventoryData = useCallback(async () => {
    if (!branchId || !token) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [inventoryResponse, lowStockResponse] = await Promise.all([
        getInventory(branchId, token),
        getLowStock(branchId, token),
      ])
      setInventory(inventoryResponse.data)
      setLowStockAlerts(normalizeAlerts(lowStockResponse.data))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [branchId, token])

  useEffect(() => {
    fetchInventoryData()
  }, [fetchInventoryData])

  async function handleSearch() {
    if (!branchId || !token) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await getInventoryFiltered(branchId, filters, token)
      setInventory(response.data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  function openModal(type, item) {
    setSelectedItem({ ...item, branchId })
    setModalType(type)
  }

  function closeModal() {
    setSelectedItem(null)
    setModalType(null)
  }

  function handleModalSuccess() {
    closeModal()
    fetchInventoryData()
  }

  return (
    <div className="page">
      <div className="container inventory-page">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm text-muted mt-1">
            View branch stock, filter medicines and vaccines, restock items, and record expired or damaged stock.
          </p>
        </div>

        {!branchId && (
          <div className="alert alert-error">
            No branch is assigned to this manager account.
          </div>
        )}

        {branchId && (
          <>
            <LowStockAlerts alerts={lowStockAlerts} />

            <div className="card mb-4">
              <h2 className="section-title">Filters</h2>
              <FilterBar filters={filters} onChange={handleFilterChange} onSearch={handleSearch} />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
              <div className="flex items-center justify-between mb-3 inventory-table-heading">
                <h2 className="section-title">Branch Stock</h2>
                <span className="text-sm text-muted">{inventory.length} items</span>
              </div>

              {loading ? (
                <div className="spinner" />
              ) : (
                <InventoryTable
                  items={inventory}
                  onRestockClick={(item) => openModal('restock', item)}
                  onExpireClick={(item) => openModal('waste', item)}
                />
              )}
            </div>

            {modalType === 'restock' && selectedItem && (
              <RestockModal
                item={selectedItem}
                token={token}
                onClose={closeModal}
                onSuccess={handleModalSuccess}
              />
            )}

            {modalType === 'waste' && selectedItem && (
              <WasteModal
                item={selectedItem}
                token={token}
                onClose={closeModal}
                onSuccess={handleModalSuccess}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
