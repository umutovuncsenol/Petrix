package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.Medication;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class InventoryRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Medication> medMapper = (rs, i) -> {
        Medication m = new Medication();
        m.setMedId(rs.getInt("med_id"));
        m.setName(rs.getString("name"));
        m.setForm(rs.getString("form"));
        m.setUnit(rs.getString("unit"));
        m.setDescription(rs.getString("description"));
        m.setVaccine(rs.getBoolean("is_vaccine"));
        try { m.setQuantity(rs.getInt("quantity")); } catch (Exception ignored) {}
        try { m.setReorderLevel(rs.getInt("reorder_level")); } catch (Exception ignored) {}
        try { m.setLowStockFlagged(rs.getBoolean("low_stock_flagged")); } catch (Exception ignored) {}
        try { m.setExpiryDate(rs.getString("expiry_date")); } catch (Exception ignored) {}
        return m;
    };

    public List<Medication> findAll() {
        return jdbc.query("SELECT * FROM MEDICATION ORDER BY name", medMapper);
    }

    public List<Medication> findStockByBranch(int branchId) {
        String sql = """
            SELECT m.*, s.quantity, s.reorder_level, s.low_stock_flagged, s.expiry_date
            FROM MEDICATION m
            JOIN STOCKED_AS s ON m.med_id = s.med_id
            WHERE s.branch_id = ?
            ORDER BY m.name
            """;
        return jdbc.query(sql, medMapper, branchId);
    }

    public List<Map<String, Object>> findLowStockByBranch(int branchId) {
        return jdbc.queryForList("""
            SELECT m.name, s.quantity, s.reorder_level, s.expiry_date
            FROM STOCKED_AS s
            JOIN MEDICATION m ON s.med_id = m.med_id
            WHERE s.branch_id = ? AND s.low_stock_flagged = TRUE
            ORDER BY s.quantity
            """, branchId);
    }

    public void logWaste(int branchId, int medId, int quantity, String reason) {
        jdbc.update("""
            INSERT INTO WASTE_TRACKING (branch_id, med_id, quantity_wasted, reason)
            VALUES (?, ?, ?, ?)
            """, branchId, medId, quantity, reason);
    }

    public List<Map<String, Object>> findWasteByBranch(int branchId) {
        return jdbc.queryForList("""
            SELECT wt.waste_id, m.name AS medication_name, wt.quantity_wasted,
                   wt.reason, wt.recorded_at
            FROM WASTE_TRACKING wt
            JOIN MEDICATION m ON wt.med_id = m.med_id
            WHERE wt.branch_id = ?
            ORDER BY wt.recorded_at DESC
            """, branchId);
    }

    public Map<String, Object> getReport(int branchId) {
        // Total stock value per medication
        List<Map<String, Object>> stockSummary = jdbc.queryForList("""
            SELECT m.name, s.quantity, s.reorder_level, s.expiry_date, s.low_stock_flagged
            FROM STOCKED_AS s
            JOIN MEDICATION m ON s.med_id = m.med_id
            WHERE s.branch_id = ?
            ORDER BY m.name
            """, branchId);

        // Waste statistics
        List<Map<String, Object>> wasteSummary = jdbc.queryForList("""
            SELECT m.name AS medication_name,
                   SUM(wt.quantity_wasted) AS total_wasted,
                   COUNT(*) AS waste_events
            FROM WASTE_TRACKING wt
            JOIN MEDICATION m ON wt.med_id = m.med_id
            WHERE wt.branch_id = ?
            GROUP BY m.name
            ORDER BY total_wasted DESC
            """, branchId);

        // Cost breakdown: prescription medication costs per visit
        List<Map<String, Object>> costBreakdown = jdbc.queryForList("""
            SELECT
                SUM(i.consultation_fee)  AS total_consultation,
                SUM(i.treatment_costs)   AS total_treatment,
                SUM(i.medication_costs)  AS total_medication,
                SUM(i.consultation_fee + i.treatment_costs + i.medication_costs) AS grand_total
            FROM INVOICE i
            JOIN VISIT v ON i.visit_id = v.visit_id
            JOIN APPOINTMENT a ON v.appt_id = a.appt_id
            WHERE a.branch_id = ?
            """, branchId);

        Map<String, Object> report = new java.util.HashMap<>();
        report.put("stockSummary", stockSummary);
        report.put("wasteSummary", wasteSummary);
        report.put("costBreakdown", costBreakdown.isEmpty() ? null : costBreakdown.get(0));
        return report;
    }
}
