import React, { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Palette, Pencil, Plus, Settings, X, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { api } from '../lib/api-client';

interface Category {
  id: string;
  key: string;
  label: string;
  icon: string;
  description: string;
  active: boolean;
  color: string;
  order: number;
  marketCount?: number;
  totalVolume?: number;
}

interface AdminCategoryManagerProps {
  isBrandTheme?: boolean;
}

const COLOR_PRESETS = [
  '#3B82F6',
  '#F97316',
  '#EF4444',
  '#8B5CF6',
  '#10B981',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#6366F1',
];

const DEFAULT_COLOR_BY_NAME: Record<string, string> = {
  politica: '#3B82F6',
  cripto: '#F97316',
  esportes: '#EF4444',
  tecnologia: '#8B5CF6',
  economia: '#10B981',
  entretenimento: '#EC4899',
  geopolitica: '#F59E0B',
  negocios: '#06B6D4',
  ciencia: '#6366F1',
};

const ICON_OPTIONS = ['🎯', '🏛️', '₿', '⚽', '💻', '📈', '🎬', '🌍', '💼', '🔬', '🎮', '🏆', '🚀', '📱', '🌐'];

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const toCategoryId = (value: string) =>
  normalizeKey(value)
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

const getDefaultColor = (label: string, id?: string) =>
  DEFAULT_COLOR_BY_NAME[normalizeKey(label)] ||
  (id ? DEFAULT_COLOR_BY_NAME[normalizeKey(id)] : undefined) ||
  '#7C3AED';

const formatCompactCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
};

