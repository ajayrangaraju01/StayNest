from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0014_hostel_pending_update"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="daily_rent",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="booking",
            name="stay_type",
            field=models.CharField(
                choices=[("monthly", "Monthly"), ("daily", "Daily")],
                default="monthly",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="total_days",
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
