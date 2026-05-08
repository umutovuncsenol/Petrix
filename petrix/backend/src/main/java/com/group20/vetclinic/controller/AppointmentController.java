package com.group20.vetclinic.controller;

import com.group20.vetclinic.model.Appointment;
import com.group20.vetclinic.repository.AppointmentRepository;
import com.group20.vetclinic.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private static final int MAX_DAILY_APPOINTMENTS_PER_VET = 20;

    private final AppointmentRepository apptRepo;
    private final JwtUtil jwtUtil;

    @GetMapping
    public List<Appointment> getByOwner(
            @RequestParam int ownerId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        if (fromDate != null && toDate != null) {
            return apptRepo.findByOwnerBetweenDates(ownerId,
                LocalDate.parse(fromDate), LocalDate.parse(toDate));
        }
        return apptRepo.findByOwner(ownerId);
    }

    @GetMapping("/owner/{ownerId}/visit-summaries")
    public ResponseEntity<?> getVisitSummariesByOwner(
            @PathVariable int ownerId,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (!isAuthorizedOwner(authHeader, ownerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You are not allowed to view visit summaries for this owner."));
        }
        return ResponseEntity.ok(apptRepo.findVisitSummariesByOwner(ownerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable int id) {
        return apptRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            int ownerId   = (int) body.get("ownerId");
            int petId     = (int) body.get("petId");
            int vetId     = (int) body.get("vetId");
            int branchId  = (int) body.get("branchId");
            String start  = (String) body.get("startTime");
            int duration  = body.containsKey("duration") ? (int) body.get("duration") : 30;
            String reason = (String) body.getOrDefault("reason", "");
            LocalDateTime startTime = LocalDateTime.parse(start);

            if (!canBookSlot(ownerId, startTime.toLocalTime())) {
                String requiredPlan = isVipSlot(startTime.toLocalTime()) ? "Gold" : "Silver or Gold";
                return ResponseEntity.badRequest().body(Map.of(
                        "error",
                        "This time slot is reserved for " + requiredPlan + " membership plans."
                ));
            }

            if (apptRepo.hasUnpaidBillsForPet(petId)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error",
                        "This pet has outstanding unpaid bills. Please pay them before booking a new appointment."
                ));
            }

            if (apptRepo.countScheduledAppointmentsForVetOnDate(vetId, startTime) >= MAX_DAILY_APPOINTMENTS_PER_VET) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error",
                        "This veterinarian is fully booked for the selected day."
                ));
            }

            int id = apptRepo.create(ownerId, petId, vetId, branchId,
                                     startTime, duration, reason);
            return ResponseEntity.ok(Map.of("apptId", id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable int id) {
        apptRepo.cancel(id);
        return ResponseEntity.ok(Map.of("status", "cancelled"));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> complete(@PathVariable int id) {
        apptRepo.complete(id);
        return ResponseEntity.ok(Map.of("status", "completed"));
    }

    private boolean isAuthorizedOwner(String authHeader, int ownerId) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return false;
        }

        try {
            String token = authHeader.substring(7);
            Integer tokenUserId = jwtUtil.extractUserId(token);
            List<String> roles = jwtUtil.extractRoles(token);
            return tokenUserId != null && tokenUserId == ownerId && roles.contains("OWNER");
        } catch (Exception e) {
            return false;
        }
    }

    private boolean canBookSlot(int ownerId, LocalTime time) {
        String planName = apptRepo.findActiveMembershipPlanName(ownerId).orElse("");

        if (isVipSlot(time)) {
            return "Gold".equalsIgnoreCase(planName);
        }

        if (isPrioritySlot(time)) {
            return "Silver".equalsIgnoreCase(planName) || "Gold".equalsIgnoreCase(planName);
        }

        return true;
    }

    private boolean isPrioritySlot(LocalTime time) {
        return time.equals(LocalTime.of(9, 0))
                || time.equals(LocalTime.of(9, 30))
                || time.equals(LocalTime.of(17, 0))
                || time.equals(LocalTime.of(17, 30));
    }

    private boolean isVipSlot(LocalTime time) {
        return time.equals(LocalTime.of(18, 0))
                || time.equals(LocalTime.of(18, 30));
    }
}
