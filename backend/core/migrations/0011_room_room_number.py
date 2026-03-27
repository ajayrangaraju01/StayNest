from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_alter_complaint_created_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="room_number",
            field=models.CharField(blank=True, max_length=40),
        ),
    ]
