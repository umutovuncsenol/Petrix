function getRowStyle(expiryDate) {
  if (!expiryDate) {
    return undefined
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)

  if (expiry < today) {
    return { backgroundColor: '#fee2e2' }
  }

  if (expiry <= thirtyDaysFromNow) {
    return { backgroundColor: '#fef9c3' }
  }

  return undefined
}

function formatDate(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleDateString()
}

export default function InventoryTable({ items, onRestockClick, onExpireClick, onDeleteClick }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted">No medications found.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Form</th>
            <th>Unit</th>
            <th>Quantity</th>
            <th>Expiry Date</th>
            <th>Batches</th>
            <th>Reorder Level</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.medId} style={getRowStyle(item.expiryDate)}>
              <td className="font-semibold">{item.name}</td>
              <td>{item.vaccine ? 'Vaccine' : 'Medicine'}</td>
              <td>{item.form || '-'}</td>
              <td>{item.unit || '-'}</td>
              <td>{item.quantity ?? '-'}</td>
              <td>{formatDate(item.expiryDate)}</td>
              <td>{item.batchSummary || '-'}</td>
              <td>{item.reorderLevel ?? '-'}</td>
              <td>
                {item.lowStockFlagged ? (
                  <span className="badge badge-red">Low Stock</span>
                ) : (
                  <span className="badge badge-green">OK</span>
                )}
              </td>
              <td>
                <div className="inventory-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onRestockClick(item)}
                  >
                    Restock
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => onExpireClick(item)}
                  >
                    Expire/Waste
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onDeleteClick(item)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
