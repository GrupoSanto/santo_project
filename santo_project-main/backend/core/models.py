from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (("admin", "Admin"), ("user", "Usuario"))
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="user")
    display_name = models.CharField(max_length=80, blank=True)

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = self.username
        super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name or self.username


class Project(models.Model):
    PRIORITY_CHOICES = (("alta", "Alta"), ("media", "Media"), ("baja", "Baja"))
    STATUS_CHOICES = (("active", "En proceso"), ("done", "Terminado"))

    name = models.CharField(max_length=200)
    client = models.CharField(max_length=200, blank=True)
    owner_name = models.CharField(max_length=80, blank=True)  # display_name del responsable
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="media")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_projects"
    )
    created_by_name = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Observation(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="observations")
    text = models.TextField()
    who = models.CharField(max_length=80, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.who}: {self.text[:40]}"
