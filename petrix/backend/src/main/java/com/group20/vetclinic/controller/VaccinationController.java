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
            String batchNumber = req.getBatchNumber() != null && !req.getBatchNumber().isBlank()
                ? req.getBatchNumber().trim()
                : null;
            LocalDate administeredDate = LocalDate.parse(req.getAdministeredDate());
            LocalDate nextDueDate = req.getNextDueDate() != null && !req.getNextDueDate().isBlank()
                ? LocalDate.parse(req.getNextDueDate())
                : null;
            LocalDate batchExpiryDate = req.getBatchExpiryDate() != null && !req.getBatchExpiryDate().isBlank()
                ? LocalDate.parse(req.getBatchExpiryDate())
                : null;

            if (batchExpiryDate != null && batchNumber == null) {
                throw new IllegalArgumentException("Batch number is required when batch expiry date is provided.");
            }
            if (batchExpiryDate != null && batchExpiryDate.isBefore(administeredDate)) {
                throw new IllegalArgumentException("Batch expiry date cannot be earlier than the administered date.");
            }

            int vaccId = vaccRepo.createRecord(
                req.getPlanId(),
                req.getMedId(),
                req.getVetId(),
                req.getVisitId(),
                batchNumber,
                batchExpiryDate,
                administeredDate,
                nextDueDate,
                "done",
                req.getNotes()
            );
            // When a next-due date is set, insert a follow-up 'upcoming' record so that
            // once that date passes the OverdueVaccinations view surfaces it correctly.
            // administered_date must be < next_due_date per schema CHECK constraint,
            // so we use nextDueDate-1 as the nominal "scheduled" date.
            if (nextDueDate != null) {
                vaccRepo.createRecord(
                    req.getPlanId(),
                    req.getMedId(),
                    req.getVetId(),
                    null,
                    null,
                    null,
                    nextDueDate.minusDays(1),
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
