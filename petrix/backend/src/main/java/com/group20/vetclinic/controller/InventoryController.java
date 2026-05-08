package com.group20.vetclinic.controller;

import com.group20.vetclinic.dto.ExpireRequest;
import com.group20.vetclinic.dto.RestockRequest;
import com.group20.vetclinic.dto.WasteRequest;
import com.group20.vetclinic.model.Medication;
import com.group20.vetclinic.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    @GetMapping("/branch/{branchId}/filtered")
    public List<Medication> getStockByBranchFiltered(
            @PathVariable int branchId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String expirationStatus
    ) {
        Boolean isVaccine = null;
        if ("vaccines".equalsIgnoreCase(category)) {
            isVaccine = true;
        } else if ("medicines".equalsIgnoreCase(category)) {
            isVaccine = false;
        }
        return inventoryRepo.findStockByBranchFiltered(branchId, name, isVaccine, expirationStatus);
    }

    @GetMapping("/branch/{branchId}/low-stock")
    public List<Map<String, Object>> getLowStock(@PathVariable int branchId) {
        return inventoryRepo.findLowStockByBranch(branchId);
    }

    @PutMapping("/restock")
    public ResponseEntity<String> restock(@RequestBody RestockRequest request) {
        inventoryRepo.restock(
                request.getBranchId(),
                request.getMedId(),
                request.getQuantityToAdd(),
                request.getExpiryDate(),
                request.getBatchNumber(),
                request.getReorderLevel()
        );
        return ResponseEntity.ok("Restocked successfully");
    }

    @PutMapping("/expire")
    public ResponseEntity<String> expire(@RequestBody ExpireRequest request) {
        try {
            inventoryRepo.expireStock(
                    request.getBranchId(),
                    request.getMedId(),
                    request.getQuantityToRemove(),
                    request.getReason()
            );
            return ResponseEntity.ok("Stock updated and waste logged");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/waste")
    public String logWaste(@RequestBody WasteRequest request) {
        inventoryRepo.logWaste(request.getBranchId(), request.getMedId(), request.getQuantity(), request.getReason());
        return "Waste logged successfully for branch: " + request.getBranchId();
    }

    @GetMapping("/waste/{branchId}")
    public List<Map<String, Object>> getWasteLogs(@PathVariable int branchId) {
        return inventoryRepo.findWasteByBranch(branchId);
    }

    @GetMapping("/reports/consumption/{branchId}")
    public List<Map<String, Object>> getStockConsumptionReport(@PathVariable int branchId) {
        return inventoryRepo.getStockConsumptionReport(branchId);
    }

    @GetMapping("/reports/branch/{branchId}")
    public Map<String, Object> getBranchReport(@PathVariable int branchId) {
        return inventoryRepo.getReport(branchId);
    }

}
