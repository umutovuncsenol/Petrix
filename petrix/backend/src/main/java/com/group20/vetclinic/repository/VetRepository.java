package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.Veterinarian;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class VetRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Veterinarian> rowMapper = (rs, i) -> {
        Veterinarian v = new Veterinarian();
        v.setVetId(rs.getInt("vet_id"));
        v.setBranchId(rs.getInt("branch_id"));
        v.setFullName(rs.getString("full_name"));
        v.setUsername(rs.getString("username"));
        v.setSpecialization(rs.getString("specialization"));
        v.setSpeciesExpertise(rs.getString("species_expertise"));
        try { v.setBranchName(rs.getString("branch_name")); } catch (Exception ignored) {}
        try { v.setBranchAddress(rs.getString("address")); } catch (Exception ignored) {}
        try { v.setAvgRating(rs.getObject("avg_rating") != null ? rs.getDouble("avg_rating") : null); } catch (Exception ignored) {}
        return v;
    };

    public List<Veterinarian> search(Integer branchId, String specialization, String species) {
        StringBuilder sql = new StringBuilder("""
            SELECT v.vet_id, v.branch_id, v.full_name, v.username,
                   v.specialization, v.species_expertise,
                   b.name AS branch_name, b.address,
                   ROUND(AVG(r.score)::NUMERIC, 1) AS avg_rating
            FROM VETERINARIAN v
            JOIN BRANCH b ON v.branch_id = b.branch_id
            LEFT JOIN VET_RATING r ON r.vet_id = v.vet_id
            WHERE 1=1
            """);
        List<Object> params = new ArrayList<>();

        if (branchId != null) { sql.append(" AND v.branch_id = ? "); params.add(branchId); }
        if (specialization != null && !specialization.isBlank()) { sql.append(" AND v.specialization = ? "); params.add(specialization); }
        if (species != null && !species.isBlank()) { sql.append(" AND v.species_expertise ILIKE ? "); params.add("%" + species + "%"); }

        sql.append(" GROUP BY v.vet_id, v.branch_id, v.full_name, v.username, v.specialization, v.species_expertise, b.name, b.address ORDER BY avg_rating DESC NULLS LAST");
        return jdbc.query(sql.toString(), rowMapper, params.toArray());
    }

    public Optional<Veterinarian> findById(int id) {
        String sql = """
            SELECT v.vet_id, v.branch_id, v.full_name, v.username,
                   v.specialization, v.species_expertise,
                   b.name AS branch_name, b.address,
                   ROUND(AVG(r.score)::NUMERIC, 1) AS avg_rating
            FROM VETERINARIAN v
            JOIN BRANCH b ON v.branch_id = b.branch_id
            LEFT JOIN VET_RATING r ON r.vet_id = v.vet_id
            WHERE v.vet_id = ?
            GROUP BY v.vet_id, v.branch_id, v.full_name, v.username, v.specialization, v.species_expertise, b.name, b.address
            """;
        return jdbc.query(sql, rowMapper, id).stream().findFirst();
    }

    public Optional<Veterinarian> findByUsername(String username) {
        String sql = """
            SELECT v.vet_id, v.branch_id, v.full_name, v.username,
                   v.specialization, v.species_expertise,
                   b.name AS branch_name, b.address, NULL as avg_rating
            FROM VETERINARIAN v
            JOIN BRANCH b ON v.branch_id = b.branch_id
            WHERE v.username = ?
            """;
        return jdbc.query(sql, rowMapper, username).stream().findFirst();
    }

    public Optional<String> findPasswordHash(String username) {
        return jdbc.query("SELECT password_hash FROM VETERINARIAN WHERE username = ?",
                          (rs, i) -> rs.getString("password_hash"), username)
                   .stream().findFirst();
    }

    public List<Veterinarian> findBySpecializationExcludingBranch(String specialization, int branchId) {
        String sql = """
            SELECT v.vet_id, v.branch_id, v.full_name, v.username,
                   v.specialization, v.species_expertise,
                   b.name AS branch_name, b.address, NULL as avg_rating
            FROM VETERINARIAN v
            JOIN BRANCH b ON v.branch_id = b.branch_id
            WHERE v.specialization = ? AND v.branch_id != ?
            """;
        return jdbc.query(sql, rowMapper, specialization, branchId);
    }
}
