package com.group20.vetclinic.dto;

import lombok.Data;

@Data
public class CreatePlanRequest {
    private int petId;
    private int vetId;
}
