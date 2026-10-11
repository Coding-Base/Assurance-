# ==============================================================================
# SubseaFlow CAD Platform - Django ORM Multi-Tenant Models (v2)
# Multi-tenant workspace isolation, JWT verification, and simulation run models.
# ==============================================================================

import hmac
import hashlib
from django.db import models, transaction
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils import timezone


class Workspace(models.Model):
    """
    Tenant isolation container for engineering assets, simulations, and license quotas.
    """
    TIER_CHOICES = [
        ('TRIAL', 'Trial Tier (15 Runs)'),
        ('PROFESSIONAL', 'Professional Tier'),
        ('ENTERPRISE', 'Enterprise Unlimited (HMAC Validated)'),
    ]

    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    tier = models.CharField(max_length=32, choices=TIER_CHOICES, default='TRIAL')
    trial_runs_left = models.PositiveIntegerField(default=15)
    max_runs = models.PositiveIntegerField(default=15)
    license_key_hmac = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def verify_license_signature(self, secret_key: str) -> bool:
        """
        Cryptographically verifies signed HMAC commercial license token.
        """
        expected_sig = hmac.new(
            secret_key.encode(),
            f"{self.id}:{self.tier}:{self.max_runs}".encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(self.license_key_hmac, expected_sig)

    @classmethod
    def atomic_decrement_quota(cls, workspace_id: str) -> int:
        """
        Uses SELECT ... FOR UPDATE to atomically decrement tenant runs without race conditions.
        """
        with transaction.atomic():
            ws = cls.objects.select_for_update().get(id=workspace_id)
            if ws.tier == 'ENTERPRISE':
                return ws.trial_runs_left
            if ws.trial_runs_left <= 0:
                raise ValidationError("Simulation quota exhausted for workspace.")
            ws.trial_runs_left -= 1
            ws.save(update_fields=['trial_runs_left', 'updated_at'])
            return ws.trial_runs_left

    def __str__(self):
        return f"{self.name} [{self.tier}] - {self.trial_runs_left} runs remaining"


class CustomUser(AbstractUser):
    """
    Custom user model with Flow Assurance role assignments and workspace binding.
    """
    ROLE_CHOICES = [
        ('Lead Flow Assurance Engineer', 'Lead Flow Assurance Engineer'),
        ('Subsea Systems Specialist', 'Subsea Systems Specialist'),
        ('Offshore Operations Admin', 'Offshore Operations Admin'),
        ('Viewer', 'Read-Only Viewer'),
    ]

    active_workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='members',
        null=True,
        blank=True
    )
    role = models.CharField(
        max_length=64,
        choices=ROLE_CHOICES,
        default='Lead Flow Assurance Engineer'
    )

    def __str__(self):
        return f"{self.email} ({self.role})"


class SimulationProject(models.Model):
    """
    Subsea flowline tieback project graph and serialized DAG definitions.
    """
    id = models.CharField(max_length=64, primary_key=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='projects')
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    canvas_version = models.CharField(max_length=16, default='2.1')
    graph_topology = models.JSONField(help_text="Visual React Flow CAD canvas coordinate structure")
    serialized_chain = models.JSONField(help_text="Normalized chronological DAG list for physics solver")
    is_valid_dag = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.workspace.name})"


class SimulationRunResult(models.Model):
    """
    Discretized multiphase Beggs & Brill physics results with spatial arrays and hydrate safety margins.
    """
    STATUS_CHOICES = [
        ('QUEUED', 'Queued in Celery'),
        ('SOLVING', 'Computing 1D Spatial Cells'),
        ('COMPLETED', 'Convergence Reached'),
        ('FAILED', 'Thermodynamic Infeasible'),
    ]

    id = models.CharField(max_length=64, primary_key=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='simulations')
    project = models.ForeignKey(SimulationProject, on_delete=models.CASCADE, related_name='runs')
    triggered_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='COMPLETED')
    execution_time_ms = models.PositiveIntegerField(default=120)

    # Key Engineering KPIs
    total_length_km = models.DecimalField(max_digits=8, decimal_places=2)
    wellhead_pressure_bar = models.DecimalField(max_digits=8, decimal_places=2)
    wellhead_temp_c = models.DecimalField(max_digits=8, decimal_places=2)
    arrival_pressure_bar = models.DecimalField(max_digits=8, decimal_places=2)
    arrival_temp_c = models.DecimalField(max_digits=8, decimal_places=2)
    pressure_drop_bar = models.DecimalField(max_digits=8, decimal_places=2)
    min_hydrate_margin_c = models.DecimalField(max_digits=8, decimal_places=2)
    is_hydrate_plug_predicted = models.BooleanField(default=False)
    max_wax_thickness_mm = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)
    dominant_flow_regime = models.CharField(max_length=64, default='Segregated')

    # Serialized spatial arrays (100m cells: distance, pressure, temp, hydrate curve, holdup)
    spatial_profile_data = models.JSONField()
    baseline_comparison_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Run {self.id} [{self.status}] - Arrival {self.arrival_temp_c}°C / {self.arrival_pressure_bar} bar"
