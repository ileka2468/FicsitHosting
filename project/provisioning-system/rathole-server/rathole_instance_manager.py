#!/usr/bin/env python3
"""
Secure Rathole Instance Manager with RBAC
Manages separate Rathole server instances for each game server with proper authentication.
Features:
- Auth-service integration for token validation
- Role-based access control (RBAC)
- User-scoped tunnel management
- HTTPS/TLS support
- Service account support for orchestrator
"""

import os
import json
import logging
import subprocess
import signal
import shutil
import ssl
import requests
from flask import Flask, request, jsonify, g
import redis
from waitress import serve
from typing import Dict, Any, Optional, List
from pathlib import Path
import threading
import time
from datetime import datetime
from functools import wraps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
SERVER_PORT = int(os.getenv('SERVER_PORT', '7001'))
HTTPS_PORT = int(os.getenv('HTTPS_PORT', '443'))
USE_HTTPS = os.getenv('USE_HTTPS', 'false').lower() == 'true'
SSL_CERT_PATH = os.getenv('SSL_CERT_PATH', '/certs/server.crt')
SSL_KEY_PATH = os.getenv('SSL_KEY_PATH', '/certs/server.key')

# Auth service configuration
AUTH_SERVICE_URL = os.getenv('AUTH_SERVICE_URL', 'http://localhost:8081')
AUTH_VALIDATE_ENDPOINT = f"{AUTH_SERVICE_URL}/api/auth/validate"

# Legacy API token for backward compatibility (will be deprecated)
API_TOKEN = os.getenv('API_TOKEN', 'your-api-control-token-here')
LEGACY_AUTH_ENABLED = os.getenv('LEGACY_AUTH_ENABLED', 'true').lower() == 'true'

RATHOLE_BINARY = os.getenv('RATHOLE_BINARY', '/usr/local/bin/rathole')
BASE_DATA_DIR = os.getenv('BASE_DATA_DIR', '/data/rathole-instances')
PUBLIC_IP = os.getenv('PUBLIC_IP', '0.0.0.0')  # For server binding (0.0.0.0 = all interfaces)
PUBLIC_HOST_IP = os.getenv('PUBLIC_HOST_IP', os.getenv('PUBLIC_IP', '192.168.20.100'))  # For external client connection
INTERNAL_SERVER_HOST = os.getenv('INTERNAL_SERVER_HOST', 'rathole-instance-manager')  # For container-to-container communication

# Port range for Rathole server instances (internal control)
RATHOLE_PORT_START = int(os.getenv('RATHOLE_PORT_START', '20000'))
RATHOLE_PORT_END = int(os.getenv('RATHOLE_PORT_END', '20100'))

# Port range for game traffic (external tunnel endpoints)
GAME_PORT_START = int(os.getenv('GAME_PORT_START', '40000'))
GAME_PORT_END = int(os.getenv('GAME_PORT_END', '40100'))

# Optional Redis configuration for persistent port tracking
REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT', '6379'))
REDIS_DB = int(os.getenv('REDIS_DB', '0'))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')

# User roles enum
class Role:
    USER = 'USER'
    ADMIN = 'ADMIN'
    MODERATOR = 'MODERATOR'
    SERVICE_ACCOUNT = 'SERVICE_ACCOUNT'

def validate_auth_token(auth_header: str) -> Optional[Dict[str, Any]]:
    """Validate authentication token with auth-service"""
    try:
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        headers = {'Authorization': auth_header}
        response = requests.get(AUTH_VALIDATE_ENDPOINT, headers=headers, timeout=5)
        
        if response.status_code == 200:
            user_info = response.json()
            logger.info(f"Token validated for user: {user_info.get('username')} (ID: {user_info.get('id')})")
            return user_info
        else:
            logger.warning(f"Token validation failed: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error validating token: {str(e)}")
        return None

