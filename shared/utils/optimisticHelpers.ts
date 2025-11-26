import { SetState, GetState } from 'zustand';

export interface OptimisticAdditionConfig<TStore, TItem> {
  stateKey: keyof TStore;
  item: TItem;
  apiCall: () => Promise<{ data: TItem | null; error: any }>;
  onSuccess?: () => Promise<void>;
  generateTempId?: () => string;
}

export interface OptimisticDeletionConfig<TStore> {
  stateKey: keyof TStore;
  itemId: string;
  apiCall: () => Promise<{ error: any }>;
  onSuccess?: () => Promise<void>;
  getItemId?: (item: any) => string;
}

export interface OptimisticUpdateConfig<TStore, TItem> {
  stateKey: keyof TStore;
  itemId: string;
  updates: Partial<TItem>;
  apiCall: () => Promise<{ error: any }>;
  onSuccess?: () => Promise<void>;
  getItemId?: (item: any) => string;
}

export function createOptimisticAddition<TStore, TItem extends { id?: string }>(
  config: OptimisticAdditionConfig<TStore, TItem>,
  set: SetState<TStore>,
  get: GetState<TStore>
) {
  return async (): Promise<string | null> => {
    const { stateKey, item, apiCall, onSuccess, generateTempId } = config;

    const tempId = generateTempId ? generateTempId() : `temp-${Date.now()}-${Math.random()}`;
    const optimisticItem = { ...item, id: tempId } as TItem;

    const currentState = get();
    const currentArray = currentState[stateKey] as any[];
    const previousState = [...currentArray];

    set({ [stateKey]: [...currentArray, optimisticItem] } as Partial<TStore>);

    try {
      const { data, error } = await apiCall();

      if (error) throw error;

      if (onSuccess) {
        await onSuccess();
      } else {
        const updatedArray = (get()[stateKey] as any[]).map((arrayItem: any) =>
          arrayItem.id === tempId ? { ...arrayItem, id: data?.id || tempId } : arrayItem
        );
        set({ [stateKey]: updatedArray } as Partial<TStore>);
      }

      return data?.id || tempId;
    } catch (error) {
      set({ [stateKey]: previousState } as Partial<TStore>);
      set({ error: (error as Error).message } as Partial<TStore>);
      return null;
    }
  };
}

export function createOptimisticDeletion<TStore>(
  config: OptimisticDeletionConfig<TStore>,
  set: SetState<TStore>,
  get: GetState<TStore>
) {
  return async (): Promise<boolean> => {
    const { stateKey, itemId, apiCall, onSuccess, getItemId = (item) => item.id } = config;

    const currentState = get();
    const currentArray = currentState[stateKey] as any[];
    const previousState = [...currentArray];

    const optimisticArray = currentArray.filter((item) => getItemId(item) !== itemId);
    set({ [stateKey]: optimisticArray } as Partial<TStore>);

    try {
      const { error } = await apiCall();

      if (error) throw error;

      if (onSuccess) {
        await onSuccess();
      }

      return true;
    } catch (error) {
      set({ [stateKey]: previousState } as Partial<TStore>);
      set({ error: (error as Error).message } as Partial<TStore>);
      return false;
    }
  };
}

export function createOptimisticUpdate<TStore, TItem>(
  config: OptimisticUpdateConfig<TStore, TItem>,
  set: SetState<TStore>,
  get: GetState<TStore>
) {
  return async (): Promise<boolean> => {
    const { stateKey, itemId, updates, apiCall, onSuccess, getItemId = (item) => item.id } = config;

    const currentState = get();
    const currentArray = currentState[stateKey] as any[];
    const previousState = [...currentArray];

    const optimisticArray = currentArray.map((item) =>
      getItemId(item) === itemId ? { ...item, ...updates } : item
    );
    set({ [stateKey]: optimisticArray } as Partial<TStore>);

    try {
      const { error } = await apiCall();

      if (error) throw error;

      if (onSuccess) {
        await onSuccess();
      }

      return true;
    } catch (error) {
      set({ [stateKey]: previousState } as Partial<TStore>);
      set({ error: (error as Error).message } as Partial<TStore>);
      return false;
    }
  };
}

export function createOptimisticMutation<TStore, TResult = boolean>(
  operation: () => Promise<TResult>,
  rollback: () => void,
  set: SetState<TStore>
): Promise<TResult> {
  return operation().catch((error) => {
    rollback();
    set({ error: (error as Error).message } as Partial<TStore>);
    throw error;
  });
}
