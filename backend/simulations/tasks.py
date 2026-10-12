"""
Celery Asynchronous Tasks for Subsea Flow Assurance Discretization
Executes high-resolution multiphase meshes (Δx = 10m to 100m) in background workers.
"""

try:
    from celery import shared_task
except ImportError:
    # Fallback decorator if Celery is not installed in local environment
    def shared_task(func):
        return func

from physics_solver import solve_subsea_chain


@shared_task
def run_asynchronous_simulation_task(project_id: str, workspace_id: str, network_chain: list, delta_x_m: float = 100.0):
    """
    Celery background worker task for intensive tieback spatial meshing.
    """
    result = solve_subsea_chain(network_chain, delta_x_m=delta_x_m)
    return {
        "project_id": project_id,
        "workspace_id": workspace_id,
        "status": "COMPLETED",
        "result": result
    }
