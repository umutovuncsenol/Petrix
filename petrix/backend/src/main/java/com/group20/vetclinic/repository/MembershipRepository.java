package com.group20.vetclinic.repository;

import com.group20.vetclinic.model.MembershipPlan;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

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

    public void enroll(int ownerId, int planId, LocalDate startDate) {
        jdbc.update(
            "INSERT INTO ENROLLS (owner_id, plan_id, start_date, status) VALUES (?,?,?,'active') ON CONFLICT DO NOTHING",
            ownerId, planId, startDate);
    }

    public void cancel(int ownerId, int planId) {
        jdbc.update(
            "UPDATE ENROLLS SET status='cancelled', end_date=CURRENT_DATE WHERE owner_id=? AND plan_id=? AND status='active'",
            ownerId, planId);
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
