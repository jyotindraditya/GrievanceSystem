package com.griever.backend.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admins")
public class AdminController {

    @Autowired
    private RestClient supabaseRestClient;

    @GetMapping
    public ResponseEntity<List> getAllAdmins() {
        List result = supabaseRestClient.get()
                .uri("/admins?select=id,username,created_at&order=created_at.desc")
                .retrieve()
                .body(List.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> createAdmin(@RequestBody Map<String, Object> admin) {
        try {
            List result = supabaseRestClient.post()
                    .uri("/admins")
                    .body(List.of(admin))
                    .retrieve()
                    .body(List.class);
            return ResponseEntity.ok(result != null && !result.isEmpty() ? result.get(0) : admin);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAdmin(@PathVariable String id) {
        supabaseRestClient.delete()
                .uri("/admins?id=eq." + id)
                .retrieve()
                .toBodilessEntity();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateLogin(@RequestBody Map<String, String> loginData) {
        String username = loginData.get("username");
        String password = loginData.get("password");

        List result = supabaseRestClient.get()
                .uri("/admins?username=ilike." + username + "&password=eq." + password + "&select=username")
                .retrieve()
                .body(List.class);

        Map<String, Boolean> response = new HashMap<>();
        response.put("valid", result != null && !result.isEmpty());
        return ResponseEntity.ok(response);
    }
}
