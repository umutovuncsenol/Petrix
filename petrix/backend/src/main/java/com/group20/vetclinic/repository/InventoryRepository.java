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
}
