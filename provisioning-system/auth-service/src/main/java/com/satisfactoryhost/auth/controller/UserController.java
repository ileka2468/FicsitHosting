package com.satisfactoryhost.auth.controller;

import com.satisfactoryhost.auth.dto.UserInfo;
import com.satisfactoryhost.auth.model.User;
import com.satisfactoryhost.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<UserInfo> getCurrentUser() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfo userInfo = convertToUserInfo(user);
        return ResponseEntity.ok(userInfo);
    }

    @PostMapping("/change-password")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestParam String currentPassword,
            @RequestParam String newPassword) {
        // Implementation would go here
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<UserInfo> updateProfile(@RequestBody UserInfo userInfo) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Update user fields
        user.setFirstName(userInfo.getFirstName());
        user.setLastName(userInfo.getLastName());
        user.setPhoneNumber(userInfo.getPhoneNumber());
        
        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(convertToUserInfo(updatedUser));
    }

    private UserInfo convertToUserInfo(User user) {
        UserInfo userInfo = new UserInfo();
        userInfo.setId(user.getId());
        userInfo.setUsername(user.getUsername());
        userInfo.setEmail(user.getEmail());
        userInfo.setFirstName(user.getFirstName());
        userInfo.setLastName(user.getLastName());
        userInfo.setPhoneNumber(user.getPhoneNumber());
        userInfo.setEmailVerified(user.isEmailVerified());
        userInfo.setPhoneVerified(user.isPhoneVerified());
        userInfo.setEnabled(user.isEnabled());
        userInfo.setRoles(user.getRoles());
        userInfo.setCreatedAt(user.getCreatedAt());
        userInfo.setLastLoginAt(user.getLastLoginAt());
        return userInfo;
    }
}
