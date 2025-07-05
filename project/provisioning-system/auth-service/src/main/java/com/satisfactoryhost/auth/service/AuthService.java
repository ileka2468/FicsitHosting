package com.satisfactoryhost.auth.service;

import com.satisfactoryhost.auth.dto.*;
import com.satisfactoryhost.auth.exception.BadRequestException;
import com.satisfactoryhost.auth.model.AuthProvider;
import com.satisfactoryhost.auth.model.Role;
import com.satisfactoryhost.auth.model.User;
import com.satisfactoryhost.auth.repository.UserRepository;
import com.satisfactoryhost.auth.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private EmailService emailService;

    public AuthResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsernameOrEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String accessToken = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication.getName());

        // Update user's refresh token and last login
        User user = userRepository.findByUsernameOrEmail(loginRequest.getUsernameOrEmail(), loginRequest.getUsernameOrEmail())
                .orElseThrow(() -> new BadRequestException("User not found"));
        
        user.setRefreshToken(refreshToken);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        UserInfo userInfo = convertToUserInfo(user);

        return new AuthResponse(
                accessToken,
                refreshToken,
                tokenProvider.getJwtExpirationInMs() / 1000,
                userInfo
        );
    }

    public AuthResponse registerUser(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new BadRequestException("Username is already taken!");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new BadRequestException("Email Address is already in use!");
        }

        // Creating user's account
        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setPhoneNumber(registerRequest.getPhoneNumber());
        user.setProvider(AuthProvider.LOCAL);
        user.setRoles(new HashSet<>(Set.of(Role.USER))); // Use mutable HashSet
        user.setCreatedAt(LocalDateTime.now());
        user.setEmailVerificationToken(UUID.randomUUID().toString());

        User savedUser = userRepository.save(user);

        // Send verification email
        emailService.sendVerificationEmail(savedUser);

        // Generate tokens
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        registerRequest.getUsername(),
                        registerRequest.getPassword()
                )
        );

        String accessToken = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication.getName());

        savedUser.setRefreshToken(refreshToken);
        savedUser.setLastLoginAt(LocalDateTime.now());
        userRepository.save(savedUser);

        UserInfo userInfo = convertToUserInfo(savedUser);

        return new AuthResponse(
                accessToken,
                refreshToken,
                tokenProvider.getJwtExpirationInMs() / 1000,
                userInfo
        );
    }

    public void registerUserPendingVerification(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new BadRequestException("Username is already taken!");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new BadRequestException("Email Address is already in use!");
        }

        // Creating user's account
        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setPhoneNumber(registerRequest.getPhoneNumber());
        user.setProvider(AuthProvider.LOCAL);
        user.setRoles(new HashSet<>(Set.of(Role.USER))); // Use mutable HashSet
        user.setCreatedAt(LocalDateTime.now());
        user.setEmailVerificationToken(UUID.randomUUID().toString());
        user.setEmailVerified(false); // Not verified yet
        user.setEnabled(false); // Account not enabled until verified

        userRepository.save(user);

        // Send verification email
        emailService.sendVerificationEmail(user);
        
        // No authentication tokens generated - user must verify email first
    }

    public AuthResponse refreshToken(RefreshTokenRequest refreshTokenRequest) {
        String refreshToken = refreshTokenRequest.getRefreshToken();

        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid refresh token");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new BadRequestException("Refresh token not found"));

        if (!user.getUsername().equals(username)) {
            throw new BadRequestException("Invalid refresh token");
        }

        String newAccessToken = tokenProvider.generateTokenFromUsername(username);
        String newRefreshToken = tokenProvider.generateRefreshToken(username);

        user.setRefreshToken(newRefreshToken);
        userRepository.save(user);

        UserInfo userInfo = convertToUserInfo(user);

        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                tokenProvider.getJwtExpirationInMs() / 1000,
                userInfo
        );
    }

    public void logout(String refreshToken) {
        userRepository.findByRefreshToken(refreshToken)
                .ifPresent(user -> {
                    user.setRefreshToken(null);
                    userRepository.save(user);
                });
    }

    public boolean verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid verification token"));

        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        userRepository.save(user);

        return true;
    }

    public AuthResponse verifyEmailAndLogin(String token) {
        try {
            User user = userRepository.findByEmailVerificationToken(token)
                    .orElseThrow(() -> new BadRequestException("Invalid verification token"));

            user.setEmailVerified(true);
            user.setEnabled(true); // Enable user after verification
            user.setEmailVerificationToken(null);
            user.setLastLoginAt(LocalDateTime.now());
            
            // Generate new refresh token
            String refreshToken = tokenProvider.generateRefreshToken(user.getUsername());
            user.setRefreshToken(refreshToken);
            userRepository.save(user);

            // Generate access token
            String accessToken = tokenProvider.generateTokenFromUsername(user.getUsername());

            // Create user info
            UserInfo userInfo = new UserInfo();
            userInfo.setId(user.getId());
            userInfo.setUsername(user.getUsername());
            userInfo.setEmail(user.getEmail());
            userInfo.setFirstName(user.getFirstName());
            userInfo.setLastName(user.getLastName());
            userInfo.setEmailVerified(user.isEmailVerified());
            userInfo.setPhoneVerified(user.isPhoneVerified());
            userInfo.setEnabled(user.isEnabled());
            userInfo.setRoles(user.getRoles());
            userInfo.setCreatedAt(user.getCreatedAt());
            userInfo.setLastLoginAt(user.getLastLoginAt());

            // Get token expiration time (assuming 1 hour = 3600 seconds)
            Long expiresIn = 3600L;

            return new AuthResponse(accessToken, refreshToken, expiresIn, userInfo);
        } catch (Exception e) {
            return null;
        }
    }

    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found with email: " + email));

        if (user.isEmailVerified()) {
            throw new BadRequestException("Email is already verified");
        }

        // Generate new verification token if none exists
        if (user.getEmailVerificationToken() == null) {
            user.setEmailVerificationToken(UUID.randomUUID().toString());
            userRepository.save(user);
        }

        // Send verification email
        emailService.sendVerificationEmail(user);
    }

    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found with email: " + email));

        String resetToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(resetToken);
        user.setPasswordResetExpiryDate(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        emailService.sendPasswordResetEmail(user);
    }

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByPasswordResetToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid password reset token"));

        if (user.getPasswordResetExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Password reset token has expired");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiryDate(null);
        userRepository.save(user);
    }

    public UserInfo validateTokenAndGetUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BadRequestException("Authorization header must start with Bearer");
        }
        
        String token = authHeader.substring(7);
        
        if (!tokenProvider.validateToken(token)) {
            throw new BadRequestException("Invalid or expired token");
        }
        
        String username = tokenProvider.getUsernameFromToken(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found"));
        
        return convertToUserInfo(user);
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
