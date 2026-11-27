import secrets
from django.db import migrations, models
import apps.groups.models


def populate_qr_tokens(apps, schema_editor):
    PasanakuGroup = apps.get_model('groups', 'PasanakuGroup')
    for group in PasanakuGroup.objects.filter(qr_token__isnull=True):
        group.qr_token = secrets.token_urlsafe(16)
        group.save(update_fields=['qr_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0005_pasanakugroup_is_public_pasanakugroup_min_reputation_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='pasanakugroup',
            name='qr_token',
            field=models.CharField(
                blank=True,
                max_length=32,
                null=True,
                verbose_name='token QR de ingreso directo',
            ),
        ),
        migrations.RunPython(populate_qr_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='pasanakugroup',
            name='qr_token',
            field=models.CharField(
                db_index=True,
                default=apps.groups.models.generate_qr_token,
                help_text='Token único embebido en el QR del grupo; permite ingreso directo omitiendo reputación.',
                max_length=32,
                unique=True,
                verbose_name='token QR de ingreso directo',
            ),
        ),
    ]
