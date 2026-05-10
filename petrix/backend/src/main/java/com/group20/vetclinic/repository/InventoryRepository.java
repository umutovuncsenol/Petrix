package com.group20.vetclinic.repository;

import com.group20.vetclinic.dto.AddMedicationRequest;
import com.group20.vetclinic.model.Medication;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
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
        try { m.setBatchSummary(rs.getString("batch_summary")); } catch (Exception ignored) {}
        return m;
    };

    public List<Medication> findAll() {
        return jdbc.query("SELECT * FROM MEDICATION ORDER BY name", medMapper);
    }

    public List<Medication> findStockByBranch(int branchId) {
        String sql = """
            SELECT m.*,
                   COALESCE(s.quantity, 0) AS quantity,
                   s.reorder_level,
                   COALESCE(s.low_stock_flagged, FALSE) AS low_stock_flagged,
                   s.expiry_date,
                   bs.batch_summary
            FROM MEDICATION m
            LEFT JOIN STOCKED_AS s ON m.med_id = s.med_id AND s.branch_id = ?
            LEFT JOIN (
                SELECT med_id,
                       STRING_AGG(batch_number || ' (' || quantity || ')', ', ' ORDER BY expiry_date NULLS LAST, batch_number) AS batch_summary
                FROM STOCK_BATCH
                WHERE branch_id = ? AND quantity > 0
                GROUP BY med_id
            ) bs ON bs.med_id = m.med_id
            ORDER BY m.name
            """;
        return jdbc.query(sql, medMapper, branchId, branchId);
    }

    public List<Medication> findStockByBranchFiltered(int branchId, String name, Boolean isVaccine, String expirationStatus) {
        StringBuilder sql = new StringBuilder("""
            SELECT m.*,
                   COALESCE(s.quantity, 0) AS quantity,
                   s.reorder_level,
                   COALESCE(s.low_stock_flagged, FALSE) AS low_stock_flagged,
                   s.expiry_date,
                   s.minimum_stock_threshold,
                   bs.batch_summary
            FROM MEDICATION m
            LEFT JOIN STOCKED_AS s ON m.med_id = s.med_id AND s.branch_id = ?
            LEFT JOIN (
                SELECT med_id,
                       STRING_AGG(batch_number || ' (' || quantity || ')', ', ' ORDER BY expiry_date NULLS LAST, batch_number) AS batch_summary
                FROM STOCK_BATCH
                WHERE branch_id = ? AND quantity > 0
                GROUP BY med_id
            ) bs ON bs.med_id = m.med_id
            WHERE 1=1
            """);
        List<Object> params = new ArrayList<>();
        params.add(branchId);
        params.add(branchId);

        if (name != null && !name.trim().isEmpty()) {
            sql.append(" AND m.name ILIKE '%' || ? || '%'");
            params.add(name.trim());
        }

        if (isVaccine != null) {
            sql.append(" AND m.is_vaccine = ?");
            params.add(isVaccine);
        }

        if ("expired".equalsIgnoreCase(expirationStatus)) {
            sql.append(" AND s.expiry_date < CURRENT_DATE");
        } else if ("expiring_soon".equalsIgnoreCase(expirationStatus)) {
            sql.append(" AND s.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30");
        } else if ("ok".equalsIgnoreCase(expirationStatus)) {
            sql.append(" AND (s.expiry_date IS NULL OR s.expiry_date > CURRENT_DATE + 30)");
        }

        sql.append(" ORDER BY m.name");
        return jdbc.query(sql.toString(), medMapper, params.toArray());
    }

    @Transactional
    public void restock(int branchId, int medId, int quantityToAdd, String expiryDate, String batchNumber, Integer reorderLevel) {
        String normalizedBatchNumber = normalizeBatchNumber(batchNumber);
        Date sqlExpiryDate = toSqlDate(expiryDate);

        jdbc.update("""
            INSERT INTO STOCK_BATCH (branch_id, med_id, batch_number, quantity, expiry_date)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (branch_id, med_id, batch_number) DO UPDATE
            SET quantity = STOCK_BATCH.quantity + EXCLUDED.quantity,
                expiry_date = COALESCE(EXCLUDED.expiry_date, STOCK_BATCH.expiry_date),
                received_at = now()
            """, branchId, medId, normalizedBatchNumber, quantityToAdd, sqlExpiryDate);

        jdbc.update("""
            INSERT INTO STOCKED_AS (branch_id, med_id, quantity, expiry_date, reorder_level)
            SELECT ?, ?, COALESCE(SUM(quantity), 0), MIN(expiry_date), ?
            FROM STOCK_BATCH
            WHERE branch_id = ? AND med_id = ? AND quantity > 0
            ON CONFLICT (branch_id, med_id) DO UPDATE
            SET quantity = EXCLUDED.quantity,
                expiry_date = EXCLUDED.expiry_date,
                reorder_level = COALESCE(EXCLUDED.reorder_level, STOCKED_AS.reorder_level)
            """, branchId, medId, reorderLevel, branchId, medId);
    }

    @Transactional
    public void expireStock(int branchId, int medId, int quantityToRemove, String reason) {
        Integer currentQuantity;
        try {
            currentQuantity = jdbc.queryForObject("""
                SELECT quantity FROM STOCKED_AS WHERE branch_id = ? AND med_id = ?
                """, Integer.class, branchId, medId);
        } catch (EmptyResultDataAccessException e) {
            throw new IllegalArgumentException("Insufficient stock");
        }

        if (currentQuantity == null || currentQuantity < quantityToRemove) {
            throw new IllegalArgumentException("Insufficient stock");
        }

        deductBatchStock(branchId, medId, quantityToRemove);
        syncStockSummary(branchId, medId, null);

        jdbc.update("""
            INSERT INTO WASTE_TRACKING (branch_id, med_id, quantity_wasted, reason)
            VALUES (?, ?, ?, ?)
            """, branchId, medId, quantityToRemove, reason);
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

    @Transactional
    public void logWaste(int branchId, int medId, int quantity, String reason) {
        jdbc.update("""
            INSERT INTO WASTE_TRACKING (branch_id, med_id, quantity_wasted, reason)
            VALUES (?, ?, ?, ?)
            """, branchId, medId, quantity, reason);
        jdbc.update("""
            UPDATE STOCKED_AS SET quantity = GREATEST(quantity - ?, 0)
            WHERE branch_id = ? AND med_id = ?
            """, quantity, branchId, medId);
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

    public List<Map<String, Object>> getStockConsumptionReport(int branchId) {
        return jdbc.queryForList("""
            SELECT
                a.branch_id,
                m.med_id,
                m.name AS medication_name,
                SUM(c.quantity) AS total_consumed,
                COUNT(DISTINCT pr.rx_id) AS prescription_count
            FROM PRESCRIPTION pr
            JOIN CONTAINS c ON pr.rx_id = c.rx_id
            JOIN MEDICATION m ON c.med_id = m.med_id
            JOIN VISIT v ON pr.visit_id = v.visit_id
            JOIN APPOINTMENT a ON v.appt_id = a.appt_id
            WHERE a.branch_id = ?
            GROUP BY a.branch_id, m.med_id, m.name
            ORDER BY total_consumed DESC, m.name
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

        // Waste statistics with MAX/MIN per medication
        List<Map<String, Object>> wasteSummary = jdbc.queryForList("""
            SELECT m.name AS medication_name,
                   SUM(wt.quantity_wasted) AS total_wasted,
                   MAX(wt.quantity_wasted) AS max_single_waste,
                   MIN(wt.quantity_wasted) AS min_single_waste,
                   COUNT(*) AS waste_events
            FROM WASTE_TRACKING wt
            JOIN MEDICATION m ON wt.med_id = m.med_id
            WHERE wt.branch_id = ?
            GROUP BY m.name
            ORDER BY total_wasted DESC
            """, branchId);

        // Branch waste comparison: branches that waste more than average (nested query)
        List<Map<String, Object>> branchWasteStats = jdbc.queryForList("""
            SELECT b.name AS branch_name,
                   SUM(wt.quantity_wasted) AS total_wasted,
                   MAX(wt.quantity_wasted) AS max_single_waste,
                   MIN(wt.quantity_wasted) AS min_single_waste
            FROM WASTE_TRACKING wt
            JOIN BRANCH b ON wt.branch_id = b.branch_id
            GROUP BY b.branch_id, b.name
            HAVING SUM(wt.quantity_wasted) >= (
                SELECT AVG(branch_total) FROM (
                    SELECT SUM(quantity_wasted) AS branch_total
                    FROM WASTE_TRACKING
                    GROUP BY branch_id
                ) AS branch_totals
            )
            ORDER BY total_wasted DESC
            """);

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
        report.put("branchWasteStats", branchWasteStats);
        report.put("costBreakdown", costBreakdown.isEmpty() ? null : costBreakdown.get(0));
        return report;
    }

    @Transactional
    public int addMedication(AddMedicationRequest req) {
        int medId = jdbc.queryForObject(
            "INSERT INTO MEDICATION (name, form, unit, description, is_vaccine) VALUES (?, ?, ?, ?, ?) RETURNING med_id",
            Integer.class,
            req.getName().trim(),
            req.getForm() != null ? req.getForm().trim() : null,
            req.getUnit() != null ? req.getUnit().trim() : null,
            req.getDescription() != null ? req.getDescription().trim() : null,
            req.isVaccine()
        );
        if (req.isVaccine()) {
            jdbc.update(
                "INSERT INTO VACCINATION (med_id, target_species, frequency_months) VALUES (?, ?, ?)",
                medId, req.getTargetSpecies(), req.getFrequencyMonths()
            );
        }
        return medId;
    }

    @Transactional
    public void deleteMedication(int medId) {
        int prescriptionRefs = jdbc.queryForObject(
            "SELECT COUNT(*) FROM CONTAINS WHERE med_id = ?", Integer.class, medId);
        int vaccinationRefs = jdbc.queryForObject(
            "SELECT COUNT(*) FROM VACCINATION_RECORD WHERE med_id = ?", Integer.class, medId);

        if (prescriptionRefs > 0 || vaccinationRefs > 0) {
            throw new IllegalStateException(
                "Cannot delete: referenced in " + prescriptionRefs + " prescription(s) and " + vaccinationRefs + " vaccination record(s)."
            );
        }

        jdbc.update("DELETE FROM WASTE_TRACKING WHERE med_id = ?", medId);
        jdbc.update("DELETE FROM STOCK_BATCH WHERE med_id = ?", medId);
        jdbc.update("DELETE FROM STOCKED_AS WHERE med_id = ?", medId);
        jdbc.update("DELETE FROM VACCINATION WHERE med_id = ?", medId);
        jdbc.update("DELETE FROM MEDICATION WHERE med_id = ?", medId);
    }

    private Date toSqlDate(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return Date.valueOf(LocalDate.parse(value));
    }

    private String normalizeBatchNumber(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "BATCH-" + System.currentTimeMillis();
        }
        return value.trim();
    }

    private void deductBatchStock(int branchId, int medId, int quantityToRemove) {
        int remaining = quantityToRemove;
        List<Map<String, Object>> batches = jdbc.queryForList("""
            SELECT batch_id, quantity
            FROM STOCK_BATCH
            WHERE branch_id = ? AND med_id = ? AND quantity > 0
            ORDER BY expiry_date NULLS LAST, received_at, batch_id
            """, branchId, medId);

        for (Map<String, Object> batch : batches) {
            if (remaining <= 0) {
                break;
            }

            int batchId = ((Number) batch.get("batch_id")).intValue();
            int batchQuantity = ((Number) batch.get("quantity")).intValue();
            int quantityFromBatch = Math.min(batchQuantity, remaining);

            jdbc.update("""
                UPDATE STOCK_BATCH
                SET quantity = quantity - ?
                WHERE batch_id = ?
                """, quantityFromBatch, batchId);

            remaining -= quantityFromBatch;
        }

        if (remaining > 0) {
            throw new IllegalArgumentException("Insufficient batch stock");
        }
    }

    private void syncStockSummary(int branchId, int medId, Integer reorderLevel) {
        jdbc.update("""
            INSERT INTO STOCKED_AS (branch_id, med_id, quantity, expiry_date, reorder_level)
            SELECT ?, ?, COALESCE(SUM(quantity), 0), MIN(expiry_date), ?
            FROM STOCK_BATCH
            WHERE branch_id = ? AND med_id = ? AND quantity > 0
            ON CONFLICT (branch_id, med_id) DO UPDATE
            SET quantity = EXCLUDED.quantity,
                expiry_date = EXCLUDED.expiry_date,
                reorder_level = COALESCE(EXCLUDED.reorder_level, STOCKED_AS.reorder_level)
            """, branchId, medId, reorderLevel, branchId, medId);
    }
}
