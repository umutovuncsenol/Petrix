package com.group20.vetclinic.dto;

import lombok.Data;

@Data
public class RegisterManagerRequest {
    private String fullName;
    private String username;
    private String password;
    private String email;
    private String phone;
    private int branchId;
}
