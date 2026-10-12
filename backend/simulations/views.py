import time
import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from physics_solver import solve_subsea_chain
from .models import Workspace, SimulationRunResult


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for container orchestrators."""
    return Response({
        "status": "healthy",
        "service": "SubseaFlow Django REST Framework Engine",
        "solver": "Beggs & Brill (1973) Multiphase Discretizer"
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def run_simulation(request):
    """
    POST /api/v1/simulations/run/
    Receives serialized DAG network chain from interactive React canvas,
    executes Beggs & Brill solver, and returns 1D spatial cells and summary KPIs.
    """
    data = request.data
    project_id = data.get("project_id", "proj_subsea_tieback_01")
    workspace_id = data.get("workspace_id", "ws_alpha_energy")
    network_chain = data.get("network_chain", [])

    if not network_chain:
        return Response(
            {"error": "Empty or missing network_chain in simulation request"},
            status=status.HTTP_400_BAD_REQUEST
        )

    t0 = time.time()
    try:
        # Solve physics using Python 3 Beggs & Brill engine
        sim_output = solve_subsea_chain(network_chain)
        duration_ms = int((time.time() - t0) * 1000)

        run_id = f"sim_run_{uuid.uuid4().hex[:12]}"
        summary = sim_output["summary"]

        response_payload = {
            "simulation_id": run_id,
            "project_id": project_id,
            "workspace_id": workspace_id,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "execution_time_ms": duration_ms,
            "summary": summary,
            "spatial_profile": sim_output["spatial_profile"],
            "unmitigated_baseline": sim_output["unmitigated_baseline"],
            "backend": "Django REST Framework / Python 3 Beggs & Brill"
        }

        return Response(response_payload, status=status.HTTP_200_OK)

    except ValueError as ve:
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": f"Numerical convergence exception: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_workspaces(request):
    """Returns available multi-tenant workspaces and trial quota balances."""
    workspaces = [
        {
            "id": "ws_alpha_energy",
            "name": "Alpha Energy Subsea Tiebacks",
            "tier": "TRIAL",
            "trial_runs_left": 12,
            "max_runs": 15,
            "is_license_valid": True
        },
        {
            "id": "ws_petrotech_gulf",
            "name": "PetroTech Gulf Deepwater Ops",
            "tier": "ENTERPRISE",
            "trial_runs_left": 9999,
            "max_runs": 10000,
            "is_license_valid": True
        },
        {
            "id": "ws_nordic_subsea",
            "name": "Nordic Offshore Consortium",
            "tier": "TRIAL",
            "trial_runs_left": 2,
            "max_runs": 15,
            "is_license_valid": True
        }
    ]
    return Response(workspaces, status=status.HTTP_200_OK)
