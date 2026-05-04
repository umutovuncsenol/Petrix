package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.VaccinationRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class VaccinationRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<VaccinationRecord> rowMapper = (rs, i) -> {
        VaccinationRecord vr = new VaccinationRecord();
        vr.setVaccId(rs.getInt("vacc_id"));
        vr.setPlanId(rs.getInt("plan_id"));
        vr.setMedId(rs.getInt("med_id"));
        vr.setVetId(rs.getInt("vet_id"));
        vr.setBatchNumber(rs.getString("batch_number"));
        try {
            Date batchExpiry = rs.getDate("batch_expiry_date");
            if (batchExpiry != null) vr.setBatchExpiryDate(batchExpiry.toLocalDate());
        } catch (Exception ignored) {}
        Date adm = rs.getDate("administered_date");
        if (adm != null) vr.setAdministeredDate(adm.toLocalDate());
        Date ndd = rs.getDate("next_due_date");
        if (ndd != null) vr.setNextDueDate(ndd.toLocalDate());
        vr.setStatus(rs.getString("status"));
        vr.setNotes(rs.getString("notes"));
        try { vr.setVaccineName(rs.getString("vaccine_name")); } catch (Exception ignored) {}
        return vr;
    };

    public int createPlan(int petId, int vetId) {
        String sql = "INSERT INTO VACCINATION_PLAN (pet_id, vet_id) VALUES (?, ?) RETURNING plan_id";
        Integer id = jdbc.queryForObject(sql, Integer.class, petId, vetId);
        return id;
    }

    public int createRecord(int planId, int medId, int vetId, Integer visitId,
                            String batchNumber, LocalDate batchExpiryDate, LocalDate administeredDate,
                            LocalDate nextDueDate, String status, String notes) {
        String sql = """
            INSERT INTO VACCINATION_RECORD
                (plan_id, med_id, vet_id, visit_id, batch_number, batch_expiry_date, administered_date, next_due_date, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING vacc_id
            """;
        Integer id = jdbc.queryForObject(sql, Integer.class,
            planId, medId, vetId, visitId, batchNumber,
            batchExpiryDate != null ? Date.valueOf(batchExpiryDate) : null,
            Date.valueOf(administeredDate),
            nextDueDate != null ? Date.valueOf(nextDueDate) : null,
            status != null ? status : "done",
            notes);
        return id;
    }

    public List<VaccinationRecord> findByPet(int petId) {
        String sql = """
            SELECT vr.*, m.name AS vaccine_name
            FROM VACCINATION_RECORD vr
            JOIN VACCINATION_PLAN vp ON vr.plan_id = vp.plan_id
            JOIN VACCINATION vac ON vr.med_id = vac.med_id
            JOIN MEDICATION m ON vac.med_id = m.med_id
            WHERE vp.pet_id = ?
            ORDER BY vr.administered_date DESC
            """;
        return jdbc.query(sql, rowMapper, petId);
    }

    public List<Map<String, Object>> findOverdueByBranchId(int branchId, int daysThreshold) {
        return jdbc.queryForList(
            "SELECT * FROM OverdueVaccinations WHERE branch_id = ? AND days_overdue >= ?",
            branchId, daysThreshold);
    }

    public List<Map<String, Object>> findOverdueAll(int daysThreshold) {
        return jdbc.queryForList(
            "SELECT * FROM OverdueVaccinations WHERE days_overdue >= ? ORDER BY days_overdue DESC",
            daysThreshold);
    }

    public List<Map<String, Object>> findOverdueByBranch(String branchName, int daysThreshold) {
        return jdbc.queryForList(
            "SELECT * FROM OverdueVaccinations WHERE branch_name = ? AND days_overdue > ?",
            branchName, daysThreshold);
    }
}
