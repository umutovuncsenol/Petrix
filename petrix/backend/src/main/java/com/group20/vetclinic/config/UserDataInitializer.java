package com.group20.vetclinic.config;

import com.group20.vetclinic.model.Role;
import com.group20.vetclinic.repository.RoleRepository;
import com.group20.vetclinic.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserDataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${seed.admin.username:admin}")
    private String adminUsername;

    @Value("${seed.admin.password:admin123}")
    private String adminPassword;

    @Value("${seed.manager.username:manager}")
    private String managerUsername;

    @Value("${seed.manager.password:manager123}")
    private String managerPassword;

    @Override
    public void run(ApplicationArguments args) {
        seedUserWithRole(
                adminUsername,
                adminPassword,
                "System Admin",
                "admin@vetclinic.local",
                "+90 000 000 0000",
                "ADMIN"
        );

        seedUserWithRole(
                managerUsername,
                managerPassword,
                "Clinic Manager",
                "manager@vetclinic.local",
                "+90 000 000 0001",
                "CLINIC_MANAGER"
        );
    }

    private void seedUserWithRole(
            String username,
            String rawPassword,
            String fullName,
            String email,
            String phone,
            String roleName
    ) {
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Missing role in ROLES table: " + roleName));

        int userId;
        var existing = userRepository.findByUsername(username);
        if (existing.isPresent()) {
            userId = existing.get().getId();
        } else {
            String passwordHash = passwordEncoder.encode(rawPassword);
            String safeEmail = userRepository.existsByEmail(email) ? username + "@vetclinic.local" : email;
            userId = userRepository.create(username, passwordHash, fullName, safeEmail, phone);
            log.info("Seeded user: {}", username);
        }

        if (!userRepository.hasRoleAssignment(userId, role.getId())) {
            userRepository.assignRole(userId, role.getId());
            log.info("Assigned role {} to {}", roleName, username);
        }
    }
}
