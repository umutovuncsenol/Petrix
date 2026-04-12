package com.group20.vetclinic.controller;

import com.group20.vetclinic.model.Medication;
import com.group20.vetclinic.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryRepository inventoryRepo;

    @GetMapping("/medications")
    public List<Medication> getAllMedications() {
        return inventoryRepo.findAll();
    }

    @GetMapping("/branch/{branchId}")
    public List<Medication> getStockByBranch(@PathVariable int branchId) {
        return inventoryRepo.findStockByBranch(branchId);
    }

    @GetMapping("/branch/{branchId}/low-stock")
    public List<Map<String, Object>> getLowStock(@PathVariable int branchId) {
        return inventoryRepo.findLowStockByBranch(branchId);
    }
}
