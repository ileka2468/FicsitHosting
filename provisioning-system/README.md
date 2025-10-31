# Satisfactory Server Provisioning System

A comprehensive Spring Boot-based system for provisioning and managing Satisfactory game servers with automatic port allocation, dynamic tunnel management, and resource monitoring.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │ Spring Boot     │    │ PostgreSQL      │
│   (Dashboard)    │◄──►│ Orchestrator    │◄──►│ Database        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │ Redis Cache     │
                    └─────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Node 1      │    │ Node 2      │    │ Node 3      │
│ Host Agent  │    │ Host Agent  │    │ Host Agent  │
│ + Rathole   │    │ + Rathole   │    │ + Rathole   │
│ Client      │    │ Client      │    │ Client      │
└─────────────┘    └─────────────┘    └─────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │ VPS (Public)    │
                    │ Rathole Server  │
                    │ + Control API   │
                    └─────────────────┘
```

## 🚀 Features

### Core Functionality
- **Automatic Server Provisioning**: Deploy Satisfactory servers on optimal nodes
- **Dynamic Port Management**: Allocate and manage ports (7777/UDP game, 15000/UDP beacon)
- **Network Tunneling**: Rathole-based tunneling for public server access
- **Resource Monitoring**: Real-time CPU, memory, and disk usage tracking
- **Load Balancing**: Intelligent node selection based on resource usage

### Management Features
- **Container Lifecycle**: Start, stop, restart, and delete server containers
- **Port Pool Management**: Automatic port allocation with conflict prevention
- **Node Health Monitoring**: Track node status and performance metrics
- **Audit Logging**: Complete audit trail of all operations

### API Features
- **RESTful API**: Full REST API for integration with web frontend
- **Real-time Updates**: WebSocket support for live status updates
- **Authentication**: JWT-based authentication system
- **Rate Limiting**: Protect against abuse with rate limiting

## 📁 Project Structure

```
provisioning-system/
├── orchestrator/                 # Spring Boot main application
│   ├── src/main/java/com/satisfactoryhost/orchestrator/
│   │   ├── controller/          # REST API controllers
│   │   ├── service/             # Business logic services
│   │   ├── model/               # JPA entities
│   │   ├── dto/                 # Data transfer objects
│   │   ├── repository/          # Data access layer
│   │   └── config/              # Configuration classes
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── static/              # Static web resources
│   ├── docker-compose.yml       # Local development stack
│   ├── Dockerfile               # Container build file
│   └── pom.xml                  # Maven dependencies
│
├── host-agent/                  # Python host agents
│   ├── agent.py                 # Main agent application
│   ├── requirements.txt         # Python dependencies
│   └── docker-compose.yml       # Agent deployment
│
└── rathole-server/              # Tunnel server
    ├── rathole-server.toml      # Rathole configuration
    ├── rathole_api.py           # Control API service
    ├── docker-compose.yml       # Tunnel server stack
    └── README.md                # Deployment guide
```

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Spring Boot 3.2 | Main orchestrator service |
| **Database** | PostgreSQL 15 | Persistent data storage |
| **Cache** | Redis 7 | Performance optimization |
| **Host Agents** | Python 3.11 + Flask | Node management |
| **Tunneling** | Rathole | Network connectivity |
| **Containers** | Docker | Service isolation |
| **Orchestration** | Docker Compose | Local deployment |

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Docker & Docker Compose
- Python 3.11+ (for host agents)
- PostgreSQL 15+ (or use Docker)

### 1. Clone and Setup
```bash
git clone <repository>
cd provisioning-system
```

### 2. Configure Environment
```bash
# Copy environment template
cp orchestrator/.env.example orchestrator/.env

# Edit configuration
nano orchestrator/.env
```

### 3. Start Infrastructure
```bash
# Start database and cache
cd orchestrator
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose logs -f postgres
```

### 4. Run Orchestrator
```bash
# Development mode
./mvnw spring-boot:run

# Or build and run with Docker
docker-compose up -d orchestrator
```

### 5. Deploy Host Agents
```bash
# On each game server node
cd host-agent
pip install -r requirements.txt

