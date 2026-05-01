package com.group20.vetclinic.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    private Key getSigningKey() {
        byte[] keyBytes = Base64.getEncoder().encode(secret.getBytes());
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String username, String role, int userId) {
        return generateToken(username, List.of(role), userId);
    }

    public String generateToken(String username, List<String> roles, int userId) {
        return generateToken(username, roles, userId, null);
    }

    public String generateToken(String username, List<String> roles, int userId, Integer branchId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", roles);
        if (roles != null && !roles.isEmpty()) {
            claims.put("role", roles.get(0)); // backward compatibility
        }
        claims.put("userId", userId);
        if (branchId != null) {
            claims.put("branchId", branchId);
        }
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return (String) parseClaims(token).get("role");
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object roles = parseClaims(token).get("roles");
        if (roles instanceof List<?>) {
            return ((List<?>) roles).stream().map(String::valueOf).toList();
        }
        String role = extractRole(token);
        return role == null ? List.of() : List.of(role);
    }

    public Integer extractUserId(String token) {
        Object id = parseClaims(token).get("userId");
        if (id instanceof Integer) return (Integer) id;
        if (id instanceof Long) return ((Long) id).intValue();
        return null;
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
