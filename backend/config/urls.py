"""
Root URL configuration.
Tenant-aware routing: public schema gets urls_public, tenants get this file.
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("members/", include("apps.members.urls")),
    path("attendance/", include("apps.attendance.urls")),
    path("finance/", include("apps.finance.urls")),
    path("events/", include("apps.events.urls")),
    path("groups/", include("apps.groups.urls")),
    path("sermons/", include("apps.sermons.urls")),
    path("communications/", include("apps.communications.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    # OpenAPI docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
