package com.group20.vetclinic.controller;

import com.group20.vetclinic.model.MembershipPlan;
import com.group20.vetclinic.repository.MembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/memberships")
@RequiredArgsConstructor
public class MembershipController {

    private final MembershipRepository membershipRepo;

    @GetMapping("/plans")
    public List<MembershipPlan> getPlans() {
        return membershipRepo.findAllPlans();
    }

    @PostMapping("/enroll")
    public ResponseEntity<?> enroll(@RequestBody Map<String, Object> body) {
        try {
            int ownerId = (int) body.get("ownerId");
            int planId  = (int) body.get("planId");
            membershipRepo.enroll(ownerId, planId, LocalDate.now());
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/cancel")
    public ResponseEntity<?> cancel(@RequestBody Map<String, Object> body) {
        int ownerId = (int) body.get("ownerId");
        int planId  = (int) body.get("planId");
        int updated = membershipRepo.cancel(ownerId, planId);
        if (updated == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "No active membership found to cancel"));
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/owner/{ownerId}")
    public List<Map<String, Object>> getByOwner(@PathVariable int ownerId) {
        return membershipRepo.findEnrollmentsByOwner(ownerId);
    }
}
