package com.group20.vetclinic.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/manager")
public class ManagerController {

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, String>> dashboard() {
        return ResponseEntity.ok(Map.of(
                "message", "Clinic manager dashboard data"
        ));
    }
}
