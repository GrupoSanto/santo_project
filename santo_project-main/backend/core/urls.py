from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import ProjectViewSet, UserViewSet, login_view, logout_view, me_view

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("auth/login/", login_view),
    path("auth/logout/", logout_view),
    path("auth/me/", me_view),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("", include(router.urls)),
]
