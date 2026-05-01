package com.group20.vetclinic.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String role;
    private List<String> roles;
    private int userId;
    private String username;
    private String fullName;
    private Integer branchId;

    public AuthResponse(String token, String role, int userId, String username, String fullName) {
        this.token = token;
        this.role = role;
        this.roles = List.of(role);
        this.userId = userId;
        this.username = username;
        this.fullName = fullName;
        this.branchId = null;
    }

    public AuthResponse(String token, List<String> roles, int userId, String username, String fullName) {
        this(token, roles, userId, username, fullName, null);
    }

    public AuthResponse(String token, List<String> roles, int userId, String username, String fullName, Integer branchId) {
        this.token = token;
        this.roles = roles;
        this.role = (roles == null || roles.isEmpty()) ? null : roles.get(0);
        this.userId = userId;
        this.username = username;
        this.fullName = fullName;
        this.branchId = branchId;
    }
}
