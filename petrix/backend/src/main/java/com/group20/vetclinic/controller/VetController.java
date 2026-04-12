package com.group20.vetclinic.controller;

import com.group20.vetclinic.model.Veterinarian;
import com.group20.vetclinic.repository.AppointmentRepository;
import com.group20.vetclinic.repository.VetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/veterinarians")
@RequiredArgsConstructor
public class VetController {

    private final VetRepository vetRepo;
    private final AppointmentRepository apptRepo;

    @GetMapping
    public List<Veterinarian> search(
            @RequestParam(required = false) Integer branchId,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String species) {
        return vetRepo.search(branchId, specialization, species);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable int id) {
        return vetRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/availability")
    public List<Map<String, Object>> getAvailability(
            @PathVariable int id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return apptRepo.findBusySlots(id, date);
    }

    @GetMapping("/{id}/appointments")
    public List<?> getAppointments(@PathVariable int id) {
        return apptRepo.findByVet(id);
    }
}
