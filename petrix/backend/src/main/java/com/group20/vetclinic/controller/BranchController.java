package com.group20.vetclinic.controller;

import com.group20.vetclinic.model.Branch;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final JdbcTemplate jdbc;

    private final RowMapper<Branch> mapper = (rs, i) -> {
        Branch b = new Branch();
        b.setBranchId(rs.getInt("branch_id"));
        b.setName(rs.getString("name"));
        b.setAddress(rs.getString("address"));
        b.setPhone(rs.getString("phone"));
        b.setEmail(rs.getString("email"));
        b.setWorkingHours(rs.getString("working_hours"));
        return b;
    };

    @GetMapping
    public List<Branch> getAll() {
        return jdbc.query("SELECT * FROM BRANCH ORDER BY name", mapper);
    }
}
