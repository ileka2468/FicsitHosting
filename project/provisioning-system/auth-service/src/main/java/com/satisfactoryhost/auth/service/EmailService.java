package com.satisfactoryhost.auth.service;

import com.satisfactoryhost.auth.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${spring.mail.from}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(User user) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("Verify Your Email - Satisfactory Host");
            
            String verificationUrl = frontendUrl + "/api/auth/verify-email?token=" + user.getEmailVerificationToken();
            String text = "Hi " + user.getFirstName() + ",\n\n" +
                         "Thank you for registering with Satisfactory Host!\n\n" +
                         "Please click the link below to verify your email address:\n" +
                         verificationUrl + "\n\n" +
                         "If you didn't create an account, please ignore this email.\n\n" +
                         "Best regards,\n" +
                         "The Satisfactory Host Team";
            
            message.setText(text);
            mailSender.send(message);
            
            logger.info("Verification email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send verification email to: {}", user.getEmail(), e);
        }
    }

    public void sendPasswordResetEmail(User user) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("Reset Your Password - Satisfactory Host");
            
            String resetUrl = frontendUrl + "/auth/reset-password?token=" + user.getPasswordResetToken();
            String text = "Hi " + user.getFirstName() + ",\n\n" +
                         "You requested a password reset for your Satisfactory Host account.\n\n" +
                         "Please click the link below to reset your password:\n" +
                         resetUrl + "\n\n" +
                         "This link will expire in 24 hours.\n\n" +
                         "If you didn't request this reset, please ignore this email.\n\n" +
                         "Best regards,\n" +
                         "The Satisfactory Host Team";
            
            message.setText(text);
            mailSender.send(message);
            
            logger.info("Password reset email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send password reset email to: {}", user.getEmail(), e);
        }
    }

    public void sendWelcomeEmail(User user) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(user.getEmail());
            message.setSubject("Welcome to Satisfactory Host!");
            
            String text = "Hi " + user.getFirstName() + ",\n\n" +
                         "Welcome to Satisfactory Host! Your email has been verified successfully.\n\n" +
                         "You can now start creating and managing your Satisfactory game servers.\n\n" +
                         "Visit our dashboard: " + frontendUrl + "/dashboard\n\n" +
                         "If you have any questions, feel free to contact our support team.\n\n" +
                         "Happy gaming!\n" +
                         "The Satisfactory Host Team";
            
            message.setText(text);
            mailSender.send(message);
            
            logger.info("Welcome email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send welcome email to: {}", user.getEmail(), e);
        }
    }
}