# Configure node ID
export NODE_ID="node-1"
export ORCHESTRATOR_URL="http://your-orchestrator:8080"

# Start agent
python agent.py
```

### 6. Setup Rathole Server (VPS)
```bash
# On your public VPS
cd rathole-server
docker-compose up -d
```

## 📊 API Documentation

### Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password"
}
```

### Server Provisioning
```http
POST /api/servers/provision
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "user123",
  "serverName": "My Factory",
  "ramAllocation": 8,
  "cpuAllocation": 4,
  "maxPlayers": 12,
  "serverPassword": "optional"
}
```

### Server Management
```http
# Get user's servers
GET /api/servers?userId=user123

# Stop server
POST /api/servers/{serverId}/stop

# Restart server
POST /api/servers/{serverId}/restart

# Delete server
DELETE /api/servers/{serverId}
```

### Node Management
```http
# Get all nodes
GET /api/nodes

# Update node stats
POST /api/nodes/{nodeId}/stats
{
  "cpuUsage": 45.2,
  "memoryUsage": 62.1,
  "diskUsage": 23.4
}
```

## 🔧 Configuration

### Application Properties
```properties
# Core Configuration
server.port=8080
app.public-ip=YOUR_VPS_IP
app.rathole.server.host=YOUR_VPS_IP
app.rathole.api-token=your-secure-token

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/satisfactory_orchestrator
spring.datasource.username=satisfactory
spring.datasource.password=your-password

# Redis Cache
spring.redis.host=localhost
spring.redis.port=6379
spring.redis.password=your-redis-password
```

### Port Ranges
- **Orchestrator**: 8080 (HTTP API)
- **Host Agents**: 8081 (Agent API)
- **Rathole Server**: 2333 (Client connections), 7000 (Control API)
- **Game Servers**: 15000-16000/UDP (allocated dynamically)

## 🏗️ Deployment

### Production Deployment

1. **Secure Configuration**:
   ```bash
   # Generate secure tokens
   openssl rand -hex 32  # Database password
   openssl rand -hex 32  # Rathole token
   openssl rand -hex 32  # JWT secret
   ```

2. **Database Setup**:
   ```bash
   # Create production database
   createdb satisfactory_orchestrator
   psql satisfactory_orchestrator < init-scripts/01-init-database.sql
   ```

3. **SSL/TLS Setup**:
   ```toml
   # rathole-server.toml
   [server.transport.tls]
   pkcs12 = "/path/to/cert.p12"
   pkcs12_password = "cert-password"
   ```

4. **Reverse Proxy** (Nginx):
   ```nginx
   server {
       listen 443 ssl;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Scaling Considerations

- **Horizontal Scaling**: Deploy multiple orchestrator instances behind a load balancer
- **Database**: Use PostgreSQL clustering or managed services
- **Cache**: Redis Cluster for high availability
- **Monitoring**: Integrate with Prometheus + Grafana

## 📈 Monitoring

### Health Checks
```bash
# Orchestrator health
curl http://localhost:8080/actuator/health

# Node agent health
curl http://node-ip:8081/api/health

# Rathole server status
curl http://vps-ip:7001/api/tunnels/status?token=your-token
```

### Metrics
- Server provisioning success rate
- Node resource utilization
- Active server count per node
- Port allocation efficiency
- Tunnel connection status

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**:
   ```bash
   # Check port allocation
   curl http://localhost:8080/api/nodes/{nodeId}/ports
   ```

2. **Tunnel Failures**:
   ```bash
   # Check Rathole status
   docker logs rathole-server
   curl http://vps-ip:7001/api/tunnels?token=your-token
   ```

3. **Database Connection Issues**:
   ```bash
   # Test database connectivity
   docker-compose exec postgres psql -U satisfactory -d satisfactory_orchestrator
   ```

### Debug Commands
```bash
# View orchestrator logs
docker-compose logs -f orchestrator

# Check node registration
curl http://localhost:8080/api/nodes

# Test host agent connectivity
curl http://node-ip:8081/api/stats
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Documentation: Check the README files in each component directory
- Issues: Create a GitHub issue with detailed information
- Discord: Join our community server for real-time help

---

**Made with ❤️ for the Satisfactory community**
