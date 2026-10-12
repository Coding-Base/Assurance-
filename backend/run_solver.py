#!/usr/bin/env python3
"""
Python Solver CLI Runner for SubseaFlow Platform
Accepts serialized DAG JSON via stdin or argument and outputs solved spatial profiles.
"""

import sys
import json
import time
from physics_solver import solve_subsea_chain


def main():
    try:
        if len(sys.argv) > 1:
            with open(sys.argv[1], 'r', encoding='utf-8') as f:
                payload = json.load(f)
        else:
            raw_input = sys.stdin.read()
            if not raw_input.strip():
                sys.stderr.write("Error: Empty input received on stdin\n")
                sys.exit(1)
            payload = json.loads(raw_input)

        network_chain = payload.get("network_chain", [])
        if not network_chain:
            sys.stderr.write("Error: network_chain missing in payload\n")
            sys.exit(1)

        t0 = time.time()
        result = solve_subsea_chain(network_chain)
        duration_ms = round((time.time() - t0) * 1000, 2)

        output = {
            "status": "success",
            "solver": "Python 3.10 Beggs & Brill Multiphase Discretizer",
            "execution_time_ms": duration_ms,
            "project_id": payload.get("project_id", "proj_subsea_tieback_01"),
            "workspace_id": payload.get("workspace_id", "ws_alpha_energy"),
            **result
        }

        print(json.dumps(output, indent=2))
        sys.exit(0)

    except Exception as e:
        sys.stderr.write(f"Python Solver Exception: {str(e)}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
