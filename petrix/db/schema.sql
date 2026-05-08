CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 0. ROLES
CREATE TABLE IF NOT EXISTS ROLES (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 0.1 USERS
CREATE TABLE IF NOT EXISTS USERS (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(20)
);

-- 0.2 USER_ROLE (USERS × ROLES)
CREATE TABLE IF NOT EXISTS USER_ROLE (
    user_id INTEGER NOT NULL REFERENCES USERS(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES ROLES(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 1. BRANCH
CREATE TABLE IF NOT EXISTS BRANCH (
    branch_id    SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL UNIQUE,
    address      VARCHAR(255) NOT NULL,
    phone        VARCHAR(20),
    email        VARCHAR(150),
    working_hours VARCHAR(100)
);

-- 2. OWNER
CREATE TABLE IF NOT EXISTS OWNER (
    owner_id      SERIAL PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(20)
);

-- 3. VETERINARIAN
CREATE TABLE IF NOT EXISTS VETERINARIAN (
    vet_id           SERIAL PRIMARY KEY,
    branch_id        INTEGER NOT NULL REFERENCES BRANCH(branch_id) ON DELETE RESTRICT,
    full_name        VARCHAR(100) NOT NULL,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    specialization   VARCHAR(100),
    species_expertise VARCHAR(200)
);

-- 4. PET
CREATE TABLE IF NOT EXISTS PET (
    pet_id     SERIAL PRIMARY KEY,
    owner_id   INTEGER NOT NULL REFERENCES OWNER(owner_id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    species    VARCHAR(50)  NOT NULL,
    breed      VARCHAR(100),
    birth_date DATE
);

-- 5. ALLERGY
CREATE TABLE IF NOT EXISTS ALLERGY (
    allergy_id SERIAL PRIMARY KEY,
    pet_id     INTEGER NOT NULL REFERENCES PET(pet_id) ON DELETE CASCADE,
    allergen   VARCHAR(100) NOT NULL,
    reaction   VARCHAR(255),
    severity   VARCHAR(20)  NOT NULL CHECK (severity IN ('mild','moderate','severe'))
);

-- 6. MEDICATION (parent of VACCINATION via ISA)
CREATE TABLE IF NOT EXISTS MEDICATION (
    med_id      SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    form        VARCHAR(50),
    unit        VARCHAR(20),
    description TEXT,
    is_vaccine  BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7. VACCINATION (ISA → MEDICATION)
CREATE TABLE IF NOT EXISTS VACCINATION (
    med_id           INTEGER PRIMARY KEY REFERENCES MEDICATION(med_id) ON DELETE CASCADE,
    target_species   VARCHAR(200),
    frequency_months INTEGER CHECK (frequency_months > 0)
);

-- 8. STOCKED_AS (BRANCH × MEDICATION inventory)
CREATE TABLE IF NOT EXISTS STOCKED_AS (
    branch_id               INTEGER NOT NULL REFERENCES BRANCH(branch_id) ON DELETE CASCADE,
    med_id                  INTEGER NOT NULL REFERENCES MEDICATION(med_id) ON DELETE CASCADE,
    quantity                INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    expiry_date             DATE,
    reorder_level           INTEGER,
    minimum_stock_threshold INTEGER,
    low_stock_flagged       BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (branch_id, med_id)
);

CREATE TABLE IF NOT EXISTS STOCK_BATCH (
    batch_id     SERIAL PRIMARY KEY,
    branch_id    INTEGER NOT NULL REFERENCES BRANCH(branch_id) ON DELETE CASCADE,
    med_id       INTEGER NOT NULL REFERENCES MEDICATION(med_id) ON DELETE CASCADE,
    batch_number VARCHAR(50) NOT NULL,
    quantity     INTEGER NOT NULL CHECK (quantity >= 0),
    expiry_date  DATE,
    received_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (branch_id, med_id, batch_number)
);

-- 9. APPOINTMENT
CREATE TABLE IF NOT EXISTS APPOINTMENT (
    appt_id    SERIAL PRIMARY KEY,
    owner_id   INTEGER NOT NULL REFERENCES OWNER(owner_id),
    pet_id     INTEGER NOT NULL REFERENCES PET(pet_id),
    vet_id     INTEGER NOT NULL REFERENCES VETERINARIAN(vet_id),
    branch_id  INTEGER NOT NULL REFERENCES BRANCH(branch_id),
    start_time TIMESTAMP NOT NULL,
    duration   INTEGER NOT NULL DEFAULT 30 CHECK (duration > 0),
    status     VARCHAR(20) NOT NULL DEFAULT 'scheduled'
               CHECK (status IN ('scheduled','completed','cancelled')),
    reason     VARCHAR(255),
    EXCLUDE USING GIST (
        vet_id WITH =,
        tsrange(start_time, start_time + duration * INTERVAL '1 minute', '[)') WITH &&
    ) WHERE (status = 'scheduled')
);

-- 10. VISIT
CREATE TABLE IF NOT EXISTS VISIT (
    visit_id   SERIAL PRIMARY KEY,
    appt_id    INTEGER NOT NULL UNIQUE REFERENCES APPOINTMENT(appt_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notes      TEXT
);

-- 11. DIAGNOSIS
CREATE TABLE IF NOT EXISTS DIAGNOSIS (
    diagnosis_id       SERIAL PRIMARY KEY,
    visit_id           INTEGER NOT NULL REFERENCES VISIT(visit_id) ON DELETE CASCADE,
    description        TEXT NOT NULL,
    icd_code           VARCHAR(20),
    severity           VARCHAR(50),
    treatment_notes    TEXT,
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE
);

-- 12. PRESCRIPTION
CREATE TABLE IF NOT EXISTS PRESCRIPTION (
    rx_id      SERIAL PRIMARY KEY,
    visit_id   INTEGER NOT NULL REFERENCES VISIT(visit_id) ON DELETE CASCADE,
    vet_id     INTEGER NOT NULL REFERENCES VETERINARIAN(vet_id),
    issued_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 13. CONTAINS (PRESCRIPTION × MEDICATION line items)
CREATE TABLE IF NOT EXISTS CONTAINS (
    rx_id         INTEGER NOT NULL REFERENCES PRESCRIPTION(rx_id) ON DELETE CASCADE,
    med_id        INTEGER NOT NULL REFERENCES MEDICATION(med_id),
    dosage        VARCHAR(100),
    duration_days INTEGER CHECK (duration_days > 0),
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (rx_id, med_id)
);

-- 14. INVOICE
CREATE TABLE IF NOT EXISTS INVOICE (
    invoice_id        SERIAL PRIMARY KEY,
    visit_id          INTEGER NOT NULL UNIQUE REFERENCES VISIT(visit_id) ON DELETE CASCADE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    consultation_fee  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
    treatment_costs   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (treatment_costs >= 0),
    medication_costs  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (medication_costs >= 0),
    status            VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                      CHECK (status IN ('unpaid','paid','cancelled')),
    payment_method    VARCHAR(50)
);

-- 15. REFERRAL
CREATE TABLE IF NOT EXISTS REFERRAL (
    referral_id      SERIAL PRIMARY KEY,
    visit_id         INTEGER NOT NULL REFERENCES VISIT(visit_id) ON DELETE CASCADE,
    target_vet_id    INTEGER NOT NULL REFERENCES VETERINARIAN(vet_id),
    target_branch_id INTEGER NOT NULL REFERENCES BRANCH(branch_id),
    reason           TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','completed'))
);

-- 16. VACCINATION_PLAN
CREATE TABLE IF NOT EXISTS VACCINATION_PLAN (
    plan_id    SERIAL PRIMARY KEY,
    pet_id     INTEGER NOT NULL REFERENCES PET(pet_id) ON DELETE CASCADE,
    vet_id     INTEGER NOT NULL REFERENCES VETERINARIAN(vet_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 17. VACCINATION_RECORD
CREATE TABLE IF NOT EXISTS VACCINATION_RECORD (
    vacc_id          SERIAL PRIMARY KEY,
    plan_id          INTEGER NOT NULL REFERENCES VACCINATION_PLAN(plan_id) ON DELETE CASCADE,
    med_id           INTEGER NOT NULL REFERENCES VACCINATION(med_id),
    vet_id           INTEGER NOT NULL REFERENCES VETERINARIAN(vet_id),
    visit_id         INTEGER REFERENCES VISIT(visit_id),
    batch_number     VARCHAR(50),
    administered_date DATE NOT NULL,
    next_due_date    DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'done'
                     CHECK (status IN ('done','upcoming','overdue')),
    notes            TEXT,
    CHECK (next_due_date IS NULL OR next_due_date > administered_date)
);

-- 18. ROOM_CAGE
CREATE TABLE IF NOT EXISTS ROOM_CAGE (
    room_id   SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES BRANCH(branch_id) ON DELETE CASCADE,
    room_no   VARCHAR(20) NOT NULL,
    room_type VARCHAR(50),
    capacity  INTEGER CHECK (capacity > 0),
    status    VARCHAR(20) NOT NULL DEFAULT 'available'
              CHECK (status IN ('available','occupied','maintenance')),
    UNIQUE (branch_id, room_no)
);

-- 19. BOARDING_RESERVATION
CREATE TABLE IF NOT EXISTS BOARDING_RESERVATION (
    reservation_id SERIAL PRIMARY KEY,
    pet_id         INTEGER NOT NULL REFERENCES PET(pet_id),
    room_id        INTEGER NOT NULL REFERENCES ROOM_CAGE(room_id),
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','completed','cancelled')),
    special_notes  TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (end_date > start_date)
);

-- 20. FEEDING_LOG
CREATE TABLE IF NOT EXISTS FEEDING_LOG (
    feed_id         SERIAL PRIMARY KEY,
    reservation_id  INTEGER NOT NULL REFERENCES BOARDING_RESERVATION(reservation_id) ON DELETE CASCADE,
    feed_time       TIMESTAMP NOT NULL,
    food            VARCHAR(100),
    amount          VARCHAR(50),
    medication_note TEXT,
    notes           TEXT
);

-- 21. MEMBERSHIP_PLAN
CREATE TABLE IF NOT EXISTS MEMBERSHIP_PLAN (
    plan_id           SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL UNIQUE,
    monthly_fee       NUMERIC(10,2) NOT NULL CHECK (monthly_fee >= 0),
    perks_description TEXT
);

-- 22. ENROLLS (OWNER × MEMBERSHIP_PLAN)
CREATE TABLE IF NOT EXISTS ENROLLS (
    owner_id   INTEGER NOT NULL REFERENCES OWNER(owner_id) ON DELETE CASCADE,
    plan_id    INTEGER NOT NULL REFERENCES MEMBERSHIP_PLAN(plan_id),
    start_date DATE NOT NULL,
    end_date   DATE,
    status     VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','cancelled','expired')),
    PRIMARY KEY (owner_id, plan_id, start_date),
    CHECK (end_date IS NULL OR end_date > start_date)
);

-- 23. REPORT
CREATE TABLE IF NOT EXISTS REPORT (
    report_id         SERIAL PRIMARY KEY,
    branch_id         INTEGER NOT NULL REFERENCES BRANCH(branch_id),
    report_type       VARCHAR(50),
    stock_consumption TEXT,
    waste_statistics  TEXT,
    cost_breakdown    TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 24. WASTE_TRACKING
CREATE TABLE IF NOT EXISTS WASTE_TRACKING (
    waste_id        SERIAL PRIMARY KEY,
    branch_id       INTEGER NOT NULL REFERENCES BRANCH(branch_id),
    med_id          INTEGER NOT NULL REFERENCES MEDICATION(med_id),
    quantity_wasted INTEGER NOT NULL CHECK (quantity_wasted > 0),
    reason          VARCHAR(100),
    recorded_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 25. VET_RATING
CREATE TABLE IF NOT EXISTS VET_RATING (
    rating_id  SERIAL PRIMARY KEY,
    visit_id   INTEGER NOT NULL UNIQUE REFERENCES VISIT(visit_id),
    owner_id   INTEGER NOT NULL REFERENCES OWNER(owner_id),
    vet_id     INTEGER NOT NULL REFERENCES VETERINARIAN(vet_id),
    score      INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── VIEWS ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW PetMedicalTimeline AS
SELECT
    p.pet_id,
    p.name           AS pet_name,
    p.species,
    p.breed,
    o.owner_id,
    o.full_name      AS owner_name,
    a.appt_id,
    a.start_time,
    a.reason,
    v.visit_id,
    v.created_at     AS visit_date,
    v.notes          AS visit_notes,
    d.diagnosis_id,
    d.description    AS diagnosis,
    d.icd_code,
    d.severity,
    d.treatment_notes,
    d.follow_up_required,
    vet.full_name    AS veterinarian_name,
    vet.specialization,
    b.name           AS branch_name,
    i.invoice_id,
    i.consultation_fee,
    i.treatment_costs,
    i.medication_costs,
    i.status         AS payment_status
FROM PET p
JOIN OWNER o       ON p.owner_id   = o.owner_id
JOIN APPOINTMENT a ON a.owner_id   = o.owner_id AND a.pet_id = p.pet_id
JOIN VISIT v       ON v.appt_id    = a.appt_id
JOIN DIAGNOSIS d   ON d.visit_id   = v.visit_id
JOIN VETERINARIAN vet ON a.vet_id  = vet.vet_id
JOIN BRANCH b      ON a.branch_id  = b.branch_id
LEFT JOIN INVOICE i ON i.visit_id  = v.visit_id;

CREATE OR REPLACE VIEW OverdueVaccinations AS
SELECT
    p.pet_id,
    p.name               AS pet_name,
    p.species,
    p.breed,
    o.full_name          AS owner_name,
    o.email,
    vr.vacc_id,
    vr.batch_number,
    vr.administered_date,
    vr.next_due_date,
    CURRENT_DATE - vr.next_due_date AS days_overdue,
    vr.status,
    vet.full_name        AS administering_vet,
    b.name               AS branch_name,
    b.branch_id
FROM VACCINATION_RECORD vr
JOIN VACCINATION_PLAN vp ON vr.plan_id  = vp.plan_id
JOIN PET p               ON vp.pet_id   = p.pet_id
JOIN OWNER o             ON p.owner_id  = o.owner_id
JOIN VETERINARIAN vet    ON vr.vet_id   = vet.vet_id
JOIN BRANCH b            ON vet.branch_id = b.branch_id
WHERE vr.next_due_date < CURRENT_DATE
  AND vr.status != 'done';

-- NOTE: trg_low_stock_check trigger is created by TriggerInitializer.java
-- Spring Boot's SQL script runner splits on every ';', which breaks PL/pgSQL
-- dollar-quoted function bodies. The trigger is therefore applied programmatically.

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

INSERT INTO BRANCH (name, address, phone, email, working_hours)
SELECT v.name, v.address, v.phone, v.email, v.working_hours
FROM (VALUES
-- Adana (2)
('Adana - Cukurova',       'Toros Mah. Türkkuşu Cad. No:11, Çukurova/Adana',              '+90 322 888 0001', 'cukurova@petrix.com',       'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
('Adana - Seyhan',         'Reşatbey Mah. Atatürk Cad. No:25, Seyhan/Adana',              '+90 322 888 0002', 'seyhan@petrix.com',         'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
-- Ankara (6)
('Ankara - Bahcelievler',  'Bahçelievler Mah. 7. Cad. No:5, Çankaya/Ankara',              '+90 312 111 0001', 'bahcelievler@petrix.com',   'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Ankara - Cankaya',       'Kızılay Mah. Atatürk Bulvarı No:12, Çankaya/Ankara',          '+90 312 111 0002', 'cankaya@petrix.com',        'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Ankara - Eryaman',       'Eryaman 4. Etap Mah. Türkmenistan Cad. No:22, Etimesgut/Ankara', '+90 312 111 0003', 'eryaman@petrix.com',    'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Ankara - Etimesgut',     'Elvankent Mah. Mevlana Bulvarı No:33, Etimesgut/Ankara',      '+90 312 111 0004', 'etimesgut@petrix.com',      'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Ankara - Kecioren',      'Aktepe Mah. Cumhuriyet Cad. No:45, Keçiören/Ankara',          '+90 312 111 0005', 'kecioren@petrix.com',       'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Ankara - Yenimahalle',   'Demetevler Mah. İvedik Cad. No:78, Yenimahalle/Ankara',       '+90 312 111 0006', 'yenimahalle@petrix.com',    'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
-- Antalya (2)
('Antalya - Konyaalti',    'Uncalı Mah. Dumlupınar Bulvarı No:13, Konyaaltı/Antalya',     '+90 242 555 0001', 'konyaalti@petrix.com',      'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Antalya - Muratpasa',    'Meltem Mah. Atatürk Cad. No:46, Muratpaşa/Antalya',           '+90 242 555 0002', 'muratpasa@petrix.com',      'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
-- Bursa (2)
('Bursa - Nilufer',        'Beşevler Mah. Atatürk Cad. No:22, Nilüfer/Bursa',             '+90 224 444 0001', 'nilufer@petrix.com',        'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
('Bursa - Osmangazi',      'Heykel Mah. İnönü Cad. No:8, Osmangazi/Bursa',                '+90 224 444 0002', 'osmangazi@petrix.com',      'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
-- Denizli (2)
('Denizli - Merkezefendi', 'Sırakapılar Mah. Delikliçınar Mey. No:6, Merkezefendi/Denizli', '+90 258 200 0001', 'merkezefendi@petrix.com', 'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
('Denizli - Pamukkale',    'Kayıhan Mah. Atatürk Cad. No:41, Pamukkale/Denizli',          '+90 258 200 0002', 'pamukkale@petrix.com',      'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
-- Erzurum (2)
('Erzurum - Palandoken',   'Güzelyurt Mah. Havuzbaşı Cad. No:19, Palandöken/Erzurum',    '+90 442 100 0001', 'palandoken@petrix.com',     'Mon-Fri 08:00-19:00, Sat 09:00-16:00'),
('Erzurum - Yakutiye',     'Cumhuriyet Mah. Terminal Cad. No:33, Yakutiye/Erzurum',       '+90 442 100 0002', 'yakutiye@petrix.com',       'Mon-Fri 08:00-19:00, Sat 09:00-16:00'),
-- Eskisehir (2)
('Eskisehir - Odunpazari', 'Orta Mah. Sakarya Cad. No:3, Odunpazarı/Eskişehir',          '+90 222 666 0001', 'odunpazari@petrix.com',     'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
('Eskisehir - Tepebasi',   'Emek Mah. İnönü Cad. No:67, Tepebaşı/Eskişehir',             '+90 222 666 0002', 'tepebasi@petrix.com',       'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
-- Gaziantep (2)
('Gaziantep - Sahinbey',   'Gazimuhtarpaşa Mah. Suburcu Cad. No:52, Şahinbey/Gaziantep', '+90 342 300 0001', 'sahinbey@petrix.com',       'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
('Gaziantep - Sehitkamil', 'Bağlarbaşı Mah. Atatürk Bulvarı No:88, Şehitkamil/Gaziantep', '+90 342 300 0002', 'sehitkamil@petrix.com',   'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
-- Istanbul (10)
('Istanbul - Atasehir',    'Atatürk Mah. Ertuğrul Gazi Sok. No:14, Ataşehir/İstanbul',   '+90 216 222 0001', 'atasehir@petrix.com',       'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Bakirkoy',    'İstasyon Cad. No:31, Bakırköy/İstanbul',                      '+90 212 222 0002', 'bakirkoy@petrix.com',       'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Besiktas',    'Barbaros Bulvarı No:42, Beşiktaş/İstanbul',                   '+90 212 222 0003', 'besiktas@petrix.com',       'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Beylikduzu',  'Cumhuriyet Mah. E-5 Yanyol No:28, Beylikdüzü/İstanbul',      '+90 212 222 0004', 'beylikduzu@petrix.com',     'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Kadikoy',     'Moda Cad. No:18, Kadıköy/İstanbul',                           '+90 216 222 0005', 'kadikoy@petrix.com',        'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Maltepe',     'Bağlarbaşı Mah. Bağdat Cad. No:55, Maltepe/İstanbul',        '+90 216 222 0006', 'maltepe@petrix.com',        'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Pendik',      'Yenişehir Mah. Ankara Cad. No:77, Pendik/İstanbul',           '+90 216 222 0007', 'pendik@petrix.com',         'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Sariyer',     'Maslak Mah. Büyükdere Cad. No:63, Sarıyer/İstanbul',         '+90 212 222 0008', 'sariyer@petrix.com',        'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Sisli',       'Halaskargazi Cad. No:101, Şişli/İstanbul',                    '+90 212 222 0009', 'sisli@petrix.com',          'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
('Istanbul - Uskudar',     'Bağlarbaşı Mah. Hakimiyet Cad. No:9, Üsküdar/İstanbul',      '+90 216 222 0010', 'uskudar@petrix.com',        'Mon-Fri 08:00-21:00, Sat-Sun 09:00-19:00'),
-- Izmir (4)
('Izmir - Alsancak',       'Kıbrıs Şehitleri Cad. No:84, Alsancak/İzmir',                '+90 232 333 0001', 'alsancak@petrix.com',       'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Izmir - Bornova',        'Kazımdirik Mah. Mimar Sinan Cad. No:17, Bornova/İzmir',      '+90 232 333 0002', 'bornova@petrix.com',        'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Izmir - Buca',           'Buca Mah. Adnan Menderes Cad. No:39, Buca/İzmir',            '+90 232 333 0003', 'buca@petrix.com',           'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
('Izmir - Karsiyaka',      'Girne Bulvarı No:56, Karşıyaka/İzmir',                       '+90 232 333 0004', 'karsiyaka@petrix.com',      'Mon-Fri 08:00-20:00, Sat 09:00-18:00'),
-- Kayseri (2)
('Kayseri - Kocasinan',    'Zümrüt Mah. Sivas Cad. No:64, Kocasinan/Kayseri',            '+90 352 400 0001', 'kocasinan@petrix.com',      'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
('Kayseri - Melikgazi',    'Köşk Mah. Osman Kavuncu Cad. No:27, Melikgazi/Kayseri',     '+90 352 400 0002', 'melikgazi@petrix.com',      'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
-- Kocaeli (2)
('Kocaeli - Gebze',        'Güzeller Mah. Şükrü Bey Cad. No:37, Gebze/Kocaeli',          '+90 262 800 0001', 'gebze@petrix.com',          'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
('Kocaeli - Izmit',        'Serdar Mah. Körfez Cad. No:23, İzmit/Kocaeli',               '+90 262 800 0002', 'izmit@petrix.com',          'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
-- Konya (2)
('Konya - Meram',          'Abdulaziz Mah. Meram Yeni Yol No:44, Meram/Konya',           '+90 332 777 0001', 'meram@petrix.com',          'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
('Konya - Selcuklu',       'Musalla Bağları Mah. Ankara Cad. No:90, Selçuklu/Konya',     '+90 332 777 0002', 'selcuklu@petrix.com',       'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
-- Malatya (2)
('Malatya - Battalgazi',   'Hamidiye Mah. İnönü Cad. No:15, Battalgazi/Malatya',         '+90 422 999 0001', 'battalgazi@petrix.com',     'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
('Malatya - Yesilyurt',    'Tecde Mah. Fuzuli Cad. No:7, Yeşilyurt/Malatya',             '+90 422 999 0002', 'yesilyurt@petrix.com',      'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
-- Mersin (2)
('Mersin - Mezitli',       'Davultepe Mah. Gazi Mustafa Kemal Bulvarı No:5, Mezitli/Mersin', '+90 324 700 0001', 'mezitli@petrix.com',   'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
('Mersin - Yenisehir',     'Çankaya Mah. Atatürk Cad. No:49, Yenişehir/Mersin',          '+90 324 700 0002', 'yenisehir@petrix.com',      'Mon-Fri 08:00-20:00, Sat 09:00-17:00'),
-- Samsun (2)
('Samsun - Atakum',        'Çarşamba Mah. Atatürk Bulvarı No:72, Atakum/Samsun',         '+90 362 600 0001', 'atakum@petrix.com',         'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
('Samsun - Ilkadim',       'Kökçüoğlu Mah. Kazımpaşa Cad. No:18, İlkadım/Samsun',      '+90 362 600 0002', 'ilkadim@petrix.com',        'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
-- Trabzon (2)
('Trabzon - Akcaabat',     'Söğütlü Mah. Atatürk Cad. No:36, Akçaabat/Trabzon',         '+90 462 500 0001', 'akcaabat@petrix.com',       'Mon-Fri 08:00-19:00, Sat 09:00-17:00'),
('Trabzon - Ortahisar',    'Kemerkaya Mah. Uzun Sok. No:10, Ortahisar/Trabzon',          '+90 462 500 0002', 'ortahisar@petrix.com',      'Mon-Fri 08:00-19:00, Sat 09:00-17:00')
) AS v(name, address, phone, email, working_hours)
WHERE NOT EXISTS (
    SELECT 1 FROM BRANCH b WHERE b.name = v.name
);

INSERT INTO MEMBERSHIP_PLAN (name, monthly_fee, perks_description) VALUES
    ('Basic',  199, '5% discount on consultation • Standard appointment slots • Email reminders'),
    ('Silver', 399, '10% discount on consultation • Priority appointment slots • 1 free boarding night/month • SMS + email reminders'),
    ('Gold',   699, '20% discount on consultation • VIP appointment slots • 3 free boarding nights/month • Dedicated vet line')
ON CONFLICT DO NOTHING;

INSERT INTO MEDICATION (name, form, unit, description, is_vaccine) VALUES
    ('Amoxicillin 50mg',  'tablet',    'mg', 'Broad-spectrum antibiotic',          FALSE),
    ('Meloxicam 1mg',     'tablet',    'mg', 'NSAID anti-inflammatory',            FALSE),
    ('Rabies Vaccine',    'injection', 'ml', 'Rabies prevention vaccine',          TRUE),
    ('DHPP Combo',        'injection', 'ml', 'Distemper/Hepatitis/Parvo/Parainfluenza', TRUE),
    ('Flea Treatment',    'solution',  'ml', 'Topical anti-parasite treatment',    FALSE),
    ('Metronidazole 250mg','tablet',   'mg', 'Antibiotic and antiprotozoal medication', FALSE),
    ('Cefalexin 500mg',   'capsule',   'mg', 'Antibiotic for skin and soft tissue infections', FALSE),
    ('Prednisolone 5mg',  'tablet',    'mg', 'Corticosteroid for inflammation control', FALSE),
    ('Ivermectin',        'solution',  'ml', 'Antiparasitic treatment',            FALSE),
    ('Feline Leukemia Vaccine', 'injection', 'ml', 'FeLV prevention vaccine',       TRUE),
    ('Bordetella Vaccine','injection', 'ml', 'Respiratory disease prevention vaccine', TRUE),
    ('Deworming Tablet',  'tablet',    'dose', 'Internal parasite control',        FALSE),
    ('Ear Cleaner Solution','solution','ml', 'Ear hygiene and cleaning solution',  FALSE),
    ('Eye Drops',         'drops',     'ml', 'Ophthalmic care drops',              FALSE),
    ('Wound Spray',       'spray',     'ml', 'Topical wound care spray',           FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO VACCINATION (med_id, target_species, frequency_months)
SELECT med_id, 'Dog, Cat', 12 FROM MEDICATION WHERE name = 'Rabies Vaccine'
ON CONFLICT DO NOTHING;

INSERT INTO VACCINATION (med_id, target_species, frequency_months)
SELECT med_id, 'Dog', 12 FROM MEDICATION WHERE name = 'DHPP Combo'
ON CONFLICT DO NOTHING;

INSERT INTO VACCINATION (med_id, target_species, frequency_months)
SELECT med_id, 'Cat', 12 FROM MEDICATION WHERE name = 'Feline Leukemia Vaccine'
ON CONFLICT DO NOTHING;

INSERT INTO VACCINATION (med_id, target_species, frequency_months)
SELECT med_id, 'Dog', 12 FROM MEDICATION WHERE name = 'Bordetella Vaccine'
ON CONFLICT DO NOTHING;

INSERT INTO STOCKED_AS (branch_id, med_id, quantity, expiry_date, reorder_level, minimum_stock_threshold)
SELECT 1, med_id, 100, '2027-01-01', 20, 10 FROM MEDICATION ON CONFLICT DO NOTHING;

INSERT INTO STOCKED_AS (branch_id, med_id, quantity, expiry_date, reorder_level, minimum_stock_threshold)
SELECT 2, med_id, 80,  '2027-01-01', 15, 8  FROM MEDICATION ON CONFLICT DO NOTHING;

INSERT INTO STOCKED_AS (branch_id, med_id, quantity, expiry_date, reorder_level, minimum_stock_threshold)
SELECT 3, med_id, 60,  '2027-01-01', 10, 5  FROM MEDICATION ON CONFLICT DO NOTHING;

INSERT INTO STOCK_BATCH (branch_id, med_id, batch_number, quantity, expiry_date)
SELECT branch_id, med_id, 'INITIAL-' || branch_id || '-' || med_id, quantity, expiry_date
FROM STOCKED_AS
WHERE quantity > 0
ON CONFLICT DO NOTHING;
