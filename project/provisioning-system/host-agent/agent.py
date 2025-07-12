from flask import Flask, request, jsonify, g
import docker
import psutil
import os
import json
import threading
import time
import yaml
import subprocess
import sys
import traceback
from datetime import datetime
import requests
import socket
from dotenv import load_dotenv

# Load environment variables from .env file (if it exists)
load_dotenv()

app = Flask(__name__)
client = docker.from_env()

# Configuration
NODE_ID = os.environ.get('NODE_ID', 'node-1')
ORCHESTRATOR_HOST = os.environ.get('ORCHESTRATOR_HOST', 'satisfactory-orchestrator')
ORCHESTRATOR_PORT = os.environ.get('ORCHESTRATOR_PORT', '8080')
ORCHESTRATOR_URL = f"http://{ORCHESTRATOR_HOST}:{ORCHESTRATOR_PORT}"

# When running in Docker compose during development the orchestrator can
# reliably reach the host agent using the container hostname. In
# production we still want to advertise the real IP address. This flag
# toggles which value is sent during registration.
USE_HOSTNAME_REGISTRATION = os.environ.get('USE_HOSTNAME_REGISTRATION', 'false').lower() == 'true'

# FRP Configuration (reuses previous env vars for compatibility)
RATHOLE_INSTANCE_MANAGER_HOST = '69.164.196.13'  # Instance manager host
RATHOLE_INSTANCE_MANAGER_PORT = os.environ.get('RATHOLE_INSTANCE_MANAGER_PORT', '7001')
RATHOLE_TOKEN = os.environ.get('RATHOLE_TOKEN', 'your-api-control-token-here')
RATHOLE_CLIENT_BINARY = os.environ.get('RATHOLE_CLIENT_BINARY', '/usr/local/bin/frpc')
RATHOLE_CLIENT_IMAGE = os.environ.get('RATHOLE_CLIENT_IMAGE', 'fatedier/frpc:0.57.0')
FRP_LOG_DIR = os.environ.get('FRP_LOG_DIR', '/var/log/frp')
os.makedirs(FRP_LOG_DIR, exist_ok=True)

# Authentication Configuration
# Enable HTTPS communication with the instance manager by default
USE_HTTPS_RATHOLE = os.environ.get('USE_HTTPS_RATHOLE', 'true').lower() == 'true'
ACCESS_TOKEN = os.environ.get('ACCESS_TOKEN', None)  # Access token from orchestrator
LEGACY_AUTH_ENABLED = os.environ.get('LEGACY_AUTH_ENABLED', 'true').lower() == 'true'
USE_CONTAINER_HOSTNAMES = os.environ.get('USE_CONTAINER_HOSTNAMES', 'false').lower() == 'true'

# Heartbeat Configuration (configurable via environment variables)
HEARTBEAT_INTERVAL = int(os.environ.get('HEARTBEAT_INTERVAL', '60'))  # seconds
HEARTBEAT_TIMEOUT = int(os.environ.get('HEARTBEAT_TIMEOUT', '10'))    # seconds
MAX_HEARTBEAT_FAILURES = int(os.environ.get('MAX_HEARTBEAT_FAILURES', '3'))

print(f"Host Agent Configuration:")
print(f"  Node ID: {NODE_ID}")
print(f"  Orchestrator URL: {ORCHESTRATOR_URL}")
print(f"  Heartbeat Interval: {HEARTBEAT_INTERVAL} seconds")
print(f"  Heartbeat Timeout: {HEARTBEAT_TIMEOUT} seconds")
print(f"  Max Failures: {MAX_HEARTBEAT_FAILURES}")
print(f"  Use Container Hostnames: {USE_CONTAINER_HOSTNAMES}")

# Container tracking
running_containers = {}

# FRP client tracking
frp_clients = {}  # server_id -> process info

def generate_satisfactory_config(server_name, max_players, game_port, beacon_port, server_password=None):
    """Generate Satisfactory server configuration with provided ports"""
    config = {
        "serverName": server_name,
        "maxPlayers": max_players,
        "serverPassword": server_password or "",
        "gamePort": game_port,
        "beaconPort": beacon_port,
        "autoPause": True,
        "autoSaveOnDisconnect": True
    }
    return config

def generate_docker_compose_config(
        server_id, server_name,
        game_port, beacon_port,
        ram_allocation, cpu_allocation,
        max_players, server_password,
        environment_vars,
        network_name,
        frp_config_path
):
    """Compose file that keeps container & public ports identical."""

    ram_allocation = ram_allocation or 4
    cpu_allocation = cpu_allocation or 2

    env_vars = {
        "PUID": "1000",
        "PGID": "1000",
        "MAXPLAYERS": str(max_players),
        "AUTOSAVENUM": "5",
        "STEAMBETA": "false",
        "SKIPUPDATE": "false",
        "TIMEOUT": "30",
        # ✨ NEW – tell the image which ports it must *both bind and advertise*
        "SERVERGAMEPORT": str(game_port),       # 7777 replacement
        "SERVERMESSAGINGPORT": str(beacon_port) # 8888 replacement
    }
    env_vars.update(environment_vars or {})

    compose = {
        "services": {
            server_id: {
                "image": "wolveix/satisfactory-server:latest",
                "container_name": server_id,
                "hostname": server_id,
                # 1 : 1 mapping – no remap, no NAT mismatch
                "ports": [
                    f"{game_port}:{game_port}/udp",
                    f"{game_port}:{game_port}/tcp",
                    f"{beacon_port}:{beacon_port}/tcp"
                ],
                "volumes": [f"./data/{server_id}:/config"],
                "environment": env_vars,
                "restart": "unless-stopped",
                "networks": [network_name],
                "deploy": {
                    "resources": {
                        "limits": {
                            "memory": f"{ram_allocation}G",
                            "cpus": str(cpu_allocation)
                        },
                        "reservations": {
                            "memory": f"{max(1, ram_allocation // 2)}G"
                        }
                    }
                }
            },
            f"{server_id}_frpc": {
                "image": RATHOLE_CLIENT_IMAGE,
                "container_name": f"{server_id}_frpc",
                "volumes": [f"{frp_config_path}:/app/client.toml:ro"],
                "command": ["/app/rathole", "/app/client.toml"],
                "restart": "unless-stopped",
                "depends_on": [server_id],
                "networks": [network_name]
            }
        },
        "networks": {network_name: {"external": False}}
    }
    return compose


