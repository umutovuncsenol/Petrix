package com.group20.vetclinic.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class BoardingRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public List<Map<String, Object>> findRooms(Integer branchId, String roomType, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT rc.room_id, rc.branch_id, b.name AS branch_name,
                   rc.room_no, rc.room_type, rc.capacity, rc.nightly_rate, rc.status
            FROM ROOM_CAGE rc
            JOIN BRANCH b ON b.branch_id = rc.branch_id
            WHERE 1 = 1
            """);
        Map<String, Object> params = new HashMap<>();

        if (branchId != null) {
            sql.append(" AND rc.branch_id = :branchId");
            params.put("branchId", branchId);
        }
        if (roomType != null && !roomType.isBlank()) {
            sql.append(" AND rc.room_type = :roomType");
            params.put("roomType", roomType);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND rc.status = :status");
            params.put("status", status);
        }

        sql.append(" ORDER BY b.name, rc.room_no");
        return jdbc.queryForList(sql.toString(), params);
    }

    public List<Map<String, Object>> findAvailableRooms(int branchId, LocalDate startDate,
                                                        LocalDate endDate, String roomType) {
        StringBuilder sql = new StringBuilder("""
            SELECT rc.room_id, rc.branch_id, b.name AS branch_name,
                   rc.room_no, rc.room_type, rc.capacity, rc.nightly_rate, rc.status
            FROM ROOM_CAGE rc
            JOIN BRANCH b ON b.branch_id = rc.branch_id
            WHERE rc.branch_id = :branchId
              AND rc.status != 'maintenance'
              AND NOT EXISTS (
                  SELECT 1
                  FROM BOARDING_RESERVATION br
                  WHERE br.room_id = rc.room_id
                    AND br.status = 'active'
                    AND br.start_date < :endDate
                    AND br.end_date > :startDate
              )
            """);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("branchId", branchId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate);

        if (roomType != null && !roomType.isBlank()) {
            sql.append(" AND rc.room_type = :roomType");
            params.addValue("roomType", roomType);
        }

        sql.append(" ORDER BY rc.room_no");
        return jdbc.queryForList(sql.toString(), params);
    }

    public boolean branchExists(int branchId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM BRANCH WHERE branch_id = :branchId",
                Map.of("branchId", branchId),
                Integer.class);
        return count != null && count > 0;
    }

    public Integer findVetBranchId(int vetId) {
        return jdbc.queryForList("""
            SELECT branch_id
            FROM VETERINARIAN
            WHERE vet_id = :vetId
            """, Map.of("vetId", vetId), Integer.class)
                .stream()
                .findFirst()
                .orElse(null);
    }

    public boolean roomExists(int roomId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM ROOM_CAGE WHERE room_id = :roomId",
                Map.of("roomId", roomId),
                Integer.class);
        return count != null && count > 0;
    }

    public boolean roomNumberExistsInBranch(int branchId, String roomNo, Integer excludingRoomId) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM ROOM_CAGE
            WHERE branch_id = :branchId
              AND room_no = :roomNo
            """);
        Map<String, Object> params = new HashMap<>();
        params.put("branchId", branchId);
        params.put("roomNo", roomNo);
        if (excludingRoomId != null) {
            sql.append(" AND room_id <> :roomId");
            params.put("roomId", excludingRoomId);
        }
        Integer count = jdbc.queryForObject(sql.toString(), params, Integer.class);
        return count != null && count > 0;
    }

    public BigDecimal findBranchNightlyRate(int branchId) {
        return jdbc.queryForList("""
            SELECT nightly_rate
            FROM ROOM_CAGE
            WHERE branch_id = :branchId
            ORDER BY room_id
            LIMIT 1
            """, Map.of("branchId", branchId), BigDecimal.class)
                .stream()
                .findFirst()
                .orElse(null);
    }

    public BigDecimal findRoomNightlyRate(int roomId) {
        return jdbc.queryForList("""
            SELECT nightly_rate
            FROM ROOM_CAGE
            WHERE room_id = :roomId
            """, Map.of("roomId", roomId), BigDecimal.class)
                .stream()
                .findFirst()
                .orElse(null);
    }

    public Map<String, Object> findActiveMembershipForOwner(int ownerId) {
        return jdbc.queryForList("""
            SELECT mp.name AS plan_name,
                   mp.monthly_fee,
                   mp.perks_description
            FROM ENROLLS e
            JOIN MEMBERSHIP_PLAN mp ON mp.plan_id = e.plan_id
            WHERE e.owner_id = :ownerId
              AND e.status = 'active'
              AND e.start_date <= CURRENT_DATE
              AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
            ORDER BY mp.monthly_fee DESC, e.start_date DESC
            LIMIT 1
            """, Map.of("ownerId", ownerId))
                .stream()
                .findFirst()
                .orElse(null);
    }

    public int countUsedFreeBoardingNights(int ownerId, LocalDate monthStart, LocalDate monthEnd) {
        Number nights = jdbc.queryForObject("""
            SELECT COALESCE(SUM(LEAST(br.end_date, :monthEnd) - GREATEST(br.start_date, :monthStart)), 0)
            FROM BOARDING_RESERVATION br
            JOIN PET p ON p.pet_id = br.pet_id
            WHERE p.owner_id = :ownerId
              AND br.status IN ('active', 'completed')
              AND br.start_date < :monthEnd
              AND br.end_date > :monthStart
            """, new MapSqlParameterSource()
                .addValue("ownerId", ownerId)
                .addValue("monthStart", monthStart)
                .addValue("monthEnd", monthEnd), Number.class);
        return nights == null ? 0 : nights.intValue();
    }

    public int createRoom(int branchId, String roomNo, String roomType, int capacity,
                          BigDecimal nightlyRate, String status) {
        Integer id = jdbc.queryForObject("""
            INSERT INTO ROOM_CAGE (branch_id, room_no, room_type, capacity, nightly_rate, status)
            VALUES (:branchId, :roomNo, :roomType, :capacity, :nightlyRate, :status)
            RETURNING room_id
            """, new MapSqlParameterSource()
                .addValue("branchId", branchId)
                .addValue("roomNo", roomNo)
                .addValue("roomType", roomType)
                .addValue("capacity", capacity)
                .addValue("nightlyRate", nightlyRate)
                .addValue("status", status), Integer.class);
        return id == null ? 0 : id;
    }

    public void updateRoom(int roomId, int branchId, String roomNo, String roomType,
                           int capacity, BigDecimal nightlyRate, String status) {
        jdbc.update("""
            UPDATE ROOM_CAGE
            SET branch_id = :branchId,
                room_no = :roomNo,
                room_type = :roomType,
                capacity = :capacity,
                nightly_rate = :nightlyRate,
                status = :status
            WHERE room_id = :roomId
            """, new MapSqlParameterSource()
                .addValue("roomId", roomId)
                .addValue("branchId", branchId)
                .addValue("roomNo", roomNo)
                .addValue("roomType", roomType)
                .addValue("capacity", capacity)
                .addValue("nightlyRate", nightlyRate)
                .addValue("status", status));
    }

    public void updateBranchNightlyRate(int branchId, BigDecimal nightlyRate) {
        jdbc.update("""
            UPDATE ROOM_CAGE
            SET nightly_rate = :nightlyRate
            WHERE branch_id = :branchId
            """, Map.of("branchId", branchId, "nightlyRate", nightlyRate));
    }

    public boolean petExists(int petId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM PET WHERE pet_id = :petId",
                Map.of("petId", petId),
                Integer.class);
        return count != null && count > 0;
    }

    public boolean petBelongsToOwner(int petId, int ownerId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM PET
            WHERE pet_id = :petId
              AND owner_id = :ownerId
            """, Map.of("petId", petId, "ownerId", ownerId), Integer.class);
        return count != null && count > 0;
    }

    public List<Map<String, Object>> findPetsByOwner(int ownerId) {
        return jdbc.queryForList("""
            SELECT pet_id, owner_id, name, species, breed, birth_date
            FROM PET
            WHERE owner_id = :ownerId
            ORDER BY name
            """, Map.of("ownerId", ownerId));
    }

    public boolean reservationExists(int reservationId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM BOARDING_RESERVATION WHERE reservation_id = :reservationId",
                Map.of("reservationId", reservationId),
                Integer.class);
        return count != null && count > 0;
    }

    public boolean reservationBelongsToOwner(int reservationId, int ownerId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM BOARDING_RESERVATION br
            JOIN PET p ON p.pet_id = br.pet_id
            WHERE br.reservation_id = :reservationId
              AND p.owner_id = :ownerId
            """, Map.of("reservationId", reservationId, "ownerId", ownerId), Integer.class);
        return count != null && count > 0;
    }

    public Integer findReservationBranchId(int reservationId) {
        return jdbc.queryForList("""
            SELECT rc.branch_id
            FROM BOARDING_RESERVATION br
            JOIN ROOM_CAGE rc ON rc.room_id = br.room_id
            WHERE br.reservation_id = :reservationId
            """, Map.of("reservationId", reservationId), Integer.class)
                .stream()
                .findFirst()
                .orElse(null);
    }

    public boolean canVetAccessReservation(int vetId, int reservationId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM BOARDING_RESERVATION br
            JOIN ROOM_CAGE rc ON rc.room_id = br.room_id
            JOIN VETERINARIAN v ON v.branch_id = rc.branch_id
            WHERE br.reservation_id = :reservationId
              AND v.vet_id = :vetId
            """, Map.of("vetId", vetId, "reservationId", reservationId), Integer.class);
        return count != null && count > 0;
    }

    public String findReservationStatus(int reservationId) {
        return jdbc.queryForObject(
                "SELECT status FROM BOARDING_RESERVATION WHERE reservation_id = :reservationId",
                Map.of("reservationId", reservationId),
                String.class);
    }

    public int countRoomOverlaps(int roomId, LocalDate startDate, LocalDate endDate) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM BOARDING_RESERVATION
            WHERE room_id = :roomId
              AND status = 'active'
              AND start_date < :endDate
              AND end_date > :startDate
            """, new MapSqlParameterSource()
                .addValue("roomId", roomId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate), Integer.class);
        return count == null ? 0 : count;
    }

    public int countPetOverlaps(int petId, LocalDate startDate, LocalDate endDate) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*)
            FROM BOARDING_RESERVATION
            WHERE pet_id = :petId
              AND status = 'active'
              AND start_date < :endDate
              AND end_date > :startDate
            """, new MapSqlParameterSource()
                .addValue("petId", petId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate), Integer.class);
        return count == null ? 0 : count;
    }

    public int createReservation(int petId, int roomId, LocalDate startDate,
                                 LocalDate endDate, String specialNotes) {
        Integer id = jdbc.queryForObject("""
            INSERT INTO BOARDING_RESERVATION
                (pet_id, room_id, start_date, end_date, status, special_notes)
            VALUES (:petId, :roomId, :startDate, :endDate, 'active', :specialNotes)
            RETURNING reservation_id
            """, new MapSqlParameterSource()
                .addValue("petId", petId)
                .addValue("roomId", roomId)
                .addValue("startDate", startDate)
                .addValue("endDate", endDate)
                .addValue("specialNotes", specialNotes), Integer.class);
        return id == null ? 0 : id;
    }

    public List<Map<String, Object>> findReservations(Integer branchId, Integer petId,
                                                      Integer ownerId, String status) {
        StringBuilder sql = new StringBuilder("""
            SELECT br.reservation_id,
                   br.pet_id,
                   p.name AS pet_name,
                   o.owner_id,
                   o.full_name AS owner_name,
                   br.room_id,
                   rc.room_no,
                   rc.room_type,
                   rc.nightly_rate,
                   rc.branch_id,
                   b.name AS branch_name,
                   br.start_date,
                   br.end_date,
                   br.status,
                   br.special_notes,
                   br.created_at
            FROM BOARDING_RESERVATION br
            JOIN PET p ON p.pet_id = br.pet_id
            JOIN OWNER o ON o.owner_id = p.owner_id
            JOIN ROOM_CAGE rc ON rc.room_id = br.room_id
            JOIN BRANCH b ON b.branch_id = rc.branch_id
            WHERE 1 = 1
            """);
        Map<String, Object> params = new HashMap<>();

        if (branchId != null) {
            sql.append(" AND rc.branch_id = :branchId");
            params.put("branchId", branchId);
        }
        if (petId != null) {
            sql.append(" AND br.pet_id = :petId");
            params.put("petId", petId);
        }
        if (ownerId != null) {
            sql.append(" AND o.owner_id = :ownerId");
            params.put("ownerId", ownerId);
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND br.status = :status");
            params.put("status", status);
        }

        sql.append(" ORDER BY br.start_date DESC, br.created_at DESC");
        return jdbc.queryForList(sql.toString(), params);
    }

    public List<Map<String, Object>> findActiveStaysForVet(int vetId) {
        return jdbc.queryForList("""
            SELECT br.reservation_id,
                   br.pet_id,
                   p.name AS pet_name,
                   p.species,
                   p.breed,
                   o.owner_id,
                   o.full_name AS owner_name,
                   rc.room_id,
                   rc.room_no,
                   rc.room_type,
                   b.branch_id,
                   b.name AS branch_name,
                   br.start_date,
                   br.end_date,
                   br.status,
                   br.special_notes
            FROM BOARDING_RESERVATION br
            JOIN PET p ON p.pet_id = br.pet_id
            JOIN OWNER o ON o.owner_id = p.owner_id
            JOIN ROOM_CAGE rc ON rc.room_id = br.room_id
            JOIN BRANCH b ON b.branch_id = rc.branch_id
            JOIN VETERINARIAN v ON v.branch_id = b.branch_id
            WHERE v.vet_id = :vetId
              AND br.status = 'active'
            ORDER BY br.start_date ASC
            """, Map.of("vetId", vetId));
    }

    public void updateReservationStatus(int reservationId, String status) {
        jdbc.update("""
            UPDATE BOARDING_RESERVATION
            SET status = :status
            WHERE reservation_id = :reservationId
            """, Map.of("reservationId", reservationId, "status", status));
    }

    public int createFeedingLog(int reservationId, LocalDateTime feedTime, String food,
                                String amount, String medicationNote, String notes) {
        Integer id = jdbc.queryForObject("""
            INSERT INTO FEEDING_LOG
                (reservation_id, feed_time, food, amount, medication_note, notes)
            VALUES (:reservationId, :feedTime, :food, :amount, :medicationNote, :notes)
            RETURNING feed_id
            """, new MapSqlParameterSource()
                .addValue("reservationId", reservationId)
                .addValue("feedTime", feedTime)
                .addValue("food", food)
                .addValue("amount", amount)
                .addValue("medicationNote", medicationNote)
                .addValue("notes", notes), Integer.class);
        return id == null ? 0 : id;
    }

    public List<Map<String, Object>> findFeedingLogs(int reservationId) {
        return jdbc.queryForList("""
            SELECT feed_id, reservation_id, feed_time, food, amount, medication_note, notes
            FROM FEEDING_LOG
            WHERE reservation_id = :reservationId
            ORDER BY feed_time DESC
            """, Map.of("reservationId", reservationId));
    }
}
