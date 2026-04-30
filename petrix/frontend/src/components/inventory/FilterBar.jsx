export default function FilterBar({ filters, onChange, onSearch }) {
  return (
    <div className="inventory-filter-bar">
      <input
        type="text"
        placeholder="Search medication name..."
        value={filters.name}
        onChange={(event) => onChange('name', event.target.value)}
      />

      <select
        value={filters.category}
        onChange={(event) => onChange('category', event.target.value)}
        aria-label="Category"
      >
        <option value="">All</option>
        <option value="medicines">Medicines</option>
        <option value="vaccines">Vaccines</option>
      </select>

      <select
        value={filters.expirationStatus}
        onChange={(event) => onChange('expirationStatus', event.target.value)}
        aria-label="Expiration"
      >
        <option value="">All</option>
        <option value="expired">Expired</option>
        <option value="expiring_soon">Expiring Soon</option>
        <option value="ok">OK</option>
      </select>

      <button type="button" className="btn btn-primary" onClick={onSearch}>
        Search
      </button>
    </div>
  )
}
