import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

API_TOKEN = "test-token"

@pytest.fixture(autouse=True)
def setup_env(monkeypatch, tmp_path):
    monkeypatch.setenv("RATHOLE_CLIENT_BINARY", "/usr/bin/frpc")
    monkeypatch.setenv("RATHOLE_TOKEN", API_TOKEN)
    yield

class DummyProc:
    def __init__(self):
        self.pid = 12345
    def poll(self):
        return None
    def terminate(self):
        pass
    def wait(self, timeout=None):
        pass


def test_start_rathole_client(monkeypatch, tmp_path):
    monkeypatch.setattr('docker.from_env', lambda *a, **k: None)
    import agent
    called = {}
    def fake_create(server_id, game_port, beacon_port):
        called['create'] = (server_id, game_port, beacon_port)
        return True, 7777, API_TOKEN
    def fake_get_cfg(server_id):
        return f"auth.token = {API_TOKEN}\nremote_port = {game_port}" if (game_port:=6000) else ''
    def fake_popen(cmd, cwd=None, stdout=None, stderr=None, text=None):
        called['cmd'] = cmd
        called['cwd'] = cwd
        Path(cwd, 'client.toml').write_text('dummy')
        return DummyProc()
    monkeypatch.setattr(agent, 'create_tunnel_instance', fake_create)
    monkeypatch.setattr(agent, 'get_rathole_client_config_from_manager', fake_get_cfg)
    monkeypatch.setattr(agent.subprocess, 'Popen', fake_popen)

    result = agent.start_rathole_client('sid', 'Server', 6000, 6001, None, None)
    assert result is True
    assert called['create'] == ('sid', 6000, 6001)
    assert called['cmd'][0] == '/usr/bin/frpc'
    assert '-c' in called['cmd']
    assert 'sid' in called['cwd']
    assert 'sid' in agent.frp_clients
