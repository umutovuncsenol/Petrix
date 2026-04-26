package com.group20.vetclinic.security;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final JdbcTemplate jdbc;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Try USERS first (role-based accounts)
        String appUserSql = "SELECT id, username, password_hash FROM USERS WHERE username = ?";
        List<UserDetails> appUsers = jdbc.query(appUserSql, (rs, i) -> {
                    int userId = rs.getInt("id");
                    List<SimpleGrantedAuthority> authorities = jdbc.query(
                            """
                            SELECT r.name
                            FROM USER_ROLE ur
                            JOIN ROLES r ON r.id = ur.role_id
                            WHERE ur.user_id = ?
                            """,
                            (roleRs, j) -> new SimpleGrantedAuthority("ROLE_" + roleRs.getString("name")),
                            userId
                    );

                    return User.builder()
                            .username(rs.getString("username"))
                            .password(rs.getString("password_hash"))
                            .authorities(authorities)
                            .build();
                },
                username);

        if (!appUsers.isEmpty()) return appUsers.get(0);

        // Try OWNER first
        String ownerSql = "SELECT username, password_hash FROM OWNER WHERE username = ?";
        List<UserDetails> owners = jdbc.query(ownerSql, (rs, i) ->
                User.builder()
                    .username(rs.getString("username"))
                    .password(rs.getString("password_hash"))
                    .authorities(List.of(new SimpleGrantedAuthority("ROLE_OWNER")))
                    .build(),
                username);

        if (!owners.isEmpty()) return owners.get(0);

        // Try VETERINARIAN
        String vetSql = "SELECT username, password_hash FROM VETERINARIAN WHERE username = ?";
        List<UserDetails> vets = jdbc.query(vetSql, (rs, i) ->
                User.builder()
                    .username(rs.getString("username"))
                    .password(rs.getString("password_hash"))
                    .authorities(List.of(new SimpleGrantedAuthority("ROLE_VET")))
                    .build(),
                username);

        if (!vets.isEmpty()) return vets.get(0);

        throw new UsernameNotFoundException("User not found: " + username);
    }
}
