package com.group20.vetclinic.model;

import lombok.Data;

@Data
public class Veterinarian {
    private int vetId;
    private int branchId;
    private String fullName;
    private String username;
    private String specialization;
    private String speciesExpertise;
    private String branchName;
    private String branchAddress;
    private Double avgRating;
}
