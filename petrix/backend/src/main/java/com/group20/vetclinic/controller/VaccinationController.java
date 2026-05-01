package com.group20.vetclinic.controller;

import com.group20.vetclinic.dto.CreatePlanRequest;
import com.group20.vetclinic.dto.CreateRecordRequest;
import com.group20.vetclinic.repository.VaccinationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vaccinations")
@RequiredArgsConstructor
public class VaccinationController {

    private final VaccinationRepository vaccRepo;

    @PostMapping("/plans")
    public ResponseEntity<?> createPlan(@RequestBody CreatePlanRequest req) {
        try {
            int planId = vaccRepo.createPlan(req.getPetId(), req.getVetId());
            return ResponseEntity.ok(Map.of("planId", planId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/records")
    public ResponseEntity<?> createRecord(@RequestBody CreateRecordRequest req) {
        try {
            LocalDate administeredDate = LocalDate.parse(req.getAdministeredDate());
            LocalDate nextDueDate = req.getNextDueDate() != null && !req.getNextDueDate().isBlank()
                ? LocalDate.parse(req.getNextDueDate())
                : null;
            int vaccId = vaccRepo.createRecord(
                req.getPlanId(),
                req.getMedId(),
                req.getVetId(),
                req.getVisitId(),
                req.getBatchNumber(),
                administeredDate,
                nextDueDate,
                "done",
                req.getNotes()
            );
            // When a next-due date is set, insert a follow-up 'upcoming' record so that
            // once that date passes the OverdueVaccinations view surfaces it correctly.
            if (nextDueDate != null) {
                vaccRepo.createRecord(
                    req.getPlanId(),
                    req.getMedId(),
                    req.getVetId(),
                    null,
                    null,
                    nextDueDate,
                    nextDueDate,
                    "upcoming",
                    null
                );
            }
            return ResponseEntity.ok(Map.of("vaccId", vaccId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/overdue")
    public ResponseEntity<?> getOverdue(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(defaultValue = "0") int threshold) {
        try {
            List<Map<String, Object>> results = branchId != null
                ? vaccRepo.findOverdueByBranchId(branchId, threshold)
                : vaccRepo.findOverdueAll(threshold);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
