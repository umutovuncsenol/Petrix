package com.group20.vetclinic.service;

import com.group20.vetclinic.dto.AuthResponse;
import com.group20.vetclinic.dto.LoginRequest;
import com.group20.vetclinic.dto.RegisterRequest;
import com.group20.vetclinic.dto.RegisterVetRequest;
import com.group20.vetclinic.model.Owner;
import com.group20.vetclinic.model.User;
import com.group20.vetclinic.model.Veterinarian;
import com.group20.vetclinic.repository.OwnerRepository;
import com.group20.vetclinic.repository.UserRepository;
import com.group20.vetclinic.repository.VetRepository;
import com.group20.vetclinic.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final OwnerRepository ownerRepo;
    private final VetRepository vetRepo;
    private final UserRepository userRepo;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse registerOwner(RegisterRequest req) {
        if (ownerRepo.existsByUsername(req.getUsername()))
            throw new IllegalArgumentException("Username already taken");
        if (ownerRepo.existsByEmail(req.getEmail()))
            throw new IllegalArgumentException("Email already registered");

        String hash = passwordEncoder.encode(req.getPassword());
        int id = ownerRepo.create(req.getFullName(), req.getUsername(), hash, req.getEmail(), req.getPhone());
        List<String> roles = List.of("OWNER");
        String token = jwtUtil.generateToken(req.getUsername(), roles, id);
        return new AuthResponse(token, roles, id, req.getUsername(), req.getFullName(), null);
    }

    public AuthResponse registerVet(RegisterVetRequest req) {
        if (vetRepo.existsByUsername(req.getUsername()))
            throw new IllegalArgumentException("Username already taken");

        String hash = passwordEncoder.encode(req.getPassword());
        int id = vetRepo.create(req.getFullName(), req.getUsername(), hash, req.getBranchId(), req.getSpecialization(), req.getSpeciesExpertise());
        List<String> roles = List.of("VET");
        String token = jwtUtil.generateToken(req.getUsername(), roles, id, req.getBranchId());
        return new AuthResponse(token, roles, id, req.getUsername(), req.getFullName(), req.getBranchId());
    }

    public AuthResponse login(LoginRequest req) {
        if (req.getUsername() == null || req.getUsername().isBlank()
                || req.getPassword() == null || req.getPassword().isBlank()) {
            throw new IllegalArgumentException("Username and password are required");
        }

        // Try USERS (ADMIN / CLINIC_MANAGER and other role-based users)
        var appUserOpt = userRepo.findByUsername(req.getUsername());
        if (appUserOpt.isPresent()) {
            User u = appUserOpt.get();
            if (!passwordEncoder.matches(req.getPassword(), u.getPasswordHash()))
                throw new IllegalArgumentException("Invalid credentials");

            var roles = userRepo.findRoleNamesByUserId(u.getId());
            if (roles.isEmpty())
                throw new IllegalArgumentException("User has no assigned role");

            String token = jwtUtil.generateToken(u.getUsername(), roles, u.getId(), u.getBranchId());
            return new AuthResponse(token, roles, u.getId(), u.getUsername(), u.getFullName(), u.getBranchId());
        }

        // Try owner
        var ownerOpt = ownerRepo.findByUsername(req.getUsername());
        if (ownerOpt.isPresent()) {
            String hash = ownerRepo.findPasswordHash(req.getUsername()).orElseThrow();
            if (!passwordEncoder.matches(req.getPassword(), hash))
                throw new IllegalArgumentException("Invalid credentials");
            Owner o = ownerOpt.get();
            List<String> roles = List.of("OWNER");
            String token = jwtUtil.generateToken(o.getUsername(), roles, o.getOwnerId());
            return new AuthResponse(token, roles, o.getOwnerId(), o.getUsername(), o.getFullName(), null);
        }

        // Try vet
        var vetOpt = vetRepo.findByUsername(req.getUsername());
        if (vetOpt.isPresent()) {
            String hash = vetRepo.findPasswordHash(req.getUsername()).orElseThrow();
            if (!passwordEncoder.matches(req.getPassword(), hash))
                throw new IllegalArgumentException("Invalid credentials");
            Veterinarian v = vetOpt.get();
            List<String> roles = List.of("VET");
            String token = jwtUtil.generateToken(v.getUsername(), roles, v.getVetId(), v.getBranchId());
            return new AuthResponse(token, roles, v.getVetId(), v.getUsername(), v.getFullName(), v.getBranchId());
        }

        throw new IllegalArgumentException("Invalid credentials");
    }
}