def get_auth_headers():
    """Get authentication headers for tunnel manager API calls"""
    headers = {'Content-Type': 'application/json'}
    
    # Check if we have an access token from the request (priority)
    request_token = None
    if hasattr(g, 'access_token'):
        request_token = g.access_token
    
    # Use request token, fallback to environment ACCESS_TOKEN, then legacy
    if request_token:
        headers['Authorization'] = f'Bearer {request_token}'
    elif ACCESS_TOKEN:
        headers['Authorization'] = f'Bearer {ACCESS_TOKEN}'
    elif LEGACY_AUTH_ENABLED and RATHOLE_TOKEN:
        headers['X-API-Token'] = RATHOLE_TOKEN
    
    return headers

def get_rathole_base_url():
    """Get the base URL for the FRP instance manager"""
    protocol = 'https' if USE_HTTPS_RATHOLE else 'http'
    port = '443' if USE_HTTPS_RATHOLE else RATHOLE_INSTANCE_MANAGER_PORT

    base = f"{protocol}://{RATHOLE_INSTANCE_MANAGER_HOST}:{port}"

    # When routed through the nginx reverse proxy the manager lives under
    # the `/manager` path. Prefix all requests with this path so that the
    # URLs resolve correctly when HTTPS is enabled.
    return f"{base}/manager"

def create_tunnel_instance(server_id, game_port, beacon_port):
    """Create a tunnel instance on the FRP instance manager"""
    try:
        base_url = get_rathole_base_url()
        headers = get_auth_headers()
        
        # Use modern API format (no token in payload)
        payload = {
            'server_id': server_id,
            'game_port': game_port,
            'query_port': beacon_port
        }
        
        # For legacy auth, include token in payload
        if not ACCESS_TOKEN and LEGACY_AUTH_ENABLED:
            payload['token'] = RATHOLE_TOKEN
        url = f'{base_url}/api/instances'
        print(f"Creating tunnel instance for {server_id} at {url} with payload: {json.dumps(payload)}")
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=10,
            verify=False if USE_HTTPS_RATHOLE else True  # Skip SSL verification for self-signed certs
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                frps_port = data.get('frps_port')
                frps_token = data.get('frps_token')
                print(
                    f"✓ Created tunnel instance for {server_id} using {'access token' if ACCESS_TOKEN else 'legacy auth'} "
                    f"(frps_port={frps_port}, frps_token={frps_token})"
                )
                return True, frps_port, frps_token

        print(f"Failed to create tunnel instance for {server_id}: {response.status_code} - {response.text}")
        return False, None, None
        
    except Exception as e:
        print(f"Error creating tunnel instance for {server_id}: {str(e)}")
        return False, None, None

