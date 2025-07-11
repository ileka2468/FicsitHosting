# Reverse Proxy Setup

This service exposes a single TLS endpoint and routes requests to the internal
containers. It uses Nginx with a simple configuration and expects SSL
certificates in `./certs`.

## Usage

1. Place your `server.crt` and `server.key` in the `certs/` directory.
2. Start the proxy together with the other services:
   ```bash
   docker compose up -d reverse-proxy
   ```

Requests are routed based on the URL prefix:

- `/auth/` → `auth-service:8081`
- `/manager/` → `frp-instance-manager:7001`
- `/orchestrator/` → `satisfactory-orchestrator:8080` *(disabled by default)*

Uncomment the orchestrator sections in `docker-compose.yml` and `nginx.conf`
when you deploy the orchestrator on the VPS.
