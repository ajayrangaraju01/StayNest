from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_booking_audit_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="feepayment",
            name="razorpay_ref",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="menu",
            name="is_override",
            field=models.BooleanField(default=False),
        ),
    ]
