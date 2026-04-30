export default function LowStockAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return null
  }

  return (
    <div className="inventory-alert">
      <h2 className="section-title">Low Stock Alert</h2>
      <ul>
        {alerts.map((alert) => (
          <li className="text-sm" key={`${alert.name}-${alert.quantity}`}>
            {alert.name}: {alert.quantity} units (reorder at {alert.reorderLevel})
          </li>
        ))}
      </ul>
    </div>
  )
}