def get_rathole_client_config_from_manager(server_id):
    """Get FRP client configuration from the instance manager"""
    try:
        base_url = get_rathole_base_url()
        headers = get_auth_headers()

        # Determine how to bind the rathole‐client listener
        if USE_CONTAINER_HOSTNAMES:
            host_ip = server_id
        else:
            host_ip = get_container_ip(server_id)

        params = {'host_ip': host_ip}
        
        # For legacy auth, include token in query params
        if not ACCESS_TOKEN and LEGACY_AUTH_ENABLED:
            params['token'] = RATHOLE_TOKEN
        
        # Request client config from instance manager
        response = requests.get(
            f'{base_url}/api/instances/{server_id}/client-config',
            params=params,
            headers=headers,
            timeout=10,
            verify=False if USE_HTTPS_RATHOLE else True  # Skip SSL verification for self-signed certs
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                print(f"✓ Retrieved client config for {server_id} using {'access token' if ACCESS_TOKEN else 'legacy auth'}")
                return data.get('config')
        
        print(f"Failed to get client config for {server_id}: {response.status_code} - {response.text}")
        return None
        
    except Exception as e:
        print(f"Error getting client config for {server_id}: {str(e)}")
        return None

def generate_rathole_client_config(
        server_id,
        server_name,
        game_port,
        beacon_port,
        frps_port=None,
        frps_token=None,
):
    """Generate FRP client configuration for a specific server (fallback method)"""
    # Try to get config from instance manager first
    config = get_rathole_client_config_from_manager(server_id)
    if config:
        return config
    
    # Fallback to local generation (should not be used in individual instance mode)
    print(f"Warning: Using fallback config generation for {server_id}")
    # Determine how to address the Satisfactory server container locally
    host_part = server_id if USE_CONTAINER_HOSTNAMES else '0.0.0.0'

    port_value = frps_port or RATHOLE_INSTANCE_MANAGER_PORT
    token_value = frps_token or RATHOLE_TOKEN

    config = f"""
[common]
server_addr = {RATHOLE_INSTANCE_MANAGER_HOST}
server_port = {port_value}
auth.method = "token"
auth.token  = {token_value}
auth.additionalScopes = ["HeartBeats", "NewWorkConns"]
transport.tls.enable = {str(USE_HTTPS_RATHOLE).lower()}

[{server_id}_game_tcp]
type        = tcp
local_ip    = {host_part}
local_port  = {game_port}
remote_port = 0

[{server_id}_game_udp]
type        = udp
local_ip    = {host_part}
local_port  = {game_port}
remote_port = 0

[{server_id}_query]
type        = tcp
local_ip    = {host_part}
local_port  = {beacon_port}
remote_port = 0
"""
    return config

def prepare_rathole_client_config(server_id, server_name, game_port, beacon_port):
    """Create tunnel instance and write FRP client config to disk."""
    try:
        if not create_tunnel_instance(server_id, game_port, beacon_port):
            print(f"Failed to create tunnel instance for {server_id}")
            return None

        rathole_dir = f"/data/frp/{server_id}"
        os.makedirs(rathole_dir, exist_ok=True)

        cfg = generate_rathole_client_config(server_id, server_name, game_port, beacon_port)
        cfg_path = f"{rathole_dir}/client.toml"
        with open(cfg_path, "w") as fh:
            fh.write(cfg)

        print(f"✓ Prepared FRP config for {server_id}: {cfg_path}")
        return cfg_path
    except Exception as exc:
        print(f"Failed to prepare FRP config for {server_id}: {exc}")
        return None

def start_rathole_client(server_id, server_name, game_port, beacon_port):
    """Launch an FRP client whose tunnel ports match the container’s bind ports."""
    try:
        # 1️⃣ Create (or refresh) the tunnel instance
        success, frps_port, frps_token = create_tunnel_instance(
            server_id, game_port, beacon_port
        )
        if not success:
            print(f"Failed to create tunnel instance for {server_id}")
            return False

        # 2️⃣ Prepare the client.cfg on disk
        rathole_dir = f"/data/frp/{server_id}"
        os.makedirs(rathole_dir, exist_ok=True)

        cfg = generate_rathole_client_config(
            server_id,
            server_name,
            game_port,
            beacon_port,
            frps_port,
            frps_token,
        )
        cfg_path = f"{rathole_dir}/client.toml"
        with open(cfg_path, "w") as fh:
            fh.write(cfg)

        # 3️⃣ Spawn frpc and log output
        log_path = f"{FRP_LOG_DIR}/{server_id}.log"
        log_file = open(log_path, "a")
        proc = subprocess.Popen(
            [RATHOLE_CLIENT_BINARY, '-c', cfg_path],
            cwd=rathole_dir,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
        )

        frp_clients[server_id] = {
            "process": proc,
            "config_path": cfg_path,
            "rathole_dir": rathole_dir,
            "game_port": game_port,
            "beacon_port": beacon_port,
            "started_at": datetime.now().isoformat(),
            "log_path": log_path,
            "frps_port": frps_port,
            "frps_token": frps_token,
        }

        print(
            f"✓ Started FRP client for {server_id} on port {frps_port} "
            f"with token {frps_token} (PID {proc.pid})"
        )
        return True

    except Exception as exc:
        print(f"Failed to start FRP client for {server_id}: {exc}")
        return False

def stop_rathole_client(server_id):
    """Stop the FRP client process for a specific server"""
    try:
        if server_id not in frp_clients:
            print(f"No FRP client found for {server_id}")
            return True
        
        client_info = frp_clients[server_id]
        process = client_info['process']
        
        # Terminate the process
        if process.poll() is None:  # Process is still running
            process.terminate()
            
            # Wait for process to terminate
            try:
                process.wait(timeout=10)
                print(f"FRP client for {server_id} terminated gracefully")
            except subprocess.TimeoutExpired:
                print(f"Force killing FRP client for {server_id}")
                process.kill()
                process.wait()
        
        # Clean up tracking
        del frp_clients[server_id]
        
        # Optionally clean up config files
        config_path = client_info.get('config_path')
        if config_path and os.path.exists(config_path):
            os.remove(config_path)
            print(f"Removed FRP config: {config_path}")
        
        # Remove tunnel instance from the FRP instance manager
        remove_tunnel_instance(server_id)
        
        return True
        
    except Exception as e:
        print(f"Failed to stop FRP client for {server_id}: {str(e)}")
        return False

def stop_all_frp_clients():
    """Stop all running FRP clients"""
    results = {}
    for sid in list(frp_clients.keys()):
        results[sid] = stop_rathole_client(sid)
    return results

def remove_tunnel_instance(server_id):
    """Remove tunnel instance from the FRP instance manager"""
    try:
        base_url = get_rathole_base_url()
        headers = get_auth_headers()
        
        # Build query parameters for legacy auth
        params = {}
        if not ACCESS_TOKEN and LEGACY_AUTH_ENABLED:
            params['token'] = RATHOLE_TOKEN
        
        response = requests.delete(
            f'{base_url}/api/instances/{server_id}',
            params=params,
            headers=headers,
            timeout=10,
            verify=False if USE_HTTPS_RATHOLE else True  # Skip SSL verification for self-signed certs
        )
        
        if response.status_code == 200:
            print(f"✓ Removed tunnel instance for {server_id} using {'access token' if ACCESS_TOKEN else 'legacy auth'}")
        else:
            print(f"Failed to remove tunnel instance for {server_id}: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error removing tunnel instance for {server_id}: {str(e)}")
        
    return True  # Don't fail the entire stop operation if cleanup fails

@app.route('/api/containers/spawn', methods=['POST'])
def spawn_container():
    """Spawn a new Satisfactory server container using Docker Compose"""
    try:
        data = request.json
        server_id = data['serverId']
        server_name = data['serverName']
        game_port = data['gamePort']
        beacon_port = data['beaconPort']
        ram_allocation = data['ramAllocation']
        cpu_allocation = data['cpuAllocation']
        max_players = data['maxPlayers']
        server_password = data.get('serverPassword')
        environment_vars = data.get('environmentVariables', {})
        
        print(f"Received spawn request for {server_id}:")
        print(f"  Server Name: {server_name}")
        print(f"  Game Port: {game_port}")
        print(f"  Beacon Port: {beacon_port}")
        print(f"  RAM Allocation: {ram_allocation} (type: {type(ram_allocation)})")
        print(f"  CPU Allocation: {cpu_allocation} (type: {type(cpu_allocation)})")
        print(f"  Max Players: {max_players}")
        print(f"  Environment Variables from Orchestrator: {environment_vars}")
        
        # Debug: Check auth headers
        auth_header = request.headers.get('Authorization')
        print(f"  DEBUG: Authorization header from orchestrator: {auth_header[:50] if auth_header else 'None'}...")
        print(f"  DEBUG: Extracted token from g: {g.access_token[:20] if hasattr(g, 'access_token') and g.access_token else 'None'}...")
        
        # Test auth headers that will be sent to the tunnel manager
        test_headers = get_auth_headers()
        auth_for_rathole = test_headers.get('Authorization', 'None')
        print(f"  DEBUG: Auth header for FRP: {auth_for_rathole[:50] if auth_for_rathole != 'None' else 'None'}...")
        
        # Create server directory structure
        server_dir = f'/data/satisfactory/{server_id}'
        os.makedirs(f'{server_dir}/data', exist_ok=True)
        
        # Determine network name for this server
        network_name = f"net_{server_id}"

        # Create docker network for the server
        subprocess.run(['docker', 'network', 'create', network_name], check=False)

        # Prepare FRP client configuration file
        frp_config_path = prepare_rathole_client_config(
            server_id, server_name, game_port, beacon_port)
        if not frp_config_path:
            print(f"Warning: failed to prepare FRP config for {server_id}")
            frp_config_path = f"/data/frp/{server_id}/client.toml"

        # Generate Docker Compose configuration
        compose_config = generate_docker_compose_config(
            server_id, server_name, game_port, beacon_port,
            ram_allocation, cpu_allocation, max_players,
            server_password, environment_vars,
            network_name,
            frp_config_path
        )
        
        # Write Docker Compose file
        compose_file_path = f'{server_dir}/docker-compose.yml'
        with open(compose_file_path, 'w') as compose_file:
            yaml.dump(compose_config, compose_file, default_flow_style=False)
        
        print(f"Generated Docker Compose file for {server_id}:")
        print(f"  File: {compose_file_path}")
        print(f"  Config: {json.dumps(compose_config, indent=2)}")
        
        # Start the container using Docker Compose
        result = subprocess.run([
            'docker-compose', '-f', compose_file_path, 'up', '-d'
        ], capture_output=True, text=True, cwd=server_dir)
        
        if result.returncode != 0:
            raise Exception(f"Docker Compose failed: {result.stderr}")
        
        # Get container ID using Docker Compose
        ps_result = subprocess.run([
            'docker-compose', '-f', compose_file_path, 'ps', '-q', server_id
        ], capture_output=True, text=True, cwd=server_dir)
        
        if ps_result.returncode != 0:
            raise Exception(f"Failed to get container ID: {ps_result.stderr}")
        
        container_id = ps_result.stdout.strip()

        # Track container
        running_containers[server_id] = {
            'container_id': container_id,
            'server_name': server_name,
            'game_port': game_port,
            'beacon_port': beacon_port,
            'network_name': network_name,
            'compose_file': compose_file_path,
            'server_dir': server_dir,
            'started_at': datetime.now().isoformat()
        }
        
        print(f"Successfully spawned container {server_id} with ID: {container_id}")
        
        return jsonify({
            'status': 'success',
            'containerId': container_id,
            'serverId': server_id,
            'gamePort': game_port,
            'beaconPort': beacon_port,
            'message': f'Container {server_id} spawned successfully using Docker Compose'
        })
        
    except Exception as e:
        print(f"Error spawning container {server_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/containers/stop', methods=['POST'])
def stop_container():
    """Stop a container using Docker Compose"""
    try:
        data = request.json
        server_id = data['serverId']
        cleanup_type = data.get('cleanupType', 'stop')  # 'stop' or 'delete'
        
        print(f"Stop request for {server_id} with cleanup type: {cleanup_type}")
        
        # Check if we have tracking info for this container
        if server_id not in running_containers:
            # Try to stop using Docker API as fallback
            try:
                container = client.containers.get(server_id)
                container.stop()
                
                # Clean up data based on type
                cleanup_server_data(server_id, cleanup_type)

                if cleanup_type == 'delete':
                    subprocess.run(['docker', 'network', 'rm', f'net_{server_id}'], check=False)
                
                return jsonify({
                    'status': 'success',
                    'message': f'Container {server_id} stopped successfully (fallback method)'
                })
            except docker.errors.NotFound:
                return jsonify({
                    'status': 'error',
                    'message': 'Container not found'
                }, 404)
        
        # Use Docker Compose to stop
        container_info = running_containers[server_id]
        compose_file = container_info.get('compose_file')
        server_dir = container_info.get('server_dir')
        network_name = container_info.get('network_name', f'net_{server_id}')
        
        if compose_file and os.path.exists(compose_file):
            if cleanup_type == 'delete':
                # Full deletion with volumes
                result = subprocess.run([
                    'docker-compose', '-f', compose_file, 'down', '-v'
                ], capture_output=True, text=True, cwd=server_dir)
            else:
                # Normal stop
                result = subprocess.run([
                    'docker-compose', '-f', compose_file, 'down'
                ], capture_output=True, text=True, cwd=server_dir)
            
            if result.returncode != 0:
                raise Exception(f"Docker Compose stop failed: {result.stderr}")
        
        # Remove from tracking
        if server_id in running_containers:
            del running_containers[server_id]
        

        # Remove network if deleting
        if cleanup_type == 'delete':
            subprocess.run(['docker', 'network', 'rm', network_name], check=False)
        
        # Clean up data based on type
        cleanup_server_data(server_id, cleanup_type)
        
        return jsonify({
            'status': 'success',
            'message': f'Container {server_id} {"deleted" if cleanup_type == "delete" else "stopped"} successfully'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/containers/restart', methods=['POST'])
def restart_container():
    """Restart a container using Docker Compose"""
    try:
        data = request.json
        server_id = data['serverId']
        
        # Check if we have tracking info for this container
        if server_id not in running_containers:
            # Try to restart using Docker API as fallback
            try:
                container = client.containers.get(server_id)
                container.restart()
                return jsonify({
                    'status': 'success',
                    'message': f'Container {server_id} restarted successfully (fallback method)'
                })
            except docker.errors.NotFound:
                return jsonify({
                    'status': 'error',
                    'message': 'Container not found'
                }, 404)
        
        # Use Docker Compose to restart
        container_info = running_containers[server_id]
        compose_file = container_info.get('compose_file')
        server_dir = container_info.get('server_dir')
        
        if compose_file and os.path.exists(compose_file):
            result = subprocess.run([
                'docker-compose', '-f', compose_file, 'restart'
            ], capture_output=True, text=True, cwd=server_dir)
            
            if result.returncode != 0:
                raise Exception(f"Docker Compose restart failed: {result.stderr}")
        
        return jsonify({
            'status': 'success',
            'message': f'Container {server_id} restarted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/containers/<server_id>/status', methods=['GET'])
def get_container_status(server_id):
    """Get container status"""
    try:
        container = client.containers.get(server_id)
        
        return jsonify({
            'serverId': server_id,
            'status': container.status,
            'containerId': container.id,
            'created': container.attrs['Created'],
            'info': running_containers.get(server_id, {})
        })
        
    except docker.errors.NotFound:
        return jsonify({
            'status': 'error',
            'message': 'Container not found'
        }, 404)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/containers/start', methods=['POST'])
def start_container():
    """Start a stopped container"""
    try:
        data = request.json
        server_id = data['serverId']
        
        container = client.containers.get(server_id)
        container.start()

        # Start accompanying FRP container if present
        frp_name = f"{server_id}_frpc"
        try:
            frp_container = client.containers.get(frp_name)
            frp_container.start()
        except docker.errors.NotFound:
            print(f"FRP container {frp_name} not found")
        
        # Update tracking if not already tracked
        if server_id not in running_containers:
            running_containers[server_id] = {
                'container_id': container.id,
                'network_name': f'net_{server_id}',
                'started_at': datetime.now().isoformat()
            }
        
        return jsonify({
            'status': 'success',
            'message': f'Container {server_id} started successfully'
        })
        
    except docker.errors.NotFound:
        return jsonify({
            'status': 'error',
            'message': 'Container not found'
        }, 404)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/containers/<server_id>/config', methods=['POST'])
def update_container_config(server_id):
    """Update container configuration"""
    try:
        data = request.json
        config = data.get('config', {})
        
        # For Satisfactory servers, we'll need to restart the container
        # with new environment variables for most config changes
        container = client.containers.get(server_id)
        
        # Get current container configuration
        current_env = container.attrs['Config']['Env']
        env_dict = {}
        for env_var in current_env:
            if '=' in env_var:
                key, value = env_var.split('=', 1)
                env_dict[key] = value
        
        # Update environment variables based on config
        if 'serverName' in config:
            env_dict['SERVER_NAME'] = config['serverName']
        if 'maxPlayers' in config:
            env_dict['MAXPLAYERS'] = str(config['maxPlayers'])
        if 'serverPassword' in config:
            env_dict['SERVER_PASSWORD'] = config['serverPassword']
        
        # For now, just log the config change
        # In a full implementation, you'd restart the container with new config
        print(f"Config update requested for {server_id}: {config}")
        
        return jsonify({
            'status': 'success',
            'message': f'Configuration update queued for {server_id}',
            'note': 'Container restart required for changes to take effect'
        })
        
    except docker.errors.NotFound:
        return jsonify({
            'status': 'error',
            'message': 'Container not found'
        }, 404)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/rathole/clients', methods=['GET'])
def list_frp_clients():
    """List all active FRP clients"""
    try:
        clients_info = {}
        for server_id, client_info in frp_clients.items():
            process = client_info.get('process')
            is_running = process and process.poll() is None
            
            clients_info[server_id] = {
                'config_path': client_info.get('config_path'),
                'game_port': client_info.get('game_port'),
                'beacon_port': client_info.get('beacon_port'),
                'started_at': client_info.get('started_at'),
                'is_running': is_running,
                'pid': process.pid if is_running else None
            }
        
        return jsonify({
            'status': 'success',
            'clients': clients_info
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/rathole/clients/<server_id>/start', methods=['POST'])
def start_rathole_client_endpoint(server_id):
    """Start FRP client for a specific server"""
    try:
        data = request.json or {}
        server_name = data.get('serverName', f'server-{server_id}')
        game_port = data.get('gamePort')
        beacon_port = data.get('beaconPort')
        
        if not game_port or not beacon_port:
            return jsonify({
                'status': 'error',
                'message': 'gamePort and beaconPort are required'
            }), 400
        
        if start_rathole_client(server_id, server_name, game_port, beacon_port):
            return jsonify({
                'status': 'success',
                'message': f'FRP client started for {server_id}'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'Failed to start FRP client for {server_id}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/rathole/clients/<server_id>/stop', methods=['POST'])
def stop_rathole_client_endpoint(server_id):
    """Stop FRP client for a specific server"""
    try:
        if stop_rathole_client(server_id):
            return jsonify({
                'status': 'success',
                'message': f'FRP client stopped for {server_id}'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'Failed to stop FRP client for {server_id}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/rathole/clients/<server_id>/configure', methods=['POST'])
def configure_rathole_client_endpoint(server_id):
    """Configure FRP client with provided configuration"""
    try:
        data = request.json or {}
        client_config = data.get('clientConfig')
        
        if not client_config:
            return jsonify({
                'status': 'error',
                'message': 'clientConfig is required'
            }), 400
        
        # Create rathole client config directory
        rathole_dir = f'/data/frp/{server_id}'
        os.makedirs(rathole_dir, exist_ok=True)
        
        # Write the provided config
        config_path = f'{rathole_dir}/client.toml'
        with open(config_path, 'w') as f:
            f.write(client_config)
        
        print(f"FRP client config written for {server_id}: {config_path}")
        
        # Start the FRP client with the new config
        if start_rathole_client_with_config(server_id, config_path):
            return jsonify({
                'status': 'success',
                'message': f'FRP client configured and started for {server_id}'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'Failed to start FRP client for {server_id}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/rathole/clients/shutdown-all', methods=['POST'])
def shutdown_all_clients_endpoint():
    """Stop all FRP clients on this agent"""
    try:
        result = stop_all_frp_clients()
        return jsonify({'status': 'success', 'stopped': result})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

def start_rathole_client_with_config(server_id, config_path):
    """Start FRP client with a specific config file"""
    try:
        # Stop existing client if running
        stop_rathole_client(server_id)
        
        rathole_dir = os.path.dirname(config_path)
        
        # Start FRP client process with logging
        log_path = f"{FRP_LOG_DIR}/{server_id}.log"
        log_file = open(log_path, "a")
        cmd = [RATHOLE_CLIENT_BINARY, '-c', config_path]
        process = subprocess.Popen(
            cmd,
            cwd=rathole_dir,
            stdout=log_file,
            stderr=subprocess.STDOUT,
            text=True,
        )
        
        # Store process info
        frp_clients[server_id] = {
            'process': process,
            'config_path': config_path,
            'rathole_dir': rathole_dir,
            'game_port': None,  # Will be parsed from config if needed
            'beacon_port': None,  # Will be parsed from config if needed
            'started_at': datetime.now().isoformat(),
            'log_path': log_path
        }
        
        print(f"Started FRP client for {server_id} with config {config_path} (PID: {process.pid})")
        return True
        
    except Exception as e:
        print(f"Failed to start FRP client for {server_id}: {str(e)}")
        return False

def get_node_stats_data():
    """Get node resource statistics as a dictionary"""
    try:
        # CPU usage
        cpu_usage = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_usage = disk.percent
        
        # Container count
        container_count = len(running_containers)
        
        return {
            'nodeId': NODE_ID,
            'cpuUsage': cpu_usage,
            'memoryUsage': memory_usage,
            'diskUsage': disk_usage,
            'containerCount': container_count,
            'runningContainers': list(running_containers.keys()),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Error getting stats: {e}")
        return {
            'nodeId': NODE_ID,
            'cpuUsage': 0,
            'memoryUsage': 0,
            'diskUsage': 0,
            'containerCount': 0,
            'runningContainers': [],
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }

@app.route('/api/stats', methods=['GET'])
def get_node_stats():
    """Get node resource statistics"""
    try:
        stats_data = get_node_stats_data()
        return jsonify(stats_data)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'nodeId': NODE_ID,
        'timestamp': datetime.now().isoformat()
    })

def register_with_orchestrator():
    """Register this node with the orchestrator with retry logic"""
    max_retries = 5
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            hostname = socket.gethostname()
            if USE_HOSTNAME_REGISTRATION:
                ip_address = hostname
            else:
                # Try to get the actual IP address of the container
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip_address = s.getsockname()[0]
                s.close()
            
            registration_data = {
                'nodeId': NODE_ID,
                'hostname': hostname,
                'ipAddress': ip_address,
                'maxServers': 20  # Configure based on your server capacity
            }
            
            response = requests.post(
                f"{ORCHESTRATOR_URL}/api/nodes",
                json=registration_data,
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"Successfully registered with orchestrator as {NODE_ID} and IP {ip_address}")
                return True
            else:
                print(f"Failed to register with orchestrator: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Error registering with orchestrator (attempt {attempt + 1}/{max_retries}): {e}")
            
        if attempt < max_retries - 1:
            print(f"Retrying registration in {retry_delay} seconds...")
            time.sleep(retry_delay)
            retry_delay *= 2  # Exponential backoff
    
    print(f"Failed to register after {max_retries} attempts")
    return False

def periodic_stats_update():
    """Periodically send stats to orchestrator with heartbeat"""
    
    # Force unbuffered output
    sys.stdout.flush()
    sys.stderr.flush()
    
    print(f"[{datetime.now().isoformat()}] *** HEARTBEAT THREAD STARTED ***", flush=True)
    print(f"[{datetime.now().isoformat()}] Thread ID: {threading.current_thread().ident}", flush=True)
    print(f"[{datetime.now().isoformat()}] Process ID: {os.getpid()}", flush=True)
    print(f"[{datetime.now().isoformat()}] Heartbeat interval: {HEARTBEAT_INTERVAL}s", flush=True)
    
    consecutive_failures = 0
    loop_count = 0
    
    try:
        while True:
            loop_count += 1
            print(f"[{datetime.now().isoformat()}] *** HEARTBEAT LOOP #{loop_count} STARTING ***", flush=True)
            
            try:
                print(f"[{datetime.now().isoformat()}] Getting node stats...", flush=True)
                stats_data = get_node_stats_data()
                print(f"[{datetime.now().isoformat()}] Got stats data (keys: {list(stats_data.keys()) if stats_data else 'None'})", flush=True)
                
                print(f"[{datetime.now().isoformat()}] Sending heartbeat to {ORCHESTRATOR_URL}/api/nodes/{NODE_ID}/stats", flush=True)
                response = requests.post(
                    f"{ORCHESTRATOR_URL}/api/nodes/{NODE_ID}/stats",
                    json=stats_data,
                    timeout=HEARTBEAT_TIMEOUT
                )
                
                if response.status_code == 200:
                    consecutive_failures = 0
                    print(f"[{datetime.now().isoformat()}] ✓ Heartbeat sent successfully for {NODE_ID}", flush=True)
                else:
                    consecutive_failures += 1
                    print(f"[{datetime.now().isoformat()}] ✗ Heartbeat failed: {response.status_code} - {response.text} (failure {consecutive_failures}/{MAX_HEARTBEAT_FAILURES})", flush=True)
                    
            except Exception as e:
                consecutive_failures += 1
                print(f"[{datetime.now().isoformat()}] ✗ Error sending heartbeat to orchestrator: {e} (failure {consecutive_failures}/{MAX_HEARTBEAT_FAILURES})", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                sys.stderr.flush()
                
            # If too many consecutive failures, try to re-register
            if consecutive_failures >= MAX_HEARTBEAT_FAILURES:
                print(f"[{datetime.now().isoformat()}] Too many heartbeat failures ({consecutive_failures}), attempting re-registration...", flush=True)
                if register_with_orchestrator():
                    consecutive_failures = 0
                    print(f"[{datetime.now().isoformat()}] ✓ Re-registration successful", flush=True)
                else:
                    print(f"[{datetime.now().isoformat()}] ✗ Re-registration failed, continuing with heartbeat attempts...", flush=True)
            
            # Sleep at the end of the loop
            print(f"[{datetime.now().isoformat()}] Sleeping for {HEARTBEAT_INTERVAL} seconds... (loop #{loop_count} complete)", flush=True)
            sys.stdout.flush()
            sys.stderr.flush()
            time.sleep(HEARTBEAT_INTERVAL)
            print(f"[{datetime.now().isoformat()}] *** WOKE UP FROM SLEEP - STARTING NEXT LOOP ***", flush=True)
            
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] *** FATAL ERROR IN HEARTBEAT THREAD: {e} ***", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        sys.stderr.flush()
        raise

# Global thread references
heartbeat_thread = None
watchdog_thread = None

def start_heartbeat_thread():
    """Start the heartbeat thread if it's not already running"""
    global heartbeat_thread
    
    if heartbeat_thread is None or not heartbeat_thread.is_alive():
        print(f"[{datetime.now().isoformat()}] Starting heartbeat thread...")
        heartbeat_thread = threading.Thread(target=periodic_stats_update, daemon=True)
        heartbeat_thread.start()
        print(f"[{datetime.now().isoformat()}] Heartbeat thread started with ID: {heartbeat_thread.ident}")
    else:
        print(f"[{datetime.now().isoformat()}] Heartbeat thread is already running with ID: {heartbeat_thread.ident}")

def start_watchdog_thread():
    """Start the watchdog thread to monitor heartbeat thread"""
    global watchdog_thread
    
    if watchdog_thread is None or not watchdog_thread.is_alive():
        print(f"[{datetime.now().isoformat()}] Starting heartbeat watchdog thread...")
        watchdog_thread = threading.Thread(target=heartbeat_watchdog, daemon=True)
        watchdog_thread.start()
        print(f"[{datetime.now().isoformat()}] Heartbeat watchdog thread started with ID: {watchdog_thread.ident}")
    else:
        print(f"[{datetime.now().isoformat()}] Heartbeat watchdog thread is already running with ID: {watchdog_thread.ident}")

def heartbeat_watchdog():
    """Monitor the heartbeat thread and log if it dies"""
    print(f"[{datetime.now().isoformat()}] Heartbeat watchdog started")
    
    while True:
        try:
            time.sleep(60)  # Check every minute
            if heartbeat_thread is None or not heartbeat_thread.is_alive():
                print(f"[{datetime.now().isoformat()}] *** WATCHDOG ALERT: HEARTBEAT THREAD IS DEAD! ***", flush=True)
                print(f"[{datetime.now().isoformat()}] Heartbeat thread state: {heartbeat_thread.is_alive() if heartbeat_thread else 'None'}", flush=True)
                # Try to restart it
                start_heartbeat_thread()
            else:
                print(f"[{datetime.now().isoformat()}] Watchdog check: Heartbeat thread is alive (ID: {heartbeat_thread.ident})", flush=True)
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Error in heartbeat watchdog: {e}", flush=True)
            traceback.print_exc()

@app.route('/api/health/threads', methods=['GET'])
def get_thread_health():
    """Get status of background threads"""
    return jsonify({
        'heartbeat_thread': {
            'exists': heartbeat_thread is not None,
            'alive': heartbeat_thread.is_alive() if heartbeat_thread else False,
            'id': heartbeat_thread.ident if heartbeat_thread else None
        },
        'watchdog_thread': {
            'exists': watchdog_thread is not None,
            'alive': watchdog_thread.is_alive() if watchdog_thread else False,
            'id': watchdog_thread.ident if watchdog_thread else None
        }
    })

@app.route('/api/health/threads/restart', methods=['POST'])
def restart_threads():
    """Restart background threads"""
    try:
        start_heartbeat_thread()
        start_watchdog_thread()
        return jsonify({
            'status': 'success',
            'message': 'Background threads restarted'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.before_request
def extract_access_token():
    """Extract access token from Authorization header for forwarding to the tunnel manager"""
    auth_header = request.headers.get('Authorization')
    print(auth_header)  # Debug: print the full header for visibility
    print(f"DEBUG: before_request - Auth header: {auth_header[:50] if auth_header else 'None'}...")
    if auth_header and auth_header.startswith('Bearer '):
        # Extract the token without the 'Bearer ' prefix
        g.access_token = auth_header[7:]  # Remove 'Bearer ' prefix
        print(f"DEBUG: Extracted access token: {g.access_token[:20]}..." if g.access_token else "No token")
    else:
        g.access_token = None
        print("DEBUG: No valid Authorization header found")

def get_container_ip(server_id):
    """Get the IP address of a container"""
    try:
        container = client.containers.get(server_id)
        networks = container.attrs['NetworkSettings']['Networks']
        
        # Look for the satisfactory network first, then use any available network
        for network_name, network_info in networks.items():
            if 'satisfactory' in network_name.lower():
                return network_info['IPAddress']
        
        # If no satisfactory network, use the first available IP
        for network_name, network_info in networks.items():
            if network_info['IPAddress']:
                return network_info['IPAddress']
                
        return None
    except Exception as e:
        print(f"Error getting container IP for {server_id}: {str(e)}")
        return None

def cleanup_server_data(server_id, cleanup_type='stop'):
    """
    Clean up server data based on cleanup type
    
    cleanup_type options:
    - 'stop': Keep server data, remove rathole configs only
    - 'delete': Remove everything including docker volumes
    - 'rathole': Remove only rathole configs
    """
    try:
        print(f"Cleaning up server data for {server_id} (type: {cleanup_type})")
        
        # Always clean up rathole configs
        rathole_dir = f'/data/frp/{server_id}'
        if os.path.exists(rathole_dir):
            import shutil
            shutil.rmtree(rathole_dir)
            print(f"✓ Removed rathole directory: {rathole_dir}")
        
        if cleanup_type == 'delete':
            # Full deletion - remove everything
            server_dir = f'/data/satisfactory/{server_id}'
            
            # 1. Stop and remove container with volumes
            try:
                container_info = running_containers.get(server_id, {})
                compose_file = container_info.get('compose_file')
                
                if compose_file and os.path.exists(compose_file):
                    # Use docker-compose down with volumes flag
                    result = subprocess.run([
                        'docker-compose', '-f', compose_file, 'down', '-v'
                    ], capture_output=True, text=True, cwd=os.path.dirname(compose_file))
                    
                    if result.returncode == 0:
                        print(f"✓ Container and volumes removed via docker-compose")
                    else:
                        print(f"⚠ Docker-compose down failed: {result.stderr}")
                        
                        # Fallback: manual container and volume cleanup
                        cleanup_container_and_volumes_manually(server_id)
                else:
                    # Fallback: manual cleanup
                    cleanup_container_and_volumes_manually(server_id)
                    
            except Exception as e:
                print(f"Error during container cleanup: {e}")
                cleanup_container_and_volumes_manually(server_id)
            
            # 2. Remove server directory
            if os.path.exists(server_dir):
                import shutil
                shutil.rmtree(server_dir)
                print(f"✓ Removed server directory: {server_dir}")
            
            # 3. Remove from tracking
            if server_id in running_containers:
                del running_containers[server_id]
                print(f"✓ Removed from tracking")
                
            print(f"✓ Complete deletion of {server_id} finished")
            
        elif cleanup_type == 'stop':
            # Stop only - keep server data but clean rathole
            print(f"✓ Stop cleanup completed - server data preserved")
            
        return True
        
    except Exception as e:
        print(f"Error cleaning up server data for {server_id}: {str(e)}")
        return False

def cleanup_container_and_volumes_manually(server_id):
    """Manual container and volume cleanup as fallback"""
    try:
        # Stop and remove container
        try:
            container = client.containers.get(server_id)
            container.stop(timeout=10)
            container.remove(v=True, force=True)  # Remove with volumes
            print(f"✓ Container {server_id} stopped and removed with volumes")
        except docker.errors.NotFound:
            print(f"Container {server_id} not found - may already be removed")
        except Exception as e:
            print(f"Error removing container {server_id}: {e}")
        
        # Find and remove associated volumes
        try:
            volumes = client.volumes.list()
            server_volumes = [v for v in volumes if server_id in v.name]
            
            for volume in server_volumes:
                try:
                    volume.remove(force=True)
                    print(f"✓ Removed volume: {volume.name}")
                except Exception as e:
                    print(f"Error removing volume {volume.name}: {e}")
                    
        except Exception as e:
            print(f"Error during volume cleanup: {e}")
            
    except Exception as e:
        print(f"Error in manual cleanup: {e}")

def get_server_data_info(server_id):
    """Get information about server data storage"""
    try:
        info = {
            'server_id': server_id,
            'server_dir': f'/data/satisfactory/{server_id}',
            'rathole_dir': f'/data/frp/{server_id}',
            'docker_volumes': [],
            'data_size': 0
        }
        
        # Check if directories exist
        server_dir = info['server_dir']
        rathole_dir = info['rathole_dir']
        
        info['server_dir_exists'] = os.path.exists(server_dir)
        info['rathole_dir_exists'] = os.path.exists(rathole_dir)
        
        # Get directory sizes
        if info['server_dir_exists']:
            info['server_dir_size'] = get_directory_size(server_dir)
        else:
            info['server_dir_size'] = 0
            
        if info['rathole_dir_exists']:
            info['rathole_dir_size'] = get_directory_size(rathole_dir)
        else:
            info['rathole_dir_size'] = 0
        
        # Find associated Docker volumes
        try:
            volumes = client.volumes.list()
            server_volumes = [v.name for v in volumes if server_id in v.name]
            info['docker_volumes'] = server_volumes
        except Exception as e:
            print(f"Error getting volume info: {e}")
            
        return info
        
    except Exception as e:
        print(f"Error getting server data info: {e}")
        return None

def get_directory_size(directory):
    """Get the size of a directory in bytes"""
    try:
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(directory):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                try:
                    total_size += os.path.getsize(filepath)
                except OSError:
                    pass
        return total_size
    except Exception:
        return 0

# ... existing code ...

# Add new endpoint for complete server deletion
@app.route('/api/containers/<server_id>/delete', methods=['DELETE'])
def delete_server_completely(server_id):
    """Completely delete a server including all data and volumes"""
    try:
        print(f"Complete deletion request for {server_id}")
        
        # Stop rathole client first
        stop_rathole_client(server_id)
        
        # Complete cleanup
        if cleanup_server_data(server_id, 'delete'):
            return jsonify({
                'status': 'success',
                'message': f'Server {server_id} completely deleted including all data'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': f'Failed to completely delete server {server_id}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Add endpoint to get server data information
@app.route('/api/containers/<server_id>/data-info', methods=['GET'])
def get_server_data_info_endpoint(server_id):
    """Get information about server data storage"""
    try:
        info = get_server_data_info(server_id)
        if info:
            return jsonify({
                'status': 'success',
                'data_info': info
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to get server data info'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Add endpoint to list all server data on this node
@app.route('/api/containers/data-summary', methods=['GET'])
def get_all_server_data_summary():
    """Get summary of all server data on this node"""
    try:
        summary = {
            'total_servers': 0,
            'total_size': 0,
            'servers': []
        }
        
        # Check /data/satisfactory directory
        satis_dir = '/data/satisfactory'
        if os.path.exists(satis_dir):
            for item in os.listdir(satis_dir):
                item_path = os.path.join(satis_dir, item)
                if os.path.isdir(item_path) and item.startswith('srv_'):
                    info = get_server_data_info(item)
                    if info:
                        summary['servers'].append(info)
                        summary['total_size'] += info.get('server_dir_size', 0) + info.get('rathole_dir_size', 0)
        
        summary['total_servers'] = len(summary['servers'])
        
        return jsonify({
            'status': 'success',
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Create data directory
    os.makedirs('/data/satisfactory', exist_ok=True)
    
    # Register with orchestrator
    register_with_orchestrator()
    
    # Start heartbeat thread with watchdog
    start_heartbeat_thread()
    start_watchdog_thread()
    
    # Start Flask app (disable debug mode to prevent double startup)
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=8082, debug=debug_mode)
