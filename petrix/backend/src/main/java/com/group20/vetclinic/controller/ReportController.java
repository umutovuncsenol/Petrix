package com.group20.vetclinic.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final JdbcTemplate jdbc;

    @GetMapping("/vaccinations")
    public ResponseEntity<?> getVaccinationReport(
            @RequestParam(required = false) Integer branchId) {
        try {
            List<Map<String, Object>> complianceBySpecies = getComplianceBySpecies(branchId);
            List<Map<String, Object>> complianceByBreed   = getComplianceByBreed(branchId);
            List<Map<String, Object>> topVaccines         = getTopVaccines(branchId);
            List<Map<String, Object>> overdueByBranch     = getOverdueByBranch(branchId);

            return ResponseEntity.ok(Map.of(
                "complianceBySpecies", complianceBySpecies,
                "complianceByBreed",   complianceByBreed,
                "topVaccines",         topVaccines,
                "overdueByBranch",     overdueByBranch
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private List<Map<String, Object>> getComplianceBySpecies(Integer branchId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
                p.species,
                COUNT(*)                                                           AS total_records,
                COUNT(CASE WHEN vr.status = 'done' THEN 1 END)                    AS done_count,
                ROUND(100.0 * COUNT(CASE WHEN vr.status = 'done' THEN 1 END)
                      / NULLIF(COUNT(*), 0), 1)                                    AS compliance_rate
            FROM VACCINATION_RECORD vr
            JOIN VACCINATION_PLAN vp ON vr.plan_id = vp.plan_id
            JOIN PET p               ON vp.pet_id  = p.pet_id
            """);
        List<Object> params = new ArrayList<>();
        if (branchId != null) {
            sql.append(" JOIN VETERINARIAN vet ON vr.vet_id = vet.vet_id WHERE vet.branch_id = ? ");
            params.add(branchId);
        }
        sql.append(" GROUP BY p.species ORDER BY p.species");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    private List<Map<String, Object>> getComplianceByBreed(Integer branchId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
                p.species,
                COALESCE(p.breed, 'Unknown') AS breed,
                COUNT(*)                                                           AS total_records,
                COUNT(CASE WHEN vr.status = 'done' THEN 1 END)                    AS done_count,
                ROUND(100.0 * COUNT(CASE WHEN vr.status = 'done' THEN 1 END)
                      / NULLIF(COUNT(*), 0), 1)                                    AS compliance_rate
            FROM VACCINATION_RECORD vr
            JOIN VACCINATION_PLAN vp ON vr.plan_id = vp.plan_id
            JOIN PET p               ON vp.pet_id  = p.pet_id
            """);
        List<Object> params = new ArrayList<>();
        if (branchId != null) {
            sql.append(" JOIN VETERINARIAN vet ON vr.vet_id = vet.vet_id WHERE vet.branch_id = ? ");
            params.add(branchId);
        }
        sql.append(" GROUP BY p.species, p.breed ORDER BY p.species, compliance_rate DESC");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    private List<Map<String, Object>> getTopVaccines(Integer branchId) {
        StringBuilder sql = new StringBuilder("""
            SELECT
                m.name               AS vaccine_name,
                COUNT(vr.vacc_id)    AS times_administered
            FROM VACCINATION_RECORD vr
            JOIN VACCINATION vac ON vr.med_id = vac.med_id
            JOIN MEDICATION m   ON vac.med_id = m.med_id
            WHERE vr.status = 'done'
            """);
        List<Object> params = new ArrayList<>();
        if (branchId != null) {
            sql.append(" AND vr.vet_id IN (SELECT vet_id FROM VETERINARIAN WHERE branch_id = ?) ");
            params.add(branchId);
        }
        sql.append(" GROUP BY m.name ORDER BY times_administered DESC LIMIT 10");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    private List<Map<String, Object>> getOverdueByBranch(Integer branchId) {
        StringBuilder sql = new StringBuilder(
            "SELECT branch_id, branch_name, COUNT(*) AS overdue_count FROM OverdueVaccinations ");
        List<Object> params = new ArrayList<>();
        if (branchId != null) {
            sql.append(" WHERE branch_id = ? ");
            params.add(branchId);
        }
        sql.append(" GROUP BY branch_id, branch_name ORDER BY overdue_count DESC");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }
}