def check_legacy_auth(request) -> bool:
    """Check legacy API token authentication"""
    if not LEGACY_AUTH_ENABLED:
        return False
        
    auth_header = request.headers.get('Authorization')
    api_token = request.headers.get('X-API-Token')
    
    # Check header-based auth first
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        return token == API_TOKEN
    elif api_token:
        return api_token == API_TOKEN
    
    # Check for token in JSON payload (deprecated but supported for backward compatibility)
    try:
        if request.is_json:
            data = request.get_json()
            if data and data.get('token') == API_TOKEN:
                return True
    except Exception:
        pass  # Ignore JSON parsing errors
    
    return False

def require_auth(roles_required: List[str] = None):
    """Decorator to require authentication and optional role authorization"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check legacy auth first for backward compatibility
            if check_legacy_auth(request):
                logger.info("Request authenticated using legacy API token")
                g.user = {
                    'id': 'legacy',
                    'username': 'system',
                    'roles': [{'name': Role.SERVICE_ACCOUNT}],
                    'is_legacy': True
                }
                return f(*args, **kwargs)
            
            # Check modern auth-service token
            auth_header = request.headers.get('Authorization')
            user_info = validate_auth_token(auth_header)
            
            if not user_info:
                logger.warning("Authentication failed - no valid token provided")
                return jsonify({'error': 'Authentication required'}), 401
            
            # Store user info in Flask's g object
            g.user = user_info
            g.user['is_legacy'] = False
            
            # Check role authorization if required
            if roles_required:
                user_roles = [role.get('name') if isinstance(role, dict) else str(role) 
                            for role in user_info.get('roles', [])]
                
                if not any(role in user_roles for role in roles_required):
                    logger.warning(f"Authorization failed for user {user_info.get('username')} - required roles: {roles_required}, user roles: {user_roles}")
                    return jsonify({'error': 'Insufficient permissions'}), 403
            
            logger.info(f"Request authenticated for user: {user_info.get('username')} (roles: {user_info.get('roles')})")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def is_admin_or_service() -> bool:
    """Check if current user is admin or service account"""
    if not hasattr(g, 'user'):
        return False
    
    if g.user.get('is_legacy', False):
        return True
    
    user_roles = [role.get('name') if isinstance(role, dict) else str(role) 
                  for role in g.user.get('roles', [])]
    return Role.ADMIN in user_roles or Role.SERVICE_ACCOUNT in user_roles

def can_access_tunnel(server_id: str) -> bool:
    """Check if current user can access the specified tunnel"""
    if not hasattr(g, 'user'):
        return False
    
    # Legacy auth or admin/service accounts can access all tunnels
    if g.user.get('is_legacy', False) or is_admin_or_service():
        return True
    
    # For regular users, check if they own the tunnel
    instance_info = app.rathole_manager.instances.get(server_id)
    if instance_info:
        return instance_info.get('owner_id') == g.user.get('id')
    
    # For new tunnels, any authenticated user can create them
    return True

class RatholeInstanceManager:
    """Manages individual Rathole server instances"""
    
    def __init__(self):
        self.instances = {}  # server_id -> instance_info
        self.port_allocations = {}  # port -> server_id
        self.lock = threading.Lock()

        # Optional Redis client for persistent state
        self.redis = None
        if REDIS_HOST:
            try:
                self.redis = redis.Redis(
                    host=REDIS_HOST,
                    port=REDIS_PORT,
                    db=REDIS_DB,
                    password=REDIS_PASSWORD,
                    decode_responses=True,
                )
                # Test connection
                self.redis.ping()
                logger.info(
                    f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
                )
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.redis = None

        # Load state from Redis if available
        if self.redis:
            self._load_state_from_redis()

        # Ensure base directory exists
        Path(BASE_DATA_DIR).mkdir(parents=True, exist_ok=True)

        # Restore existing instances on startup
        self._restore_instances()

    def _load_state_from_redis(self):
        """Load saved instances and port allocations from Redis"""
        try:
            port_data = self.redis.hgetall('rathole:port_allocations')
            self.port_allocations.update({int(p): sid for p, sid in port_data.items()})

            for key in self.redis.scan_iter('rathole:instance:*'):
                data = self.redis.get(key)
                if not data:
                    continue
                info = json.loads(data)
                self.instances[info['server_id']] = info
        except Exception as e:
            logger.error(f"Error loading state from Redis: {e}")
    
    def _restore_instances(self):
        """Restore instance tracking from existing directories"""
        try:
            base_path = Path(BASE_DATA_DIR)
            if not base_path.exists():
                return
                
            for instance_dir in base_path.iterdir():
                if instance_dir.is_dir():
                    server_id = instance_dir.name
                    config_file = instance_dir / 'rathole-server.toml'
                    pid_file = instance_dir / 'rathole.pid'
                    
                    if config_file.exists():
                        # Check if process is still running
                        is_running = False
                        pid = None
                        
                        if pid_file.exists():
                            try:
                                with open(pid_file, 'r') as f:
                                    pid = int(f.read().strip())
                                    # Check if process exists
                                    os.kill(pid, 0)
                                    is_running = True
                            except (OSError, ValueError):
                                # Process doesn't exist or invalid PID
                                if pid_file.exists():
                                    pid_file.unlink()
                        
                        # Read config to get port info
                        game_port, query_port, rathole_port = self._parse_config_ports(config_file)
                        
                        instance_info = {
                            'server_id': server_id,
                            'game_port': game_port,
                            'query_port': query_port,
                            'rathole_port': rathole_port,
                            'config_dir': str(instance_dir),
                            'is_running': is_running,
                            'pid': pid,
                            'created_at': datetime.now().isoformat()
                        }
                        
                        self.instances[server_id] = instance_info
                        if rathole_port:
                            self.port_allocations[rathole_port] = server_id
                            if self.redis:
                                self.redis.hset('rathole:port_allocations', rathole_port, server_id)
                        if self.redis:
                            self.redis.set(f'rathole:instance:{server_id}', json.dumps(instance_info))
                        
                        logger.info(f"Restored instance {server_id}: running={is_running}, port={rathole_port}")
                        
        except Exception as e:
            logger.error(f"Error restoring instances: {e}")
    
    def _parse_config_ports(self, config_file: Path) -> tuple:
        """Parse Rathole config file to extract port information"""
        try:
            with open(config_file, 'r') as f:
                content = f.read()
                
            # Simple parsing - look for bind_addr patterns
            import re
            
            # Main server bind address
            server_match = re.search(r'bind_addr\s*=\s*"[^:]*:(\d+)"', content)
            rathole_port = int(server_match.group(1)) if server_match else None
            
            # Service ports (game and query API)
            service_matches = re.findall(r'local_addr\s*=\s*"[^:]*:(\d+)"', content)
            ports = [int(p) for p in service_matches] if service_matches else []
            
            game_port = ports[0] if len(ports) > 0 else None
            query_port = ports[1] if len(ports) > 1 else None
            
            return game_port, query_port, rathole_port
            
        except Exception as e:
            logger.error(f"Error parsing config {config_file}: {e}")
            return None, None, None
    
    def _allocate_rathole_port(self) -> Optional[int]:
        """Allocate an available port for a new Rathole server instance"""
        # Note: This method should only be called when self.lock is already held
        for port in range(RATHOLE_PORT_START, RATHOLE_PORT_END + 1):
            if port not in self.port_allocations:
                if self.redis:
                    if not self.redis.hexists('rathole:port_allocations', port):
                        return port
                else:
                    return port
        return None

    def _allocate_game_port(self) -> Optional[int]:
        """Allocate an available port for game traffic (tunnel endpoint)"""
        # Note: This method should only be called when self.lock is already held
        for port in range(GAME_PORT_START, GAME_PORT_END + 1):
            if port not in self.port_allocations:
                if self.redis:
                    if not self.redis.hexists('rathole:port_allocations', port):
                        return port
                else:
                    return port
        return None
    
    def _generate_server_config(self, server_id: str, original_game_port: int, rathole_port: int, tunnel_game_port: int, tunnel_query_port: Optional[int] = None) -> str:
        """Generate Rathole server configuration for a specific game server.

        The game TCP and UDP services use the same public port. This simplifies
        client connectivity as some games (like Satisfactory) expect the same
        port for both protocols.
        """
        # Base configuration for the server
        config = f"""
        [server]
        bind_addr = "{PUBLIC_IP}:{rathole_port}"
        default_token = "{API_TOKEN}"

        [server.services.{server_id}_game_tcp]
        type = "tcp"
        bind_addr = "{PUBLIC_IP}:{tunnel_game_port}"

        [server.services.{server_id}_game_udp]
        type = "udp"
        bind_addr = "{PUBLIC_IP}:{tunnel_game_port}"
