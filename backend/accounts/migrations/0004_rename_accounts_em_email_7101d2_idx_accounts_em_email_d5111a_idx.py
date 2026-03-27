from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_emailotp_attempt_controls"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="emailotp",
            new_name="accounts_em_email_d5111a_idx",
            old_name="accounts_em_email_7101d2_idx",
        ),
    ]
