package com.group20.vetclinic.controller;

import com.group20.vetclinic.dto.AuthResponse;
import com.group20.vetclinic.dto.LoginRequest;
import com.group20.vetclinic.dto.RegisterRequest;
import com.group20.vetclinic.dto.RegisterVetRequest;
import com.group20.vetclinic.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/auth", "/auth"})
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        try {
            AuthResponse resp = authService.registerOwner(req);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/register/vet")
    public ResponseEntity<?> registerVet(@RequestBody RegisterVetRequest req) {
        try {
            AuthResponse resp = authService.registerVet(req);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            AuthResponse resp = authService.login(req);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }
}
