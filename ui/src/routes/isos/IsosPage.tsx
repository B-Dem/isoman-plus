import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PaginationState, SortingState } from '@tanstack/react-table';
import { useCallback, useState } from 'react';
import { EditIsoModal } from '@/components/EditIsoModal';
import { IsoList } from '@/components/IsoList';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  deleteISO,
  listISOsPaginated,
  retryISO,
  updateISO,
} from '@/lib/api';
import { useAppStore } from '@/stores';
import type {
  ISO,
  PaginationInfo,
  UpdateISORequest,
  WSProgressMessage,
} from '@/types/iso';

export function IsosPage() {
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isoToEdit, setIsoToEdit] = useState<ISO | null>(null);

  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortBy = sorting.length > 0 ? sorting[0].id : 'created_at';
  const sortDir = sorting.length > 0 && sorting[0].desc ? 'desc' : 'asc';

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['isos', { page, pageSize, sortBy, sortDir }],
    queryFn: () => listISOsPaginated({ page, pageSize, sortBy, sortDir }),
    placeholderData: keepPreviousData,
  });

  const isos = data?.isos ?? [];
  const pagination: PaginationInfo = data?.pagination ?? {
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
  };

  const handleWebSocketMessage = useCallback(
    (message: WSProgressMessage) => {
      if (message.type === 'progress') {
        queryClient.setQueryData(
          ['isos', { page, pageSize, sortBy, sortDir }],
          (oldData: { isos: ISO[]; pagination: PaginationInfo } | undefined) => {
            if (!oldData) return oldData;

            const updatedIsos = oldData.isos.map((iso) =>
              iso.id === message.payload.id
                ? {
                    ...iso,
                    progress: message.payload.progress,
                    status: message.payload.status,
                  }
                : iso,
            );

            if (
              message.payload.status === 'complete' ||
              message.payload.status === 'failed'
            ) {
              queryClient.invalidateQueries({ queryKey: ['isos'] });
            }

            return { ...oldData, isos: updatedIsos };
          },
        );
      }
    },
    [queryClient, page, pageSize, sortBy, sortDir],
  );

  useWebSocket({ onMessage: handleWebSocketMessage });

  const deleteMutation = useMutation({
    mutationFn: deleteISO,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['isos'] }),
  });

  const retryMutation = useMutation({
    mutationFn: retryISO,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['isos'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateISORequest }) =>
      updateISO(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['isos'] }),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['isos'] });
  };

  const handleDelete = (id: string) => deleteMutation.mutate(id);
  const handleRetry = (id: string) => retryMutation.mutate(id);
  
  const handleEdit = (iso: ISO) => {
    setIsoToEdit(iso);
    setEditModalOpen(true);
  };

  const handleUpdate = async (id: string, request: UpdateISORequest) => {
    await updateMutation.mutateAsync({ id, request });
  };

  const handlePaginationChange = useCallback(
    (newPagination: PaginationState) => {
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
    [],
  );

  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting);
    setPage(1);
  }, []);

  return (
    <>
      <IsoList
        isos={isos}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error as Error | null}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        onDeleteISO={handleDelete}
        onRetryISO={handleRetry}
        onEditISO={handleEdit}
        pagination={pagination}
        sorting={sorting}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
      />
      {isoToEdit && (
        <EditIsoModal
          iso={isoToEdit}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSubmit={handleUpdate}
        />
      )}
    </>
  );
}