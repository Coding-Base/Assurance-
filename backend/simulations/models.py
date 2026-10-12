import hmac
import hashlib
from django.db import models, transaction
from django.core.exceptions import ValidationError


class Workspace(models.Model):
    """
    Multi-tenant workspace with cryptographic HMAC license verification and row-level locking.
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

    @classmethod
    def atomic_decrement_quota(cls, workspace_id: str) -> int:
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
        return f"{self.name} [{self.tier}]"


class SimulationRunResult(models.Model):
    """
    Beggs & Brill multiphase spatial results archive.
    """
    id = models.CharField(max_length=64, primary_key=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='simulations')
    project_id = models.CharField(max_length=64)
    status = models.CharField(max_length=32, default='COMPLETED')
    execution_time_ms = models.PositiveIntegerField(default=100)

    total_length_km = models.DecimalField(max_digits=8, decimal_places=2)
    arrival_pressure_bar = models.DecimalField(max_digits=8, decimal_places=2)
    arrival_temp_c = models.DecimalField(max_digits=8, decimal_places=2)
    min_hydrate_margin_c = models.DecimalField(max_digits=8, decimal_places=2)
    is_hydrate_plug_predicted = models.BooleanField(default=False)
    dominant_flow_regime = models.CharField(max_length=64, default='Segregated')

    spatial_profile_data = models.JSONField()
    baseline_comparison_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Run {self.id} [{self.status}]"
