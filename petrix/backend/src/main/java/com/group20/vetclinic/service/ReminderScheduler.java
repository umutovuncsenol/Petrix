package com.group20.vetclinic.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReminderScheduler {

    private final JdbcTemplate jdbc;
    private final EmailService emailService;

    /**
     * Her gün 08:00'de çalışır.
     * Yarın randevusu olan Silver (veya Gold) üyelerin henüz gönderilmemiş
     * hatırlatmalarını bulur ve mail atar.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void sendDailyReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("Running appointment reminder job for {}", tomorrow);

        List<Map<String, Object>> rows = findPendingReminders(tomorrow);
        log.info("Found {} reminder(s) to send", rows.size());

        for (Map<String, Object> row : rows) {
            int apptId = (int) row.get("appt_id");
            try {
                emailService.sendAppointmentReminder(
                    (String) row.get("email"),
                    (String) row.get("owner_name"),
                    (String) row.get("pet_name"),
                    (String) row.get("vet_name"),
                    (String) row.get("branch_name"),
                    ((java.sql.Timestamp) row.get("start_time")).toLocalDateTime()
                );
                markReminderSent(apptId);
            } catch (Exception e) {
                log.error("Error processing reminder for appt_id={}: {}", apptId, e.getMessage());
            }
        }
    }

    private List<Map<String, Object>> findPendingReminders(LocalDate date) {
        String sql = """
            SELECT
                a.appt_id,
                a.start_time,
                o.email,
                o.full_name  AS owner_name,
                p.name       AS pet_name,
                v.full_name  AS vet_name,
                b.name       AS branch_name
            FROM APPOINTMENT a
            JOIN OWNER       o  ON a.owner_id  = o.owner_id
            JOIN PET         p  ON a.pet_id    = p.pet_id
            JOIN VETERINARIAN v ON a.vet_id    = v.vet_id
            JOIN BRANCH      b  ON a.branch_id = b.branch_id
            JOIN ENROLLS     e  ON e.owner_id  = o.owner_id AND e.status = 'active'
            JOIN MEMBERSHIP_PLAN mp ON mp.plan_id = e.plan_id
                AND mp.name IN ('Silver', 'Gold')
            WHERE a.status        = 'scheduled'
              AND a.reminder_sent = FALSE
              AND DATE(a.start_time) = ?
            """;
        return jdbc.queryForList(sql, date);
    }

    private void markReminderSent(int apptId) {
        jdbc.update("UPDATE APPOINTMENT SET reminder_sent = TRUE WHERE appt_id = ?", apptId);
    }
}
