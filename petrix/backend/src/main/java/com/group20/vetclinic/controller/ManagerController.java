package com.group20.vetclinic.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerController {

    private final JdbcTemplate jdbc;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> dashboard() {
        return ResponseEntity.ok(Map.of(
                "message", "Clinic manager dashboard data"
        ));
    }

    @GetMapping("/branch/{branchId}/stats")
    public ResponseEntity<Map<String, Object>> branchStats(@PathVariable int branchId) {
        Integer totalStockItems = jdbc.queryForObject(
                "SELECT COUNT(*) FROM STOCKED_AS WHERE branch_id = ?",
                Integer.class,
                branchId
        );
        Integer lowStockItems = jdbc.queryForObject(
                "SELECT COUNT(*) FROM STOCKED_AS WHERE branch_id = ? AND low_stock_flagged = TRUE",
                Integer.class,
                branchId
        );
        Integer expiredStockItems = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM STOCK_BATCH
                WHERE branch_id = ? AND expiry_date < CURRENT_DATE AND quantity > 0
                """,
                Integer.class,
                branchId
        );
        Integer overdueVaccinations = jdbc.queryForObject(
                "SELECT COUNT(*) FROM OverdueVaccinations WHERE branch_id = ?",
                Integer.class,
                branchId
        );
        Integer wasteEntries = jdbc.queryForObject(
                "SELECT COUNT(*) FROM WASTE_TRACKING WHERE branch_id = ?",
                Integer.class,
                branchId
        );

        return ResponseEntity.ok(Map.of(
                "branchId", branchId,
                "totalStockItems", totalStockItems == null ? 0 : totalStockItems,
                "lowStockItems", lowStockItems == null ? 0 : lowStockItems,
                "expiredStockItems", expiredStockItems == null ? 0 : expiredStockItems,
                "overdueVaccinations", overdueVaccinations == null ? 0 : overdueVaccinations,
                "wasteEntries", wasteEntries == null ? 0 : wasteEntries
        ));
    }

    @GetMapping("/branch/{branchId}/vets")
    public ResponseEntity<List<Map<String, Object>>> branchVets(@PathVariable int branchId) {
        return ResponseEntity.ok(jdbc.queryForList(
                """
                SELECT vet_id, full_name, specialization, species_expertise
                FROM VETERINARIAN
                WHERE branch_id = ?
                ORDER BY full_name
                """,
                branchId
        ));
    }
}
