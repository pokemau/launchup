<script lang="ts">
  import axiosInstance from '$lib/axios';
  import Button from '$lib/components/ui/button/button.svelte';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label/index.js';
  import { useQuery } from '@sveltestack/svelte-query';
  import type { PageData } from './$types';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Table from '$lib/components/ui/table';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Plus, Search, Trash } from 'lucide-svelte';
  import { PUBLIC_API_URL } from '$env/static/public';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import { toast } from 'svelte-sonner';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

  let { data }: { data: PageData } = $props();
  let { startupId, access } = data;

  const queryResult = useQuery(
    'startupData',
    async () =>
      (
        await axiosInstance.get(`/startups/${data.startupId}`, {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        })
      ).data,
    {
      cacheTime: 0,
      staleTime: 0
    }
  );

  // Svelte 5 runes mode state
  let search = $state('');
  let searchedUsers = $state<any[]>([]);
  let firstName = $state('');
  let lastName = $state('');
  let outsideMember = $state(false);
  let open = $state(false);
  let dialogOpen = $state(false);
  let toBeDeletedId = $state<number | null>(null);
  let contracted = $state(false);
  let isSearching = $state(false);
  let searchTimeout: NodeJS.Timeout | null = null;

  // Debounced search function
  function handleSearchInput(value: string) {
    search = value;

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Don't search if query is empty
    if (value.length < 1) {
      searchedUsers = [];
      return;
    }

    // Debounce for 300ms
    searchTimeout = setTimeout(() => {
      searchUsersDebounced();
    }, 300);
  }

  async function searchUsersDebounced() {
    isSearching = true;
    try {
      const response = await fetch(
        `${PUBLIC_API_URL}/users/search?search=${encodeURIComponent(search)}&role=Startup`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );
      const users = await response.json();

      if (response.ok) {
        // Filter out existing members and the startup owner
        const membersSet = new Set($queryResult.data.members.map((member: any) => member.id));
        searchedUsers = users.filter(
          (user: any) => !membersSet.has(user.id) && user.id !== $queryResult.data.user_id
        );
      }
    } catch (error) {
      toast.error('Failed to search users');
      console.error('Search error:', error);
    } finally {
      isSearching = false;
    }
  }

  async function addMember(userId: any) {
    try {
      const { data: responseData } = await axiosInstance.post(
        '/startups/add-member',
        {
          userId: userId,
          startupId: startupId
        },
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );

      if (responseData) {
        toast.success('Successfully added a member');
        $queryResult.refetch();

        // Close dialog and reset search
        dialogOpen = false;
        search = '';
        searchedUsers = [];
      }
    } catch (error) {
      toast.error('Failed to add member');
      console.error('Add member error:', error);
    }
  }

  async function addContractedMember(first: string, last: string) {
    const { data: responseData } = await axiosInstance.post(
      '/startup-contracted-members/',
      {
        startupId: startupId,
        firstName: first,
        lastName: last
      },
      {
        headers: {
          Authorization: `Bearer ${access}`
        }
      }
    );

    if (responseData) {
      toast.success('Successfully added contracted member');
      firstName = '';
      lastName = '';
      $queryResult.refetch();
    }
  }

  async function removeMember(memberId: number) {
    const res = await axiosInstance.delete(`/startups/remove-member/${memberId}/`, {
      headers: {
        Authorization: `Bearer ${access}`
      },
      data: {
        startupId
      }
    });

    if (res.status === 200) {
      toast.success('Successfully removed member');
      $queryResult.refetch();
    }
  }

  async function removeContractedMember(contractedMemberId: number) {
    const res = await axiosInstance.delete(
      `/startup-contracted-members/${contractedMemberId}/`,
      {
        headers: {
          Authorization: `Bearer ${access}`
        }
      }
    );

    if (res.status === 204) {
      toast.success('Successfully removed contracted member');
      $queryResult.refetch();
    }
  }
</script>

<svelte:head>
  <title>Settings - Members</title>
