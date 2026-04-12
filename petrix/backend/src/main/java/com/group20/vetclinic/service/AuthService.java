package com.group20.vetclinic.service;

import com.group20.vetclinic.dto.AuthResponse;
import com.group20.vetclinic.dto.LoginRequest;
import com.group20.vetclinic.dto.RegisterRequest;
import com.group20.vetclinic.model.Owner;
import com.group20.vetclinic.model.Veterinarian;
import com.group20.vetclinic.repository.OwnerRepository;
import com.group20.vetclinic.repository.VetRepository;
import com.group20.vetclinic.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final OwnerRepository ownerRepo;
    private final VetRepository vetRepo;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse registerOwner(RegisterRequest req) {
        if (ownerRepo.existsByUsername(req.getUsername()))
            throw new IllegalArgumentException("Username already taken");
        if (ownerRepo.existsByEmail(req.getEmail()))
            throw new IllegalArgumentException("Email already registered");

        String hash = passwordEncoder.encode(req.getPassword());
        int id = ownerRepo.create(req.getFullName(), req.getUsername(), hash, req.getEmail(), req.getPhone());
        String token = jwtUtil.generateToken(req.getUsername(), "OWNER", id);
        return new AuthResponse(token, "OWNER", id, req.getUsername(), req.getFullName());
    }

    public AuthResponse login(LoginRequest req) {
        // Try owner
        var ownerOpt = ownerRepo.findByUsername(req.getUsername());
        if (ownerOpt.isPresent()) {
            String hash = ownerRepo.findPasswordHash(req.getUsername()).orElseThrow();
            if (!passwordEncoder.matches(req.getPassword(), hash))
                throw new IllegalArgumentException("Invalid credentials");
            Owner o = ownerOpt.get();
            String token = jwtUtil.generateToken(o.getUsername(), "OWNER", o.getOwnerId());
            return new AuthResponse(token, "OWNER", o.getOwnerId(), o.getUsername(), o.getFullName());
        }

        // Try vet
        var vetOpt = vetRepo.findByUsername(req.getUsername());
        if (vetOpt.isPresent()) {
            String hash = vetRepo.findPasswordHash(req.getUsername()).orElseThrow();
            if (!passwordEncoder.matches(req.getPassword(), hash))
                throw new IllegalArgumentException("Invalid credentials");
            Veterinarian v = vetOpt.get();
            String token = jwtUtil.generateToken(v.getUsername(), "VET", v.getVetId());
            return new AuthResponse(token, "VET", v.getVetId(), v.getUsername(), v.getFullName());
        }

        throw new IllegalArgumentException("Invalid credentials");
    }
}
