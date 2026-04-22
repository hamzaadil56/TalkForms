"""drop graph tables and orphaned form columns

Revision ID: a1b2c3d4e5f6
Revises: 38c208b7772f
Create Date: 2026-04-22 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '38c208b7772f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop edges before nodes (FK dependency)
    op.drop_index('ix_form_graph_edges_from_node_id', table_name='form_graph_edges')
    op.drop_index('ix_form_graph_edges_form_version_id', table_name='form_graph_edges')
    op.drop_table('form_graph_edges')

    op.drop_index('ix_form_graph_nodes_key', table_name='form_graph_nodes')
    op.drop_index('ix_form_graph_nodes_form_version_id', table_name='form_graph_nodes')
    op.drop_table('form_graph_nodes')

    # Drop respondent_sessions.form_version_id FK + column
    with op.batch_alter_table('respondent_sessions') as batch_op:
        batch_op.drop_column('form_version_id')
        batch_op.drop_column('current_node_id')

    # Drop forms.published_version_id FK + column
    with op.batch_alter_table('forms') as batch_op:
        batch_op.drop_column('published_version_id')

    # Drop form_versions last (no more dependents)
    op.drop_index('ix_form_versions_form_id', table_name='form_versions')
    op.drop_table('form_versions')


def downgrade() -> None:
    # Restore form_versions
    op.create_table(
        'form_versions',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('form_id', sa.String(36), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(32), nullable=False),
        sa.Column('start_node_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['form_id'], ['forms.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('form_id', 'version_number', name='uq_form_version_number'),
    )
    op.create_index('ix_form_versions_form_id', 'form_versions', ['form_id'])

    with op.batch_alter_table('forms') as batch_op:
        batch_op.add_column(sa.Column('published_version_id', sa.String(36), nullable=True))

    with op.batch_alter_table('respondent_sessions') as batch_op:
        batch_op.add_column(sa.Column('form_version_id', sa.String(36), nullable=True))
        batch_op.add_column(sa.Column('current_node_id', sa.String(36), nullable=True))
