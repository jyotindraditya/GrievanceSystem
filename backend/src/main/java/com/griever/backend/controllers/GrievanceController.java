package com.griever.backend.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/grievances")
public class GrievanceController {

    @Autowired
    private RestClient supabaseRestClient;

    @GetMapping
    public ResponseEntity<List> getAllGrievances() {
        List result = supabaseRestClient.get()
                .uri("/grievances?order=created_at.desc")
                .retrieve()
                .body(List.class);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> createGrievance(@RequestBody Map<String, Object> grievance) {
        List result = supabaseRestClient.post()
                .uri("/grievances")
                .body(List.of(grievance))
                .retrieve()
                .body(List.class);
        return ResponseEntity.ok(result != null && !result.isEmpty() ? result.get(0) : grievance);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateGrievance(@PathVariable String id, @RequestBody Map<String, Object> updates) {
        List result = supabaseRestClient.patch()
                .uri("/grievances?id=eq." + id)
                .body(updates)
                .retrieve()
                .body(List.class);
        return ResponseEntity.ok(result != null && !result.isEmpty() ? result.get(0) : updates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGrievance(@PathVariable String id) {
        supabaseRestClient.delete()
                .uri("/grievances?id=eq." + id)
                .retrieve()
                .toBodilessEntity();
        return ResponseEntity.ok().build();
    }
}
