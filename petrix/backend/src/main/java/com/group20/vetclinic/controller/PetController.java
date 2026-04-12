package com.group20.vetclinic.controller;

import com.group20.vetclinic.model.Pet;
import com.group20.vetclinic.model.VaccinationRecord;
import com.group20.vetclinic.repository.PetRepository;
import com.group20.vetclinic.repository.VaccinationRepository;
import com.group20.vetclinic.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pets")
@RequiredArgsConstructor
public class PetController {

    private final PetRepository petRepo;
    private final VisitRepository visitRepo;
    private final VaccinationRepository vaccRepo;

    @GetMapping("/owner/{ownerId}")
    public List<Pet> getByOwner(@PathVariable int ownerId) {
        return petRepo.findByOwner(ownerId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable int id) {
        return petRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        int ownerId    = (int) body.get("ownerId");
        String name    = (String) body.get("name");
        String species = (String) body.get("species");
        String breed   = (String) body.getOrDefault("breed", "");
        String bd      = (String) body.getOrDefault("birthDate", null);
        LocalDate birthDate = bd != null ? LocalDate.parse(bd) : null;
        int id = petRepo.create(ownerId, name, species, breed, birthDate);
        return ResponseEntity.ok(Map.of("petId", id));
    }

    @GetMapping("/{id}/allergies")
    public List<Map<String, Object>> getAllergies(@PathVariable int id) {
        return petRepo.findAllergies(id);
    }

    @GetMapping("/{id}/vaccinations")
    public List<VaccinationRecord> getVaccinations(@PathVariable int id) {
        return vaccRepo.findByPet(id);
    }

    @GetMapping("/{id}/medical-timeline")
    public List<Map<String, Object>> getMedicalTimeline(@PathVariable int id) {
        return visitRepo.getMedicalTimeline(id);
    }
}
