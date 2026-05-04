package com.group20.vetclinic.model;

import lombok.Data;
import java.time.LocalDate;

@Data
public class VaccinationRecord {
    private int vaccId;
    private int planId;
    private int medId;
    private int vetId;
    private Integer visitId;
    private String batchNumber;
    private LocalDate batchExpiryDate;
    private LocalDate administeredDate;
    private LocalDate nextDueDate;
    private String status;
    private String notes;
    private String vaccineName;
}
