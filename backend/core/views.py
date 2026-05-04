from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404

from .models import User, Project, Observation
from .serializers import UserSerializer, ProjectSerializer, ObservationSerializer


# ---------- AUTH ----------

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = (request.data.get("username") or "").strip().lower()
    password = (request.data.get("password") or "").strip()
    if not username or not password:
        return Response({"detail": "Usuario y contraseña requeridos."}, status=400)
    user = authenticate(username=username, password=password)
    if not user:
        return Response({"detail": "Usuario o contraseña incorrectos."}, status=401)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data})


@api_view(["POST"])
def logout_view(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "ok"})


@api_view(["GET"])
def me_view(request):
    return Response(UserSerializer(request.user).data)


# ---------- PROJECTS ----------

class IsOwnerOrAdmin(permissions.BasePermission):
    """Solo el creador o un admin pueden eliminar."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS or request.method in ("PATCH", "PUT"):
            return True
        if request.user.role == "admin":
            return True
        return obj.created_by_id == request.user.id


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().prefetch_related("observations", "created_by")
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def perform_create(self, serializer):
        u = self.request.user
        serializer.save(
            created_by=u,
            created_by_name=u.display_name or u.username,
        )

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
    permission_classes = [IsAuthenticated, IsAdmin]

    def list(self, request):
        return Response(UserSerializer(User.objects.all().order_by("id"), many=True).data)

    def create(self, request):
        username = (request.data.get("username") or "").strip().lower().replace(" ", "")
        password = (request.data.get("password") or "").strip()
        role = request.data.get("role") or "user"
        display_name = (request.data.get("display_name") or request.data.get("username") or "").strip()
        if not username or not password:
            return Response({"detail": "Completa usuario y contraseña."}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "Ese nombre de usuario ya existe."}, status=400)
        if role not in ("admin", "user"):
            role = "user"
        u = User.objects.create_user(username=username, password=password)
        u.role = role
        u.display_name = display_name or username
        u.save()
        return Response(UserSerializer(u).data, status=201)

    def destroy(self, request, pk=None):
        if str(request.user.id) == str(pk):
            return Response({"detail": "No puedes eliminarte a ti mismo."}, status=400)
        u = get_object_or_404(User, pk=pk)
        u.delete()
        return Response(status=204)

    @action(detail=True, methods=["post"], url_path="change_password")
    def change_password(self, request, pk=None):
        new_pass = (request.data.get("password") or "").strip()
        if not new_pass:
            return Response({"detail": "Contraseña requerida."}, status=400)
        u = get_object_or_404(User, pk=pk)
        u.set_password(new_pass)
        u.save()
        Token.objects.filter(user=u).delete()
        return Response({"detail": "ok"})
