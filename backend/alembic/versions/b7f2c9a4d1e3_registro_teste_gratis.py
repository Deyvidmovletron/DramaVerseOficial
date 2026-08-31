"""registro cliente, telefone, teste gratis e destaque de plano

Revision ID: b7f2c9a4d1e3
Revises: 83ca48e2b500
Create Date: 2026-08-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7f2c9a4d1e3'
down_revision: Union[str, None] = '83ca48e2b500'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # clientes.telefone: coletado no auto-cadastro (/registro), usado como contato do
    # admin e como payer.phone best-effort nos pagamentos PIX.
    with op.batch_alter_table('clientes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('telefone', sa.String(length=20), nullable=True))

    # planos.periodo_teste_dias: teste grátis em dias inteiros (0 = sem teste).
    # planos.destaque: marca o plano "recomendado" nos layouts de 2/3 planos.
    with op.batch_alter_table('planos', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('periodo_teste_dias', sa.Integer(), server_default='0', nullable=False)
        )
        batch_op.add_column(
            sa.Column('destaque', sa.Boolean(), server_default='0', nullable=False)
        )

    # StatusAssinatura ganhou o valor 'teste'. Em SQLite o Enum é VARCHAR sem CHECK
    # constraint (create_constraint=False, padrão), então não há DDL a aplicar aqui.


def downgrade() -> None:
    with op.batch_alter_table('planos', schema=None) as batch_op:
        batch_op.drop_column('destaque')
        batch_op.drop_column('periodo_teste_dias')

    with op.batch_alter_table('clientes', schema=None) as batch_op:
        batch_op.drop_column('telefone')
