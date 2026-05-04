package com.group20.vetclinic.controller;

import com.group20.vetclinic.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/admin", "/admin"})
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> dashboard() {
        return ResponseEntity.ok(Map.of(
                "message", "Admin dashboard data"
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> users() {
        return ResponseEntity.ok(userRepository.findAllWithRoles());
    }
}
