# Proyectos Santo

Aplicación de gestión de proyectos con login, observaciones, prioridades y administración de usuarios.
- **Backend:** Django 5 + Django REST Framework (Token auth) → desplegado en PythonAnywhere.
- **Frontend:** Angular 17 standalone components → desplegado en Vercel.

## Estructura

```
santos-mathi/
├── backend/           # Django + DRF
└── frontend/          # Angular 17
```

---

## 1. Desarrollo local

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_users
python manage.py runserver
```

API disponible en `http://localhost:8000/api/`.

Usuarios iniciales (creados por `seed_users`):

| Usuario     | Contraseña    | Rol    |
|-------------|---------------|--------|
| mathias     | santo123234   | admin  |
| mariajose   | santo123      | user   |
| hector      | santo123      | user   |
| francisco   | santo123      | user   |
| johnn       | santo123      | user   |

### Frontend

```powershell
cd frontend
npm install
npm start
```

App disponible en `http://localhost:4200/`. Por defecto consume `http://localhost:8000/api`.

---

## 2. Despliegue del backend en PythonAnywhere

1. Crear cuenta en https://www.pythonanywhere.com
2. En **Consoles → Bash**, clonar el repo:
   ```bash
   git clone https://github.com/TU_USUARIO/santos-mathi.git
   cd santos-mathi/backend
   python3.10 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Crear archivo `.env` en `backend/` con:
   ```
   SECRET_KEY=una-clave-larga-aleatoria
   DEBUG=False
   ALLOWED_HOSTS=TU_USUARIO.pythonanywhere.com
   CORS_ALLOWED_ORIGINS=https://TU-PROYECTO.vercel.app
   ```
4. Migraciones y datos iniciales:
   ```bash
   python manage.py migrate
   python manage.py seed_users
   python manage.py collectstatic --noinput
   ```
5. En **Web → Add a new web app**:
   - Manual configuration, Python 3.10
   - **Source code:** `/home/TU_USUARIO/santos-mathi/backend`
   - **Working directory:** `/home/TU_USUARIO/santos-mathi/backend`
   - **Virtualenv:** `/home/TU_USUARIO/santos-mathi/backend/venv`
6. Editar el WSGI file (`/var/www/TU_USUARIO_pythonanywhere_com_wsgi.py`):
   ```python
   import os, sys
   path = '/home/TU_USUARIO/santos-mathi/backend'
   if path not in sys.path:
       sys.path.insert(0, path)
   os.environ['DJANGO_SETTINGS_MODULE'] = 'proyectos_santo.settings'
   from django.core.wsgi import get_wsgi_application
   application = get_wsgi_application()
   ```
7. En **Static files** agregar:
   - URL `/static/` → `/home/TU_USUARIO/santos-mathi/backend/staticfiles`
   - URL `/media/`  → `/home/TU_USUARIO/santos-mathi/backend/media`
8. Click en **Reload**. La API queda disponible en `https://TU_USUARIO.pythonanywhere.com/api/`.

> En la cuenta gratuita debes hacer click en "Run until 1 month" cada mes.

---

## 3. Despliegue del frontend en Vercel

1. Editar `frontend/src/environments/environment.prod.ts` y reemplazar `TU_USUARIO` con tu usuario real de PythonAnywhere:
   ```ts
   apiUrl: 'https://TU_USUARIO.pythonanywhere.com/api'
   ```
   Hacer commit y push a GitHub.
2. En https://vercel.com importar el repo de GitHub.
3. Configurar el proyecto:
   - **Root directory:** `frontend`
   - **Framework Preset:** Other
   - **Build command:** `npm run build`
   - **Output directory:** `dist/proyectos-santo/browser`
4. Deploy. Vercel entregará una URL del tipo `https://TU-PROYECTO.vercel.app`.
5. Volver al backend y agregar esa URL a `CORS_ALLOWED_ORIGINS` en `.env`, luego **Reload** la app web en PythonAnywhere.

---

## Endpoints principales

- `POST /api/auth/login/` → `{ token, user }`
- `POST /api/auth/logout/`
- `GET  /api/auth/me/`
- `GET/POST /api/projects/`
- `DELETE /api/projects/{id}/`
- `POST /api/projects/{id}/done/` · `POST /api/projects/{id}/reopen/`
- `POST /api/projects/{id}/observations/`
- `DELETE /api/projects/{id}/observations/{obs_id}/`
- `GET/POST /api/users/` (solo admin)
- `DELETE /api/users/{id}/` (solo admin)
- `POST /api/users/{id}/change_password/` (solo admin)
