package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.Diagnosis;
import com.group20.vetclinic.model.Invoice;
import com.group20.vetclinic.model.Visit;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class VisitRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Visit> visitMapper = (rs, i) -> {
        Visit v = new Visit();
        v.setVisitId(rs.getInt("visit_id"));
        v.setApptId(rs.getInt("appt_id"));
        v.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        v.setNotes(rs.getString("notes"));
        return v;
    };

    public int createVisit(int apptId, String notes) {
        String sql = "INSERT INTO VISIT (appt_id, notes) VALUES (?,?) RETURNING visit_id";
        Integer id = jdbc.queryForObject(sql, Integer.class, apptId, notes);
        return id;
    }

    public Optional<Visit> findByApptId(int apptId) {
        return jdbc.query("SELECT * FROM VISIT WHERE appt_id = ?", visitMapper, apptId).stream().findFirst();
    }

    public Optional<Visit> findById(int visitId) {
        return jdbc.query("SELECT * FROM VISIT WHERE visit_id = ?", visitMapper, visitId).stream().findFirst();
    }

    public int createDiagnosis(int visitId, String description, String icdCode,
                               String severity, String treatmentNotes, boolean followUp) {
        String sql = "INSERT INTO DIAGNOSIS (visit_id, description, icd_code, severity, treatment_notes, follow_up_required) VALUES (?,?,?,?,?,?) RETURNING diagnosis_id";
        Integer id = jdbc.queryForObject(sql, Integer.class,
            visitId, description, icdCode, severity, treatmentNotes, followUp);
        return id;
    }

    public List<Diagnosis> findDiagnosesByVisit(int visitId) {
        return jdbc.query("SELECT * FROM DIAGNOSIS WHERE visit_id = ?", (rs, i) -> {
            Diagnosis d = new Diagnosis();
            d.setDiagnosisId(rs.getInt("diagnosis_id"));
            d.setVisitId(rs.getInt("visit_id"));
            d.setDescription(rs.getString("description"));
            d.setIcdCode(rs.getString("icd_code"));
            d.setSeverity(rs.getString("severity"));
            d.setTreatmentNotes(rs.getString("treatment_notes"));
            d.setFollowUpRequired(rs.getBoolean("follow_up_required"));
            return d;
        }, visitId);
    }

    public int createPrescription(int visitId, int vetId) {
        String sql = "INSERT INTO PRESCRIPTION (visit_id, vet_id) VALUES (?,?) RETURNING rx_id";
        Integer id = jdbc.queryForObject(sql, Integer.class, visitId, vetId);
        return id;
    }

    public void addPrescriptionItem(int rxId, int medId, String dosage, int durationDays, int quantity) {
        jdbc.update("INSERT INTO CONTAINS (rx_id, med_id, dosage, duration_days, quantity) VALUES (?,?,?,?,?)",
                    rxId, medId, dosage, durationDays, quantity);
    }

    public void deductStock(int branchId, int medId, int qty) {
        jdbc.update("UPDATE STOCKED_AS SET quantity = quantity - ? WHERE branch_id = ? AND med_id = ?",
                    qty, branchId, medId);
    }

    public int createInvoice(int visitId, BigDecimal consultationFee,
                             BigDecimal treatmentCosts, BigDecimal medicationCosts) {
        String sql = "INSERT INTO INVOICE (visit_id, consultation_fee, treatment_costs, medication_costs) VALUES (?,?,?,?) RETURNING invoice_id";
        Integer id = jdbc.queryForObject(sql, Integer.class,
            visitId, consultationFee, treatmentCosts, medicationCosts);
        return id;
    }

    public Optional<Invoice> findInvoiceByVisit(int visitId) {
        return jdbc.query("SELECT * FROM INVOICE WHERE visit_id = ?", (rs, i) -> {
            Invoice inv = new Invoice();
            inv.setInvoiceId(rs.getInt("invoice_id"));
            inv.setVisitId(rs.getInt("visit_id"));
            inv.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            inv.setConsultationFee(rs.getBigDecimal("consultation_fee"));
            inv.setTreatmentCosts(rs.getBigDecimal("treatment_costs"));
            inv.setMedicationCosts(rs.getBigDecimal("medication_costs"));
            inv.setStatus(rs.getString("status"));
            inv.setPaymentMethod(rs.getString("payment_method"));
            return inv;
        }, visitId).stream().findFirst();
    }

    public void payInvoice(int invoiceId, String paymentMethod) {
        jdbc.update("UPDATE INVOICE SET status = 'paid', payment_method = ? WHERE invoice_id = ?",
                    paymentMethod, invoiceId);
    }

    public List<Map<String, Object>> getMedicalTimeline(int petId) {
        return jdbc.queryForList(
            "SELECT * FROM PetMedicalTimeline WHERE pet_id = ? ORDER BY visit_date DESC", petId);
    }

    public Optional<Map<String, Object>> findRatingByVisit(int visitId) {
        String sql = "SELECT score, comment FROM VET_RATING WHERE visit_id = ?";
        return jdbc.queryForList(sql, visitId).stream().findFirst();
    }

    public void createRating(int visitId, int ownerId, int vetId, int score, String comment) {
        jdbc.update("""
            INSERT INTO VET_RATING (visit_id, owner_id, vet_id, score, comment)
            VALUES (?,?,?,?,?)
            ON CONFLICT (visit_id) DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment
            """, visitId, ownerId, vetId, score, comment);
    }

    public void createReferral(int visitId, int targetVetId, int targetBranchId, String reason) {
        jdbc.update("INSERT INTO REFERRAL (visit_id, target_vet_id, target_branch_id, reason) VALUES (?,?,?,?)",
                    visitId, targetVetId, targetBranchId, reason);
    }
}