</svelte:head>
<div class="flex flex-col gap-5">
  {#if $queryResult.isError}
    <div class="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
      <p class="font-medium">Failed to load member data</p>
      <p class="text-sm">Please try refreshing the page</p>
    </div>
  {:else}
    {#if $queryResult.isSuccess}
      {#if data.role === 'Mentor' || data.role === 'Manager as Mentor' || data.user.id === $queryResult.data.user_id}
        <h1 class="text-xl font-semibold">Invite Member</h1>
        <div class="flex items-center space-x-2">
          <Switch id="airplane-mode" bind:checked={outsideMember} />
          <Label for="airplane-mode">Contracted member</Label>
        </div>
        {#if outsideMember}
          <div class="flex w-2/3 items-end gap-3">
            <div class="grid flex-1 gap-2">
              <Label for="firstName">First Name</Label>
              <Input
                name="firstName"
                id="firstName"
                type="text"
                placeholder="John"
                required
                bind:value={firstName}
              />
            </div>
            <div class="grid flex-1 gap-2">
              <Label for="lastName">Last Name</Label>
              <Input
                name="lastName"
                id="lastName"
                type="text"
                placeholder="Doe"
                required
                bind:value={lastName}
              />
            </div>
            <Button
              class="w-24"
              onclick={() => addContractedMember(firstName, lastName)}
              ><Plus class="h-4 w-4" /> Add</Button
            >
          </div>
        {:else}
          <div class="flex w-2/3 items-end gap-3">
            <Button onclick={() => (dialogOpen = true)}>
              <Plus class="mr-2 h-4 w-4" /> Add Member
            </Button>
          </div>
        {/if}
      {/if}
    {/if}
    <h1 class="text-xl font-semibold">Members</h1>
    <div class="w-2/3 rounded-md border">
      {#if $queryResult.isLoading}
        <Skeleton class="h-40" />
      {:else}
        <Table.Root class="rounded-lg bg-background">
          <Table.Header>
            <Table.Row class="text-centery h-12">
              <Table.Head class="pl-5">Name</Table.Head>
              <Table.Head class="">Role</Table.Head>
              <Table.Head class=""></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row class="h-14 cursor-pointer">
              <Table.Cell class="pl-5"
                >{$queryResult.data.user.firstName}
                {$queryResult.data.user.lastName}</Table.Cell
              >
              <Table.Cell class="">Leader</Table.Cell>
              <Table.Cell class=""></Table.Cell>
            </Table.Row>
            {#each $queryResult.data.members as member}
              {#if member.id !== $queryResult.data.user.id}
                <Table.Row class="h-14 cursor-pointer">
                  <Table.Cell class="pl-5"
                    >{member.firstName} {member.lastName}</Table.Cell
                  >
                  <Table.Cell class="">Member</Table.Cell>
                  <Table.Cell class="">
                    {#if data.role === 'Mentor' || data.role === 'Manager as Mentor' || data.user.id === $queryResult.data.user_id}
                      <button
                        onclick={() => {
                          open = true;
                          contracted = false;
                          toBeDeletedId = member.id;
                        }}><Trash class="h-4 w-4 text-red-500" /></button
                      >
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {/if}
            {/each}
            {#each $queryResult.data.contracted_members as member, index}
              <Table.Row class="h-14 cursor-pointer">
                <Table.Cell class="pl-5"
                  >{member.first_name} {member.last_name}</Table.Cell
                >
                <Table.Cell class="">Contracted Member</Table.Cell>
                <Table.Cell class="">
                  {#if data.role === 'Mentor' || data.role === 'Manager as Mentor' || data.user.id === $queryResult.data.user_id}
                    <button
                      onclick={() => {
                        open = true;
                        contracted = true;
                        toBeDeletedId = member.id;
                      }}><Trash class="h-4 w-4 text-red-500" /></button
                    >
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </div>
  {/if}
</div>

<!-- Add Member Dialog -->
<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Add Team Member</Dialog.Title>
      <Dialog.Description>
        Search for registered users to add as team members
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <!-- Search Input -->
      <div class="grid gap-2">
        <Label for="searchInput">Search by name or email</Label>
        <div class="relative">
          <Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="searchInput"
            class="pl-9"
            placeholder="Type to search..."
            value={search}
            oninput={(e) => handleSearchInput(e.currentTarget.value)}
          />
        </div>
      </div>

      <!-- Search Results -->
      <div class="max-h-[300px] overflow-y-auto">
        {#if isSearching}
          <div class="flex items-center justify-center py-8">
            <Skeleton class="h-10 w-full" />
          </div>
        {:else if search.length > 0 && searchedUsers.length === 0}
          <div class="py-8 text-center text-sm text-muted-foreground">No users found</div>
        {:else if searchedUsers.length > 0}
          <div class="space-y-2">
            {#each searchedUsers as user}
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div class="flex flex-col">
                  <span class="font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <span class="text-sm text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <Button size="sm" onclick={() => addMember(user.id)}> Add </Button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="py-8 text-center text-sm text-muted-foreground">
            Start typing to search for users
          </div>
        {/if}
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (dialogOpen = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open onOpenChange={() => (open = !open)}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >Are you absolutely sure to remove this member?</AlertDialog.Title
      >
      <AlertDialog.Description>
        This action cannot be undone. This will permanently remove this member in your
        startup.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => (open = false)}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-red-500 hover:bg-red-600"
        onclick={async () => {
          if (contracted) {
            await removeContractedMember(toBeDeletedId!);
          } else {
            await removeMember(toBeDeletedId!);
          }
          open = false;
        }}>Delete</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
