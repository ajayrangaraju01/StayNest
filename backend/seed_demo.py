import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'staynest_backend.settings')
django.setup()

from accounts.models import User
from core.models import Hostel, Room, HostelPhoto, Review

owner, _ = User.objects.get_or_create(
    phone="9876543210",
    defaults={
        "name": "Demo Hostel Owner",
        "email": "owner@staynest.local",
        "role": "owner",
        "status": "active", "verification_state": "verified"
    }
)
if not owner.has_usable_password():
    owner.set_password("owner123")
    owner.save()

student, _ = User.objects.get_or_create(
    phone="9123456780",
    defaults={
        "name": "Demo Student Guest",
        "email": "student@staynest.local",
        "role": "student",
        "status": "active", "verification_state": "verified"
    }
)
if not student.has_usable_password():
    student.set_password("student123")
    student.save()

demo_hostels = [
    {
        "name": "StayNest Luxury Residency - Madhapur",
        "description": "Premium executive hostel with high-speed WiFi, hygienic dining, air conditioning, and daily housekeeping close to Hitec City tech parks.",
        "address": "Plot 42, Silicon Valley Layout, Madhapur, Hyderabad",
        "area": "Madhapur",
        "city": "Hyderabad",
        "pincode": "500081",
        "gender_type": "boys", "geo_lat": 17.4483, "geo_lng": 78.3915,
        "contact_number": "9876543210",
        "amenities": ["WiFi", "AC", "Laundry", "Gym", "Food", "Power Backup"],
        "is_active": True,
        "moderation_status": "approved",
        "total_floors": 4,
        "rooms_per_floor": 6,
        "total_rooms": 24,
        "rooms": [
            {"type": "single", "room_number": "101", "monthly_rent": 14000, "daily_rent": 800, "total_beds": 1, "occupied_beds": 0},
            {"type": "double", "room_number": "102", "monthly_rent": 9500, "daily_rent": 500, "total_beds": 2, "occupied_beds": 1},
            {"type": "triple", "room_number": "103", "monthly_rent": 7500, "daily_rent": 400, "total_beds": 3, "occupied_beds": 1},
        ],
        "photos": [
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "name": "Emerald Elite Girls Living - Gachibowli",
        "description": "Safe, serene, and modern girls hostel with 24/7 biometric security, nutritious 3-time meals, power backup, and indoor games room.",
        "address": "Road No 3, Telecom Nagar, Gachibowli, Hyderabad",
        "area": "Gachibowli",
        "city": "Hyderabad",
        "pincode": "500032",
        "gender_type": "girls", "geo_lat": 17.4401, "geo_lng": 78.3489,
        "contact_number": "9876543211",
        "amenities": ["WiFi", "AC", "CCTV", "Biometric Access", "Food", "Lift"],
        "is_active": True,
        "moderation_status": "approved",
        "total_floors": 5,
        "rooms_per_floor": 5,
        "total_rooms": 25,
        "rooms": [
            {"type": "single", "room_number": "201", "monthly_rent": 15000, "daily_rent": 900, "total_beds": 1, "occupied_beds": 0},
            {"type": "double", "room_number": "202", "monthly_rent": 10500, "daily_rent": 600, "total_beds": 2, "occupied_beds": 1},
            {"type": "triple", "room_number": "203", "monthly_rent": 8000, "daily_rent": 450, "total_beds": 3, "occupied_beds": 1},
        ],
        "photos": [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
        ]
    },
    {
        "name": "Urban Nest Co-Living Space - Koramangala",
        "description": "Vibrant co-living community with dedicated coworking stations, rooftop cafe, gym facility, and weekly community events.",
        "address": "80 Feet Road, 4th Block, Koramangala, Bengaluru",
        "area": "Koramangala",
        "city": "Bengaluru",
        "pincode": "560034",
        "gender_type": "coliving", "geo_lat": 12.9352, "geo_lng": 77.6245,
        "contact_number": "9876543212",
        "amenities": ["Coworking", "High Speed WiFi", "Rooftop Cafe", "Gym", "Food"],
        "is_active": True,
        "moderation_status": "approved",
        "total_floors": 4,
        "rooms_per_floor": 4,
        "total_rooms": 16,
        "rooms": [
            {"type": "single", "room_number": "301", "monthly_rent": 18000, "daily_rent": 1000, "total_beds": 1, "occupied_beds": 0},
            {"type": "double", "room_number": "302", "monthly_rent": 12000, "daily_rent": 700, "total_beds": 2, "occupied_beds": 1},
        ],
        "photos": [
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80"
        ]
    }
]

created_count = 0
for data in demo_hostels:
    rooms_data = data.pop("rooms")
    photos_data = data.pop("photos")
    
    hostel, created = Hostel.objects.get_or_create(
        name=data["name"],
        defaults=dict(owner=owner, **data)
    )
    if created:
        created_count += 1
        for r in rooms_data:
            Room.objects.create(
                hostel=hostel,
                type=r["type"],
                room_number=r["room_number"],
                monthly_rent=r["monthly_rent"],
                daily_rent=r["daily_rent"],
                total_beds=r["total_beds"],
                occupied_beds=r["occupied_beds"]
            )
        for p in photos_data:
            HostelPhoto.objects.create(
                hostel=hostel,
                url=p,
                display_order=0
            )
        Review.objects.create(
            hostel=hostel,
            student=student,
            rating_cleanliness=5,
            rating_food=5,
            rating_owner=5,
            rating_facilities=5,
            rating_value=5,
            text="Awesome stay! The food and hygiene are well maintained, and internet connectivity is fast.",
            status="approved"
        )

print(f"SUCCESS: Seeded demo data! Added {created_count} hostels. Total Hostels: {Hostel.objects.count()}, Total Rooms: {Room.objects.count()}")
