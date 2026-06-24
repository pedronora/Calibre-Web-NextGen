import pytest
import flask


@pytest.mark.unit
def test_spa_disabled_404(monkeypatch):
    monkeypatch.delenv("CWNG_SPA", raising=False)
    from cps.spa import spa
    app = flask.Flask(__name__)
    app.register_blueprint(spa)
    assert app.test_client().get("/app").status_code == 404


@pytest.mark.unit
def test_spa_enabled_serves_shell(monkeypatch):
    monkeypatch.setenv("CWNG_SPA", "1")
    from cps.spa import spa
    app = flask.Flask(__name__)
    app.register_blueprint(spa)
    resp = app.test_client().get("/app")
    assert resp.status_code == 200
    assert b"NextGen" in resp.data
