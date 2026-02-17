import time
import subprocess
import sys
import json

def run_step(step_name, delay=0.5):
    print(f"\n[{step_name}] processing...")
    time.sleep(delay)
    print(f"[{step_name}] complete.")

def main():
    print("=== Starting Policy Pipeline with Business Central Verification ===")

    # 1. Data Collection (Simulated)
    run_step("1. Data Collection")

    # 2. TTL Implementation (Simulated)
    run_step("2. TTL Transformation")

    # 3. Fuseki Loading (Simulated)
    run_step("3. Fuseki Load")

    # 4. SPARQL Feature Extraction (Simulated)
    run_step("4. SPARQL Feature Extraction")

    # 5. Policy Evaluation (Simulated)
    # Ensure policy_decision.json is ready
    run_step("5. Policy Decision Engine")
    
    # 6. Business Central Verification (The New Module)
    print("\n[6. BC Procedure Verification] invoking connector...")
    try:
        # Run the connector
        result = subprocess.run([sys.executable, "bc_connector.py"], check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Connector failed: {e.stderr}")
        sys.exit(1)

    # 7. Quality Gate
    print("\n[7. Quality Gate] checking results...")
    result = subprocess.run([sys.executable, "quality_gate.py"], capture_output=True, text=True)
    print(result.stdout)
    
    if result.returncode == 0:
        print(">>> PIPELINE SUCCESS: Ready for execution/provisioning.")
    else:
        print(">>> PIPELINE STOPPED: Decision held in Staging.")

if __name__ == "__main__":
    main()
