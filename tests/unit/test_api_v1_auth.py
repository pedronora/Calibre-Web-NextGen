import pytest
import flask
from unittest.mock import patch, MagicMock


def _app():
    from cps.api import api_v1
    app = flask.Flask(__name__)
    app.testing = True
    app.config["WTF_CSRF_ENABLED"] = False
    app.config["SECRET_KEY"] = "test"
    app.register_blueprint(api_v1)
    return app


@pytest.mark.unit
def test_csrf_returns_token_key():
    resp = _app().test_client().get("/api/v1/auth/csrf")
    assert resp.status_code == 200
    assert "csrf_token" in resp.get_json()


@pytest.mark.unit
def test_me_anonymous_401():
    app = _app()
    with patch("cps.api.auth.current_user") as cu:
        cu.is_authenticated = False
        resp = app.test_client().get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.unit
def test_me_authenticated_returns_user():
    app = _app()
    from cps import ub, constants
    u = ub.User()
    u.id, u.name, u.locale, u.theme = 5, "maggie", "en", 1
    u.role = constants.ROLE_USER
    with patch("cps.api.auth.current_user", u):
        resp = app.test_client().get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.get_json()["name"] == "maggie"
