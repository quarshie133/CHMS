"""Public schema URLs (landing, auth, tenant registration, etc.)"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/tenants/", include("apps.tenants.urls")),
    path("api/v1/members/", include("apps.members.urls")),
    path("api/v1/attendance/", include("apps.attendance.urls")),
    path("api/v1/finance/", include("apps.finance.urls")),
    path("api/v1/events/", include("apps.events.urls")),
    path("api/v1/groups/", include("apps.groups.urls")),
    path("api/v1/sermons/", include("apps.sermons.urls")),
    path("api/v1/communications/", include("apps.communications.urls")),
]
