package com.group20.vetclinic.config;

import com.group20.vetclinic.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class RoleDataInitializer implements ApplicationRunner {

    private static final List<String> DEFAULT_ROLES = List.of("ADMIN", "CLINIC_MANAGER");

    private final RoleRepository roleRepository;

    @Override
    public void run(ApplicationArguments args) {
        DEFAULT_ROLES.forEach(roleName -> {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.create(roleName);
                log.info("Seeded role: {}", roleName);
            }
        });
    }
}