"""
        # Conditionally add the query API service if a query port is provided (TCP only)
        if tunnel_query_port:
            config += f"""
        [server.services.{server_id}_query]
        type = "tcp"
        bind_addr = "{PUBLIC_IP}:{tunnel_query_port}"
"""
        return config
    
    def create_instance(self, server_id: str, game_port: int, query_port: Optional[int] = None, owner_id: str = None, owner_username: str = None) -> Dict[str, Any]:
        """Create a new Rathole server instance for a game server"""
        logger.info(f"Creating instance for server_id={server_id}, game_port={game_port}, query_port={query_port}, owner={owner_username}")
        try:
            with self.lock:
                logger.info(f"Acquired lock for {server_id}")
                if server_id in self.instances:
                    logger.warning(f"Instance {server_id} already exists")
                    return {'status': 'error', 'message': f'Instance {server_id} already exists'}
                
                # Allocate Rathole server port (for internal control)
                logger.info(f"Allocating Rathole control port for {server_id}")
                rathole_port = self._allocate_rathole_port()
                if not rathole_port:
                    logger.error(f"No available Rathole control ports for {server_id}")
                    return {'status': 'error', 'message': 'No available Rathole control ports'}
                # Mark rathole port as allocated immediately
                self.port_allocations[rathole_port] = server_id
                if self.redis:
                    self.redis.hset('rathole:port_allocations', rathole_port, server_id)
                
                # Allocate a single tunnel port for both TCP and UDP game traffic
                logger.info(f"Allocating tunnel game port for {server_id}")
                tunnel_game_port = self._allocate_game_port()
                if not tunnel_game_port:
                    logger.error(f"No available tunnel game ports for {server_id}")
                    return {'status': 'error', 'message': 'No available tunnel game ports'}
                # Mark game port as allocated immediately
                self.port_allocations[tunnel_game_port] = server_id
                if self.redis:
                    self.redis.hset('rathole:port_allocations', tunnel_game_port, server_id)
                
                # Allocate tunnel query port if needed
                tunnel_query_port = None
                if query_port:
                    tunnel_query_port = self._allocate_game_port()
                    if not tunnel_query_port:
                        logger.error(f"No available tunnel query ports for {server_id}")
                        return {'status': 'error', 'message': 'No available tunnel query ports'}
                    # Mark query port as allocated immediately
                    self.port_allocations[tunnel_query_port] = server_id
                    if self.redis:
                        self.redis.hset('rathole:port_allocations', tunnel_query_port, server_id)
                
                logger.info(f"Allocated ports for {server_id}: rathole={rathole_port}, tunnel_game={tunnel_game_port}, tunnel_query={tunnel_query_port}")
                
                # Create instance directory
                instance_dir = Path(BASE_DATA_DIR) / server_id
                logger.info(f"Creating instance directory: {instance_dir}")
                instance_dir.mkdir(parents=True, exist_ok=True)
                
                # Generate configuration
                logger.info(f"Generating configuration for {server_id}")
                config_content = self._generate_server_config(server_id, game_port, rathole_port, tunnel_game_port, tunnel_query_port)
                config_file = instance_dir / 'rathole-server.toml'
                
                with open(config_file, 'w') as f:
                    f.write(config_content)
                
                logger.info(f"Written config file: {config_file}")
                
                # Start Rathole server process
                log_file = instance_dir / 'rathole.log'
                pid_file = instance_dir / 'rathole.pid'
                
                logger.info(f"Starting Rathole process for {server_id} with binary: {RATHOLE_BINARY}")
                process = subprocess.Popen(
                    [RATHOLE_BINARY, str(config_file)],
                    cwd=str(instance_dir),
                    stdout=open(log_file, 'w'),
                    stderr=subprocess.STDOUT,
                    preexec_fn=os.setsid
                )
                
                logger.info(f"Started process with PID: {process.pid}")

                # Verify process started successfully
                time.sleep(1)
                if process.poll() is not None:
                    error_msg = f"Rathole process for {server_id} exited immediately"
                    logger.error(error_msg)
                    with open(log_file, 'r') as lf:
                        log_content = lf.read()
                    # Cleanup allocations
                    for port in [rathole_port, tunnel_game_port, tunnel_query_port]:
                        if port and port in self.port_allocations:
                            del self.port_allocations[port]
                            if self.redis:
                                self.redis.hdel('rathole:port_allocations', port)
                    return {'status': 'error', 'message': error_msg, 'log': log_content}
                
                # Save PID
                with open(pid_file, 'w') as f:
                    f.write(str(process.pid))
                
                # Track instance with ownership
                instance_info = {
                    'server_id': server_id,
                    'game_port': game_port,           # Original game server port
                    'query_port': query_port,         # Original query server port  
                    'tunnel_game_tcp_port': tunnel_game_port,     # Public tunnel port for game TCP traffic
                    'tunnel_game_udp_port': tunnel_game_port,     # Public tunnel port for game UDP traffic
                    'tunnel_query_port': tunnel_query_port,   # Public tunnel port for query traffic
                    'rathole_port': rathole_port,     # Rathole control port
                    'owner_id': owner_id,
                    'owner_username': owner_username,
                    'config_dir': str(instance_dir),
                    'is_running': True,
                    'pid': process.pid,
                    'created_at': datetime.now().isoformat()
                }
                
                self.instances[server_id] = instance_info
                if self.redis:
                    self.redis.set(f'rathole:instance:{server_id}', json.dumps(instance_info))
                # Port allocations were already done immediately after each allocation above
                
                logger.info(f"Created Rathole instance {server_id}: rathole_port={rathole_port}, tunnel_game_port={tunnel_game_port}, tunnel_query_port={tunnel_query_port}")
                
                return {
                    'status': 'success',
                    'server_id': server_id,
                    'rathole_port': rathole_port,
                    'original_game_port': game_port,
                    'original_query_port': query_port,
                    'tunnel_game_tcp_port': tunnel_game_port,
                    'tunnel_game_udp_port': tunnel_game_port,
                    'tunnel_query_port': tunnel_query_port,
                    'config_dir': str(instance_dir),
                    'public_connection_info': {
                        'game_tcp_address': f"{PUBLIC_HOST_IP}:{tunnel_game_port}",
                        'game_udp_address': f"{PUBLIC_HOST_IP}:{tunnel_game_port}",
                        'query_address': f"{PUBLIC_HOST_IP}:{tunnel_query_port}" if tunnel_query_port else None
                    }
                }
                
        except Exception as e:
            logger.error(f"Error creating instance {server_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def remove_instance(self, server_id: str) -> Dict[str, Any]:
        """Remove a Rathole server instance"""
        try:
            with self.lock:
                if server_id not in self.instances:
                    return {'status': 'error', 'message': f'Instance {server_id} not found'}
                
                instance_info = self.instances[server_id]
                
                # Stop process if running
                if instance_info.get('is_running') and instance_info.get('pid'):
                    try:
                        # Kill process group to ensure cleanup
                        os.killpg(os.getpgid(instance_info['pid']), signal.SIGTERM)
                        time.sleep(2)
                        
                        # Force kill if still running
                        try:
                            os.killpg(os.getpgid(instance_info['pid']), signal.SIGKILL)
                        except OSError:
                            pass  # Process already dead
                            
                    except OSError:
                        pass  # Process already dead
                
                # Clean up port allocations
                rathole_port = instance_info.get('rathole_port')
                tunnel_game_tcp_port = instance_info.get('tunnel_game_tcp_port')
                tunnel_game_udp_port = instance_info.get('tunnel_game_udp_port')
                tunnel_query_port = instance_info.get('tunnel_query_port')

                for port in [rathole_port, tunnel_game_tcp_port, tunnel_game_udp_port, tunnel_query_port]:
                    if port and port in self.port_allocations:
                        del self.port_allocations[port]
                        if self.redis:
                            self.redis.hdel('rathole:port_allocations', port)
                
                # Remove instance directory
                config_dir = Path(instance_info['config_dir'])
                if config_dir.exists():
                    shutil.rmtree(config_dir)
                
                # Remove from tracking
                del self.instances[server_id]
                if self.redis:
                    self.redis.delete(f'rathole:instance:{server_id}')

                logger.info(f"Removed Rathole instance {server_id}")
                
                return {'status': 'success', 'message': f'Instance {server_id} removed'}
                
        except Exception as e:
            logger.error(f"Error removing instance {server_id}: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_instance(self, server_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific instance"""
        return self.instances.get(server_id)
    
    def list_instances(self) -> Dict[str, Any]:
        """List all instances"""
        return dict(self.instances)

    def shutdown_all_instances(self) -> Dict[str, Any]:
        """Force stop and remove all instances"""
        removed = []
        for server_id in list(self.instances.keys()):
            res = self.remove_instance(server_id)
            if res.get('status') == 'success':
                removed.append(server_id)
        return {'status': 'success', 'removed': removed, 'remaining': list(self.instances.keys())}
    
    def get_client_config(self, server_id: str, host_ip: str) -> Optional[str]:
        """Generate client configuration for a specific server"""
        if server_id not in self.instances:
            return None
        
        instance_info = self.instances[server_id]
        rathole_port = instance_info['rathole_port']
        original_game_port = instance_info['game_port']
        original_query_port = instance_info['query_port']
        
        # Base client configuration
        config = f"""
        [client]
        remote_addr = "{INTERNAL_SERVER_HOST}:{rathole_port}"
        default_token = "{API_TOKEN}"

        [client.services.{server_id}_game_tcp]
        type = "tcp"
        local_addr = "{host_ip}:{original_game_port}"

        [client.services.{server_id}_game_udp]
        type = "udp"
        local_addr = "{host_ip}:{original_game_port}"
"""
        
        # Conditionally add the query API service if a query port exists
        if original_query_port:
            config += f"""
            [client.services.{server_id}_query]
            type = "tcp"
            local_addr = "{host_ip}:{original_query_port}"
"""
        
        return config

