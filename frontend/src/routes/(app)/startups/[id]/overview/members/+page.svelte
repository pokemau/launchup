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
  import { Plus, Search, Trash } from 'lucide-svelte';
  import { PUBLIC_API_URL } from '$env/static/public';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import { toast } from 'svelte-sonner';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

  export let data: PageData;
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

  let search: string;
  let searchedUsers: any[] = [];

  async function searchUsers() {
    const response = await fetch(
      `${PUBLIC_API_URL}/users/search?search=${search}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      }
    );
    const d = await response.json();
    if (response.ok) {
      const membersSet = new Set($queryResult.data.members.map((member: any) => member.id));
      searchedUsers = d.filter((user: any) => !membersSet.has(user.id));
      search = '';
    }
  }

  async function addMember(userId: any) {
    const { data } = await axiosInstance.post(
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

    if (data) {
      toast.success('Successfully added a member');
      $queryResult.refetch();
    }
  }

  let firstName: string, lastName: string;

  async function addContractedMember(first: string, last: string) {
    const { data } = await axiosInstance.post(
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

    if (data) {
      toast.success('Successfully added contracted member');
      firstName = '';
      lastName = '';
      $queryResult.refetch();
    }
  }

  async function removeMember(memberId: number) {
    // const res = await axiosInstance.delete(`/startup-members/${memberId}/`, {
    const res = await axiosInstance.delete(
      `/startups/remove-member/${memberId}/`,
      {
        headers: {
          Authorization: `Bearer ${access}`
        },
        data: {
          startupId
        }
      }
    );

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

  let outsideMember = false;
  let open = false;
  let toBeDeletedId = null;
  let contracted = false;
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
          <div class="grid flex-1 gap-2">
            <Label for="email">Email</Label>
            <Input
              name="email"
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              bind:value={search}
            />
          </div>
          <Button class="w-24" onclick={searchUsers}
            ><Search class="h-4 w-4" /> Search</Button
          >
        </div>
        {#if searchedUsers.length !== 0}
          <div class="text-sm">Results</div>
          {#each searchedUsers as user}
            <div>
              {user.firstName}
              {user.lastName}

              <Button onclick={() => addMember(user.id)}>Add</Button>
            </div>
          {/each}
        {/if}
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
<AlertDialog.Root bind:open onOpenChange={() => (open = !open)}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title
        >Are you absolutely sure to remove this member?</AlertDialog.Title
      >
      <AlertDialog.Description>
        This action cannot be undone. This will permanently remove this member
        in your startup.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => (open = false)}
        >Cancel</AlertDialog.Cancel
      >
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
