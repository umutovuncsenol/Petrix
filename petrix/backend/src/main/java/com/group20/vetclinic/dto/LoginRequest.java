package com.group20.vetclinic.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
    private String role; // "owner" or "vet"
}
