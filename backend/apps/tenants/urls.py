from django.urls import path
from .views import ChurchRegistrationView, ChurchDetailView

urlpatterns = [
    path("register/", ChurchRegistrationView.as_view(), name="church-register"),
    path("me/", ChurchDetailView.as_view(), name="church-detail"),
]
