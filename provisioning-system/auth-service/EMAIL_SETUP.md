# Development Email Setup

This project uses **MailHog** for development email testing. MailHog is a fake SMTP server that captures emails instead of actually sending them, perfect for development and testing.

## Quick Start

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the MailHog Web UI:**
   Open your browser and go to: [http://localhost:8025](http://localhost:8025)

3. **Test email functionality:**
   - Register a new user through your frontend
   - Check the MailHog web interface to see the verification email
   - Click the verification link in the email to test the flow

## What is MailHog?

MailHog is a development mail server that:
- **Captures emails** instead of sending them to real recipients
- **Provides a web UI** to view captured emails
- **Supports all SMTP features** your application needs
- **Requires no authentication** or configuration
- **Perfect for testing** email workflows without spamming real addresses

## Configuration

The application is configured to use MailHog via these settings in `application.properties`:

```properties
spring.mail.host=mailhog
spring.mail.port=1025
spring.mail.username=
spring.mail.password=
spring.mail.properties.mail.smtp.auth=false
spring.mail.properties.mail.smtp.starttls.enable=false
spring.mail.from=noreply@satisfactoryhost.com
```

## Switching to Production Email

When ready for production, update the `docker-compose.yml` and `application.properties` to use a real SMTP service:

1. **Remove the MailHog service** from `docker-compose.yml`
2. **Update email environment variables** in `docker-compose.yml`:
   ```yaml
   environment:
     - SPRING_MAIL_HOST=smtp.gmail.com
     - SPRING_MAIL_PORT=587
     - SPRING_MAIL_USERNAME=${MAIL_USERNAME}
     - SPRING_MAIL_PASSWORD=${MAIL_PASSWORD}
     - SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
     - SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
   ```
3. **Update your `.env` file** with real credentials

## Email Types Sent

The application sends these types of emails:

1. **Email Verification** - When users register
2. **Password Reset** - When users request password reset
3. **Welcome Email** - After email verification is complete

All emails can be viewed and tested through the MailHog interface.

## Troubleshooting

- **MailHog not starting?** Check if port 8025 is already in use
- **Emails not appearing?** Check the application logs for SMTP errors
- **Web UI not accessible?** Ensure MailHog container is running: `docker-compose ps`
