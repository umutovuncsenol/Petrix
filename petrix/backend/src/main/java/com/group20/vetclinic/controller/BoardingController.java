package com.group20.vetclinic.controller;

import com.group20.vetclinic.service.BoardingService;
import com.group20.vetclinic.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/boarding")
@RequiredArgsConstructor
public class BoardingController {

    private final BoardingService boardingService;
    private final JwtUtil jwtUtil;

    @GetMapping("/rooms")
    public ResponseEntity<?> getRooms(@RequestParam(required = false) Integer branchId,
                                      @RequestParam(required = false) String roomType,
                                      @RequestParam(required = false) String status) {
        return ResponseEntity.ok(boardingService.findRooms(branchId, roomType, status));
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, Object> body) {
        try {
            int roomId = boardingService.createRoom(body);
            return ResponseEntity.ok(Map.of("roomId", roomId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/rooms/{roomId}")
    public ResponseEntity<?> updateRoom(@PathVariable int roomId,
                                        @RequestBody Map<String, Object> body) {
        try {
            boardingService.updateRoom(roomId, body);
            return ResponseEntity.ok(Map.of("status", "updated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/rooms/available")
    public ResponseEntity<?> getAvailableRooms(
            @RequestParam int branchId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String roomType) {
        try {
            return ResponseEntity.ok(boardingService.findAvailableRooms(branchId, startDate, endDate, roomType));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reservations")
    public ResponseEntity<?> createReservation(@RequestBody Map<String, Object> body) {
        try {
            int reservationId = boardingService.createReservation(body);
            return ResponseEntity.ok(Map.of("reservationId", reservationId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/reservations")
    public ResponseEntity<?> getReservations(@RequestParam(required = false) Integer branchId,
                                             @RequestParam(required = false) Integer petId,
                                             @RequestParam(required = false) Integer ownerId,
                                             @RequestParam(required = false) String status) {
        return ResponseEntity.ok(boardingService.findReservations(branchId, petId, ownerId, status));
    }

    @GetMapping("/owner/{ownerId}/pets")
    public ResponseEntity<?> getOwnerPets(@PathVariable int ownerId,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthorizedOwner(authHeader, ownerId)) {
            return forbidden("You are not allowed to view pets for this owner.");
        }
        return ResponseEntity.ok(boardingService.findOwnerPets(ownerId));
    }

    @GetMapping("/owner/{ownerId}/reservations")
    public ResponseEntity<?> getOwnerReservations(@PathVariable int ownerId,
                                                  @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthorizedOwner(authHeader, ownerId)) {
            return forbidden("You are not allowed to view boarding reservations for this owner.");
        }
        return ResponseEntity.ok(boardingService.findOwnerReservations(ownerId));
    }

    @PostMapping("/owner/{ownerId}/reservations")
    public ResponseEntity<?> createOwnerReservation(@PathVariable int ownerId,
                                                   @RequestBody Map<String, Object> body,
                                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthorizedOwner(authHeader, ownerId)) {
            return forbidden("You are not allowed to create boarding reservations for this owner.");
        }
        try {
            int reservationId = boardingService.createOwnerReservation(ownerId, body);
            return ResponseEntity.ok(Map.of("reservationId", reservationId));
        } catch (SecurityException e) {
            return forbidden(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/owner/{ownerId}/reservations/{reservationId}/cancel")
    public ResponseEntity<?> cancelOwnerReservation(@PathVariable int ownerId,
                                                   @PathVariable int reservationId,
                                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthorizedOwner(authHeader, ownerId)) {
            return forbidden("You are not allowed to cancel boarding reservations for this owner.");
        }
        try {
            boardingService.cancelOwnerReservation(ownerId, reservationId);
            return ResponseEntity.ok(Map.of("status", "cancelled"));
        } catch (SecurityException e) {
            return forbidden(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/reservations/{reservationId}/cancel")
    public ResponseEntity<?> cancelReservation(@PathVariable int reservationId) {
        try {
            boardingService.cancelReservation(reservationId);
            return ResponseEntity.ok(Map.of("status", "cancelled"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/reservations/{reservationId}/complete")
    public ResponseEntity<?> completeReservation(@PathVariable int reservationId) {
        try {
            boardingService.completeReservation(reservationId);
            return ResponseEntity.ok(Map.of("status", "completed"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reservations/{reservationId}/feeding-logs")
    public ResponseEntity<?> addFeedingLog(@PathVariable int reservationId,
                                           @RequestBody Map<String, Object> body) {
        try {
            int feedId = boardingService.addFeedingLog(reservationId, body);
            return ResponseEntity.ok(Map.of("feedId", feedId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/reservations/{reservationId}/feeding-logs")
    public ResponseEntity<?> getFeedingLogs(@PathVariable int reservationId) {
        try {
            return ResponseEntity.ok(boardingService.findFeedingLogs(reservationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/owner/{ownerId}/reservations/{reservationId}/feeding-logs")
    public ResponseEntity<?> getOwnerFeedingLogs(@PathVariable int ownerId,
                                                 @PathVariable int reservationId,
                                                 @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!isAuthorizedOwner(authHeader, ownerId)) {
            return forbidden("You are not allowed to view feeding logs for this owner.");
        }
        try {
            return ResponseEntity.ok(boardingService.findOwnerFeedingLogs(ownerId, reservationId));
        } catch (SecurityException e) {
            return forbidden(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private boolean isAuthorizedOwner(String authHeader, int ownerId) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return false;
        }

        try {
            String token = authHeader.substring(7);
            Integer tokenUserId = jwtUtil.extractUserId(token);
            List<String> roles = jwtUtil.extractRoles(token);
            return tokenUserId != null && tokenUserId == ownerId && roles.contains("OWNER");
        } catch (Exception e) {
            return false;
        }
    }

    private ResponseEntity<?> forbidden(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", message));
    }
}
