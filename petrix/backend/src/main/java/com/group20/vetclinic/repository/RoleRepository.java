package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class RoleRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Role> rowMapper = (rs, i) -> {
        Role role = new Role();
        role.setId(rs.getInt("id"));
        role.setName(rs.getString("name"));
        return role;
    };

    public Optional<Role> findByName(String name) {
        return jdbc.query("SELECT id, name FROM ROLES WHERE name = ?", rowMapper, name)
                   .stream()
                   .findFirst();
    }

    public int create(String name) {
        Integer id = jdbc.queryForObject(
            "INSERT INTO ROLES (name) VALUES (?) RETURNING id",
            Integer.class,
            name
        );
        return id;
    }
}
