#!/usr/bin/env python3
"""
Seed script to create the Django Superuser administrator account
and bootstrap initial multi-tenant workspaces.
"""

import os
import sys
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

ADMIN_CREDENTIALS = {
    "username": "admin",
    "email": "admin@subseaflow.internal",
    "password": "SubseaAdmin2026!",
    "role": "Superuser / Flow Assurance Lead Administrator",
    "workspace": "ws_petrotech_gulf",
    "portal_url": "http://localhost:3000/admin (or http://localhost:8000/admin)"
}

INITIAL_TENANTS = [
    {
        "id": "ws_alpha_energy",
        "name": "Alpha Energy Subsea Tiebacks",
        "tier": "TRIAL",
        "trial_runs_left": 12,
        "max_runs": 15,
        "license_key_hmac": "HMAC_SHA256_ALPHA_TRIAL_v2_9f83a21",
        "is_active": 1
    },
    {
        "id": "ws_petrotech_gulf",
        "name": "PetroTech Gulf Deepwater Ops",
        "tier": "ENTERPRISE",
        "trial_runs_left": 9999,
        "max_runs": 10000,
        "license_key_hmac": "HMAC_SHA256_PETRO_ENT_VALID_8b21c7d4e39f",
        "is_active": 1
    },
    {
        "id": "ws_nordic_subsea",
        "name": "Nordic Offshore Consortium",
        "tier": "TRIAL",
        "trial_runs_left": 2,
        "max_runs": 15,
        "license_key_hmac": "HMAC_SHA256_NORDIC_LIMITED_4e1a0b",
        "is_active": 1
    }
]


def seed_database():
    db_file = BASE_DIR / "subseaflow.sqlite3"
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Create admin auth table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS auth_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            is_superuser INTEGER NOT NULL DEFAULT 1,
            is_staff INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create workspaces table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            tier TEXT NOT NULL,
            trial_runs_left INTEGER NOT NULL,
            max_runs INTEGER NOT NULL,
            license_key_hmac TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Insert admin superuser
    cursor.execute("""
        INSERT OR REPLACE INTO auth_users (id, username, email, password, role, is_superuser, is_staff)
        VALUES (1, ?, ?, ?, ?, 1, 1)
    """, (
        ADMIN_CREDENTIALS["username"],
        ADMIN_CREDENTIALS["email"],
        ADMIN_CREDENTIALS["password"],
        ADMIN_CREDENTIALS["role"]
    ))

    # Insert sample workspaces
    for t in INITIAL_TENANTS:
        cursor.execute("""
            INSERT OR REPLACE INTO workspaces (id, name, tier, trial_runs_left, max_runs, license_key_hmac, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            t["id"],
            t["name"],
            t["tier"],
            t["trial_runs_left"],
            t["max_runs"],
            t["license_key_hmac"],
            t["is_active"]
        ))

    conn.commit()
    conn.close()

    print("==================================================================")
    print(" SubseaFlow Django Administrator Account Seeded Successfully")
    print("==================================================================")
    print(f" Username : {ADMIN_CREDENTIALS['username']}")
    print(f" Email    : {ADMIN_CREDENTIALS['email']}")
    print(f" Password : {ADMIN_CREDENTIALS['password']}")
    print(f" Role     : {ADMIN_CREDENTIALS['role']}")
    print(f" Database : {db_file}")
    print("==================================================================")


if __name__ == "__main__":
    seed_database()
