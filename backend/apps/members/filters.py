import django_filters
from .models import Member, MemberStatus


class MemberFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=MemberStatus.choices)
    life_stage = django_filters.CharFilter()
    family = django_filters.UUIDFilter(field_name="family__id")
    membership_date_from = django_filters.DateFilter(field_name="membership_date", lookup_expr="gte")
    membership_date_to = django_filters.DateFilter(field_name="membership_date", lookup_expr="lte")
    birthday_month = django_filters.NumberFilter(field_name="date_of_birth__month")

    class Meta:
        model = Member
        fields = ["status", "life_stage", "family", "gender", "is_active"]
