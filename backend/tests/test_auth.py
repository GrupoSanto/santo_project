import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from core.models import User


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    u = User.objects.create_user(username="admin_test", password="Admin1234!")
    u.role = "admin"
    u.display_name = "Admin Test"
    u.is_staff = True
    u.save()
    return u


@pytest.fixture
def regular_user(db):
    u = User.objects.create_user(username="user_test", password="User1234!")
    u.role = "user"
    u.display_name = "User Test"
    u.save()
    return u


def _login(client, username, password):
    resp = client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
    return resp


def _auth_client(client, user_fixture):
    """Devuelve un cliente autenticado con JWT."""
    resp = _login(client, user_fixture.username, user_fixture.username.replace("_test", "").capitalize() + "1234!")
    token = resp.data.get("access")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


# ── Auth ──────────────────────────────────────────────────────────

class TestLogin:
    def test_login_exitoso(self, client, admin_user):
        resp = _login(client, "admin_test", "Admin1234!")
        assert resp.status_code == 200
        assert "access" in resp.data
        assert "refresh" in resp.data
        assert resp.data["user"]["username"] == "admin_test"

    def test_login_credenciales_incorrectas(self, client, admin_user):
        resp = _login(client, "admin_test", "wrongpass")
        assert resp.status_code == 401

    def test_login_usuario_inexistente(self, client, db):
        resp = _login(client, "noexiste", "cualquier")
        assert resp.status_code == 401

    def test_login_campos_vacios(self, client, db):
        resp = client.post("/api/auth/login/", {}, format="json")
        assert resp.status_code == 400

    def test_me_autenticado(self, client, admin_user):
        resp = _login(client, "admin_test", "Admin1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        me = client.get("/api/auth/me/")
        assert me.status_code == 200
        assert me.data["username"] == "admin_test"
        assert me.data["role"] == "admin"

    def test_me_sin_token(self, client):
        resp = client.get("/api/auth/me/")
        assert resp.status_code == 401


# ── Proyectos ──────────────────────────────────────────────────────

class TestProjects:
    def test_crear_proyecto(self, client, regular_user):
        resp = _login(client, "user_test", "User1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        data = {"name": "Proyecto Test", "priority": "media"}
        resp = client.post("/api/projects/", data, format="json")
        assert resp.status_code == 201
        assert resp.data["name"] == "Proyecto Test"

    def test_listar_proyectos_requiere_auth(self, client):
        resp = client.get("/api/projects/")
        assert resp.status_code == 401

    def test_usuario_no_puede_eliminar_proyecto_ajeno(self, client, regular_user, admin_user):
        # Admin crea un proyecto
        resp = _login(client, "admin_test", "Admin1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        p = client.post("/api/projects/", {"name": "Proyecto Admin", "priority": "alta"}, format="json")
        project_id = p.data["id"]

        # Usuario normal intenta eliminarlo
        resp = _login(client, "user_test", "User1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        del_resp = client.delete(f"/api/projects/{project_id}/")
        assert del_resp.status_code == 403

    def test_admin_puede_eliminar_cualquier_proyecto(self, client, regular_user, admin_user):
        # Usuario normal crea un proyecto
        resp = _login(client, "user_test", "User1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        p = client.post("/api/projects/", {"name": "Proyecto User", "priority": "baja"}, format="json")
        project_id = p.data["id"]

        # Admin lo elimina
        resp = _login(client, "admin_test", "Admin1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        del_resp = client.delete(f"/api/projects/{project_id}/")
        assert del_resp.status_code == 204

    def test_marcar_proyecto_como_terminado(self, client, regular_user):
        resp = _login(client, "user_test", "User1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        p = client.post("/api/projects/", {"name": "P Done", "priority": "media"}, format="json")
        pid = p.data["id"]
        done = client.post(f"/api/projects/{pid}/done/", {}, format="json")
        assert done.status_code == 200
        assert done.data["status"] == "done"


# ── Usuarios (admin) ───────────────────────────────────────────────

class TestUsers:
    def test_solo_admin_puede_listar_usuarios(self, client, regular_user, admin_user):
        resp = _login(client, "user_test", "User1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        resp = client.get("/api/users/")
        assert resp.status_code == 403

    def test_admin_puede_crear_usuario(self, client, admin_user):
        resp = _login(client, "admin_test", "Admin1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        data = {"username": "nuevo", "password": "NuevoPass1!", "role": "user", "display_name": "Nuevo"}
        resp = client.post("/api/users/", data, format="json")
        assert resp.status_code == 201

    def test_contrasena_minimo_8_caracteres(self, client, admin_user):
        resp = _login(client, "admin_test", "Admin1234!")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        data = {"username": "short", "password": "abc", "role": "user", "display_name": "Short"}
        resp = client.post("/api/users/", data, format="json")
        assert resp.status_code == 400
