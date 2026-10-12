"""
Django Admin Design & Configuration for SubseaFlow Platform
Includes Workspace management, Commercial License Key generation, and Simulation auditing.
"""

import uuid
from django.contrib import admin
from django.utils.html import format_html
from .models import Workspace, CommercialLicense, SimulationRunResult

admin.site.site_header = "SubseaFlow CAD Platform - Administration"
admin.site.site_title = "SubseaFlow Flow Assurance Portal"
admin.site.index_title = "Subsea Asset, Multi-Tenant Workspace & Commercial License Management"


@admin.register(CommercialLicense)
class CommercialLicenseAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'organization_name',
        'tier_badge',
        'allowed_runs',
        'license_key_preview',
        'status_badge',
        'issued_by',
        'created_at',
    )
    list_filter = ('tier', 'is_revoked', 'created_at')
    search_fields = ('organization_name', 'license_key_hmac', 'id')
    readonly_fields = ('id', 'created_at')
    actions = ['revoke_selected_licenses', 'reissue_signed_license_key']

    fieldsets = (
        ('License Holder & Organization', {
            'fields': ('id', 'organization_name', 'workspace', 'tier', 'allowed_runs')
        }),
        ('Cryptographic Security & Verification', {
            'fields': ('license_key_hmac', 'is_revoked', 'expires_at', 'issued_by')
        }),
        ('Enabled Subsea Capabilities', {
            'fields': ('features',),
            'classes': ('collapse',)
        }),
        ('Audit Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.id:
            obj.id = f"LIC-{uuid.uuid4().hex[:8].upper()}"
        if not obj.license_key_hmac:
            obj.license_key_hmac = CommercialLicense.generate_signed_key(
                obj.organization_name,
                obj.tier,
                obj.allowed_runs
            )
        obj.issued_by = request.user.email or 'admin@subseaflow.internal'
        super().save_model(request, obj, form, change)

    def tier_badge(self, obj):
        colors = {
            'TRIAL': '#6366f1',
            'PROFESSIONAL': '#0ea5e9',
            'ENTERPRISE': '#10b981',
            'ACADEMIC': '#f59e0b',
        }
        color = colors.get(obj.tier, '#64748b')
        return format_html(
            '<span style="background-color: {}; color: #ffffff; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 11px;">{}</span>',
            color,
            obj.tier
        )
    tier_badge.short_description = "Tier"

    def status_badge(self, obj):
        if obj.is_revoked:
            return format_html('<span style="background-color: #e11d48; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">REVOKED</span>')
        return format_html('<span style="background-color: #059669; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px;">VALID HMAC</span>')
    status_badge.short_description = "Status"

    def license_key_preview(self, obj):
        return format_html('<code style="font-size: 10px; background: #1e293b; color: #38bdf8; padding: 2px 5px; border-radius: 3px;">{}...</code>', obj.license_key_hmac[:18])
    license_key_preview.short_description = "Signed HMAC Token"

    @admin.action(description="Revoke selected licenses")
    def revoke_selected_licenses(self, request, queryset):
        rows = queryset.update(is_revoked=True)
        self.message_user(request, f"Revoked {rows} license key(s).")

    @admin.action(description="Regenerate HMAC signatures for selected licenses")
    def reissue_signed_license_key(self, request, queryset):
        count = 0
        for lic in queryset:
            lic.license_key_hmac = CommercialLicense.generate_signed_key(lic.organization_name, lic.tier, lic.allowed_runs)
            lic.is_revoked = False
            lic.save()
            count += 1
        self.message_user(request, f"Regenerated HMAC signature for {count} license(s).")


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'id',
        'tier_badge',
        'trial_runs_left',
        'max_runs',
        'is_active',
        'created_at',
    )
    list_filter = ('tier', 'is_active', 'created_at')
    search_fields = ('name', 'id', 'license_key_hmac')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['reset_trial_runs_to_15', 'upgrade_to_enterprise_tier', 'deactivate_workspace']

    def tier_badge(self, obj):
        colors = {
            'TRIAL': '#6366f1',
            'PROFESSIONAL': '#0ea5e9',
            'ENTERPRISE': '#10b981',
            'ACADEMIC': '#f59e0b',
        }
        color = colors.get(obj.tier, '#64748b')
        return format_html(
            '<span style="background-color: {}; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{}</span>',
            color,
            obj.tier
        )
    tier_badge.short_description = "Tier"

    @admin.action(description="Reset selected workspaces to 15 trial runs")
    def reset_trial_runs_to_15(self, request, queryset):
        rows_updated = queryset.update(trial_runs_left=15)
        self.message_user(request, f"Successfully reset quota to 15 runs for {rows_updated} workspace(s).")

    @admin.action(description="Upgrade selected workspaces to Unlimited Enterprise")
    def upgrade_to_enterprise_tier(self, request, queryset):
        rows_updated = queryset.update(
            tier='ENTERPRISE',
            trial_runs_left=9999,
            max_runs=10000,
            license_key_hmac='HMAC_SHA256_ENT_VALID_SIGNED'
        )
        self.message_user(request, f"Upgraded {rows_updated} workspace(s) to Enterprise tier.")

    @admin.action(description="Deactivate selected workspaces")
    def deactivate_workspace(self, request, queryset):
        rows_updated = queryset.update(is_active=False)
        self.message_user(request, f"Deactivated {rows_updated} workspace(s).")


@admin.register(SimulationRunResult)
class SimulationRunResultAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'workspace',
        'total_length_km',
        'arrival_temp_c',
        'arrival_pressure_bar',
        'hydrate_status_badge',
        'dominant_flow_regime',
        'status',
        'created_at',
    )
    list_filter = ('is_hydrate_plug_predicted', 'status', 'dominant_flow_regime', 'workspace')
    search_fields = ('id', 'project_id', 'workspace__name')
    readonly_fields = (
        'id',
        'workspace',
        'project_id',
        'status',
        'execution_time_ms',
        'total_length_km',
        'arrival_pressure_bar',
        'arrival_temp_c',
        'min_hydrate_margin_c',
        'is_hydrate_plug_predicted',
        'dominant_flow_regime',
        'created_at',
        'spatial_profile_data',
        'baseline_comparison_data',
    )

    def hydrate_status_badge(self, obj):
        if obj.is_hydrate_plug_predicted:
            return format_html(
                '<span style="background-color: #e11d48; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">HYDRATE HAZARD</span>'
            )
        return format_html(
            '<span style="background-color: #059669; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">SAFE (+{}°C)</span>',
            obj.min_hydrate_margin_c
        )
    hydrate_status_badge.short_description = "Hydrate Margin"
