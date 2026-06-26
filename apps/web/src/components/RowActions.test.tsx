import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RowActions } from './RowActions';

describe('RowActions', () => {
  it('chama onEdit ao clicar em Editar', () => {
    const onEdit = vi.fn();
    render(<RowActions onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Editar'));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('pede confirmação antes de excluir', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RowActions onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Excluir'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('não exclui se confirmação for cancelada', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<RowActions onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Excluir'));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
