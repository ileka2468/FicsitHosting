import os
import sys
import time
import subprocess
from pathlib import Path

import psutil
import pytest

os.makedirs('/var/log/frp', exist_ok=True)

# Ensure the frp server module can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

app = None
manager = None

API_TOKEN = "test-token"

@pytest.fixture(autouse=True)
def setup_env(monkeypatch, tmp_path):
    monkeypatch.setenv("LEGACY_AUTH_ENABLED", "true")
    monkeypatch.setenv("API_TOKEN", API_TOKEN)

    global app, manager
    from frp_instance_manager import app as flask_app, manager as mgr
    app = flask_app
    manager = mgr

    manager.instances.clear()
    manager.port_allocations.clear()
    yield
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if proc.info['name'] == 'python3' and 'dummy_frps' in ' '.join(proc.info.get('cmdline', [])):
            proc.kill()
            proc.wait()

@pytest.fixture
def client():
    app.config['TESTING'] = True
    return app.test_client()

# Helper to start a dummy server to simulate frps on a port

def start_dummy_frps(port):
    script = Path(__file__).parent / "dummy_frps.py"
    return subprocess.Popen([sys.executable, str(script), str(port)])


def is_port_open(port):
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.connections(kind='inet'):
                if conn.status == psutil.CONN_LISTEN and conn.laddr.port == port:
                    return True
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            continue
    return False


def test_instance_lifecycle(client, monkeypatch):
    started = {}

    def fake_create(server_id, game_port, query_port=None, owner_id=None, owner_username=None):
        inst = {
            'server_id': server_id,
            'game_port': game_port,
            'query_port': query_port,
            'tunnel_game_port': game_port,
            'tunnel_query_port': query_port,
            'owner_id': owner_id,
            'owner_username': owner_username
        }
        manager.instances[server_id] = inst
        proc = start_dummy_frps(game_port)
        started[server_id] = proc
        time.sleep(0.3)
        return {'status': 'success', **inst}

    def fake_remove(server_id):
        manager.instances.pop(server_id, None)
        proc = started.pop(server_id, None)
        if proc:
            proc.terminate()
            proc.wait(timeout=5)
        return {'status': 'success'}

    monkeypatch.setattr(manager, 'create_instance', fake_create)
    monkeypatch.setattr(manager, 'remove_instance', fake_remove)

    headers = {'X-API-Token': API_TOKEN}
    data = {'server_id': 'srv1', 'game_port': 33000}
    resp = client.post('/api/instances', json=data, headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    port = body['tunnel_game_port']

    assert is_port_open(port)

    cfg_resp = client.get(f'/api/instances/{data["server_id"]}/client-config',
                          headers=headers,
                          query_string={'host_ip': '127.0.0.1'})
    assert cfg_resp.status_code == 200
    cfg = cfg_resp.get_json()['config']
    assert str(port) in cfg
    assert API_TOKEN in cfg

    del_resp = client.delete(f'/api/instances/{data["server_id"]}', headers=headers)
    assert del_resp.status_code == 200
    time.sleep(0.3)
    assert not is_port_open(port)
