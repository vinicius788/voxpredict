import React, { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

type CommentItem = {
  id: string;
  content: string;
  upvotes: number;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  };
};

interface MarketCommentsProps {
  marketId: number | string;
  className?: string;
}

const UserAvatar: React.FC<{ username: string | null; avatarUrl: string | null }> = ({ username, avatarUrl }) => {
  const initial = (username || '?')[0].toUpperCase();
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username || 'user'} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--purple-primary)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
      {initial}
    </div>
  );
};

export const MarketComments: React.FC<MarketCommentsProps> = ({ marketId, className = '' }) => {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['comments', marketId],
    queryFn: async ({ pageParam }) => {
      const response = await api.getMarketComments(marketId, pageParam as string | undefined);
      return response as { data: CommentItem[]; nextCursor: string | null; hasMore: boolean };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const allComments = data?.pages.flatMap((p) => p.data) ?? [];

  const postMutation = useMutation({
    mutationFn: (content: string) => api.postComment(marketId, content),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['comments', marketId] });
      toast.success('Comentário publicado!');
    },
    onError: () => toast.error('Erro ao publicar comentário.'),
  });

  const upvoteMutation = useMutation({
    mutationFn: (commentId: string) => api.upvoteComment(commentId),
    onSuccess: (_data, commentId) => {
      setUpvotedIds((prev) => new Set([...prev, commentId]));
      queryClient.invalidateQueries({ queryKey: ['comments', marketId] });
    },
    onError: () => toast.error('Erro ao dar upvote.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    postMutation.mutate(trimmed);
  };

  const charsLeft = 500 - draft.length;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-[var(--purple-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Discussão
          {allComments.length > 0 && (
            <span className="ml-1.5 text-[var(--text-muted)] font-normal">({allComments.length})</span>
          )}
        </h3>
      </div>

      {isSignedIn && (
        <form onSubmit={handleSubmit} className="mb-5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            placeholder="Escreva um comentário..."
            rows={3}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--border-focus)] resize-none transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${charsLeft < 50 ? 'text-[var(--no)]' : 'text-[var(--text-faint)]'}`}>
              {charsLeft} caracteres restantes
            </span>
            <button
              type="submit"
              disabled={!draft.trim() || postMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-[var(--purple-primary)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {postMutation.isPending ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      )}

      {!isSignedIn && (
        <p className="text-sm text-[var(--text-muted)] mb-4 italic">
          <button
            className="text-[var(--purple-primary)] underline underline-offset-2"
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signin' } }))}
          >
            Entre
          </button>{' '}
          para comentar.
        </p>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-1/3" />
                <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-full" />
                <div className="h-3 bg-[var(--bg-elevated)] rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && allComments.length === 0 && (
        <p className="text-[var(--text-muted)] text-sm text-center py-6">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      )}

      {!isLoading && allComments.length > 0 && (
        <div className="space-y-4">
          {allComments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar username={comment.user.username} avatarUrl={comment.user.avatarUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {comment.user.username || 'Anônimo'}
                  </span>
                  <span className="text-xs text-[var(--text-faint)]">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
                <button
                  onClick={() => {
                    if (!isSignedIn) {
                      window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signin' } }));
                      return;
                    }
                    if (upvotedIds.has(comment.id)) return;
                    upvoteMutation.mutate(comment.id);
                  }}
                  className={`mt-1.5 flex items-center gap-1 text-xs transition-colors ${
                    upvotedIds.has(comment.id)
                      ? 'text-[var(--purple-primary)]'
                      : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{comment.upvotes}</span>
                </button>
              </div>
            </div>
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full text-center text-sm text-[var(--purple-primary)] hover:underline disabled:opacity-50 py-2"
            >
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
