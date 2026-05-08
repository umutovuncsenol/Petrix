package com.group20.vetclinic.service;

import com.group20.vetclinic.repository.BoardingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BoardingService {

    private static final Set<String> ROOM_STATUSES = Set.of("available", "occupied", "maintenance");

    private final BoardingRepository boardingRepo;

    public List<Map<String, Object>> findRooms(Integer branchId, String roomType, String status) {
        return boardingRepo.findRooms(branchId, roomType, status);
    }

    public List<Map<String, Object>> findAvailableRooms(int branchId, LocalDate startDate,
                                                        LocalDate endDate, String roomType) {
        validateDateRange(startDate, endDate);
        return boardingRepo.findAvailableRooms(branchId, startDate, endDate, roomType);
    }

    public List<Map<String, Object>> findOwnerPets(int ownerId) {
        return boardingRepo.findPetsByOwner(ownerId);
    }

    public int createRoom(Map<String, Object> body) {
        int branchId = intValue(body.get("branchId"), "branchId is required.");
        String roomNo = stringValue(body.get("roomNo"), "roomNo is required.");
        String roomType = "standard room";
        int capacity = intValue(body.get("capacity"), "capacity is required.");
        BigDecimal nightlyRate = decimalValue(body.get("nightlyRate"), "nightlyRate is required.");
        String status = (String) body.getOrDefault("status", "available");

        validateRoom(branchId, roomNo, capacity, nightlyRate, status, null);
        BigDecimal branchRate = boardingRepo.findBranchNightlyRate(branchId);
        return boardingRepo.createRoom(
                branchId,
                roomNo,
                roomType,
                capacity,
                branchRate == null ? nightlyRate : branchRate,
                status
        );
    }

    public void updateRoom(int roomId, Map<String, Object> body) {
        if (!boardingRepo.roomExists(roomId)) {
            throw new IllegalArgumentException("Room/cage unit not found.");
        }

        int branchId = intValue(body.get("branchId"), "branchId is required.");
        String roomNo = stringValue(body.get("roomNo"), "roomNo is required.");
        String roomType = "standard room";
        int capacity = intValue(body.get("capacity"), "capacity is required.");
        BigDecimal nightlyRate = decimalValue(body.get("nightlyRate"), "nightlyRate is required.");
        String status = (String) body.getOrDefault("status", "available");

        validateRoom(branchId, roomNo, capacity, nightlyRate, status, roomId);
        boardingRepo.updateRoom(roomId, branchId, roomNo, roomType, capacity, nightlyRate, status);
        boardingRepo.updateBranchNightlyRate(branchId, nightlyRate);
    }

    public int createReservation(Map<String, Object> body) {
        int petId = intValue(body.get("petId"), "petId is required.");
        int roomId = intValue(body.get("roomId"), "roomId is required.");
        LocalDate startDate = LocalDate.parse((String) body.get("startDate"));
        LocalDate endDate = LocalDate.parse((String) body.get("endDate"));
        String specialNotes = (String) body.getOrDefault("specialNotes", "");

        validateDateRange(startDate, endDate);

        if (!boardingRepo.roomExists(roomId)) {
            throw new IllegalArgumentException("Selected room does not exist.");
        }
        if (!boardingRepo.petExists(petId)) {
            throw new IllegalArgumentException("Selected pet does not exist.");
        }
        if (boardingRepo.countRoomOverlaps(roomId, startDate, endDate) > 0) {
            throw new IllegalArgumentException("This room is already reserved for the selected date range.");
        }
        if (boardingRepo.countPetOverlaps(petId, startDate, endDate) > 0) {
            throw new IllegalArgumentException("This pet already has an active boarding reservation in the selected date range.");
        }

        return boardingRepo.createReservation(petId, roomId, startDate, endDate, specialNotes);
    }

    public int createOwnerReservation(int ownerId, Map<String, Object> body) {
        int petId = intValue(body.get("petId"), "petId is required.");
        if (!boardingRepo.petBelongsToOwner(petId, ownerId)) {
            throw new SecurityException("You can only create boarding reservations for your own pets.");
        }
        return createReservation(body);
    }

    public List<Map<String, Object>> findReservations(Integer branchId, Integer petId,
                                                      Integer ownerId, String status) {
        return boardingRepo.findReservations(branchId, petId, ownerId, status);
    }

    public List<Map<String, Object>> findOwnerReservations(int ownerId) {
        return boardingRepo.findReservations(null, null, ownerId, null);
    }

    public void cancelReservation(int reservationId) {
        requireReservation(reservationId);
        boardingRepo.updateReservationStatus(reservationId, "cancelled");
    }

    public void cancelOwnerReservation(int ownerId, int reservationId) {
        requireOwnerReservation(ownerId, reservationId);
        String status = boardingRepo.findReservationStatus(reservationId);
        if (!"active".equals(status)) {
            throw new IllegalArgumentException("Only active boarding reservations can be cancelled.");
        }
        boardingRepo.updateReservationStatus(reservationId, "cancelled");
    }

    public void completeReservation(int reservationId) {
        requireReservation(reservationId);
        boardingRepo.updateReservationStatus(reservationId, "completed");
    }

    public int addFeedingLog(int reservationId, Map<String, Object> body) {
        requireReservation(reservationId);
        String status = boardingRepo.findReservationStatus(reservationId);
        if ("cancelled".equals(status)) {
            throw new IllegalArgumentException("Cannot add feeding logs to a cancelled reservation.");
        }

        LocalDateTime feedTime = LocalDateTime.parse((String) body.get("feedTime"));
        String food = (String) body.getOrDefault("food", "");
        String amount = (String) body.getOrDefault("amount", "");
        String medicationNote = (String) body.getOrDefault("medicationNote", "");
        String notes = (String) body.getOrDefault("notes", "");
        return boardingRepo.createFeedingLog(reservationId, feedTime, food, amount, medicationNote, notes);
    }

    public List<Map<String, Object>> findFeedingLogs(int reservationId) {
        requireReservation(reservationId);
        return boardingRepo.findFeedingLogs(reservationId);
    }

    public List<Map<String, Object>> findOwnerFeedingLogs(int ownerId, int reservationId) {
        requireOwnerReservation(ownerId, reservationId);
        return boardingRepo.findFeedingLogs(reservationId);
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || !endDate.isAfter(startDate)) {
            throw new IllegalArgumentException("End date must be after start date.");
        }
    }

    private void requireReservation(int reservationId) {
        if (!boardingRepo.reservationExists(reservationId)) {
            throw new IllegalArgumentException("Boarding reservation not found.");
        }
    }

    private void requireOwnerReservation(int ownerId, int reservationId) {
        if (!boardingRepo.reservationBelongsToOwner(reservationId, ownerId)) {
            throw new SecurityException("You are not allowed to access this boarding reservation.");
        }
    }

    private void validateRoom(int branchId, String roomNo, int capacity, BigDecimal nightlyRate,
                              String status, Integer excludingRoomId) {
        if (!boardingRepo.branchExists(branchId)) {
            throw new IllegalArgumentException("Selected branch does not exist.");
        }
        if (capacity <= 0) {
            throw new IllegalArgumentException("Room capacity must be greater than zero.");
        }
        if (nightlyRate.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Nightly rate cannot be negative.");
        }
        if (!ROOM_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Invalid room status.");
        }
        if (boardingRepo.roomNumberExistsInBranch(branchId, roomNo, excludingRoomId)) {
            throw new IllegalArgumentException("This branch already has a room/cage with the same room number.");
        }
    }

    private int intValue(Object value, String message) {
        if (value == null) {
            throw new IllegalArgumentException(message);
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private BigDecimal decimalValue(Object value, String message) {
        if (value == null) {
            throw new IllegalArgumentException(message);
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }

    private String stringValue(Object value, String message) {
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.toString().trim();
    }
}
