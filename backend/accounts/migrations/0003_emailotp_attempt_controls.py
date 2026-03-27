from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_email_emailotp"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailotp",
            name="attempt_count",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="emailotp",
            name="last_attempt_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
