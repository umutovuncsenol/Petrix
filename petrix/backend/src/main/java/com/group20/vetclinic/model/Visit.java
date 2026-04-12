package com.group20.vetclinic.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Visit {
    private int visitId;
    private int apptId;
    private LocalDateTime createdAt;
    private String notes;
}
