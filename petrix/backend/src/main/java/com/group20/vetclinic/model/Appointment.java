package com.group20.vetclinic.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Appointment {
    private int apptId;
    private int ownerId;
    private int petId;
    private int vetId;
    private int branchId;
    private LocalDateTime startTime;
    private int duration;
    private String status;
    private String reason;
    // Joined fields
    private String petName;
    private String vetName;
    private String branchName;
    private String ownerName;
    private Boolean visitInProgress;
}
