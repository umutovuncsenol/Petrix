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
