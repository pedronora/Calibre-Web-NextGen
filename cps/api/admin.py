# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Admin user-management endpoints for /api/v1 (admin-only).

Reuses cps/admin.py's _delete_user (last-admin + Guest guards + the D4 per-user
data purge) for deletion. Role changes guard against demoting the last admin so
an admin can't lock everyone out. User creation is deferred to a follow-up.
"""
from flask import jsonify, request

from . import api_v1
from .. import ub, constants
from ..cw_login import current_user
from ..usermanagement import login_required_if_no_ano
from ..helper import valid_email, check_email
from ..admin import _delete_user

# SPA role key -> the User.role bitmask bit. ROLE_ANONYMOUS is intentionally
# excluded — it's not an admin-assignable permission.
ROLE_BITS = {
    "admin": constants.ROLE_ADMIN,
    "download": constants.ROLE_DOWNLOAD,
    "upload": constants.ROLE_UPLOAD,
    "edit": constants.ROLE_EDIT,
    "passwd": constants.ROLE_PASSWD,
    "edit_shelfs": constants.ROLE_EDIT_SHELFS,
    "delete_books": constants.ROLE_DELETE_BOOKS,
    "viewer": constants.ROLE_VIEWER,
}


def _err(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status


def _require_admin():
    if not current_user.is_authenticated or current_user.is_anonymous:
        return _err("unauthorized", "You must be signed in", 401)
    if not current_user.role_admin():
        return _err("forbidden", "Admin access required", 403)
    return None


def _serialize_user(u):
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email or "",
        "kindle_mail": u.kindle_mail or "",
        "locale": u.locale,
        "default_language": u.default_language,
        "is_guest": u.name == "Guest",
        "roles": {key: bool(u.role & bit) for key, bit in ROLE_BITS.items()},
    }


def _other_admin_count(exclude_id):
    return (ub.session.query(ub.User)
            .filter(ub.User.role.op('&')(constants.ROLE_ADMIN) == constants.ROLE_ADMIN,
                    ub.User.id != exclude_id)
            .count())


@api_v1.route("/admin/users")
@login_required_if_no_ano
def admin_list_users():
    guard = _require_admin()
    if guard:
        return guard
    users = ub.session.query(ub.User).order_by(ub.User.id.asc()).all()
    # Hide the anonymous/guest row unless anon browsing is on (matches the legacy
    # admin table behaviour).
    items = [_serialize_user(u) for u in users
             if (u.role & constants.ROLE_ANONYMOUS) != constants.ROLE_ANONYMOUS]
    return jsonify({"items": items})


@api_v1.route("/admin/users/<int:user_id>", methods=["POST"])
@login_required_if_no_ano
def admin_update_user(user_id):
    guard = _require_admin()
    if guard:
        return guard
    user = ub.session.query(ub.User).filter(ub.User.id == user_id).first()
    if not user:
        return _err("not_found", "User not found", 404)

    data = request.get_json(silent=True) or {}

    if "roles" in data and isinstance(data["roles"], dict):
        new_role = user.role
        for key, bit in ROLE_BITS.items():
            if key in data["roles"]:
                if data["roles"][key]:
                    new_role |= bit
                else:
                    new_role &= ~bit
        # Lockout guard: never let the last admin lose the admin role.
        losing_admin = (user.role & constants.ROLE_ADMIN) and not (new_role & constants.ROLE_ADMIN)
        if losing_admin and _other_admin_count(user.id) == 0:
            return _err("conflict", "Can't remove admin from the last administrator", 400)
        user.role = new_role

    try:
        if "email" in data:
            new_email = valid_email(data.get("email") or "")
            if new_email and new_email != user.email:
                user.email = check_email(new_email)  # raises if taken
        if "kindle_mail" in data:
            user.kindle_mail = valid_email(data.get("kindle_mail") or "")
        if "locale" in data and data["locale"]:
            user.locale = data["locale"]
        if "default_language" in data and data["default_language"]:
            user.default_language = data["default_language"]
    except Exception as ex:  # validators raise generic Exception with a message
        ub.session.rollback()
        return _err("invalid_request", str(ex), 400)

    try:
        ub.session.commit()
    except Exception as ex:
        ub.session.rollback()
        return _err("db_error", "Could not save user: %s" % ex, 500)

    return jsonify(_serialize_user(user))


@api_v1.route("/admin/users/<int:user_id>/delete", methods=["POST"])
@login_required_if_no_ano
def admin_delete_user(user_id):
    guard = _require_admin()
    if guard:
        return guard
    if user_id == int(current_user.id):
        return _err("conflict", "You can't delete your own account here", 400)
    user = ub.session.query(ub.User).filter(ub.User.id == user_id).first()
    if not user:
        return _err("not_found", "User not found", 404)
    try:
        # _delete_user enforces the last-admin + Guest guards and purges the
        # user's per-book data (read status, bookmarks, annotations + backups).
        _delete_user(user)
    except Exception as ex:
        ub.session.rollback()
        return _err("conflict", str(ex), 400)
    return "", 204
