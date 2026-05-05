import os
import secrets
from django.core.management.base import BaseCommand
from core.models import User

# Usuarios iniciales del sistema.
# Las contraseñas se leen desde variables de entorno.
# Si no están definidas, se genera una contraseña aleatoria segura y se imprime UNA vez.
DEFAULT_USERS = [
    {"username": "mathias",   "env_pass": "SEED_PASS_MATHIAS",   "role": "admin", "display_name": "Mathias"},
    {"username": "mariajose", "env_pass": "SEED_PASS_MARIAJOSE", "role": "user",  "display_name": "Maria Jose"},
    {"username": "hector",    "env_pass": "SEED_PASS_HECTOR",    "role": "user",  "display_name": "Hector"},
    {"username": "francisco", "env_pass": "SEED_PASS_FRANCISCO", "role": "user",  "display_name": "Francisco"},
    {"username": "johnn",     "env_pass": "SEED_PASS_JOHNN",     "role": "user",  "display_name": "Johnn"},
]


class Command(BaseCommand):
    help = "Crea los usuarios iniciales del sistema (idempotente). Las contraseñas se leen desde .env"

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            "AVISO: Define las variables SEED_PASS_* en tu .env antes de ejecutar este comando en producción."
        ))
        for data in DEFAULT_USERS:
            password = os.getenv(data["env_pass"])
            generated = False
            if not password:
                password = secrets.token_urlsafe(16)
                generated = True

            u, created = User.objects.get_or_create(username=data["username"])
            if created:
                u.set_password(password)
            u.role = data["role"]
            u.display_name = data["display_name"]
            if data["role"] == "admin":
                u.is_staff = True
                u.is_superuser = True
            u.save()

            if created and generated:
                self.stdout.write(self.style.SUCCESS(
                    f"Creado: {u.username} ({u.role}) — contraseña generada: {password}"
                    f" (guárdala en {data['env_pass']} del .env)"
                ))
            elif created:
                self.stdout.write(self.style.SUCCESS(f"Creado: {u.username} ({u.role})"))
            else:
                self.stdout.write(f"Ya existe: {u.username} ({u.role}) — no se modificó la contraseña")
