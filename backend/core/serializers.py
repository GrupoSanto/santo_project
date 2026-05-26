from rest_framework import serializers
from .models import User, Project, Observation


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "display_name", "role"]


class ObservationSerializer(serializers.ModelSerializer):
    ts = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = ["id", "text", "who", "ts", "created_at"]
        read_only_fields = ["ts", "created_at"]

    def get_ts(self, obj):
        # Formato corto en español: "4 may"
        meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
        d = obj.created_at
        return f"{d.day} {meses[d.month - 1]}"


class ProjectSerializer(serializers.ModelSerializer):
    obs = ObservationSerializer(source="observations", many=True, read_only=True)
    owner = serializers.CharField(source="owner_name", required=False, allow_blank=True)
    startDate = serializers.DateField(source="start_date", required=False, allow_null=True)
    deadline = serializers.DateField(required=False, allow_null=True)
    createdBy = serializers.SerializerMethodField()
    createdByName = serializers.CharField(source="created_by_name", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "name", "client", "owner", "startDate", "deadline",
            "priority", "status", "createdBy", "createdByName",
            "obs", "created_at",
        ]
        read_only_fields = ["createdBy", "createdByName", "created_at"]

    def get_createdBy(self, obj):
        return obj.created_by.username if obj.created_by_id else ""
