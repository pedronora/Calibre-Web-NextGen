# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Auth endpoints for /api/v1 — reuse the existing cw_login session + CSRF."""
from flask import jsonify, request
from sqlalchemy import func
from werkzeug.security import check_password_hash

from . import api_v1
from .serializers import serialize_user
from .. import ub
from ..cw_login import current_user, login_user, logout_user

try:
    from flask_wtf.csrf import generate_csrf
except ImportError:  # flask_wtf is optional/container-only
    generate_csrf = None


@api_v1.route("/auth/csrf")
def auth_csrf():
    token = generate_csrf() if generate_csrf else ""
    return jsonify({"csrf_token": token})


@api_v1.route("/auth/me")
def auth_me():
    if not current_user.is_authenticated:
        return jsonify({"error": {"code": "unauthenticated", "message": "Login required"}}), 401
    return jsonify(serialize_user(current_user))
