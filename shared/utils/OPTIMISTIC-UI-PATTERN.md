# Optimistic UI Pattern

This project uses the **Optimistic UI Update** pattern to provide instant, seamless user feedback without lag or jumpy screens.

## What is Optimistic UI?

Optimistic UI is a design pattern where you immediately update the user interface based on the assumption that operations will succeed, rather than waiting for the server response. This creates an instant, responsive feel for users.

### Benefits
- **Instant Feedback**: Users see changes immediately
- **No Lag**: No waiting for API responses
- **Smooth Experience**: No jumpy screens or loading states
- **Professional Feel**: App feels fast and polished
- **Automatic Rollback**: If operations fail, changes are reverted automatically

## How to Use

### For Adding Items to Arrays

Use `createOptimisticAddition` when adding new items:

```typescript
addFamilyMember: async (member) => {
  set({ error: null });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    set({ error: 'Not authenticated' });
    return null;
  }

  return createOptimisticAddition<RecurStore, FamilyMember>({
    stateKey: 'familyMembers',
    item: { ...member, user_id: user.id } as FamilyMember,
    apiCall: async () => {
      const { data, error } = await supabase
        .from('family_members')
        .insert([{ ...member, user_id: user.id }])
        .select()
        .single();
      return { data, error };
    },
    onSuccess: async () => {
      await get().fetchAllFamilyMembers();
    },
  }, set, get)();
}
```

### For Deleting Items from Arrays

Use `createOptimisticDeletion` when removing items:

```typescript
deleteFamilyMember: async (memberId: string) => {
  set({ error: null });

  return createOptimisticDeletion<RecurStore>({
    stateKey: 'familyMembers',
    itemId: memberId,
    apiCall: async () => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);
      return { error };
    },
    onSuccess: async () => {
      await get().fetchAllFamilyMembers();
    },
  }, set, get)();
}
```

### For Updating Items in Arrays

Use `createOptimisticUpdate` when modifying items:

```typescript
updateFamilyMember: async (memberId: string, member: { name: string; avatar: string; relation: string }) => {
  set({ error: null });

  return createOptimisticUpdate<RecurStore, FamilyMember>({
    stateKey: 'familyMembers',
    itemId: memberId,
    updates: member,
    apiCall: async () => {
      const { error } = await supabase
        .from('family_members')
        .update(member)
        .eq('id', memberId);
      return { error };
    },
    onSuccess: async () => {
      await get().fetchAllFamilyMembers();
    },
  }, set, get)();
}
```

## How It Works

1. **Immediate UI Update**: The helper function immediately updates the Zustand store, triggering UI re-renders instantly
2. **Background API Call**: The actual API request happens asynchronously in the background
3. **Success Handling**: If the API succeeds, optionally refresh data from the server to ensure consistency
4. **Error Handling**: If the API fails, the helper automatically:
   - Reverts the UI to the previous state
   - Sets the error message in the store
   - Returns null/false to indicate failure

## Configuration Options

### `createOptimisticAddition`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `stateKey` | keyof TStore | Yes | The key in the Zustand store that holds the array |
| `item` | TItem | Yes | The item to add to the array |
| `apiCall` | () => Promise | Yes | Function that performs the API call |
| `onSuccess` | () => Promise | No | Optional callback after successful API call |
| `generateTempId` | () => string | No | Optional function to generate temporary IDs |

### `createOptimisticDeletion`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `stateKey` | keyof TStore | Yes | The key in the Zustand store that holds the array |
| `itemId` | string | Yes | The ID of the item to delete |
| `apiCall` | () => Promise | Yes | Function that performs the API call |
| `onSuccess` | () => Promise | No | Optional callback after successful API call |
| `getItemId` | (item) => string | No | Optional function to get item ID (defaults to `item.id`) |

### `createOptimisticUpdate`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `stateKey` | keyof TStore | Yes | The key in the Zustand store that holds the array |
| `itemId` | string | Yes | The ID of the item to update |
| `updates` | Partial<TItem> | Yes | The fields to update on the item |
| `apiCall` | () => Promise | Yes | Function that performs the API call |
| `onSuccess` | () => Promise | No | Optional callback after successful API call |
| `getItemId` | (item) => string | No | Optional function to get item ID (defaults to `item.id`) |

## Best Practices

### DO:
- Always clear errors before operations: `set({ error: null })`
- Use type-safe operations with proper TypeScript types
- Include authentication checks before operations
- Use `onSuccess` callback when you need to refresh server data
- Test both success and failure scenarios

### DON'T:
- Don't use `set({ loading: true })` for mutations (only for initial fetches)
- Don't bypass the helper functions and write optimistic logic manually
- Don't forget to handle authentication errors
- Don't skip error handling in API calls

## Future Development

When adding new store actions that modify data:

1. **Import the helpers** at the top of your store file
2. **Choose the right helper** based on your operation type (add/delete/update)
3. **Follow the pattern** shown in existing actions
4. **Test thoroughly** with both success and failure cases

The helper functions enforce the optimistic pattern automatically, ensuring consistency across all future features.

## Error Handling

When operations fail, the helper functions:
1. Automatically revert the UI to the previous state
2. Set an error message in the store: `set({ error: (error as Error).message })`
3. Return `null` (for additions) or `false` (for deletions/updates)

You can display errors to users by reading the `error` state from the store:

```typescript
const error = useRecur((state) => state.error);

{error && (
  <Text style={styles.errorText}>{error}</Text>
)}
```

## Performance

The optimistic UI pattern provides:
- **0ms perceived latency** for user actions
- **Smooth animations** without loading spinners
- **Professional user experience** comparable to native apps
- **Automatic state management** with no manual tracking needed

This approach is used by industry-leading apps like Twitter, Instagram, and Facebook to create responsive, delightful user experiences.
