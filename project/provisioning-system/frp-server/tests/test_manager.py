import subprocess
import os
from pathlib import Path
import types

os.environ.setdefault("LEGACY_AUTH_ENABLED", "true")
os.environ.setdefault("API_TOKEN", "test-token")
import frp_instance_manager as fim


class DummyProc:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        self.terminated = False

    def poll(self):
        return None

    def terminate(self):
        self.terminated = True

    def wait(self, timeout=None):
        pass

    def kill(self):
        self.terminated = True


def setup_manager(monkeypatch, tmp_path):
    monkeypatch.setattr(fim, "BASE_DATA_DIR", str(tmp_path))
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: DummyProc(*a, **k))
    return fim.FrpManager()


def test_port_allocation(monkeypatch, tmp_path):
    monkeypatch.setattr(fim, "FRPS_PORT_RANGE_START", 5000)
    monkeypatch.setattr(fim, "FRPS_PORT_RANGE_END", 5002)
    mgr = setup_manager(monkeypatch, tmp_path)
    res1 = mgr.create_instance("srv1", 1234)
    res2 = mgr.create_instance("srv2", 1235)
    assert res1["frps_port"] != res2["frps_port"]
    assert {res1["frps_port"], res2["frps_port"]} == {5000, 5001}


def test_frps_process_lifecycle(monkeypatch, tmp_path):
    mgr = setup_manager(monkeypatch, tmp_path)
    res = mgr.create_instance("srv", 1111)
    proc = mgr.frps_processes["srv"]
    assert isinstance(proc, DummyProc)
    assert not proc.terminated
    mgr.remove_instance("srv")
    assert proc.terminated
    assert "srv" not in mgr.frps_processes
