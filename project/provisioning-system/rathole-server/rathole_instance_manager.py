#!/usr/bin/env python3
"""
Individual Rathole Instance Manager
Manages separate Rathole server instances for each game server.
Each game server gets its own isolated tunnel setup.
"""

import os
import json
import logging
import subprocess
import signal
import shutil
from flask import Flask, request, jsonify
from waitress import serve
from typing import Dict, Any, Optional, List
from pathlib import Path
import threading
import time
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
API_TOKEN = os.getenv('API_TOKEN', 'your-api-control-token-here')
SERVER_PORT = int(os.getenv('SERVER_PORT', '7001'))
RATHOLE_BINARY = os.getenv('RATHOLE_BINARY', '/usr/local/bin/rathole')
BASE_DATA_DIR = os.getenv('BASE_DATA_DIR', '/data/rathole-instances')
PUBLIC_IP = os.getenv('PUBLIC_IP', '0.0.0.0')

# Port range for Rathole server instances
# Each game server will get allocated 2 consecutive ports from this range
RATHOLE_PORT_START = int(os.getenv('RATHOLE_PORT_START', '10000'))
RATHOLE_PORT_END = int(os.getenv('RATHOLE_PORT_END', '20000'))

class RatholeInstanceManager:
    """Manages individual Rathole server instances"""
    
    def __init__(self):
        self.instances = {}  # server_id -> instance_info
        self.port_allocations = {}  # port -> server_id
        self.lock = threading.Lock()
        
        # Ensure base directory exists
        Path(BASE_DATA_DIR).mkdir(parents=True, exist_ok=True)
        
        # Restore existing instances on startup
        self._restore_instances()
    
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
                return port
        return None
    
    def _generate_server_config(self, server_id: str, game_port: int, rathole_port: int, query_port: Optional[int] = None) -> str:
        """Generate Rathole server configuration for a specific game server"""
        # Base configuration for the server
        config = f"""[server]
bind_addr = "{PUBLIC_IP}:{rathole_port}"
default_token = "{API_TOKEN}"
heartbeat_interval = 30

[server.transport]
type = "tcp"

[server.services.{server_id}_game_tcp]
type = "tcp"
token = "{API_TOKEN}"
bind_addr = "{PUBLIC_IP}:{game_port}"
nodelay = true

[server.services.{server_id}_game_udp]
type = "udp"
token = "{API_TOKEN}"
bind_addr = "{PUBLIC_IP}:{game_port}"
nodelay = true
"""
        # Conditionally add the query API service if a query port is provided (TCP only)
        if query_port:
            config += f"""
[server.services.{server_id}_query]
type = "tcp"
token = "{API_TOKEN}"
bind_addr = "{PUBLIC_IP}:{query_port}"
nodelay = true
"""
        return config
    
    def create_instance(self, server_id: str, game_port: int, query_port: Optional[int] = None) -> Dict[str, Any]:
        """Create a new Rathole server instance for a game server"""
        logger.info(f"Creating instance for server_id={server_id}, game_port={game_port}, query_port={query_port}")
        try:
            with self.lock:
                logger.info(f"Acquired lock for {server_id}")
                if server_id in self.instances:
                    logger.warning(f"Instance {server_id} already exists")
                    return {'status': 'error', 'message': f'Instance {server_id} already exists'}
                
                # Allocate Rathole server port
                logger.info(f"Allocating Rathole port for {server_id}")
                rathole_port = self._allocate_rathole_port()
                if not rathole_port:
                    logger.error(f"No available ports for Rathole server for {server_id}")
                    return {'status': 'error', 'message': 'No available ports for Rathole server'}
                
                logger.info(f"Allocated port {rathole_port} for {server_id}")
                
                # Create instance directory
                instance_dir = Path(BASE_DATA_DIR) / server_id
                logger.info(f"Creating instance directory: {instance_dir}")
                instance_dir.mkdir(parents=True, exist_ok=True)
                
                # Generate configuration
                logger.info(f"Generating configuration for {server_id}")
                config_content = self._generate_server_config(server_id, game_port, rathole_port, query_port)
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
                
                # Save PID
                with open(pid_file, 'w') as f:
                    f.write(str(process.pid))
                
                # Track instance
                instance_info = {
                    'server_id': server_id,
                    'game_port': game_port,
                    'query_port': query_port,
                    'rathole_port': rathole_port,
                    'config_dir': str(instance_dir),
                    'is_running': True,
                    'pid': process.pid,
                    'created_at': datetime.now().isoformat()
                }
                
                self.instances[server_id] = instance_info
                self.port_allocations[rathole_port] = server_id
                
                logger.info(f"Created Rathole instance {server_id} on port {rathole_port}")
                
                return {
                    'status': 'success',
                    'server_id': server_id,
                    'rathole_port': rathole_port,
                    'game_port': game_port,
                    'query_port': query_port,
                    'config_dir': str(instance_dir)
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
                
                # Clean up port allocation
                rathole_port = instance_info.get('rathole_port')
                if rathole_port and rathole_port in self.port_allocations:
                    del self.port_allocations[rathole_port]
                
                # Remove instance directory
                config_dir = Path(instance_info['config_dir'])
                if config_dir.exists():
                    shutil.rmtree(config_dir)
                
                # Remove from tracking
                del self.instances[server_id]
                
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
    
    def get_client_config(self, server_id: str, host_ip: str) -> Optional[str]:
        """Generate client configuration for a specific server"""
        if server_id not in self.instances:
            return None
        
        instance_info = self.instances[server_id]
        rathole_port = instance_info['rathole_port']
        game_port = instance_info['game_port']
        query_port = instance_info['query_port']
        
        # Base client configuration
        config = f"""[client]
remote_addr = "{PUBLIC_IP}:{rathole_port}"
default_token = "{API_TOKEN}"
heartbeat_timeout = 40
retry_interval = 1

[client.transport]
type = "tcp"

[client.transport.tcp]
keepalive_secs = 5
keepalive_interval = 2

[client.services.{server_id}_game_tcp]
type = "tcp"
token = "{API_TOKEN}"
local_addr = "{host_ip}:{game_port}"
nodelay = true

[client.services.{server_id}_game_udp]
type = "udp"
token = "{API_TOKEN}"
local_addr = "{host_ip}:{game_port}"
nodelay = true
"""
        
        # Conditionally add the query API service if a query port exists
        if query_port:
            config += f"""
[client.services.{server_id}_query]
type = "tcp"
token = "{API_TOKEN}"
local_addr = "{host_ip}:{query_port}"
nodelay = true
"""
        
        return config

# Initialize manager
rathole_manager = RatholeInstanceManager()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    logger.info(f"GET /health called from {request.remote_addr}")
    return jsonify({
        'status': 'healthy', 
        'service': 'rathole-instance-manager',
        'active_instances': len(rathole_manager.instances)
    })

@app.route('/api/instances', methods=['POST'])
def create_instance():
    """Create a new Rathole instance"""
    logger.info(f"POST /api/instances called from {request.remote_addr}")
    logger.info(f"Request headers: {dict(request.headers)}")
    logger.info(f"Request content type: {request.content_type}")
    try:
        data = request.get_json()
        logger.info(f"Request JSON data: {data}")
        
        # Validate token
        if data.get('token') != API_TOKEN:
            logger.warning("Invalid token provided")
            return jsonify({'error': 'Invalid token'}), 401
        
        # Validate required fields
        required_fields = ['server_id', 'game_port']
        for field in required_fields:
            if field not in data:
                logger.error(f"Missing required field: {field}")
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # beacon_port is optional, default to None
        query_port = data.get('query_port', None)
        
        logger.info(f"Calling rathole_manager.create_instance with: {data['server_id']}, {data['game_port']}, {query_port}")
        result = rathole_manager.create_instance(
            data['server_id'],
            data['game_port'],
            query_port
        )
        
        logger.info(f"Result from create_instance: {result}")
        
        if result['status'] == 'success':
            logger.info(f"Successfully created instance for {data['server_id']}")
            return jsonify(result), 200
        else:
            logger.error(f"Failed to create instance for {data['server_id']}: {result}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error in create_instance endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances/<server_id>', methods=['DELETE'])
def remove_instance(server_id):
    """Remove a Rathole instance"""
    try:
        # Validate token
        token = request.args.get('token')
        if token != API_TOKEN:
            return jsonify({'error': 'Invalid token'}), 401
        
        result = rathole_manager.remove_instance(server_id)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500 if 'not found' not in result['message'] else 404
            
    except Exception as e:
        logger.error(f"Error in remove_instance endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances', methods=['GET'])
def list_instances():
    """List all instances"""
    try:
        # Validate token
        token = request.args.get('token')
        if token != API_TOKEN:
            return jsonify({'error': 'Invalid token'}), 401
        
        instances = rathole_manager.list_instances()
        return jsonify({'status': 'success', 'instances': instances}), 200
        
    except Exception as e:
        logger.error(f"Error in list_instances endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances/<server_id>', methods=['GET'])
def get_instance(server_id):
    """Get information about a specific instance"""
    try:
        # Validate token
        token = request.args.get('token')
        if token != API_TOKEN:
            return jsonify({'error': 'Invalid token'}), 401
        
        instance = rathole_manager.get_instance(server_id)
        if instance:
            return jsonify({'status': 'success', 'instance': instance}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Instance not found'}), 404
            
    except Exception as e:
        logger.error(f"Error in get_instance endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/instances/<server_id>/client-config', methods=['GET'])
def get_client_config(server_id):
    """Get client configuration for a specific server"""
    logger.info(f"GET /api/instances/{server_id}/client-config called from {request.remote_addr}")
    logger.info(f"Request args: {dict(request.args)}")
    try:
        # Validate token
        token = request.args.get('token')
        if token != API_TOKEN:
            logger.warning("Invalid token provided for client config")
            return jsonify({'error': 'Invalid token'}), 401
        
        host_ip = request.args.get('host_ip', '127.0.0.1')
        config = rathole_manager.get_client_config(server_id, host_ip)
        
        if config:
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

if __name__ == '__main__':
    logger.info(f"Starting Rathole Instance Manager on port {SERVER_PORT}")
    logger.info(f"Managing instances in: {BASE_DATA_DIR}")
    logger.info(f"Port range: {RATHOLE_PORT_START}-{RATHOLE_PORT_END}")
    
    if os.getenv('FLASK_ENV') == 'development':
        app.run(host='0.0.0.0', port=SERVER_PORT, debug=True)
    else:
        serve(app, host='0.0.0.0', port=SERVER_PORT, threads=4)
