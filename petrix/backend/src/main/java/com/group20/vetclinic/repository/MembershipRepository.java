package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.MembershipPlan;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class MembershipRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<MembershipPlan> planMapper = (rs, i) -> {
        MembershipPlan p = new MembershipPlan();
        p.setPlanId(rs.getInt("plan_id"));
        p.setName(rs.getString("name"));
        p.setMonthlyFee(rs.getBigDecimal("monthly_fee"));
        p.setPerksDescription(rs.getString("perks_description"));
        return p;
    };

    public List<MembershipPlan> findAllPlans() {
        return jdbc.query("SELECT * FROM MEMBERSHIP_PLAN ORDER BY monthly_fee", planMapper);
    }

    @Transactional
    public void enroll(int ownerId, int planId, LocalDate startDate) {
        BigDecimal targetFee = jdbc.queryForObject(
            "SELECT monthly_fee FROM MEMBERSHIP_PLAN WHERE plan_id = ?",
            BigDecimal.class,
            planId);
        if (targetFee == null) {
            throw new IllegalArgumentException("Membership plan not found");
        }

        BigDecimal activeFee = jdbc.queryForObject("""
            SELECT MAX(mp.monthly_fee)
            FROM ENROLLS e
            JOIN MEMBERSHIP_PLAN mp ON mp.plan_id = e.plan_id
            WHERE e.owner_id = ? AND e.status = 'active'
            """, BigDecimal.class, ownerId);

        if (activeFee != null && activeFee.compareTo(targetFee) >= 0) {
            throw new IllegalArgumentException("You already have an equal or higher active membership plan");
        }

        cancelActive(ownerId);

        jdbc.update("""
            INSERT INTO ENROLLS (owner_id, plan_id, start_date, status)
            VALUES (?,?,?,'active')
            ON CONFLICT (owner_id, plan_id, start_date)
            DO UPDATE SET status='active', end_date=NULL
            """, ownerId, planId, startDate);
    }

    public int cancel(int ownerId, int planId) {
        return jdbc.update("""
            UPDATE ENROLLS
            SET status='cancelled',
                end_date=GREATEST(CURRENT_DATE, start_date) + INTERVAL '1 day'
            WHERE owner_id=? AND plan_id=? AND status='active'
            """, ownerId, planId);
    }

    private int cancelActive(int ownerId) {
        return jdbc.update("""
            UPDATE ENROLLS
            SET status='cancelled',
                end_date=GREATEST(CURRENT_DATE, start_date) + INTERVAL '1 day'
            WHERE owner_id=? AND status='active'
            """, ownerId);
    }

    public List<Map<String, Object>> findEnrollmentsByOwner(int ownerId) {
        return jdbc.queryForList("""
            SELECT e.*, mp.name as plan_name, mp.monthly_fee, mp.perks_description
            FROM ENROLLS e
            JOIN MEMBERSHIP_PLAN mp ON e.plan_id = mp.plan_id
            WHERE e.owner_id = ?
            ORDER BY e.start_date DESC
            """, ownerId);
    }
}
