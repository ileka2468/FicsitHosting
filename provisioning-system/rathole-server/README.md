# Secure Rathole Instance Manager

A production-ready Rathole tunnel management service with authentication, authorization, and user-scoped access control.

## Features

- **🔐 Authentication & Authorization**: Integration with auth-service for token validation
- **👥 Role-Based Access Control (RBAC)**: Support for USER, ADMIN, MODERATOR, and SERVICE_ACCOUNT roles
- **🔒 User-Scoped Tunnels**: Users can only manage their own tunnels (admins can manage all)
- **🌐 HTTPS Support**: TLS/SSL encryption for secure communication
- **🔄 Backward Compatibility**: Legacy API token support for smooth migration
- **📊 Comprehensive Logging**: Detailed audit trail for all operations
- **⚡ High Performance**: Multi-threaded server with optimized port allocation

## Architecture

```
Player/Admin → Orchestrator (RBAC) → Host Agent → Rathole Manager (Token Validation)
                     ↓
              Auth Service validates access token
```

## Quick Start

### Development Mode (Legacy Auth)

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start the Service**:
   ```bash
   docker-compose up -d
   ```

3. **Test the API**:
   ```bash
   curl -H "X-API-Token: your-token" http://localhost:7001/health
   ```

### Production Mode (Secure Auth)

1. **Generate SSL Certificates**:
   ```bash
   ./generate-ssl-certs.sh
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Update .env:
   USE_HTTPS=true
   AUTH_SERVICE_URL=https://your-auth-service.com
   LEGACY_AUTH_ENABLED=false
   PUBLIC_IP=your.vps.ip.address
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

## API Endpoints

### Public Endpoints

- `GET /health` - Service health check

### Authenticated Endpoints

All require valid access token or legacy API token.

#### Tunnel Management

- `POST /api/instances` - Create new tunnel
- `GET /api/instances` - List user's tunnels
- `GET /api/instances/{id}` - Get tunnel details
- `DELETE /api/instances/{id}` - Remove tunnel
- `GET /api/instances/{id}/client-config` - Get client configuration

#### Admin Endpoints

Require ADMIN or SERVICE_ACCOUNT role.

- `GET /api/admin/instances` - List all tunnels (admin view)
- `DELETE /api/admin/instances/{id}` - Force remove any tunnel

## Authentication

### Access Token (Recommended)

```bash
curl -H "Authorization: Bearer your-access-token" \
     -H "Content-Type: application/json" \
     -d '{"server_id": "server1", "game_port": 7777}' \
     https://your-server.com/api/instances
```

### Legacy API Token (Backward Compatibility)

```bash
# Header method
curl -H "X-API-Token: your-api-token" \
     -H "Content-Type: application/json" \
     -d '{"server_id": "server1", "game_port": 7777}' \
     http://your-server.com:7001/api/instances

# Payload method (deprecated)
curl -H "Content-Type: application/json" \
     -d '{"token": "your-api-token", "server_id": "server1", "game_port": 7777}' \
     http://your-server.com:7001/api/instances
```

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **USER** | Create, read, update, delete own tunnels |
| **ADMIN** | All USER permissions + manage any tunnel + admin endpoints |
| **MODERATOR** | Same as USER (future: moderate content) |
| **SERVICE_ACCOUNT** | Same as ADMIN (for orchestrator/automation) |

## Environment Variables

### Authentication & Security

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_SERVICE_URL` | `http://auth-service:8080` | Auth service endpoint |
| `USE_HTTPS` | `false` | Enable HTTPS/TLS |
| `SSL_CERT_PATH` | `/certs/server.crt` | SSL certificate path |
| `SSL_KEY_PATH` | `/certs/server.key` | SSL private key path |
| `LEGACY_AUTH_ENABLED` | `true` | Enable legacy API token auth |
| `API_TOKEN` | `your-token` | Legacy API token |

### Network Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_IP` | `0.0.0.0` | Public IP for tunnel endpoints |
| `SERVER_PORT` | `7001` | HTTP server port |
| `HTTPS_PORT` | `443` | HTTPS server port |

### Rathole Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `RATHOLE_BINARY` | `/usr/local/bin/rathole` | Rathole binary path |
| `BASE_DATA_DIR` | `/data/rathole-instances` | Instance data directory |
| `RATHOLE_PORT_START` | `10000` | Port range start |
| `RATHOLE_PORT_END` | `20000` | Port range end |

### Redis (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` |  | Redis host for persistent state |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis database index |
| `REDIS_PASSWORD` |  | Redis password (optional) |

## Security Considerations

### Production Deployment

1. **Disable Legacy Auth**: Set `LEGACY_AUTH_ENABLED=false`
2. **Enable HTTPS**: Set `USE_HTTPS=true` and configure valid SSL certificates
3. **Secure Network**: Ensure auth-service is accessible but not publicly exposed
4. **Firewall Rules**: Open only necessary port ranges
5. **Monitor Logs**: Set up log aggregation and monitoring

### SSL Certificates

For production, use certificates from a trusted CA:

```bash
# Let's Encrypt example
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/server.crt
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/server.key
```

## Migration from Legacy

1. **Phase 1**: Deploy with `LEGACY_AUTH_ENABLED=true`
2. **Phase 2**: Update clients to use access tokens
3. **Phase 3**: Set `LEGACY_AUTH_ENABLED=false`
4. **Phase 4**: Enable HTTPS with `USE_HTTPS=true`

## Troubleshooting

### Common Issues

1. **Auth Service Connection Failed**:
   ```bash
   # Check auth service connectivity
   curl http://your-auth-service:8080/api/auth/health
   ```

2. **SSL Certificate Issues**:
   ```bash
   # Test certificate
   openssl x509 -in ./certs/server.crt -text -noout
   ```

3. **Permission Denied**:
   - Check user roles in auth service
   - Verify access token validity
   - Ensure user owns the tunnel (for non-admin users)

### Logs

```bash
# View container logs
docker-compose logs -f rathole-instance-manager

# Check instance-specific logs
docker exec rathole-instance-manager ls -la /data/rathole-instances/
```

## Development

### Running Tests

```bash
# Unit tests
python -m pytest tests/

# Integration tests with auth service
TESTING=true AUTH_SERVICE_URL=http://localhost:8080 python -m pytest tests/integration/
```

### API Testing

```bash
# Test with curl
curl -H "Authorization: Bearer $(cat access_token.txt)" \
     http://localhost:7001/health

# Test with httpie
http :7001/health Authorization:"Bearer $(cat access_token.txt)"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
