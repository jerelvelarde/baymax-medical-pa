import json
from pathlib import Path

p = Path("evidence/agent_proofs/CHATGPT-PROOF-0001.json")
d = json.loads(p.read_text())
assert d["proof_id"] == "CHATGPT-PROOF-0001"
assert d["project"] == "baymax-medical-pa"
assert d["repository"] == "jerelvelarde/baymax-medical-pa"
assert d["execution_agent"] == "ChatGPT"
assert d["execution_model"] == "GPT-5.6 Sol"
assert d["signature_state"] == "UNSIGNED"
assert d["claim_ceiling"] == "REMOTE_COMMIT_EXISTENCE_AND_TEST_EXECUTION_ONLY"
print("PASS CHATGPT-PROOF-0001")