# Initialize manager
rathole_manager = RatholeInstanceManager()
app.rathole_manager = rathole_manager  # Make manager accessible from auth functions

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint - no authentication required"""
    logger.info(f"GET /health called from {request.remote_addr}")
    return jsonify({
        'status': 'healthy', 
        'service': 'rathole-instance-manager',
        'version': '2.0.0-secure',
        'auth_service': AUTH_SERVICE_URL,
        'https_enabled': USE_HTTPS,
        'legacy_auth_enabled': LEGACY_AUTH_ENABLED,
        'active_instances': len(rathole_manager.instances)
    })

@app.route('/api/instances', methods=['POST'])
@require_auth()
def create_instance():
    """Create a new Rathole instance"""
    logger.info(f"POST /api/instances called from {request.remote_addr} by user {g.user.get('username')}")
    logger.info(f"Request headers: {dict(request.headers)}")
    logger.info(f"Request content type: {request.content_type}")
    try:
        data = request.get_json()
        logger.info(f"Request JSON data: {data}")
        
        # Validate required fields
        required_fields = ['server_id', 'game_port']
        for field in required_fields:
            if field not in data:
                logger.error(f"Missing required field: {field}")
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # query_port is optional, default to None
        query_port = data.get('query_port', None)
        
        # Get owner information from authenticated user
        owner_id = g.user.get('id')
        owner_username = g.user.get('username')
        
        logger.info(f"Calling rathole_manager.create_instance with: {data['server_id']}, {data['game_port']}, {query_port}, owner: {owner_username}")
        result = rathole_manager.create_instance(
            data['server_id'],
            data['game_port'],
            query_port,
            owner_id,
            owner_username
        )
        
        logger.info(f"Result from create_instance: {result}")
        
        if result['status'] == 'success':
            logger.info(f"Successfully created instance for {data['server_id']} by {owner_username}")
            return jsonify(result), 200
        else:
            logger.error(f"Failed to create instance for {data['server_id']}: {result}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error in create_instance endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances/<server_id>', methods=['DELETE'])
@require_auth()
def remove_instance(server_id):
    """Remove a Rathole instance"""
    logger.info(f"DELETE /api/instances/{server_id} called by user {g.user.get('username')}")
    try:
        # Check access permissions
        if not can_access_tunnel(server_id):
            logger.warning(f"User {g.user.get('username')} attempted to delete unauthorized tunnel {server_id}")
            return jsonify({'error': 'Access denied - you can only manage your own tunnels'}), 403
        
        result = rathole_manager.remove_instance(server_id)
        
        if result['status'] == 'success':
            logger.info(f"Successfully removed instance {server_id} by {g.user.get('username')}")
            return jsonify(result), 200
        else:
            return jsonify(result), 500 if 'not found' not in result['message'] else 404
            
    except Exception as e:
        logger.error(f"Error in remove_instance endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances', methods=['GET'])
@require_auth()
def list_instances():
    """List instances accessible to the current user"""
    logger.info(f"GET /api/instances called by user {g.user.get('username')}")
    try:
        all_instances = rathole_manager.list_instances()
        
        # Filter instances based on user permissions
        if is_admin_or_service():
            # Admin/service accounts can see all instances
            accessible_instances = all_instances
            logger.info(f"Returning all {len(accessible_instances)} instances for admin/service user {g.user.get('username')}")
        else:
            # Regular users can only see their own instances
            user_id = g.user.get('id')
            accessible_instances = [
                instance for instance in all_instances 
                if instance.get('owner_id') == user_id
            ]
            logger.info(f"Returning {len(accessible_instances)} user-owned instances for {g.user.get('username')}")
        
        return jsonify({'status': 'success', 'instances': accessible_instances}), 200
        
    except Exception as e:
        logger.error(f"Error in list_instances endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances/<server_id>', methods=['GET'])
@require_auth()
def get_instance(server_id):
    """Get information about a specific instance"""
    logger.info(f"GET /api/instances/{server_id} called by user {g.user.get('username')}")
    try:
        # Check access permissions
        if not can_access_tunnel(server_id):
            logger.warning(f"User {g.user.get('username')} attempted to access unauthorized tunnel {server_id}")
            return jsonify({'error': 'Access denied - you can only access your own tunnels'}), 403
        
        instance = rathole_manager.get_instance(server_id)
        if instance:
            return jsonify({'status': 'success', 'instance': instance}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Instance not found'}), 404
            
    except Exception as e:
        logger.error(f"Error in get_instance endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances/<server_id>/client-config', methods=['GET'])
@require_auth()
def get_client_config(server_id):
    """Get client configuration for a specific server"""
    logger.info(f"GET /api/instances/{server_id}/client-config called from {request.remote_addr} by user {g.user.get('username')}")
    logger.info(f"Request args: {dict(request.args)}")
    try:
        # Check access permissions
        if not can_access_tunnel(server_id):
            logger.warning(f"User {g.user.get('username')} attempted to get client config for unauthorized tunnel {server_id}")
            return jsonify({'error': 'Access denied - you can only access your own tunnels'}), 403
        
        host_ip = request.args.get('host_ip', '127.0.0.1')
        config = rathole_manager.get_client_config(server_id, host_ip)
        
        if config:
            logger.info(f"Returning client config for {server_id} to {g.user.get('username')}")
            return jsonify({
                'status': 'success', 
                'config': config,
                'server_id': server_id,
                'host_ip': host_ip
            }), 200
        else:
            return jsonify({'status': 'error', 'message': 'Instance not found'}), 404
            
    except Exception as e:
        logger.error(f"Error in get_client_config endpoint: {e}")
        return jsonify({'error': str(e)}), 500

# Admin-only endpoints for management
@app.route('/api/admin/instances', methods=['GET'])
@require_auth([Role.ADMIN, Role.SERVICE_ACCOUNT])
def admin_list_instances():
    """Admin endpoint to list all instances with full details"""
    logger.info(f"GET /api/admin/instances called by admin user {g.user.get('username')}")
    try:
        instances = rathole_manager.list_instances()
        return jsonify({
            'status': 'success', 
            'instances': instances,
            'total_count': len(instances)
        }), 200
        
    except Exception as e:
        logger.error(f"Error in admin_list_instances endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/instances/<server_id>', methods=['DELETE'])
@require_auth([Role.ADMIN])
def admin_remove_instance(server_id):
    """Admin endpoint to remove any instance"""
    logger.info(f"DELETE /api/admin/instances/{server_id} called by admin user {g.user.get('username')}")
    try:
        result = rathole_manager.remove_instance(server_id)
        
        if result['status'] == 'success':
            logger.info(f"Admin {g.user.get('username')} successfully removed instance {server_id}")
            return jsonify(result), 200
        else:
            return jsonify(result), 500 if 'not found' not in result['message'] else 404
            
    except Exception as e:
        logger.error(f"Error in admin_remove_instance endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/instances/<server_id>/log', methods=['GET'])
@require_auth([Role.ADMIN, Role.SERVICE_ACCOUNT])
def admin_get_instance_log(server_id):
    """Retrieve log file for an instance"""
    try:
        instance = rathole_manager.get_instance(server_id)
        if not instance:
            return jsonify({'status': 'error', 'message': 'Instance not found'}), 404
        log_path = Path(instance['config_dir']) / 'rathole.log'
        if not log_path.exists():
            return jsonify({'status': 'error', 'message': 'Log file not found'}), 404
        with open(log_path, 'r') as f:
            content = f.read()
        return jsonify({'status': 'success', 'log': content})
    except Exception as e:
        logger.error(f"Error getting log for {server_id}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/sanity-check', methods=['POST'])
@require_auth([Role.ADMIN, Role.SERVICE_ACCOUNT])
def admin_sanity_check():
    """Force shutdown of all tunnels and verify closure"""
    try:
        result = rathole_manager.shutdown_all_instances()
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error in sanity check: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info(f"Starting Secure Rathole Instance Manager")
    logger.info(f"Auth Service: {AUTH_SERVICE_URL}")
    logger.info(f"HTTPS Enabled: {USE_HTTPS}")
    logger.info(f"Legacy Auth Enabled: {LEGACY_AUTH_ENABLED}")
    logger.info(f"Managing instances in: {BASE_DATA_DIR}")
    logger.info(f"Port range: {RATHOLE_PORT_START}-{RATHOLE_PORT_END}")
    logger.info(f"Server bind IP: {PUBLIC_IP} (for rathole server binding)")
    logger.info(f"Client connect IP: {PUBLIC_HOST_IP} (for external connections)")
    logger.info(f"Internal server host: {INTERNAL_SERVER_HOST} (for container-to-container communication)")
    
    # Test auth service connectivity on startup
    if not LEGACY_AUTH_ENABLED:
        try:
            response = requests.get(f"{AUTH_SERVICE_URL}/api/auth/health", timeout=5)
            if response.status_code == 200:
                logger.info("✓ Auth service connectivity verified")
            else:
                logger.warning(f"⚠ Auth service returned status {response.status_code}")
        except Exception as e:
            logger.error(f"✗ Cannot connect to auth service: {e}")
            logger.error("Consider enabling LEGACY_AUTH_ENABLED=true for development")
    
    if os.getenv('FLASK_ENV') == 'development':
        # Development mode - HTTP only
        logger.info(f"Starting in development mode on HTTP port {SERVER_PORT}")
        app.run(host='0.0.0.0', port=SERVER_PORT, debug=True)
    elif USE_HTTPS and os.path.exists(SSL_CERT_PATH) and os.path.exists(SSL_KEY_PATH):
        # Production mode with HTTPS
        logger.info(f"Starting in production mode with HTTPS on port {HTTPS_PORT}")
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(SSL_CERT_PATH, SSL_KEY_PATH)
        
        serve(app, 
              host='0.0.0.0', 
              port=HTTPS_PORT, 
              ssl_context=ssl_context,
              threads=8)
    else:
        # Production mode - HTTP fallback
        logger.info(f"Starting in production mode on HTTP port {SERVER_PORT}")
        if USE_HTTPS:
            logger.warning("HTTPS requested but SSL certificates not found - falling back to HTTP")
        serve(app, host='0.0.0.0', port=SERVER_PORT, threads=8)
