import json
import sys

def quality_gate_check(result_path="bc_verification_result.json"):
    """
    Evaluates the BC Verification Result and enforces the Quality Gate.
    """
    print("--- [Quality Gate] Starting Business Central Procedure Verification ---")
    
    try:
        with open(result_path, 'r') as f:
            result = json.load(f)
    except FileNotFoundError:
        print(f"Error: {result_path} not found. verification failed to run?")
        sys.exit(1)
        
    status = result.get("status")
    
    if status == "PASS":
        print(f"✅ PASSED: Business Central Verification successful.")
        print(f"   Evidence: {result.get('evidence')}")
        # Proceed to next step (e.g., Trigger Execution)
        return True
    else:
        print(f"❌ FAILED: Business Central rejected the decision.")
        print(f"   Error Codes: {result.get('error_codes')}")
        print(f"   Reason: {result.get('raw_bc_message')}")
        print(f"   Recommended Fix: {result.get('recommended_fix')}")
        print("   -> Action: Decision moved to STAGING for review.")
        return False

if __name__ == "__main__":
    passed = quality_gate_check()
    if passed:
        sys.exit(0)
    else:
        sys.exit(1)
