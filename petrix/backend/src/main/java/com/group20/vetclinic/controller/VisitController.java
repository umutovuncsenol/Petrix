package com.group20.vetclinic.controller;

import com.group20.vetclinic.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/visits")
@RequiredArgsConstructor
public class VisitController {

    private final VisitRepository visitRepo;

    /** Start or resume a visit record without completing the appointment. */
    @PostMapping
    public ResponseEntity<?> createVisit(@RequestBody Map<String, Object> body) {
        try {
            int apptId  = (int) body.get("apptId");
            String notes = (String) body.getOrDefault("notes", "");
            int visitId = visitRepo.findByApptId(apptId)
                    .map(v -> v.getVisitId())
                    .orElseGet(() -> visitRepo.createVisit(apptId, notes));
            return ResponseEntity.ok(Map.of("visitId", visitId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/appointment/{apptId}")
    public ResponseEntity<?> getByAppt(@PathVariable int apptId) {
        return visitRepo.findByApptId(apptId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable int id) {
        return visitRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Add diagnosis to a visit */
    @PostMapping("/{visitId}/diagnoses")
    public ResponseEntity<?> addDiagnosis(@PathVariable int visitId,
                                          @RequestBody Map<String, Object> body) {
        String desc         = (String) body.get("description");
        String icd          = (String) body.getOrDefault("icdCode", "");
        String severity     = (String) body.getOrDefault("severity", "");
        String treatment    = (String) body.getOrDefault("treatmentNotes", "");
        boolean followUp    = Boolean.parseBoolean(body.getOrDefault("followUpRequired", false).toString());
        int id = visitRepo.findDiagnosesByVisit(visitId).stream()
                .findFirst()
                .map(existing -> {
                    visitRepo.updateDiagnosis(existing.getDiagnosisId(), desc, icd, severity, treatment, followUp);
                    return existing.getDiagnosisId();
                })
                .orElseGet(() -> visitRepo.createDiagnosis(visitId, desc, icd, severity, treatment, followUp));
        return ResponseEntity.ok(Map.of("diagnosisId", id));
    }

    @GetMapping("/{visitId}/diagnoses")
    public ResponseEntity<?> getDiagnoses(@PathVariable int visitId) {
        return ResponseEntity.ok(visitRepo.findDiagnosesByVisit(visitId));
    }

    /** Create prescription + line items + deduct stock */
    @Transactional
    @PostMapping("/{visitId}/prescriptions")
    public ResponseEntity<?> addPrescription(@PathVariable int visitId,
                                             @RequestBody Map<String, Object> body) {
        try {
            int vetId    = (int) body.get("vetId");
            int branchId = (int) body.get("branchId");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");

            for (Map<String, Object> item : items) {
                int medId = (int) item.get("medId");
                int quantity = (int) item.get("quantity");
                Map<String, Object> stock = visitRepo.findStockForMedication(branchId, medId);
                int available = stock.get("quantity") == null ? 0 : ((Number) stock.get("quantity")).intValue();
                if (available < quantity) {
                    throw new IllegalArgumentException("Insufficient stock for " + stock.get("name"));
                }
            }

            int rxId = visitRepo.createPrescription(visitId, vetId);
            for (Map<String, Object> item : items) {
                int medId         = (int) item.get("medId");
                String dosage     = (String) item.getOrDefault("dosage", "");
                int durationDays  = (int) item.getOrDefault("durationDays", 7);
                int quantity      = (int) item.get("quantity");
                visitRepo.addPrescriptionItem(rxId, medId, dosage, durationDays, quantity);
                visitRepo.deductStock(branchId, medId, quantity);
            }
            return ResponseEntity.ok(Map.of("rxId", rxId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{visitId}/prescriptions")
    public ResponseEntity<?> getPrescriptions(@PathVariable int visitId) {
        return ResponseEntity.ok(visitRepo.findPrescriptionItemsByVisit(visitId));
    }

    /** Generate invoice and mark the appointment completed. */
    @Transactional
    @PostMapping("/{visitId}/invoice")
    public ResponseEntity<?> createInvoice(@PathVariable int visitId,
                                           @RequestBody Map<String, Object> body) {
        try {
            BigDecimal consult   = new BigDecimal(body.getOrDefault("consultationFee",   "0").toString());
            BigDecimal treatment = new BigDecimal(body.getOrDefault("treatmentCosts",    "0").toString());
            BigDecimal meds      = new BigDecimal(body.getOrDefault("medicationCosts",   "0").toString());
            int invoiceId = visitRepo.createInvoice(visitId, consult, treatment, meds);
            visitRepo.completeAppointmentForVisit(visitId);
            return ResponseEntity.ok(Map.of("invoiceId", invoiceId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{visitId}/invoice")
    public ResponseEntity<?> getInvoice(@PathVariable int visitId) {
        return visitRepo.findInvoiceByVisit(visitId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{visitId}/invoice/pay")
    public ResponseEntity<?> payInvoice(@PathVariable int visitId,
                                        @RequestBody Map<String, Object> body) {
        var inv = visitRepo.findInvoiceByVisit(visitId);
        if (inv.isEmpty()) return ResponseEntity.notFound().build();
        visitRepo.payInvoice(inv.get().getInvoiceId(),
                             (String) body.getOrDefault("paymentMethod", "cash"));
        return ResponseEntity.ok(Map.of("status", "paid"));
    }

    @GetMapping("/{visitId}/rating")
    public ResponseEntity<?> getRating(@PathVariable int visitId) {
        return visitRepo.findRatingByVisit(visitId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Rate the vet after a visit */
    @PostMapping("/{visitId}/rating")
    public ResponseEntity<?> rate(@PathVariable int visitId,
                                  @RequestBody Map<String, Object> body) {
        visitRepo.createRating(visitId,
                               (int) body.get("ownerId"),
                               (int) body.get("vetId"),
                               (int) body.get("score"),
                               (String) body.getOrDefault("comment", ""));
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /** Create referral */
    @PostMapping("/{visitId}/referral")
    public ResponseEntity<?> refer(@PathVariable int visitId,
                                   @RequestBody Map<String, Object> body) {
        visitRepo.createReferral(visitId,
                                 (int) body.get("targetVetId"),
                                 (int) body.get("targetBranchId"),
                                 (String) body.getOrDefault("reason", ""));
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
