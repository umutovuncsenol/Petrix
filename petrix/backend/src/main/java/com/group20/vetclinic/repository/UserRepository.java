package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<User> rowMapper = (rs, i) -> {
        User user = new User();
        user.setId(rs.getInt("id"));
        user.setUsername(rs.getString("username"));
        user.setPasswordHash(rs.getString("password_hash"));
        user.setFullName(rs.getString("full_name"));
        user.setEmail(rs.getString("email"));
        user.setPhone(rs.getString("phone"));
        return user;
    };

    public Optional<User> findByUsername(String username) {
        return jdbc.query(
                "SELECT id, username, password_hash, full_name, email, phone FROM USERS WHERE username = ?",
                rowMapper,
                username
        ).stream().findFirst();
    }

    public boolean existsByUsername(String username) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM USERS WHERE username = ?",
                Integer.class,
                username
        );
        return count != null && count > 0;
    }

    public boolean existsByEmail(String email) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM USERS WHERE email = ?",
                Integer.class,
                email
        );
        return count != null && count > 0;
    }

    public int create(String username, String passwordHash, String fullName, String email, String phone) {
        Integer id = jdbc.queryForObject(
                """
                INSERT INTO USERS (username, password_hash, full_name, email, phone)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id
                """,
                Integer.class,
                username,
                passwordHash,
                fullName,
                email,
                phone
        );
        if (id == null) {
            throw new IllegalStateException("Failed to create user: " + username);
        }
        return id;
    }

    public boolean hasRoleAssignment(int userId, int roleId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM USER_ROLE WHERE user_id = ? AND role_id = ?",
                Integer.class,
                userId,
                roleId
        );
        return count != null && count > 0;
    }

    public void assignRole(int userId, int roleId) {
        jdbc.update("INSERT INTO USER_ROLE (user_id, role_id) VALUES (?, ?)", userId, roleId);
    }

    public List<String> findRoleNamesByUserId(int userId) {
        return jdbc.query(
                """
                SELECT r.name
                FROM USER_ROLE ur
                JOIN ROLES r ON r.id = ur.role_id
                WHERE ur.user_id = ?
                ORDER BY r.name
                """,
                (rs, i) -> rs.getString("name"),
                userId
        );
    }
}
