package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.Appointment;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AppointmentRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Appointment> rowMapper = (rs, i) -> {
        Appointment a = new Appointment();
        a.setApptId(rs.getInt("appt_id"));
        a.setOwnerId(rs.getInt("owner_id"));
        a.setPetId(rs.getInt("pet_id"));
        a.setVetId(rs.getInt("vet_id"));
        a.setBranchId(rs.getInt("branch_id"));
        a.setStartTime(rs.getTimestamp("start_time").toLocalDateTime());
        a.setDuration(rs.getInt("duration"));
        a.setStatus(rs.getString("status"));
        a.setReason(rs.getString("reason"));
        try { a.setPetName(rs.getString("pet_name")); } catch (Exception ignored) {}
        try { a.setVetName(rs.getString("vet_name")); } catch (Exception ignored) {}
        try { a.setBranchName(rs.getString("branch_name")); } catch (Exception ignored) {}
        try { a.setOwnerName(rs.getString("owner_name")); } catch (Exception ignored) {}
        return a;
    };

    public int create(int ownerId, int petId, int vetId, int branchId,
                      LocalDateTime startTime, int duration, String reason) {
        String sql = "INSERT INTO APPOINTMENT (owner_id, pet_id, vet_id, branch_id, start_time, duration, reason) VALUES (?,?,?,?,?,?,?) RETURNING appt_id";
        Integer id = jdbc.queryForObject(sql, Integer.class,
            ownerId, petId, vetId, branchId, Timestamp.valueOf(startTime), duration, reason);
        return id;
    }

    public List<Appointment> findByOwner(int ownerId) {
        String sql = """
            SELECT a.*, p.name as pet_name, v.full_name as vet_name,
                   b.name as branch_name, o.full_name as owner_name
            FROM APPOINTMENT a
            JOIN PET p ON a.pet_id = p.pet_id
            JOIN VETERINARIAN v ON a.vet_id = v.vet_id
            JOIN BRANCH b ON a.branch_id = b.branch_id
            JOIN OWNER o ON a.owner_id = o.owner_id
            WHERE a.owner_id = ?
            ORDER BY a.start_time DESC
            """;
        return jdbc.query(sql, rowMapper, ownerId);
    }

    public List<Appointment> findByVet(int vetId) {
        String sql = """
            SELECT a.*, p.name as pet_name, v.full_name as vet_name,
                   b.name as branch_name, o.full_name as owner_name
            FROM APPOINTMENT a
            JOIN PET p ON a.pet_id = p.pet_id
            JOIN VETERINARIAN v ON a.vet_id = v.vet_id
            JOIN BRANCH b ON a.branch_id = b.branch_id
            JOIN OWNER o ON a.owner_id = o.owner_id
            WHERE a.vet_id = ?
            ORDER BY a.start_time DESC
            """;
        return jdbc.query(sql, rowMapper, vetId);
    }

    public Optional<Appointment> findById(int id) {
        String sql = """
            SELECT a.*, p.name as pet_name, v.full_name as vet_name,
                   b.name as branch_name, o.full_name as owner_name
            FROM APPOINTMENT a
            JOIN PET p ON a.pet_id = p.pet_id
            JOIN VETERINARIAN v ON a.vet_id = v.vet_id
            JOIN BRANCH b ON a.branch_id = b.branch_id
            JOIN OWNER o ON a.owner_id = o.owner_id
            WHERE a.appt_id = ?
            """;
        return jdbc.query(sql, rowMapper, id).stream().findFirst();
    }

    public void cancel(int apptId) {
        jdbc.update("UPDATE APPOINTMENT SET status = 'cancelled' WHERE appt_id = ?", apptId);
    }

    public void complete(int apptId) {
        jdbc.update("UPDATE APPOINTMENT SET status = 'completed' WHERE appt_id = ?", apptId);
    }

    /** Returns booked time-slots for a vet on a given date */
    public List<Map<String, Object>> findBusySlots(int vetId, LocalDate date) {
        String sql = """
            SELECT start_time,
                   start_time + (duration || ' minutes')::INTERVAL AS end_time
            FROM APPOINTMENT
            WHERE vet_id = ? AND DATE(start_time) = ? AND status = 'scheduled'
            """;
        return jdbc.queryForList(sql, vetId, date);
    }
}
