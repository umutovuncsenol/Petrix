package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.Pet;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class PetRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Pet> rowMapper = (rs, i) -> {
        Pet p = new Pet();
        p.setPetId(rs.getInt("pet_id"));
        p.setOwnerId(rs.getInt("owner_id"));
        p.setName(rs.getString("name"));
        p.setSpecies(rs.getString("species"));
        p.setBreed(rs.getString("breed"));
        Date bd = rs.getDate("birth_date");
        if (bd != null) p.setBirthDate(bd.toLocalDate());
        return p;
    };

    public int create(int ownerId, String name, String species, String breed, java.time.LocalDate birthDate) {
        String sql = "INSERT INTO PET (owner_id, name, species, breed, birth_date) VALUES (?,?,?,?,?) RETURNING pet_id";
        Integer id = jdbc.queryForObject(sql, Integer.class,
            ownerId, name, species, breed,
            birthDate != null ? Date.valueOf(birthDate) : null);
        return id;
    }

    public List<Pet> findByOwner(int ownerId) {
        return jdbc.query("SELECT * FROM PET WHERE owner_id = ? ORDER BY name", rowMapper, ownerId);
    }

    public Optional<Pet> findById(int id) {
        return jdbc.query("SELECT * FROM PET WHERE pet_id = ?", rowMapper, id).stream().findFirst();
    }

    public List<java.util.Map<String, Object>> findAllergies(int petId) {
        return jdbc.queryForList(
            "SELECT allergen, reaction, severity FROM ALLERGY WHERE pet_id = ? ORDER BY severity",
            petId);
    }

    public void update(int petId, String name, String species, String breed, java.time.LocalDate birthDate) {
        jdbc.update("UPDATE PET SET name=?, species=?, breed=?, birth_date=? WHERE pet_id=?",
            name, species, breed, birthDate != null ? Date.valueOf(birthDate) : null, petId);
    }

    public void delete(int petId) {
        jdbc.update("DELETE FROM PET WHERE pet_id=?", petId);
    }
}