const withAlpha = (hex: string, alpha = 0.2) => {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw;
  const normalized = full.length === 6 ? full : '7C3AED';
  return `#${normalized}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
};

const normalizeCategory = (category: Partial<Category>, fallbackOrder: number): Category => {
  const label = (category.label || category.id || 'Categoria').trim();
  const id = (category.id || `cat-${fallbackOrder}`).trim();
  const key = (category.key || toCategoryId(label) || `cat-${fallbackOrder}`).trim();

  return {
    id,
    key,
    label,
    icon: category.icon || '🎯',
    description: category.description || '',
    active: category.active ?? true,
    color: category.color || getDefaultColor(label, id),
    order: typeof category.order === 'number' ? category.order : fallbackOrder,
    marketCount: Number(category.marketCount ?? 0),
    totalVolume: Number(category.totalVolume ?? 0),
  };
};

const mapApiCategories = (items: Array<Partial<Category>>) =>
  items
    .map((category, index) =>
      normalizeCategory(
        {
          ...category,
          order: category.order ?? (category as any).sortOrder,
          marketCount: (category as any).marketCount ?? 0,
          totalVolume: (category as any).totalVolume ?? 0,
        },
        index + 1,
      ),
    )
    .sort((a, b) => a.order - b.order);

type ModalMode = 'create' | 'edit' | null;

interface CategoryModalState {
  id?: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

interface SortableCategoryItemProps {
  category: Category;
  marketCount: number;
  totalVolume: number;
  isDescriptionEditing: boolean;
  descriptionDraft: string;
  onStartDescriptionEdit: (category: Category) => void;
  onDescriptionDraftChange: (value: string) => void;
  onSaveDescription: () => void;
  onCancelDescription: () => void;
  onRequestToggle: (category: Category) => void;
  onOpenEdit: (category: Category) => void;
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({
  category,
  marketCount,
  totalVolume,
  isDescriptionEditing,
  descriptionDraft,
  onStartDescriptionEdit,
  onDescriptionDraftChange,
  onSaveDescription,
  onCancelDescription,
  onRequestToggle,
  onOpenEdit,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-[12px] border border-white/10 bg-[#1e1e30] p-4 transition-colors ${
        isDragging ? 'opacity-75 shadow-lg' : 'hover:border-white/20'
      } ${category.active ? '' : 'opacity-70'}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-1 rounded-[8px] border border-white/10 p-1.5 text-gray-500 hover:text-white"
            aria-label={`Reordenar categoria ${category.label}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-white/10 text-xl" style={{ backgroundColor: withAlpha(category.color, 0.2), color: category.color }}>
            <span>{category.icon}</span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{category.label}</h3>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-gray-300">
                {marketCount} {marketCount === 1 ? 'mercado' : 'mercados'}
              </span>
              <span className="mono-value text-xs text-gray-500">Vol {formatCompactCurrency(totalVolume)}</span>
            </div>

            {isDescriptionEditing ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={descriptionDraft}
                  onChange={(event) => onDescriptionDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onSaveDescription();
                    if (event.key === 'Escape') onCancelDescription();
                  }}
                  placeholder="Descreva esta categoria"
                  className="h-9 min-w-[240px] max-w-[420px] rounded-[8px] border border-white/10 bg-[#0f0f1a] px-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-500/50 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={onSaveDescription}
                  className="rounded-[8px] border border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.16)] p-1.5 text-[#6ee7b7]"
                  aria-label="Salvar descrição"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={onCancelDescription}
                  className="rounded-[8px] border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.15)] p-1.5 text-[#fda4af]"
                  aria-label="Cancelar edição da descrição"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onStartDescriptionEdit(category)}
                className="mt-2 text-left text-sm text-gray-300 transition-colors hover:text-white"
              >
                {category.description || 'Sem descrição'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          <button
            onClick={() => onRequestToggle(category)}
            className={`relative h-7 w-12 rounded-full border transition-colors ${
              category.active
                ? 'border-[rgba(16,185,129,0.45)] bg-[rgba(16,185,129,0.35)]'
                : 'border-[var(--border)] bg-[rgba(148,163,184,0.25)]'
            }`}
            aria-label={category.active ? `Desativar ${category.label}` : `Ativar ${category.label}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                category.active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <button
            onClick={() => onOpenEdit(category)}
            className="rounded-[8px] border border-white/10 p-2 text-gray-300 transition-colors hover:text-white"
            aria-label={`Editar categoria ${category.label}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminCategoryManager: React.FC<AdminCategoryManagerProps> = () => {
  const { isAdmin } = useAdminAccess();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalState, setModalState] = useState<CategoryModalState>({
    label: '',
    icon: '🎯',
    description: '',
    color: '#7C3AED',
  });
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [pendingDeactivation, setPendingDeactivation] = useState<Category | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const persistCategories = async (nextCategories: Category[], successMessage?: string) => {
    const ordered = nextCategories
      .map((category, index) => ({ ...category, order: index + 1 }))
      .sort((a, b) => a.order - b.order);

    setCategories(ordered);
    try {
      await api.reorderCategories(ordered.map((category) => category.id));
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error('Falha ao salvar a nova ordem das categorias.');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.getCategories({ includeInactive: true });
        const items = (response.data || response) as Array<Partial<Category>>;
        setCategories(mapApiCategories(items));
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar categorias.', { id: 'admin-categories-load-error' });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setModalState({
      label: '',
      icon: '🎯',
      description: '',
      color: '#7C3AED',
    });
  };

  const openEditModal = (category: Category) => {
    setModalMode('edit');
    setModalState({
      id: category.id,
      label: category.label,
      icon: category.icon,
      description: category.description,
      color: category.color,
    });
  };

  const closeModal = () => {
    setModalMode(null);
    setModalState({
      label: '',
      icon: '🎯',
      description: '',
      color: '#7C3AED',
    });
  };

  const saveModal = async () => {
    const label = modalState.label.trim();
    if (!label) {
      toast.error('Nome da categoria é obrigatório.');
      return;
    }

    if (modalMode === 'create') {
      const id = toCategoryId(label);
      if (!id) {
        toast.error('Nome inválido para categoria.');
        return;
      }

      if (categories.some((category) => category.key === id)) {
        toast.error('Já existe uma categoria com este nome.');
        return;
      }

      try {
        await api.createCategory({
          key: id,
          label,
          icon: modalState.icon || '🎯',
          description: modalState.description.trim(),
          color: modalState.color || getDefaultColor(label, id),
          active: true,
          sortOrder: categories.length + 1,
        });

        const refreshed = await api.getCategories({ includeInactive: true });
        const items = (refreshed.data || refreshed) as Array<Partial<Category>>;
        setCategories(mapApiCategories(items));
        toast.success('Categoria criada com sucesso.');
        closeModal();
      } catch (error) {
        console.error(error);
        toast.error('Erro ao criar categoria.');
      }
      return;
    }

    if (modalMode === 'edit' && modalState.id) {
      try {
        const current = categories.find((category) => category.id === modalState.id);
        await api.updateCategory(modalState.id, {
          key: toCategoryId(label),
          label,
          icon: modalState.icon || current?.icon || '🎯',
          description: modalState.description.trim(),
          color: modalState.color || current?.color || '#7C3AED',
        });

        const refreshed = await api.getCategories({ includeInactive: true });
        const items = (refreshed.data || refreshed) as Array<Partial<Category>>;
        setCategories(mapApiCategories(items));
        toast.success('Categoria atualizada.');
        closeModal();
      } catch (error) {
        console.error(error);
        toast.error('Erro ao atualizar categoria.');
      }
    }
  };

  const startDescriptionEdit = (category: Category) => {
    setEditingDescriptionId(category.id);
    setDescriptionDraft(category.description);
  };

  const cancelDescriptionEdit = () => {
    setEditingDescriptionId(null);
    setDescriptionDraft('');
  };

  const saveDescriptionEdit = async () => {
    if (!editingDescriptionId) return;

    try {
      await api.updateCategory(editingDescriptionId, { description: descriptionDraft.trim() });
      setCategories((prev) =>
        prev.map((category) =>
          category.id === editingDescriptionId ? { ...category, description: descriptionDraft.trim() } : category,
        ),
      );
      toast.success('Descrição da categoria atualizada.');
      cancelDescriptionEdit();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar descrição.');
    }
  };

  const requestToggle = async (category: Category) => {
    if (category.active) {
      setPendingDeactivation(category);
      return;
    }

    try {
      await api.updateCategory(category.id, { active: true });
      setCategories((prev) =>
        prev.map((item) => (item.id === category.id ? { ...item, active: true } : item)),
      );
      toast.success(`Categoria "${category.label}" ativada.`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao ativar categoria.');
    }
  };

  const confirmDeactivation = async () => {
    if (!pendingDeactivation) return;
    try {
      await api.updateCategory(pendingDeactivation.id, { active: false });
      setCategories((prev) =>
        prev.map((item) =>
          item.id === pendingDeactivation.id ? { ...item, active: false } : item,
        ),
      );
      toast.success(`Categoria "${pendingDeactivation.label}" desativada.`);
      setPendingDeactivation(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao desativar categoria.');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((category) => category.id === active.id);
    const newIndex = categories.findIndex((category) => category.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    void persistCategories(reordered, 'Ordem das categorias atualizada.');
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-8 text-center">
        <div className="text-red-500 mb-4">
          <Zap className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">Acesso Negado</h3>
        <p className="text-gray-400">Apenas administradores podem gerenciar categorias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#1e1e30] p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Gerenciar Categorias</h2>
              <p className="text-sm text-gray-400">Cores, ordem, descrição e visibilidade pública.</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" /> Nova Categoria
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-[12px] border border-white/10 bg-[#0f0f1a]" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-[12px] border border-white/10 bg-[#0f0f1a] p-8 text-center">
            <p className="text-sm text-gray-400">Nenhuma categoria cadastrada.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
            >
              Criar categoria
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {categories.map((category) => {
                  return (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      marketCount={category.marketCount || 0}
                      totalVolume={category.totalVolume || 0}
                      isDescriptionEditing={editingDescriptionId === category.id}
                      descriptionDraft={descriptionDraft}
                      onStartDescriptionEdit={startDescriptionEdit}
                      onDescriptionDraftChange={setDescriptionDraft}
                      onSaveDescription={saveDescriptionEdit}
                      onCancelDescription={cancelDescriptionEdit}
                      onRequestToggle={requestToggle}
                      onOpenEdit={openEditModal}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="rounded-[12px] border border-amber-500/25 bg-amber-500/10 p-4">
        <p className="text-sm font-semibold text-amber-400">Dica</p>
        <p className="mt-1 text-xs text-amber-300/90">
          Arraste para reordenar, clique na descrição para editar inline e use o toggle para ocultar categorias da listagem pública.
        </p>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-4">
          <div className="w-full max-w-xl rounded-[12px] border border-[var(--border)] bg-[var(--brand-800)] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {modalMode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
              </h3>
              <button onClick={closeModal} className="rounded-[8px] border border-[var(--border)] p-1.5 text-[var(--text-secondary)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Nome
                </label>
                <input
                  value={modalState.label}
                  onChange={(event) => setModalState((prev) => ({ ...prev, label: event.target.value }))}
                  className="vp-input h-10 px-3 text-sm"
                  placeholder="Ex: Geopolítica"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Ícone
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setModalState((prev) => ({ ...prev, icon }))}
                      className={`flex h-9 w-9 items-center justify-center rounded-[8px] border text-sm ${
                        modalState.icon === icon
                          ? 'border-amber-500/60 bg-amber-500/15'
                          : 'border-white/10 bg-[#0f0f1a]'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Cor da categoria
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setModalState((prev) => ({ ...prev, color }))}
                      className={`h-8 rounded-[8px] border ${modalState.color === color ? 'border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Descrição
                </label>
                <input
                  value={modalState.description}
                  onChange={(event) => setModalState((prev) => ({ ...prev, description: event.target.value }))}
                  className="vp-input h-10 px-3 text-sm"
                  placeholder="Resumo desta categoria"
                />
              </div>
            </div>

            <div className="mt-4 rounded-[10px] border border-white/10 bg-[#0f0f1a] p-3">
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <Palette className="h-3.5 w-3.5" /> Preview
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/10 text-lg" style={{ backgroundColor: withAlpha(modalState.color, 0.2), color: modalState.color }}>
                  {modalState.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{modalState.label || 'Categoria'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{modalState.description || 'Descrição da categoria'}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-[8px] border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={saveModal}
                className="rounded-[8px] bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeactivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[var(--border)] bg-[var(--brand-800)] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Desativar categoria?</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Isso ocultará a categoria e seus mercados da listagem pública.
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Categoria: {pendingDeactivation.label}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDeactivation(null)}
                className="rounded-[8px] border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeactivation}
                className="rounded-[8px] border border-[rgba(239,68,68,0.45)] bg-[rgba(239,68,68,0.2)] px-4 py-2 text-sm font-semibold text-[#fecaca]"
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
