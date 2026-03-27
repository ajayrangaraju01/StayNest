from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_phase3_complaints_reviews"),
    ]

    operations = [
        migrations.AlterField(
            model_name="complaint",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name="complaint",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name="complaintevidence",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name="review",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name="review",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
