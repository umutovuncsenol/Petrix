package com.group20.vetclinic.model;

import lombok.Data;

@Data
public class Branch {
    private int branchId;
    private String name;
    private String address;
    private String phone;
    private String email;
    private String workingHours;
}
