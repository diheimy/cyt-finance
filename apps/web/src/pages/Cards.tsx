import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWorkspace, useWorkspaces } from '@/hooks/useWorkspace';
import { useCards, useDeleteCard, type Card } from '@/hooks/useCards';
import { Modal } from '@/components/Modal';
import CardForm from '@/components/forms/CardForm';

export default function Cards() {
  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces(user?.id);
  const { active } = useActiveWorkspace(workspaces);
  const cards = useCards(active?.id);
  const del = useDeleteCard(active?.id);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(card: Card) {
    setEditing(card);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  if (!active) return <p className="p-6">Carregando…</p>;

  const canEdit = active.role !== 'viewer';

  return (
    <section className="p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl">Cartões</h1>
          <p className="text-slate-500 text-sm">Cadastre seus cartões para lançar compras parceladas.</p>
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold"
          >
            + Novo cartão
          </button>
        )}
      </header>

      {cards.isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {(cards.data ?? []).length === 0 && !cards.isLoading && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500 text-sm">
          Nenhum cartão cadastrado ainda.
        </div>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(cards.data ?? []).map((c) => (
          <li
            key={c.id}
            className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{c.nome}</p>
              <p className="text-xs text-slate-500 font-mono">•••• {c.ultimos_digitos}</p>
              <p className="text-xs text-slate-500 mt-1">
                Fechamento dia <strong>{c.dia_fechamento}</strong>
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir cartão "${c.nome}"? Transações existentes não serão apagadas.`)) {
                      del.mutate(c.id);
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Excluir
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Modal open={formOpen} onClose={closeForm} title={editing ? 'Editar cartão' : 'Novo cartão'}>
        <CardForm
          workspaceId={active.id}
          existing={editing ?? undefined}
          onSuccess={closeForm}
          onCancel={closeForm}
        />
      </Modal>
    </section>
  );
}
