interface Props {
  onEdit: () => void;
  onDelete: () => void;
  confirmText?: string;
}

export function RowActions({ onEdit, onDelete, confirmText = 'Excluir este item?' }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Editar"
        onClick={onEdit}
        className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Excluir"
        onClick={() => {
          if (window.confirm(confirmText)) onDelete();
        }}
        className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-negative"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
