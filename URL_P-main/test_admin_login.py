import requests
import json

# Test admin login
url = "http://127.0.0.1:8000/login"
payload = {
    "email": "admin@cybershield.com",
    "password": "Admin123!"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("✅ Login successful!")
        data = response.json()
        print(f"Token: {data.get('access_token')}")
    else:
        print("❌ Login failed")
        
except Exception as e:
    print(f"Error: {e}")