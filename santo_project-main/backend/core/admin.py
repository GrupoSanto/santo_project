from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Project, Observation


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("id", "username", "display_name", "role", "is_active")
    list_filter = ("role", "is_active")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Portfolio", {"fields": ("display_name", "role")}),
    )


class ObservationInline(admin.TabularInline):
    model = Observation
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "client", "owner_name", "priority", "status", "deadline")
    list_filter = ("status", "priority")
    search_fields = ("name", "client", "owner_name")
    inlines = [ObservationInline]
