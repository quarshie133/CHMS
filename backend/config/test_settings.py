"""
Settings for the automated test suite.

Tests always use a local/CI PostgreSQL (django-tenants needs Postgres) and never
the database from .env. Configure with TEST_DATABASE_URL, e.g.
    postgres://postgres@127.0.0.1:5432/churchms
No real SMS is ever sent: SMS_DRY_RUN is on and the provider is mocked in tests.
"""

import os
from urllib.parse import urlparse

from .settings import *  # noqa: F401,F403

_url = urlparse(os.environ.get("TEST_DATABASE_URL", "postgres://postgres@127.0.0.1:5432/churchms"))
if _url.hostname and "neon.tech" in _url.hostname:
    raise RuntimeError("Refusing to run tests against a Neon database. Point TEST_DATABASE_URL at a local/CI Postgres.")

DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": _url.path.lstrip("/") or "churchms",
        "USER": _url.username or "postgres",
        "PASSWORD": _url.password or "",
        "HOST": _url.hostname or "127.0.0.1",
        "PORT": str(_url.port or 5432),
    }
}

ALLOWED_HOSTS = ["*"]
DEBUG = False
SECRET_KEY = "test-secret-key-not-for-production-0123456789abcdefghijklmnop"
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CELERY_BROKER_URL = "memory://"
CELERY_TASK_ALWAYS_EAGER = False

# SMS: test mode on, no credentials, provider always mocked.
SMS_DRY_RUN = True
AGOOSMS_API_KEY = ""
AGOOSMS_API_KEY_SSM_PARAMETER = ""
AGOOSMS_API_KEY_SECRET_ID = ""
AGOOSMS_SENDER_ID = "TLPCI"
AGOOSMS_BASE_URL = "https://agoosms.invalid"
SMS_LARGE_BROADCAST_THRESHOLD = 3
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"sms_send": "1000/hour"}}  # noqa: F405
