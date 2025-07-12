#!/usr/bin/env python3
"""
Test script for the Secure FRP Instance Manager
Tests both legacy and modern authentication methods
"""
__test__ = False

import requests
import json
import sys
import time

# Configuration
BASE_URL = "http://localhost:7001"
LEGACY_TOKEN = "470d4ae26987ec5b430196e03ce999602008de2945921b106250efe207939f5f"

def test_health_check():
    """Test the health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        assert response.status_code == 200, f"health failed: {response.status_code}"
        data = response.json()
        print(f"✅ Health check passed: {data.get('status')}")
        print(f"   Version: {data.get('version')}")
        print(f"   Auth Service: {data.get('auth_service')}")
        print(f"   HTTPS Enabled: {data.get('https_enabled')}")
        print(f"   Legacy Auth: {data.get('legacy_auth_enabled')}")
        print(f"   Active Instances: {data.get('active_instances')}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
        raise

def test_legacy_auth():
    """Test legacy API token authentication"""
    print("\n🔐 Testing legacy authentication...")
    
    # Test with X-API-Token header
    headers = {
        'X-API-Token': LEGACY_TOKEN,
        'Content-Type': 'application/json'
    }
    
    payload = {
        'server_id': 'test-server-legacy',
        'game_port': 7777,
        'query_port': 15000
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/instances", json=payload, headers=headers, timeout=10
        )
        print(f"   Response: {response.status_code}")
        print(f"   Body: {response.text}")

        assert response.status_code == 200, f"legacy header failed: {response.status_code}"

        # Clean up - remove the test instance
        requests.delete(
            f"{BASE_URL}/api/instances/test-server-legacy",
            headers={'X-API-Token': LEGACY_TOKEN},
            timeout=10,
        )

    except Exception as e:
        print(f"❌ Legacy auth error: {e}")
        raise

def test_legacy_auth_payload():
    """Test legacy API token in payload (deprecated method)"""
    print("\n🔐 Testing legacy authentication (payload method)...")
    
    payload = {
        'token': LEGACY_TOKEN,
        'server_id': 'test-server-payload',
        'game_port': 7778,
        'query_port': 15001
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/instances", json=payload, timeout=10)
        print(f"   Response: {response.status_code}")
        print(f"   Body: {response.text}")

        assert response.status_code == 200, f"legacy payload failed: {response.status_code}"

        # Clean up - remove the test instance
        requests.delete(
            f"{BASE_URL}/api/instances/test-server-payload?token={LEGACY_TOKEN}",
            timeout=10,
        )

    except Exception as e:
        print(f"❌ Legacy auth error: {e}")
        raise

def test_list_instances():
    """Test listing instances"""
    print("\n📋 Testing instance listing...")
    
    headers = {'X-API-Token': LEGACY_TOKEN}
    
    try:
        response = requests.get(f"{BASE_URL}/api/instances", headers=headers, timeout=10)
        print(f"   Response: {response.status_code}")

        assert response.status_code == 200, f"list failed: {response.status_code}"
        data = response.json()
        instances = data.get('instances', [])
        print(f"✅ Listed {len(instances)} instances")

        for instance_id, instance_info in instances.items():
            print(f"   - {instance_id}: port {instance_info.get('rathole_port')}, owner: {instance_info.get('owner_username', 'legacy')}")

    except Exception as e:
        print(f"❌ List instances error: {e}")
        raise

def test_auth_failure():
    """Test authentication failure"""
    print("\n🚫 Testing authentication failure...")
    
    payload = {
        'server_id': 'test-server-fail',
        'game_port': 7779
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/instances", json=payload, timeout=10)
        print(f"   Response: {response.status_code}")

        assert response.status_code == 401, f"expected 401, got {response.status_code}"
        print("✅ Authentication properly rejected!")

    except Exception as e:
        print(f"❌ Auth failure test error: {e}")
        raise

def main():
    """Run all tests"""
    print("🧪 Starting Secure FRP Instance Manager Tests")
    print("=" * 50)
    
    tests = [
        test_health_check,
        test_legacy_auth,
        test_legacy_auth_payload,
        test_list_instances,
        test_auth_failure
    ]
    
    passed = 0
    total = len(tests)

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"❌ {test.__name__} failed: {e}")
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
        
        time.sleep(1)  # Brief pause between tests
    
    print("\n" + "=" * 50)
    print(f"🏁 Tests completed: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed! The secure FRP manager is working correctly.")
        sys.exit(0)
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()
