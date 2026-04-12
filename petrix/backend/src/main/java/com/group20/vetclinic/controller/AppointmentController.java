package com.group20.vetclinic.controller;

import com.group20.vetclinic.model.Appointment;
import com.group20.vetclinic.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentRepository apptRepo;

    @GetMapping
    public List<Appointment> getByOwner(@RequestParam int ownerId) {
        return apptRepo.findByOwner(ownerId);
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
            int id = apptRepo.create(ownerId, petId, vetId, branchId,
                                     LocalDateTime.parse(start), duration, reason);
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
}
