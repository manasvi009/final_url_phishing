import requests

# Test the login endpoint
def test_login():
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
            print("\n✅ Login successful!")
            data = response.json()
            print(f"Token: {data.get('access_token')[:50]}...")
        elif response.status_code == 401:
            print("\n❌ Unauthorized - Invalid credentials")
        else:
            print(f"\n❌ Login failed with status code: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error occurred: {e}")

if __name__ == "__main__":
    test_login()