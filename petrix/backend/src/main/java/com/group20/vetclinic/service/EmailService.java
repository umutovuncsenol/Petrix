package com.group20.vetclinic.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    private static final DateTimeFormatter FORMATTER =
        DateTimeFormatter.ofPattern("dd MMMM yyyy, HH:mm");

    public void sendAppointmentReminder(
            String toEmail,
            String ownerName,
            String petName,
            String vetName,
            String branchName,
            LocalDateTime appointmentTime) {

        if (!enabled) {
            log.info("Mail disabled — skipping reminder for {} ({})", ownerName, toEmail);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject("Petrix — Yarınki Randevunuzu Hatırlatıyoruz 🐾");
            helper.setText(buildHtml(ownerName, petName, vetName, branchName, appointmentTime), true);

            mailSender.send(message);
            log.info("Reminder sent to {} for appointment at {}", toEmail, appointmentTime);
        } catch (Exception e) {
            log.error("Failed to send reminder to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildHtml(String ownerName, String petName, String vetName,
                              String branchName, LocalDateTime time) {
        return """
            <html>
            <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:auto">
              <div style="background:#4f7942;padding:20px;border-radius:8px 8px 0 0">
                <h1 style="color:#fff;margin:0">Petrix Veteriner Kliniği</h1>
              </div>
              <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
                <p>Merhaba <strong>%s</strong>,</p>
                <p><strong>%s</strong> adlı dostunuzun yarın bir randevusu bulunmaktadır.</p>
                <table style="width:100%%;border-collapse:collapse;margin:16px 0">
                  <tr style="background:#f5f5f5">
                    <td style="padding:10px;border:1px solid #ddd"><strong>Tarih &amp; Saat</strong></td>
                    <td style="padding:10px;border:1px solid #ddd">%s</td>
                  </tr>
                  <tr>
                    <td style="padding:10px;border:1px solid #ddd"><strong>Veteriner</strong></td>
                    <td style="padding:10px;border:1px solid #ddd">%s</td>
                  </tr>
                  <tr style="background:#f5f5f5">
                    <td style="padding:10px;border:1px solid #ddd"><strong>Şube</strong></td>
                    <td style="padding:10px;border:1px solid #ddd">%s</td>
                  </tr>
                </table>
                <p style="color:#666;font-size:13px">
                  Bu hatırlatma, Silver üyelik planınızın bir avantajıdır.<br>
                  Randevunuzu iptal etmek için lütfen kliniğimizi arayın.
                </p>
              </div>
            </body>
            </html>
            """.formatted(
                ownerName, petName,
                time.format(FORMATTER),
                vetName, branchName);
    }
}
