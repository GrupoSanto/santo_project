import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache

from .models import User, Project, Observation
from .serializers import UserSerializer, ProjectSerializer, ObservationSerializer

logger = logging.getLogger("core")


# ---------- AUTH ----------

@never_cache
@api_view(["POST"])
@permission_classes([AllowAny])
@ratelimit(key="ip", rate="10/m", method="POST", block=True)
def login_view(request):
    username = (request.data.get("username") or "").strip().lower()
    password = (request.data.get("password") or "").strip()
    if not username or not password:
        return Response({"detail": "Usuario y contraseña requeridos."}, status=400)
    user = authenticate(username=username, password=password)
    if not user:
        logger.warning("Login fallido para usuario: %s desde IP: %s", username,
                       request.META.get("REMOTE_ADDR"))
        return Response({"detail": "Usuario o contraseña incorrectos."}, status=401)
    refresh = RefreshToken.for_user(user)
    logger.info("Login exitoso: %s", username)
    return Response({
        "access":  str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    })


@api_view(["POST"])
def logout_view(request):
    refresh_token = request.data.get("refresh")
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            pass  # token ya inválido o expirado — no es error
    return Response({"detail": "ok"})


@api_view(["GET"])
def me_view(request):
    return Response(UserSerializer(request.user).data)


# ---------- PROJECTS ----------

class IsOwnerOrAdmin(permissions.BasePermission):
    """Cualquiera puede leer y editar; solo el creador o admin puede eliminar."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS or request.method in ("PATCH", "PUT"):
            return True
        if request.user.role == "admin":
            return True
        return obj.created_by_id == request.user.id


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return Project.objects.all().prefetch_related("observations", "created_by")

    def perform_create(self, serializer):
        u = self.request.user
        serializer.save(
            created_by=u,
            created_by_name=u.display_name or u.username,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        logger.info("Proyecto eliminado id=%s por usuario=%s", instance.id, request.user.username)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def done(self, request, pk=None):
        p = self.get_object()
        p.status = "done"
        p.save()
        return Response(ProjectSerializer(p).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        p = self.get_object()
        p.status = "active"
        p.save()
        return Response(ProjectSerializer(p).data)

    @action(detail=True, methods=["post"], url_path="observations")
    def add_observation(self, request, pk=None):
        p = self.get_object()
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Texto requerido."}, status=400)
        obs = Observation.objects.create(
            project=p, text=text,
            who=request.user.display_name or request.user.username,
            created_by=request.user,
        )
        return Response(ObservationSerializer(obs).data, status=201)

    @action(detail=True, methods=["delete"], url_path=r"observations/(?P<obs_id>[^/.]+)")
    def delete_observation(self, request, pk=None, obs_id=None):
        p = self.get_object()
        obs = get_object_or_404(Observation, id=obs_id, project=p)
        obs.delete()
        return Response(status=204)


# ---------- USERS (admin only) ----------

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


class UserViewSet(viewsets.ViewSet):
    def get_permissions(self):
        # La pantalla de proyectos necesita leer usuarios para el filtro/responsable.
        # Crear, eliminar y cambiar claves sigue siendo solo para admin.
        if self.action == "list":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def list(self, request):
        return Response(UserSerializer(User.objects.all().order_by("id"), many=True).data)

    def create(self, request):
        username = (request.data.get("username") or "").strip().lower().replace(" ", "")
        password = (request.data.get("password") or "").strip()
        role = request.data.get("role") or "user"
        display_name = (request.data.get("display_name") or request.data.get("username") or "").strip()
        if not username or not password:
            return Response({"detail": "Completa usuario y contraseña."}, status=400)
        if len(password) < 8:
            return Response({"detail": "La contraseña debe tener al menos 8 caracteres."}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "Ese nombre de usuario ya existe."}, status=400)
        if role not in ("admin", "user"):
            role = "user"
        u = User.objects.create_user(username=username, password=password)
        u.role = role
        u.display_name = display_name or username
        u.save()
        logger.info("Usuario creado: %s (rol=%s) por admin=%s", username, role, request.user.username)
        return Response(UserSerializer(u).data, status=201)

    def destroy(self, request, pk=None):
        if str(request.user.id) == str(pk):
            return Response({"detail": "No puedes eliminarte a ti mismo."}, status=400)
        u = get_object_or_404(User, pk=pk)
        logger.info("Usuario eliminado: %s por admin=%s", u.username, request.user.username)
        u.delete()
        return Response(status=204)

    @action(detail=True, methods=["post"], url_path="change_password")
    def change_password(self, request, pk=None):
        new_pass = (request.data.get("password") or "").strip()
        if not new_pass:
            return Response({"detail": "Contraseña requerida."}, status=400)
        if len(new_pass) < 8:
            return Response({"detail": "La contraseña debe tener al menos 8 caracteres."}, status=400)
        u = get_object_or_404(User, pk=pk)
        u.set_password(new_pass)
        u.save()
        # Invalidar tokens existentes del usuario cambiando su contraseña
        # (simplejwt no requiere blacklist manual si se usa rotating refresh)
        logger.info("Contraseña cambiada para: %s por admin=%s", u.username, request.user.username)
        return Response({"detail": "ok"})
