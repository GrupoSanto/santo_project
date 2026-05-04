from django.core.management.base import BaseCommand
from core.models import User


DEFAULT_USERS = [
    {"username": "mathias",   "password": "santo123234", "role": "admin", "display_name": "Mathias"},
    {"username": "mariajose", "password": "santo123",    "role": "user",  "display_name": "Maria Jose"},
    {"username": "hector",    "password": "santo123",    "role": "user",  "display_name": "Hector"},
    {"username": "francisco", "password": "santo123",    "role": "user",  "display_name": "Francisco"},
    {"username": "johnn",     "password": "santo123",    "role": "user",  "display_name": "Johnn"},
]


class Command(BaseCommand):
    help = "Crea los usuarios iniciales del sistema (idempotente)."

    def handle(self, *args, **options):
        for data in DEFAULT_USERS:
            u, created = User.objects.get_or_create(username=data["username"])
            if created:
                u.set_password(data["password"])
            u.role = data["role"]
            u.display_name = data["display_name"]
            if data["role"] == "admin":
                u.is_staff = True
                u.is_superuser = True
            u.save()
            self.stdout.write(self.style.SUCCESS(
                f"{'Creado' if created else 'Actualizado'}: {u.username} ({u.role})"
            ))
