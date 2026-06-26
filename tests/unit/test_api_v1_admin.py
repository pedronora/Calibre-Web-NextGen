# -*- coding: utf-8 -*-
# SPDX-License-Identifier: GPL-3.0-or-later
"""Unit tests for /api/v1 admin user management — admin gating, role-bit
serialization, the last-admin lockout guard, and delete gating."""
import inspect
import json
import flask
import pytest
from types import SimpleNamespace
from unittest.mock import patch, MagicMock

from cps import constants


def _ctx(path, method="POST", body=None):
    app = flask.Flask(__name__)
    app.config["WTF_CSRF_ENABLED"] = False
    kwargs = {"method": method}
    if body is not None:
        kwargs["json"] = body
        kwargs["content_type"] = "application/json"
    return app.test_request_context(path, **kwargs)


def _admin(is_admin=True, anon=False, uid=1):
    return SimpleNamespace(is_authenticated=True, is_anonymous=anon,
                           role_admin=lambda: is_admin, id=uid)


def _user(uid=2, name="maggie", role=constants.ROLE_DOWNLOAD):
    return SimpleNamespace(id=uid, name=name, email="m@x.com", kindle_mail="",
                           locale="en", default_language="all", role=role)


# ── gating ───────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_list_users_requires_admin():
    from cps.api import admin as mod
    with _ctx("/api/v1/admin/users", method="GET"):
        with patch.object(mod, "current_user", _admin(is_admin=False)):
            resp = inspect.unwrap(mod.admin_list_users)()
    assert resp[1] == 403


@pytest.mark.unit
def test_list_users_anonymous_401():
    from cps.api import admin as mod
    with _ctx("/api/v1/admin/users", method="GET"):
        with patch.object(mod, "current_user", _admin(anon=True)):
            resp = inspect.unwrap(mod.admin_list_users)()
    assert resp[1] == 401


# ── serialization ────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_serialize_user_roles_from_bitmask():
    from cps.api import admin as mod
    u = _user(role=constants.ROLE_ADMIN | constants.ROLE_UPLOAD)
    out = mod._serialize_user(u)
    assert out["roles"]["admin"] is True
    assert out["roles"]["upload"] is True
    assert out["roles"]["edit"] is False
    assert out["roles"]["delete_books"] is False


# ── role update + lockout guard ──────────────────────────────────────────────

@pytest.mark.unit
def test_update_user_last_admin_lockout():
    from cps.api import admin as mod
    target = _user(uid=1, name="admin", role=constants.ROLE_ADMIN)
    mock_ub = MagicMock()
    mock_ub.session.query.return_value.filter.return_value.first.return_value = target
    with _ctx("/api/v1/admin/users/1", body={"roles": {"admin": False}}):
        with patch.object(mod, "current_user", _admin()), \
             patch.object(mod, "ub", mock_ub), \
             patch.object(mod, "_other_admin_count", return_value=0):
            resp = inspect.unwrap(mod.admin_update_user)(1)
    assert resp[1] == 400
    assert json.loads(resp[0].get_data())["error"]["code"] == "conflict"
    # role must be unchanged (still admin)
    assert target.role & constants.ROLE_ADMIN


@pytest.mark.unit
def test_update_user_toggles_roles():
    from cps.api import admin as mod
    target = _user(uid=2, name="maggie", role=constants.ROLE_DOWNLOAD)
    mock_ub = MagicMock()
    mock_ub.session.query.return_value.filter.return_value.first.return_value = target
    with _ctx("/api/v1/admin/users/2", body={"roles": {"upload": True, "download": False}}):
        with patch.object(mod, "current_user", _admin()), \
             patch.object(mod, "ub", mock_ub):
            resp = inspect.unwrap(mod.admin_update_user)(2)
    assert resp.status_code == 200
    assert target.role & constants.ROLE_UPLOAD
    assert not (target.role & constants.ROLE_DOWNLOAD)


@pytest.mark.unit
def test_update_user_not_found_404():
    from cps.api import admin as mod
    mock_ub = MagicMock()
    mock_ub.session.query.return_value.filter.return_value.first.return_value = None
    with _ctx("/api/v1/admin/users/99", body={"roles": {}}):
        with patch.object(mod, "current_user", _admin()), \
             patch.object(mod, "ub", mock_ub):
            resp = inspect.unwrap(mod.admin_update_user)(99)
    assert resp[1] == 404


# ── delete ───────────────────────────────────────────────────────────────────

@pytest.mark.unit
def test_delete_self_blocked():
    from cps.api import admin as mod
    with _ctx("/api/v1/admin/users/1/delete"):
        with patch.object(mod, "current_user", _admin(uid=1)):
            resp = inspect.unwrap(mod.admin_delete_user)(1)
    assert resp[1] == 400
    assert "own account" in json.loads(resp[0].get_data())["error"]["message"]


@pytest.mark.unit
def test_delete_user_reuses_core_204():
    from cps.api import admin as mod
    target = _user(uid=2)
    mock_ub = MagicMock()
    mock_ub.session.query.return_value.filter.return_value.first.return_value = target
    with _ctx("/api/v1/admin/users/2/delete"):
        with patch.object(mod, "current_user", _admin(uid=1)), \
             patch.object(mod, "ub", mock_ub), \
             patch.object(mod, "_delete_user", return_value="deleted") as core:
            resp = inspect.unwrap(mod.admin_delete_user)(2)
    assert resp[1] == 204
    core.assert_called_once_with(target)


@pytest.mark.unit
def test_delete_user_last_admin_guard_surfaces_as_400():
    from cps.api import admin as mod
    target = _user(uid=2, name="admin2", role=constants.ROLE_ADMIN)
    mock_ub = MagicMock()
    mock_ub.session.query.return_value.filter.return_value.first.return_value = target
    with _ctx("/api/v1/admin/users/2/delete"):
        with patch.object(mod, "current_user", _admin(uid=1)), \
             patch.object(mod, "ub", mock_ub), \
             patch.object(mod, "_delete_user", side_effect=Exception("No admin user remaining")):
            resp = inspect.unwrap(mod.admin_delete_user)(2)
    assert resp[1] == 400
    assert "admin" in json.loads(resp[0].get_data())["error"]["message"].lower()
