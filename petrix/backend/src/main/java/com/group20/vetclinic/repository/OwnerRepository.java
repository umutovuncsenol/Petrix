package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.Owner;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class OwnerRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Owner> rowMapper = (rs, i) -> {
        Owner o = new Owner();
        o.setOwnerId(rs.getInt("owner_id"));
        o.setFullName(rs.getString("full_name"));
        o.setUsername(rs.getString("username"));
        o.setEmail(rs.getString("email"));
        o.setPhone(rs.getString("phone"));
        return o;
    };

    public int create(String fullName, String username, String passwordHash, String email, String phone) {
        String sql = "INSERT INTO OWNER (full_name, username, password_hash, email, phone) VALUES (?,?,?,?,?) RETURNING owner_id";
        Integer id = jdbc.queryForObject(sql, Integer.class, fullName, username, passwordHash, email, phone);
        return id;
    }

    public Optional<Owner> findById(int id) {
        return jdbc.query("SELECT * FROM OWNER WHERE owner_id = ?", rowMapper, id)
                   .stream().findFirst();
    }

    public Optional<Owner> findByUsername(String username) {
        return jdbc.query("SELECT * FROM OWNER WHERE username = ?", rowMapper, username)
                   .stream().findFirst();
    }

    public Optional<String> findPasswordHash(String username) {
        return jdbc.query("SELECT password_hash FROM OWNER WHERE username = ?",
                          (rs, i) -> rs.getString("password_hash"), username)
                   .stream().findFirst();
    }

    public boolean existsByUsername(String username) {
        Integer cnt = jdbc.queryForObject("SELECT COUNT(*) FROM OWNER WHERE username = ?", Integer.class, username);
        return cnt != null && cnt > 0;
    }

    public boolean existsByEmail(String email) {
        Integer cnt = jdbc.queryForObject("SELECT COUNT(*) FROM OWNER WHERE email = ?", Integer.class, email);
        return cnt != null && cnt > 0;
    }
}
