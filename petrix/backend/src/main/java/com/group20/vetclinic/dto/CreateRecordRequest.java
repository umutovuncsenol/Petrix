package com.group20.vetclinic.dto;

import lombok.Data;

@Data
public class CreateRecordRequest {
    private int planId;
    private int medId;
    private int vetId;
    private Integer visitId;
    private String batchNumber;
    private String batchExpiryDate;
    private String administeredDate;
    private String nextDueDate;
    private String status;
    private String notes;
}
