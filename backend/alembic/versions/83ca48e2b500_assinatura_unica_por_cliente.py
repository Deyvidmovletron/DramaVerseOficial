"""assinatura unica por cliente

Revision ID: 83ca48e2b500
Revises: 614563e5dabc
Create Date: 2026-08-17 16:42:09.969699

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '83ca48e2b500'
down_revision: Union[str, None] = '614563e5dabc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove duplicatas antes da constraint: mantém só a assinatura mais recente (maior
    # id) de cada cliente. Sem isso, a criação da constraint única abaixo falha em
    # qualquer banco que já tenha mais de uma linha por cliente — exatamente o bug que
    # esta revisão corrige (cada "atribuir plano" criava uma linha nova em vez de
    # atualizar a existente).
    op.execute(
        "DELETE FROM assinaturas WHERE id NOT IN (SELECT MAX(id) FROM assinaturas GROUP BY cliente_id)"
    )

    with op.batch_alter_table('assinaturas', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_assinaturas_cliente_id'))
        batch_op.create_index(batch_op.f('ix_assinaturas_cliente_id'), ['cliente_id'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('assinaturas', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_assinaturas_cliente_id'))
        batch_op.create_index(batch_op.f('ix_assinaturas_cliente_id'), ['cliente_id'], unique=False)
