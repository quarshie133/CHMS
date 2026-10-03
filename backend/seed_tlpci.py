import os
import django
import uuid
from decimal import Decimal
from datetime import date, datetime, timedelta, time

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django_tenants.utils import schema_context
from apps.members.models import Member, Family
from apps.groups.models import Group, GroupCategory, GroupMembership
from apps.finance.models import Fund, Contribution
from apps.events.models import Event, EventCategory
from apps.attendance.models import ServiceType, AttendanceRecord
from apps.communications.models import Campaign

with schema_context('cathedral'):
    print("Seeding TLPCI Central data in schema 'cathedral'...")

    # 1. Members
    families = {}
    for fam_name in ["Sterling Family", "Osei Family", "Jenkins Family", "Adebayo Family", "Campbell Family"]:
        f, _ = Family.objects.get_or_create(
            name=fam_name,
            defaults={"city": "Springfield", "state": "Oregon", "postal_code": "97477"}
        )
        families[fam_name] = f

    members_data = [
        {
            "first_name": "Marcus",
            "last_name": "Sterling",
            "email": "m.sterling@email.com",
            "phone_mobile": "(555) 234-8901",
            "gender": "male",
            "status": "active",
            "life_stage": "adult",
            "family": families["Sterling Family"],
            "membership_date": date(2021, 10, 15),
            "date_of_birth": date(1986, 5, 12),
        },
        {
            "first_name": "Elena",
            "last_name": "Sterling",
            "email": "elena.s@email.com",
            "phone_mobile": "(555) 234-8902",
            "gender": "female",
            "status": "active",
            "life_stage": "adult",
            "family": families["Sterling Family"],
            "membership_date": date(2021, 10, 15),
            "date_of_birth": date(1988, 8, 24),
        },
        {
            "first_name": "David",
            "last_name": "Osei",
            "email": "david.osei@email.com",
            "phone_mobile": "(555) 871-3320",
            "gender": "male",
            "status": "active",
            "life_stage": "adult",
            "family": families["Osei Family"],
            "membership_date": date(2019, 4, 10),
            "date_of_birth": date(1982, 11, 3),
        },
        {
            "first_name": "Sarah",
            "last_name": "Jenkins",
            "email": "sarah.j@email.com",
            "phone_mobile": "(555) 412-9081",
            "gender": "female",
            "status": "active",
            "life_stage": "young_adult",
            "family": families["Jenkins Family"],
            "membership_date": date(2022, 6, 20),
            "date_of_birth": date(1996, 3, 15),
        },
        {
            "first_name": "Michael",
            "last_name": "Chang",
            "email": "mchang@email.com",
            "phone_mobile": "(555) 902-1144",
            "gender": "male",
            "status": "visitor",
            "life_stage": "adult",
            "family": None,
            "membership_date": None,
            "date_of_birth": date(1991, 9, 30),
        },
        {
            "first_name": "Grace",
            "last_name": "Adebayo",
            "email": "grace.a@email.com",
            "phone_mobile": "(555) 673-2190",
            "gender": "female",
            "status": "active",
            "life_stage": "adult",
            "family": families["Adebayo Family"],
            "membership_date": date(2020, 1, 19),
            "date_of_birth": date(1984, 7, 8),
        },
        {
            "first_name": "Ray",
            "last_name": "Campbell",
            "email": "ray.campbell@email.com",
            "phone_mobile": "(555) 345-6789",
            "gender": "male",
            "status": "active",
            "life_stage": "senior",
            "family": families["Campbell Family"],
            "membership_date": date(2015, 3, 1),
            "date_of_birth": date(1960, 2, 14),
        }
    ]

    saved_members = {}
    for mdata in members_data:
        m, _ = Member.objects.get_or_create(email=mdata["email"], defaults=mdata)
        saved_members[m.full_name] = m
    print(f"Total members in DB: {Member.objects.count()}")

    # 2. Group Categories & Groups
    categories = {}
    for cat_name in [
        "Fellowship & Discipleship",
        "Worship & Creative Arts",
        "Next Gen Ministries",
        "Sunday Serving Teams",
        "Pastoral Ministries"
    ]:
        gc, _ = GroupCategory.objects.get_or_create(name=cat_name)
        categories[cat_name] = gc

    groups_data = [
        {
            "name": "Choir & Worship Ministry",
            "category": categories["Worship & Creative Arts"],
            "leader": saved_members.get("Marcus Sterling"),
            "description": "Leads congregational singing every Sunday morning. Weekly rehearsals on Thursdays at 7:00 PM.",
            "is_open": True,
            "is_active": True,
            "meeting_day": "Thursday",
            "meeting_time": time(19, 0),
        },
        {
            "name": "Men's Fellowship",
            "category": categories["Fellowship & Discipleship"],
            "leader": saved_members.get("Ray Campbell"),
            "description": "Studying the Word over Saturday morning breakfast in the Fellowship Hall.",
            "is_open": True,
            "is_active": True,
            "meeting_day": "Saturday",
            "meeting_time": time(8, 30),
        },
        {
            "name": "Youth Ministry & TELPSAM",
            "category": categories["Next Gen Ministries"],
            "leader": saved_members.get("Sarah Jenkins"),
            "description": "High school and college fellowship gathering Friday evenings for worship, small groups, and games.",
            "is_open": True,
            "is_active": True,
            "meeting_day": "Friday",
            "meeting_time": time(18, 30),
        },
        {
            "name": "Ushers & Hospitality Greeters",
            "category": categories["Sunday Serving Teams"],
            "leader": saved_members.get("David Osei"),
            "description": "Warmly welcoming first-time guests, guiding families to seating, and assisting with tithes & offerings.",
            "is_open": True,
            "is_active": True,
            "meeting_day": "Sunday",
            "meeting_time": time(8, 30),
        },
        {
            "name": "Women Fellowship",
            "category": categories["Fellowship & Discipleship"],
            "leader": saved_members.get("Elena Sterling"),
            "description": "Bi-weekly devotional fellowship supporting mothers, career women, and mentoring young ladies.",
            "is_open": True,
            "is_active": True,
            "meeting_day": "Tuesday",
            "meeting_time": time(18, 0),
        }
    ]

    for gdata in groups_data:
        g, _ = Group.objects.get_or_create(name=gdata["name"], defaults=gdata)
        # Add members
        if g.leader:
            GroupMembership.objects.get_or_create(group=g, member=g.leader, defaults={"role": "leader"})
        for m in Member.objects.all()[:3]:
            GroupMembership.objects.get_or_create(group=g, member=m, defaults={"role": "member"})

    print(f"Total groups in DB: {Group.objects.count()}")

    # 3. Funds & Contributions
    funds_data = [
        {"name": "General Tithe", "description": "General ministry operations, staff, facilities", "goal_amount": Decimal("100000.00")},
        {"name": "Sunday Offering", "description": "Weekly Sunday service collection", "goal_amount": Decimal("50000.00")},
        {"name": "Building Fund", "description": "Sanctuary expansion and infrastructure", "goal_amount": Decimal("150000.00")},
        {"name": "Missions & Outreach", "description": "Local evangelism and international mission support", "goal_amount": Decimal("40000.00")},
    ]

    saved_funds = {}
    for fdata in funds_data:
        f, _ = Fund.objects.get_or_create(name=fdata["name"], defaults=fdata)
        saved_funds[f.name] = f

    contribs = [
        {
            "member": saved_members.get("David Osei"),
            "fund": saved_funds["General Tithe"],
            "contribution_type": "tithe",
            "amount": Decimal("650.00"),
            "payment_method": "bank_transfer",
            "date": date.today(),
            "notes": "Envelope #2041",
        },
        {
            "member": None,
            "fund": saved_funds["Sunday Offering"],
            "contribution_type": "offering",
            "amount": Decimal("50.00"),
            "payment_method": "card",
            "date": date.today(),
            "is_anonymous": True,
            "notes": "Guest Offering Kiosk",
        },
        {
            "member": saved_members.get("Marcus Sterling"),
            "fund": saved_funds["Building Fund"],
            "contribution_type": "building",
            "amount": Decimal("1200.00"),
            "payment_method": "check",
            "check_number": "4421",
            "date": date.today() - timedelta(days=1),
            "notes": "Envelope #1084",
        },
        {
            "member": saved_members.get("Grace Adebayo"),
            "fund": saved_funds["Missions & Outreach"],
            "contribution_type": "missions",
            "amount": Decimal("250.00"),
            "payment_method": "card",
            "date": date.today() - timedelta(days=2),
            "notes": "Online Giving Portal",
        },
    ]

    for c in contribs:
        Contribution.objects.get_or_create(
            member=c["member"],
            fund=c["fund"],
            date=c["date"],
            amount=c["amount"],
            defaults=c
        )
    print(f"Total contributions in DB: {Contribution.objects.count()}")

    # 4. Events
    event_cats = {}
    for cname in ["Sunday Services", "Youth & Children", "Prayer Meetings", "Bible Studies"]:
        ec, _ = EventCategory.objects.get_or_create(name=cname)
        event_cats[cname] = ec

    events_data = [
        {
            "title": "Sunday Miracle & Celebration Service",
            "category": event_cats["Sunday Services"],
            "location": "Main Sanctuary (TLPCI Central)",
            "start_datetime": datetime.combine(date.today() + timedelta(days=2), time(9, 30)),
            "end_datetime": datetime.combine(date.today() + timedelta(days=2), time(12, 0)),
            "description": "Weekly celebration, prophetic worship, and message from God's Word.",
            "requires_rsvp": False,
        },
        {
            "title": "Wednesday Midweek Word & Prayer",
            "category": event_cats["Prayer Meetings"],
            "location": "Fellowship Hall & Online",
            "start_datetime": datetime.combine(date.today() + timedelta(days=5), time(19, 0)),
            "end_datetime": datetime.combine(date.today() + timedelta(days=5), time(20, 30)),
            "description": "In-depth Bible exposition and corporate intercession.",
            "requires_rsvp": False,
        },
        {
            "title": "Youth Fall Harvest Night",
            "category": event_cats["Youth & Children"],
            "location": "Youth Hall",
            "start_datetime": datetime.combine(date.today() + timedelta(days=14), time(17, 0)),
            "end_datetime": datetime.combine(date.today() + timedelta(days=14), time(20, 0)),
            "description": "Special night for young people with praise, breakout talks, games, and refreshments.",
            "requires_rsvp": True,
        }
    ]

    for edata in events_data:
        Event.objects.get_or_create(title=edata["title"], defaults=edata)
    print(f"Total events in DB: {Event.objects.count()}")
    print("Database seeding completed successfully!")
