"""Shared fixtures for tenant-scoped communications tests."""

from django.db import connection
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.members.models import Member


class CommsTenantTestCase(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Church"
        tenant.slug = "test-church"

    @classmethod
    def get_test_tenant_domain(cls):
        return "tenant.test.com"

    def setUp(self):
        super().setUp()
        self.schema = connection.schema_name
        self.admin = self.make_user("admin@example.com", "church_admin")
        self.staff = self.make_user("staff@example.com", "staff")
        self.member_user = self.make_user("member@example.com", "member")

    def make_user(self, email, role):
        return User.objects.create_user(email=email, password="test-pass-123", first_name=role.title(), last_name="User", role=role)

    def client_for(self, user=None):
        client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        if user:
            client.force_authenticate(user)
        return client

    def make_member(self, first, last, phone="", email="", status="active"):
        return Member.objects.create(first_name=first, last_name=last, phone_mobile=phone, email=email, status=status)
