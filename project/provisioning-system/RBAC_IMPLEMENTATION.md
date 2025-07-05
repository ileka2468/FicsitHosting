# Role-Based Access Control (RBAC) Implementation

## Overview
The provisioning system now implements granular role-based access control with the following authorization rules:

## Database Architecture
- **Auth Service Database**: Contains all user data, authentication, and authorization
- **Orchestrator Database**: Contains only server infrastructure data (nodes, game servers, port allocations)
- **Separation of Concerns**: User management is completely isolated from server provisioning

## Roles
- **USER**: Regular users who can manage their own servers
- **ADMIN**: Administrators with full access to all servers
- **MODERATOR**: Moderators with limited administrative access
- **SERVICE_ACCOUNT**: Service accounts that can provision new servers

## Access Control Rules

### Server Provisioning (`POST /api/provision/server`)
- **Allowed**: `SERVICE_ACCOUNT` only
- **Denied**: `USER`, `ADMIN`, `MODERATOR`
- **Reason**: Only automated systems/services should create new servers

### Server Management (Start/Stop/Restart/Delete)
- **Owner Access**: Users can control their own servers
- **Admin Access**: `ADMIN` and `SERVICE_ACCOUNT` can control any server
- **Denied**: Users cannot control servers they don't own

### Server Information (Status/Details)
- **Owner Access**: Users can view their own servers
- **Admin Access**: `ADMIN` and `SERVICE_ACCOUNT` can view any server
- **Denied**: Users cannot view servers they don't own

### Server Configuration Updates
- **Owner Access**: Users can modify their own servers
- **Admin Access**: `ADMIN` and `SERVICE_ACCOUNT` can modify any server
- **Denied**: Users cannot modify servers they don't own

## Implementation Details

### JWT Validation
All protected endpoints now:
1. Validate the JWT token with the auth-service at `/api/auth/validate`
2. Retrieve user information including roles
3. Check role-based permissions before proceeding

### Ownership Validation
Server ownership is determined by comparing the user ID from the JWT with the `userId` field on the `GameServer` entity.

### Error Messages
- `"Insufficient permissions: Only service accounts can provision servers"`
- `"Insufficient permissions: You can only control your own servers"`
- `"Insufficient permissions: You can only view your own servers"`
- `"Insufficient permissions: You can only modify your own servers"`

## Security Benefits
1. **Principle of Least Privilege**: Users only have access to their own resources
2. **Separation of Concerns**: Provisioning is restricted to service accounts
3. **Administrative Override**: Admins can manage any server when needed
4. **Audit Trail**: All operations are tied to authenticated users

## Usage Examples

### Creating a Service Account User
```sql
INSERT INTO users (username, email, password, roles, enabled, email_verified) 
VALUES ('provisioning-service', 'service@satisfactoryhost.com', '$encoded_password', 'SERVICE_ACCOUNT', true, true);
```

### Regular User Operations
- Users authenticate and receive JWT tokens containing their roles
- They can only manage servers where `server.userId = user.id`
- Attempts to access other servers result in permission errors

### Admin Operations
- Admins can perform any operation on any server
- Useful for customer support and system maintenance
