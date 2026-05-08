package com.group20.vetclinic.controller;

import com.group20.vetclinic.service.ReminderScheduler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
@Profile("!prod")
public class ReminderTestController {

    private final ReminderScheduler reminderScheduler;

    @PostMapping("/trigger-reminders")
    public ResponseEntity<String> triggerReminders() {
        reminderScheduler.sendDailyReminders();
        return ResponseEntity.ok("Reminder job triggered");
    }
}
