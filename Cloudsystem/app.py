from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import time
import os
import uuid
from db import execute_query, init_db

# Import legacy connector
import bc_connector 

app = Flask(__name__)
CORS(app)

# --- Legacy Pipeline Support ---
POLICY_FILE = "policy_decision.json"
RESULT_FILE = "bc_verification_result.json"

def load_json(path):
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return {}

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/api/policy', methods=['GET', 'POST'])
def handle_legacy_policy():
    if request.method == 'POST':
        data = request.json
        save_json(POLICY_FILE, data)
        return jsonify({"status": "saved", "data": data})
    else:
        return jsonify(load_json(POLICY_FILE))

@app.route('/api/run', methods=['POST'])
def run_pipeline():
    logs = []
    # ... (Same legacy logic as before) ...
    steps = ["1. Data Collection", "2. TTL Transformation", "3. Fuseki Load", "4. SPARQL Feature Extraction", "5. Policy Decision Engine"]
    for step in steps:
        time.sleep(0.2); logs.append({"step": step, "status": "COMPLETED", "message": "Simulated success"})
    
    try:
        logs.append({"step": "6. BC Procedure Verification", "status": "RUNNING", "message": "Invoking Connector..."})
        policy = load_json(POLICY_FILE)
        connector = bc_connector.BCVerificationConnector()
        bc_result = connector.verify(policy)
        save_json(RESULT_FILE, bc_result)
        logs.append({"step": "6. BC Procedure Verification", "status": "COMPLETED" if bc_result['status'] == 'PASS' else "FAILED", "message": f"{bc_result['status']}. {bc_result['raw_bc_message']}"})
    except Exception as e:
        logs.append({"step": "6. BC Procedure Verification", "status": "ERROR", "message": str(e)})

    try:
        logs.append({"step": "7. Quality Gate", "status": "RUNNING", "message": "Checking criteria..."})
        res = load_json(RESULT_FILE)
        logs.append({"step": "7. Quality Gate", "status": "COMPLETED" if res.get('status') == 'PASS' else "FAILED", "message": "Gate Passed" if res.get('status') == 'PASS' else f"Gate Failed: {res.get('recommended_fix')}"})
    except Exception as e:
        logs.append({"step": "7. Quality Gate", "status": "ERROR", "message": str(e)})

    return jsonify({"logs": logs, "final_status": "SUCCESS", "bc_result": load_json(RESULT_FILE)})


# --- SQLite Backend API ---

