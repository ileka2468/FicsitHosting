#!/usr/bin/env python3
"""Simple FRP Instance Manager
This service replaces the old Rathole manager. It keeps the external API
compatible but generates frp client configs instead of rathole configs.
"""
import os
import json
import threading
import secrets
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from flask import Flask, request, jsonify, g
import redis
import requests
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("/var/log/frp/manager.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Basic configuration
SERVER_PORT = int(os.getenv("SERVER_PORT", "7001"))
HTTPS_PORT = int(os.getenv("HTTPS_PORT", "443"))
USE_HTTPS = os.getenv("USE_HTTPS", "false").lower() == "true"

# Auth service configuration (optional, same as before)
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8081")
AUTH_VALIDATE_ENDPOINT = f"{AUTH_SERVICE_URL}/api/auth/validate"

API_TOKEN = os.getenv("API_TOKEN", "your-api-control-token-here")
LEGACY_AUTH_ENABLED = os.getenv("LEGACY_AUTH_ENABLED", "true").lower() == "true"

BASE_DATA_DIR = os.getenv("BASE_DATA_DIR", "/data/frp-instances")
FRP_SERVER_HOST = os.getenv("FRP_SERVER_HOST", "frp-instance-manager")
FRP_SERVER_PORT = int(os.getenv("FRP_SERVER_PORT", "7000"))
FRP_TLS_ENABLED = os.getenv("FRP_TLS_ENABLED", "true").lower() == "true"
FRP_BINARY = os.getenv("FRP_BINARY", "/usr/local/bin/frps")
FRPS_PORT_RANGE_START = int(os.getenv("FRPS_PORT_RANGE_START", "7100"))
FRPS_PORT_RANGE_END = int(os.getenv("FRPS_PORT_RANGE_END", "7200"))


REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")


# ----- Authentication helpers -----
def validate_auth_token(auth_header: str) -> Optional[Dict[str, Any]]:
    try:
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        headers = {"Authorization": auth_header}
        resp = requests.get(AUTH_VALIDATE_ENDPOINT, headers=headers, timeout=5)
        return resp.json() if resp.status_code == 200 else None
    except Exception:
        return None


def check_legacy_auth(req) -> bool:
    if not LEGACY_AUTH_ENABLED:
        return False
    hdr = req.headers.get("X-API-Token") or req.headers.get("Authorization")
    if hdr:
        token = hdr.split()[-1]
        return token == API_TOKEN
    if req.is_json:
        data = req.get_json(silent=True) or {}
        return data.get("token") == API_TOKEN
    return False


def require_auth(func):
    def wrapper(*args, **kwargs):
        if check_legacy_auth(request):
            g.user = {"username": "legacy", "id": "legacy"}
            return func(*args, **kwargs)
        user = validate_auth_token(request.headers.get("Authorization"))
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.user = user
        return func(*args, **kwargs)

    wrapper.__name__ = func.__name__
    return wrapper


# ----- Manager Implementation -----
class FrpManager:
    def __init__(self):
        self.instances: Dict[str, Dict[str, Any]] = {}
        self.port_allocations: Dict[int, str] = {}
        self.frps_ports: Dict[int, str] = {}
        self.frps_processes: Dict[str, Any] = {}
        self.lock = threading.Lock()
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
                self.redis.ping()
            except Exception:
                self.redis = None
        Path(BASE_DATA_DIR).mkdir(parents=True, exist_ok=True)
        if self.redis:
            self._load_from_redis()

    def _load_from_redis(self):
        try:
            data = self.redis.hgetall("frp:port_allocations")
            self.port_allocations.update({int(k): v for k, v in data.items()})
            frps = self.redis.hgetall("frp:frps_ports")
            self.frps_ports.update({int(k): v for k, v in frps.items()})
            for key in self.redis.scan_iter("frp:instance:*"):
                inst = json.loads(self.redis.get(key))
                self.instances[inst["server_id"]] = inst
        except Exception:
            pass

    def _save_instance(self, inst: Dict[str, Any]):
        if self.redis:
            self.redis.set(f"frp:instance:{inst['server_id']}", json.dumps(inst))
            self.redis.hset(
                "frp:port_allocations", inst["tunnel_game_port"], inst["server_id"]
            )
            if inst.get("tunnel_query_port"):
                self.redis.hset(
                    "frp:port_allocations", inst["tunnel_query_port"], inst["server_id"]
                )
            if inst.get("frps_port"):
                self.redis.hset("frp:frps_ports", inst["frps_port"], inst["server_id"])

    def _release_ports(self, inst: Dict[str, Any]):
        for p in [inst.get("tunnel_game_port"), inst.get("tunnel_query_port")]:
            if p and p in self.port_allocations:
                del self.port_allocations[p]
                if self.redis:
                    self.redis.hdel("frp:port_allocations", p)
        frps_port = inst.get("frps_port")
        if frps_port and frps_port in self.frps_ports:
            del self.frps_ports[frps_port]
            if self.redis:
                self.redis.hdel("frp:frps_ports", frps_port)

    def create_instance(
        self,
        server_id: str,
        game_port: int,
        query_port: Optional[int] = None,
        owner_id: str = None,
        owner_username: str = None,
    ) -> Dict[str, Any]:
        with self.lock:
            if server_id in self.instances:
                return {
                    "status": "error",
                    "message": f"Instance {server_id} already exists",
                }
            if game_port in self.port_allocations:
                return {
                    "status": "error",
                    "message": f"Port {game_port} already allocated",
                }
            self.port_allocations[game_port] = server_id

            tunnel_query_port = None
            if query_port is not None:
                if query_port in self.port_allocations:
                    del self.port_allocations[game_port]
                    return {
                        "status": "error",
                        "message": f"Port {query_port} already allocated",
                    }
                self.port_allocations[query_port] = server_id
            # Allocate control port for frps
            frps_port = None
            for p in range(FRPS_PORT_RANGE_START, FRPS_PORT_RANGE_END):
                if p not in self.frps_ports:
                    frps_port = p
                    self.frps_ports[p] = server_id
                    break
            if frps_port is None:
                del self.port_allocations[game_port]
                if query_port is not None:
                    del self.port_allocations[query_port]
                return {"status": "error", "message": "No available frps ports"}

            frps_token = secrets.token_urlsafe(16)

            config_dir = Path(f"{BASE_DATA_DIR}/{server_id}")
            config_dir.mkdir(parents=True, exist_ok=True)
            cfg_path = config_dir / "frps.ini"
            cfg = f"""[common]
bind_port = {frps_port}
auth.method = \"token\"
auth.token = {frps_token}
log_file = {str(config_dir / 'frps.log')}
"""
            with open(cfg_path, "w") as fh:
                fh.write(cfg)

            proc = subprocess.Popen(
                [FRP_BINARY, "-c", str(cfg_path)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            inst = {
                "server_id": server_id,
                "game_port": game_port,
                "query_port": query_port,
                "tunnel_game_port": game_port,
                "tunnel_query_port": query_port,
                "frps_port": frps_port,
                "frps_token": frps_token,
                "owner_id": owner_id,
                "owner_username": owner_username,
                "created_at": datetime.utcnow().isoformat(),
            }
            self.instances[server_id] = inst
            self.frps_processes[server_id] = proc
            self._save_instance(inst)
            logger.info("Created instance %s -> game %s", server_id, game_port)
            return {"status": "success", **inst}

    def remove_instance(self, server_id: str) -> Dict[str, Any]:
        with self.lock:
            inst = self.instances.pop(server_id, None)
            if not inst:
                return {"status": "error", "message": "Instance not found"}
            self._release_ports(inst)
            proc = self.frps_processes.pop(server_id, None)
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except Exception:
                    proc.kill()
            if self.redis:
                self.redis.delete(f"frp:instance:{server_id}")
            path = Path(f"{BASE_DATA_DIR}/{server_id}")
            if path.exists():
                for child in path.iterdir():
                    child.unlink()
                path.rmdir()
            logger.info("Removed instance %s", server_id)
            return {"status": "success"}

    def get_client_config(self, server_id: str, host_ip: str) -> Optional[str]:
        inst = self.instances.get(server_id)
        if not inst:
            return None
        logger.info("Generated client config for %s", server_id)
        cfg = f"""
[common]
server_addr = {FRP_SERVER_HOST}
server_port = {inst['frps_port']}
auth.method = "token"
auth.token  = {inst['frps_token']}
auth.additionalScopes = ["HeartBeats", "NewWorkConns"]
transport.tls.enable = {str(FRP_TLS_ENABLED).lower()}

[{server_id}_game_tcp]
type        = tcp
local_ip    = {host_ip}
local_port  = {inst['game_port']}
remote_port = {inst['tunnel_game_port']}

[{server_id}_game_udp]
type        = udp
local_ip    = {host_ip}
local_port  = {inst['game_port']}
remote_port = {inst['tunnel_game_port']}
"""
        if inst.get("query_port"):
            cfg += f"""
[{server_id}_query]
type        = tcp
local_ip    = {host_ip}
local_port  = {inst['query_port']}
remote_port = {inst['tunnel_query_port']}
"""
        return cfg


manager = FrpManager()
app.manager = manager


@app.route("/health", methods=["GET"])
def health():
    logger.debug("Health check requested")
    return jsonify({"status": "healthy", "instances": len(manager.instances)})


@app.route("/api/instances", methods=["POST"])
@require_auth
def api_create_instance():
    logger.info("Create instance requested by %s", g.user.get("username"))
    data = request.get_json() or {}
    required = ["server_id", "game_port"]
    for f in required:
        if f not in data:
            return jsonify({"status": "error", "message": f"Missing {f}"}), 400
    res = manager.create_instance(
        data["server_id"],
        int(data["game_port"]),
        int(data.get("query_port")) if data.get("query_port") else None,
        g.user.get("id"),
        g.user.get("username"),
    )
    code = 200 if res["status"] == "success" else 500
    return jsonify(res), code


@app.route("/api/instances/<server_id>", methods=["DELETE"])
@require_auth
def api_delete_instance(server_id):
    logger.info("Delete instance %s requested by %s", server_id, g.user.get("username"))
    res = manager.remove_instance(server_id)
    code = 200 if res["status"] == "success" else 404
    return jsonify(res), code


@app.route("/api/instances/<server_id>/client-config", methods=["GET"])
@require_auth
def api_client_config(server_id):
    logger.info("Client config requested for %s", server_id)
    host_ip = request.args.get("host_ip", "127.0.0.1")
    cfg = manager.get_client_config(server_id, host_ip)
    if not cfg:
        return jsonify({"status": "error", "message": "Instance not found"}), 404
    return jsonify({"status": "success", "config": cfg})


if __name__ == "__main__":
    if USE_HTTPS and os.path.exists("certs/server.crt"):
        app.run(
            host="0.0.0.0",
            port=HTTPS_PORT,
            ssl_context=("certs/server.crt", "certs/server.key"),
        )
    else:
        app.run(host="0.0.0.0", port=SERVER_PORT)
