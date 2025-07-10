# Rathole Security Evolution Plan

## Current Security State

### Rathole Manager (Current)
- ✅ API token authentication (basic)
- ❌ HTTP only (token sent in plain text)
- ❌ Single shared token (no user-specific access)
- ❌ No RBAC - anyone with the token can create/delete any tunnel

### Orchestrator (Target)
- ✅ RBAC through auth service
- ✅ User-specific access tokens
- ✅ Will have HTTPS/TLS on port 443

## Security Evolution Phases

### Phase 1: Current Implementation (Basic Protection)

**Flow:**
```
Player/Admin → Orchestrator (RBAC) → Host Agent → Rathole Manager (API token)
```

**Characteristics:**
- Shared API token for rathole manager authentication
- HTTP communication between host agent and rathole manager
- No user-specific permissions in rathole manager
- Basic protection against random attacks

**Acceptable Risk Level:**
- Controlled environment
- Limited token distribution
- Non-public API endpoints
- Planned security upgrade path

### Phase 2: End Game Implementation (Full RBAC Chain)

**Flow:**
```
Player/Admin → Orchestrator (RBAC) → Host Agent → Rathole Manager (Access Token Validation)
                     ↓
              Auth Service validates access token
```

**Key Features:**
- **Access Token Propagation**: Orchestrator passes user access tokens to rathole manager
- **Auth Service Integration**: Rathole manager validates tokens with centralized auth service
- **User-Specific Permissions**: Users can only manage their own tunnels
- **HTTPS/TLS**: All communication secured with TLS on port 443
- **Fine-Grained RBAC**: Permission-based access control (create, read, update, delete tunnels)

## Implementation Plan for Phase 2

### 1. Auth Service Integration

```python
# Future rathole manager enhancement
class AuthService:
    async def validate_access_token(self, token: str, required_permission: str) -> ValidationResult:
        """Validate access token with auth service"""
        response = await self.auth_client.post('/validate', {
            'token': token,
            'required_permission': required_permission
        })
        return ValidationResult(
            is_valid=response.is_valid,
            user_id=response.user_id,
            permissions=response.permissions
        )
```

### 2. User-Scoped Tunnel Management

```python
# Enhanced tunnel creation with user context
def create_instance(self, server_id: str, game_port: int, user_id: str, query_port: Optional[int] = None):
    # Ensure server_id is scoped to user
    scoped_server_id = f"{user_id}_{server_id}"
    
    # Store user ownership
    instance_info = {
        'server_id': scoped_server_id,
        'owner_user_id': user_id,
        'game_port': game_port,
        'query_port': query_port,
        # ... existing fields
    }
```

### 3. Permission-Based Access Control

```python
# RBAC permissions for tunnel management
TUNNEL_PERMISSIONS = {
    'tunnel:create': 'Create new tunnels',
    'tunnel:read': 'View tunnel information',
    'tunnel:update': 'Modify tunnel configuration',
    'tunnel:delete': 'Remove tunnels',
    'tunnel:admin': 'Manage all tunnels (admin only)'
}

def check_tunnel_access(self, user_id: str, server_id: str, permission: str) -> bool:
    """Check if user has permission to access specific tunnel"""
    instance = self.instances.get(server_id)
    if not instance:
        return False
    
    # Users can always access their own tunnels
    if instance['owner_user_id'] == user_id:
        return True
    
    # Admins can access any tunnel
    if permission == 'tunnel:admin':
        return True
    
    return False
```

### 4. TLS/HTTPS Implementation

```python
# TLS configuration for production
if __name__ == '__main__':
    if os.getenv('ENVIRONMENT') == 'production':
        # Use TLS certificates
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain('/certs/rathole-manager.crt', '/certs/rathole-manager.key')
        
        serve(app, 
              host='0.0.0.0', 
              port=443, 
              ssl_context=ssl_context,
              threads=4)
    else:
        # Development HTTP
        serve(app, host='0.0.0.0', port=SERVER_PORT, threads=4)
```

## Migration Strategy

### Step 1: Add Auth Service Client
- Integrate auth service client into rathole manager
- Add token validation middleware
- Maintain backward compatibility with API tokens

### Step 2: Implement User Scoping
- Add user_id to tunnel creation
- Implement ownership-based access control
- Update data structures to include user context

### Step 3: Deploy TLS Infrastructure
- Obtain SSL certificates
- Configure HTTPS endpoints
- Update client configurations

### Step 4: Deprecate API Tokens
- Remove shared API token support
- Enforce access token validation
- Complete migration to full RBAC

## Security Benefits of Phase 2

1. **Token Security**: No more plain-text token transmission
2. **User Isolation**: Users cannot interfere with each other's tunnels
3. **Audit Trail**: All actions tied to specific users
4. **Scalable Permissions**: Fine-grained control over tunnel operations
5. **Centralized Auth**: Single source of truth for authentication/authorization
6. **Zero Trust**: Every request validated against auth service

## Timeline Considerations

- **Phase 1**: Immediate deployment for MVP functionality
- **Phase 2**: Implementation after core game server provisioning is stable
- **Migration Window**: Planned downtime for security upgrade
- **Rollback Plan**: Ability to revert to Phase 1 if issues arise