@app.route('/api/auth/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request body"}), 400
    
    email = data.get('email')
    if not email or not isinstance(email, str):
        return jsonify({"error": "Email is required"}), 400
    
    # Check DB
    user, error = execute_query("SELECT id, email, full_name FROM users WHERE email = ?", (email,), fetch_one=True)
    
    if error:
        return jsonify({"error": f"Database error: {error}"}), 500
    
    if user:
        return jsonify({"user": user, "token": f"mock-jwt-{user['id']}"})
    
    # Fallback/Test User (only in development)
    if os.getenv('FLASK_DEBUG', 'False').lower() == 'true' and email == "admin@example.com":
        # Ensure it exists in DB if not found
        uid = "admin-uuid-1234"
        execute_query("INSERT OR IGNORE INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)", 
                      (uid, email, "password", "Admin User"), commit=True)
        return jsonify({"user": {"id": uid, "email": email, "full_name": "Admin User"}, "token": "dev-token"})
        
    return jsonify({"error": "User not found"}), 404

@app.route('/api/datasets', methods=['GET', 'POST'])
def handle_datasets():
    if request.method == 'GET':
        datasets, error = execute_query("SELECT * FROM datasets ORDER BY created_at DESC", fetch_all=True)
        if error:
            return jsonify({"error": f"Database error: {error}"}), 500
        # Parse JSON fields
        if datasets:
            for d in datasets:
                if d.get('json_data') and isinstance(d['json_data'], str):
                    try: 
                        d['json_data'] = json.loads(d['json_data']) 
                    except json.JSONDecodeError:
                        pass  # Keep as string if invalid JSON
        return jsonify(datasets or [])
    
    if request.method == 'POST':
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        
        data = request.json
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        if 'name' not in data:
            return jsonify({"error": "Name is required"}), 400
        
        uid = str(uuid.uuid4())
        user_id = data.get('uploaded_by')
        
        query = "INSERT INTO datasets (id, name, description, json_data, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)"
        json_data_str = json.dumps(data.get('json_data')) if data.get('json_data') else None
        params = (uid, data['name'], data.get('description'), json_data_str, data.get('file_size'), user_id)
        
        _, error = execute_query(query, params, commit=True)
        if error: 
            return jsonify({"error": error}), 500
        
        return jsonify({"id": uid, "name": data['name']})

@app.route('/api/ttl', methods=['POST'])
def save_ttl():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request body"}), 400
    
    if 'ttl_content' not in data:
        return jsonify({"error": "ttl_content is required"}), 400
    
    uid = str(uuid.uuid4())
    user_id = data.get('created_by')
    
    query = "INSERT INTO ttl_files (id, dataset_id, ttl_content, created_by) VALUES (?, ?, ?, ?)"
    params = (uid, data.get('dataset_id'), data['ttl_content'], user_id)
    
    _, error = execute_query(query, params, commit=True)
    if error: 
        return jsonify({"error": error}), 500
    return jsonify({"id": uid})

@app.route('/api/fuseki/upload', methods=['POST'])
def upload_to_fuseki():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request body"}), 400
    
    ttl_content = data.get('ttl_content')
    if not ttl_content:
        return jsonify({"error": "ttl_content is required"}), 400
    
    dataset_name = data.get('dataset', 'fc')
    # Sanitize dataset name to prevent path traversal
    if not dataset_name.replace('_', '').replace('-', '').isalnum():
        return jsonify({"error": "Invalid dataset name"}), 400
    
    fuseki_url = f"http://localhost:3030/{dataset_name}/data"
    
    try:
        try:
            requests.get("http://localhost:3030/$/ping", timeout=1)
        except requests.exceptions.RequestException:
             return jsonify({"error": "Fuseki server is not running. Please start it using './start_fuseki.sh'"}), 503

        headers = {'Content-Type': 'text/turtle'}
        response = requests.post(
            fuseki_url, 
            data=ttl_content.encode('utf-8'), 
            headers=headers,
            timeout=30  # Add timeout
        )
        
        if response.status_code in [200, 201, 204]:
            return jsonify({"status": "success", "message": "TTL data successfully loaded into Fuseki."})
        else:
            return jsonify({"error": f"Fuseki Error ({response.status_code}): {response.text}"}), response.status_code
            
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout: Fuseki server did not respond in time"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/fuseki/status', methods=['GET'])
def check_fuseki_status():
    try:
        resp = requests.get("http://localhost:3030/$/ping", timeout=0.5)
        if resp.status_code == 200:
            return jsonify({"status": "running", "version": "Unknown"}) 
    except:
        pass
    return jsonify({"status": "stopped"})

@app.route('/api/sparql/execute', methods=['POST'])
def execute_sparql():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request body"}), 400
    
    query_text = data.get('query')
    if not query_text:
        return jsonify({"error": "Query is required"}), 400
    
    endpoint = data.get('fuseki_endpoint', 'http://localhost:3030/fc/sparql')
    user_id = data.get('executed_by')
    
    start_time = time.time()
    try:
        # Fuseki call with timeout
        response = requests.post(
            endpoint, 
            data={'query': query_text}, 
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30  # 30 second timeout
        )
        exec_time_ms = int((time.time() - start_time) * 1000)
        
        if response.status_code == 200:
            results = response.json()
            # Log
            log_id = str(uuid.uuid4())
            l_query = "INSERT INTO query_executions (id, query, results, execution_time, status, executed_by) VALUES (?, ?, ?, ?, ?, ?)"
            execute_query(l_query, (log_id, query_text, json.dumps(results), exec_time_ms, 'success', user_id), commit=True)
            return jsonify({"results": results, "execution_time": exec_time_ms})
        else:
            return jsonify({"error": f"Fuseki Error: {response.text}"}), response.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout: Fuseki server did not respond in time"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/sparql/history', methods=['GET'])
def sparql_history():
    history, error = execute_query("SELECT * FROM query_executions ORDER BY executed_at DESC LIMIT 10", fetch_all=True)
    # Parse JSON
    if history:
        for h in history:
            if h.get('results') and isinstance(h['results'], str):
                 try: h['results'] = json.loads(h['results']) 
                 except: pass
    return jsonify(history or [])

@app.route('/api/policies', methods=['GET', 'POST'])
def handle_policies():
    if request.method == 'GET':
        policies, error = execute_query("SELECT * FROM policies ORDER BY created_at DESC", fetch_all=True)
        if error:
            return jsonify({"error": f"Database error: {error}"}), 500
        return jsonify(policies or [])

    if request.method == 'POST':
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        
        data = request.json
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        if 'name' not in data or 'sparql_query' not in data:
            return jsonify({"error": "Name and sparql_query are required"}), 400
        
        uid = str(uuid.uuid4())
        query = "INSERT INTO policies (id, name, description, sparql_query, status, created_by) VALUES (?, ?, ?, ?, ?, ?)"
        params = (uid, data['name'], data.get('description'), data['sparql_query'], data.get('status', 'draft'), data.get('created_by'))
        _, error = execute_query(query, params, commit=True)
        if error: 
            return jsonify({"error": error}), 500
        return jsonify({"id": uid, "name": data['name']})

@app.route('/api/policies/<policy_id>', methods=['PUT', 'DELETE'])
def update_delete_policy(policy_id):
    if not policy_id:
        return jsonify({"error": "Policy ID is required"}), 400
    
    if request.method == 'DELETE':
        _, error = execute_query("DELETE FROM policies WHERE id = ?", (policy_id,), commit=True)
        if error: 
            return jsonify({"error": error}), 500
        return jsonify({"status": "deleted"})
        
    if request.method == 'PUT':
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
        
        data = request.json
        if not data:
            return jsonify({"error": "Invalid request body"}), 400
        
        if 'name' not in data or 'sparql_query' not in data:
            return jsonify({"error": "Name and sparql_query are required"}), 400
        
        query = "UPDATE policies SET name=?, description=?, sparql_query=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        params = (data['name'], data.get('description'), data['sparql_query'], data.get('status'), policy_id)
        _, error = execute_query(query, params, commit=True)
        if error: 
            return jsonify({"error": error}), 500
        return jsonify({"status": "updated"})

@app.route('/api/analyze', methods=['POST'])
def analyze_policy():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request body"}), 400
    
    policy_id = data.get('policy_id')
    if not policy_id:
        return jsonify({"error": "policy_id is required"}), 400
    
    time.sleep(1.5)
    mock_score = 85
    mock_result = "Analysis: Valid Logic."
    
    uid = str(uuid.uuid4())
    query = "INSERT INTO llm_analyses (id, policy_id, analysis_result, quality_score) VALUES (?, ?, ?, ?)"
    _, error = execute_query(query, (uid, policy_id, mock_result, mock_score), commit=True)
    
    if error: 
        return jsonify({"error": error}), 500
    return jsonify({"analysis": {"id": uid, "quality_score": mock_score, "analysis_result": mock_result}})

@app.route('/api/analyses', methods=['GET'])
def get_analyses():
    analyses, error = execute_query("SELECT * FROM llm_analyses ORDER BY analyzed_at DESC", fetch_all=True)
    return jsonify(analyses or [])

@app.route('/api/proxy', methods=['POST'])
def proxy_request():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 400
    
    data = request.json
    if not data:
        return jsonify({"error": "Invalid request body"}), 400
    
    url = data.get('url')
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    # Security: Only allow specific domains or localhost in production
    allowed_hosts = os.getenv('PROXY_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.hostname not in allowed_hosts and '*' not in allowed_hosts:
        return jsonify({"error": "Proxy to this host is not allowed"}), 403
    
    try:
        method = data.get('method', 'GET')
        headers = data.get('headers', {})
        body = data.get('body')
        
        resp = requests.request(
            method=method, 
            url=url, 
            headers=headers, 
            json=body,
            timeout=30  # Add timeout
        )
        resp.raise_for_status()  # Raise exception for bad status codes
        return jsonify(resp.json())
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Request failed: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

if __name__ == '__main__':
    init_db() # Ensure DB is created on start
    # Only enable debug mode in development
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, port=5001)
