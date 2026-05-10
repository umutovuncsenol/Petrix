package com.group20.vetclinic.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Creates the low-stock trigger after Spring Boot has finished applying schema.sql.
 *
 * Spring Boot's SQL script initializer splits statements on every ';', which
 * breaks PL/pgSQL dollar-quoted function bodies (the body itself contains
 * semicolons). We therefore execute the CREATE FUNCTION / CREATE TRIGGER DDL
 * directly via JdbcTemplate, which hands the full string to the JDBC driver in
 * one shot — no splitting, no truncation.
 */
@Component
public class TriggerInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TriggerInitializer.class);
    private final JdbcTemplate jdbc;

    public TriggerInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Applying trg_low_stock_check trigger...");

        jdbc.execute(
            "CREATE OR REPLACE FUNCTION flag_low_stock() " +
            "RETURNS TRIGGER AS $$ " +
            "BEGIN " +
            "    IF NEW.quantity <= NEW.reorder_level THEN " +
            "        NEW.low_stock_flagged := TRUE; " +
            "    ELSE " +
            "        NEW.low_stock_flagged := FALSE; " +
            "    END IF; " +
            "    RETURN NEW; " +
            "END; " +
            "$$ LANGUAGE plpgsql"
        );

        jdbc.execute(
            "DROP TRIGGER IF EXISTS trg_low_stock_check ON STOCKED_AS"
        );

        jdbc.execute(
            "CREATE TRIGGER trg_low_stock_check " +
            "BEFORE UPDATE OF quantity ON STOCKED_AS " +
            "FOR EACH ROW " +
            "EXECUTE FUNCTION flag_low_stock()"
        );

        log.info("trg_low_stock_check trigger applied successfully.");

        // ── Boarding reservation → room status trigger ──────────────────────
        log.info("Applying trg_boarding_room_status trigger...");

        jdbc.execute(
            "CREATE OR REPLACE FUNCTION release_room_on_reservation_end() " +
            "RETURNS TRIGGER AS $$ " +
            "BEGIN " +
            "    IF NEW.status IN ('completed', 'cancelled') " +
            "       AND OLD.status = 'active' THEN " +
            "        UPDATE ROOM_CAGE " +
            "        SET status = 'available' " +
            "        WHERE room_id = NEW.room_id; " +
            "    END IF; " +
            "    RETURN NEW; " +
            "END; " +
            "$$ LANGUAGE plpgsql"
        );

        jdbc.execute(
            "DROP TRIGGER IF EXISTS trg_boarding_room_status ON BOARDING_RESERVATION"
        );

        jdbc.execute(
            "CREATE TRIGGER trg_boarding_room_status " +
            "AFTER UPDATE OF status ON BOARDING_RESERVATION " +
            "FOR EACH ROW " +
            "EXECUTE FUNCTION release_room_on_reservation_end()"
        );

        log.info("trg_boarding_room_status trigger applied successfully.");
    }
}
