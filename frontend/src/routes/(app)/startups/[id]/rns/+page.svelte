<script lang="ts">
  import {
    KanbanBoardNew,
    MembersFilter,
    ShowHideColumns
  } from '$lib/components/shared';
  import { getData, getColumns, getReadiness } from '$lib/utils';
  import { useQueriesState } from '$lib/stores/useQueriesState.svelte.js';
  import { useQueries } from '@sveltestack/svelte-query';
  import { toast } from 'svelte-sonner';
  import axiosInstance from '$lib/axios.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import {
    RnsCard,
    RnsCreateDialog
  } from '$lib/components/startups/rns/index.js';
  import {
    Kanban,
    TableIcon,
    Loader,
    ChevronDown,
    Sparkles,
    Plus
  } from 'lucide-svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import * as Table from '$lib/components/ui/table';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';

  interface Member {
    userId: number;
    startupId: number;
    firstName: string;
    lastName: string;
    email: string;
    selected: boolean;
  }

  const { data } = $props();
  const { access, startupId } = data;

  const queryArray = [
    {
      queryKey: ['allowRNS', startupId],
      queryFn: () => getData(`/startups/${startupId}/allow-tasks/`, access!)
    },
    {
      queryKey: ['rnsData', startupId],
      queryFn: () => getData(`/rns/?startupId=${startupId}`, access!)
    },
    {
      queryKey: ['readinessData'],
      queryFn: () => getData(`/readinesslevel/readiness-levels/`, access!)
    },
    {
      queryKey: ['startupData', startupId],
      queryFn: () => getData(`/startups/${startupId}`, access!)
    },
    {
      queryKey: ['rnaData', startupId],
      queryFn: () => getData(`/rna/?startupId=${startupId}`, access!)
    }
  ];

  const rnsQueries = useQueries(queryArray);
  const { isLoading, isError } = $derived(useQueriesState(queryArray));
  $rnsQueries[0].refetch();
  const isAccessible = $derived($rnsQueries[0].data);

  const columns = $state(getColumns());
  const readiness = $state(getReadiness());

  const members = $derived(
    $rnsQueries[3].isSuccess
      ? (() => {
          const data = $rnsQueries[3].data;
          const baseMembers: Member[] = data.members.map(
            ({
              id,
              email,
              firstName,
              lastName
            }: {
              id: number;
              email: string;
              firstName: string;
              lastName: string;
            }) => ({
              userId: id,
              startupId: data.id,
              firstName,
              lastName,
              email,
              selected: false
            })
          );

          // Check if user is already in members
          const isUserInMembers = baseMembers.some(
            (member: Member) => member.userId === data.user.id
          );

          if (!isUserInMembers) {
            baseMembers.push({
              userId: data.user.id,
              startupId: data.id,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              email: data.user.email,
              selected: false
            });
          }

          return baseMembers;
        })()
      : []
  );

  const views = $derived(columns);

  let generatingRNS = $state(false);
  let open = $state(false);
  const generateRNSForSelected = async () => {
    if (selectedRNA.length === 0) {
      toast.error('No RNS selected');
      return;
    }

    generatingRNS = true;
    try {
      // First, get all current RNS items
      const currentItems = await axiosInstance.get(
        `/rns/?startupId=${data.startupId}`,
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );

      // Increment priority numbers of all existing items
      const updatePromises = currentItems.data.map((item: any) =>
        axiosInstance.patch(
          `/rns/${item.id}/`,
          { priorityNumber: (item.priorityNumber || 0) + selectedRNA.length },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );

      await Promise.all(updatePromises);

      // Now generate new items with priority numbers starting from 1
      await axiosInstance.post(
        `/rns/generate-tasks/`, // Assuming this endpoint can handle rns_ids
        {
          startup_id: data.startupId,
          rnaIds: selectedRNA, // Pass selected RNS IDs
          no_of_tasks_to_create: 1,
          startPriorityNumber: 1
        },
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );

      await $rnsQueries[1].refetch();
      selectedRNA = []; // Clear selected RNS after generation

      generatingRNS = false;
      toast.success(`Successfully generated RNS`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate RNS');
      generatingRNS = false;
    }
  };

  const addToRNS = async (id: number, payload: any) => {
    const length = columns[0].items.length;
    try {
      const response = await axiosInstance.patch(
        `/rns/${id}/`,
        {
          priorityNumber: length + 1,
          description: payload.description,
          isAiGenerated: false,
          assigneeId: payload.assigneeId,
          readinessType: payload.readinessType,
          targetLevel: payload.targetLevelId
        },
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );
      toast.success('Successfully added to RNS');

      $rnsQueries[1]
        .refetch()
        .then((res) => {
          columns.forEach((column) => {
            const filteredItems = res.data
              .filter(
                (data: any) =>
                  data.isAiGenerated === false &&
                  data.requestedStatus === column.value
              )
              .sort((a: any, b: any) => a.priorityNumber - b.priorityNumber);
            column.items = filteredItems;
          });
        })
        .finally(async () => await updatePriorityNumber());
      goto('rns');
    } catch (error) {
      console.error('Error in addToRNS:', error);
      toast.error('Failed to add to RNS');
    }
  };

  const createRns = async (payload: any) => {
    await axiosInstance.post(
      '/rns',
      {
        ...payload,
        status
      },
      {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      }
    );
    toast.success('Successfully created the RNS');
    open = false;
    $rnsQueries[1]
      .refetch()
      .then((res) => {
        columns.forEach((column) => {
          column.items = res.data
            .filter(
              (data: any) =>
                data.isAiGenerated === false &&
                data.requestedStatus === column.value
            )
            .sort((a: any, b: any) => a.priorityNumber - b.priorityNumber);
        });
      })
      .finally(async () => {
        await updatePriorityNumber();
      });
  };

  const updatedEditRNS = async (
    id: number,
    payload: {
      readinessType: string;
      description: string;
      targetLevelId: number;
      assigneeId: number;
      isAiGenerated: boolean;
      clickedByMentor: boolean;
    },
    showToast: boolean = true
  ) => {
    await axiosInstance.patch(`/rns/${id}/`, payload, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });

    if (showToast) toast.success('Successfully updated the RNS');
    open = false;
    $rnsQueries[1].refetch().then((res) => {
      columns.forEach((column) => {
        column.items = res.data
          .filter(
            (data: any) =>
              data.isAiGenerated === false &&
              data.requestedStatus === column.value
          )
          .sort((a: any, b: any) => a.priorityNumber - b.priorityNumber);
      });
    });
    // goto('rns');
  };

  const deleteRNS = async (id: number, index: number) => {
    try {
      await axiosInstance.delete(`/rns/${id}/`, {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      });
      toast.success('Successfuly deleted a task');
      columns.forEach((column) => {
        column.items = column.items.filter((item: any) => item.id !== id);
      });

      await $rnsQueries[1].refetch();
      await updatePriorityNumber();
    } catch (error) {
      console.error('Error deleting RNS: ', error);
      toast.error('Failed to delete RNS');
    }
  };

  function handleDndConsider(e: CustomEvent<DndEvent<any>>, x: number) {
    columns[x].items = e.detail.items;
  }

  async function handleDndFinalize(
    e: CustomEvent<DndEvent<any>>,
    x: number,
    status: number
  ) {
    columns[x].items = e.detail.items;
    if (e.detail.info.trigger === 'droppedIntoZone') {
      const task = e.detail.items.find((t: any) => t.id == e.detail.info.id);
      if (task) {
        await axiosInstance.patch(
          `/rns/${task.id}/roleDependent?role=${data.role}`,
          {
            status
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        );
      }

      updatePriorityNumber();
      $rnsQueries[1].refetch();
      // setTimeout(() => $rnsQueries[1].refetch(), 250);
    }
  }

  const updatePriorityNumber = async () => {
    const updatePromises: any = [];

    let counter = 1;

    columns.forEach((column) => {
      column.items.forEach((item: any) => {
        item.priorityNumber = counter;
        updatePromises.push(
          axiosInstance.patch(
            `/rns/${item.id}/`,
            { priorityNumber: counter },
            { headers: { Authorization: `Bearer ${data.access}` } }
          )
        );
        counter++;
      });
    });

    try {
      await Promise.all(updatePromises);
    } catch (error) {
      $rnsQueries[1].refetch();
      toast.error('Error updating');
      console.error('Failed to update tasks', error);
    }
  };

  $effect(() => {
    if (
      !isLoading &&
      $rnsQueries[1].isSuccess &&
      Array.isArray($rnsQueries[1].data)
    ) {
      columns.forEach((column) => {
        column.items = $rnsQueries[1].data
          ? $rnsQueries[1].data
              .filter(
                (data: any) =>
                  data.isAiGenerated === false &&
                  data.requestedStatus === column.value
              )
              .sort((a: any, b: any) => a.priorityNumber - b.priorityNumber)
          : [];
      });
    }

    if ($rnsQueries[1].data && $rnsQueries[4].data)
      selectedRNA = $rnsQueries[4].data
        .filter(
          (rna: any) =>
            !$rnsQueries[1].data.some(
              (rns: any) =>
                rns.readinessType === rna.readinessLevel.readinessType
            )
        )
        .map((rna: any) => rna.id);
  });

  const onOpenChange = () => {
    open = !open;
  };

  const showDialog = () => {
    open = true;
  };

  let status = $state(1);

  const updateStatus = (newStatus: number) => {
    status = newStatus;
  };
  const selectedMembers: any = $state([]);

  const toggleMemberSelection = (index: number) => {
    if (index === 999) {
      const userIndex = selectedMembers.indexOf(999);
      if (userIndex !== -1) {
        selectedMembers.splice(userIndex, 1);
      } else {
        selectedMembers.push(index);
      }
    } else {
      const userId = members[index].userId;
      const userIndex = selectedMembers.indexOf(userId);

      if (userIndex !== -1) {
        selectedMembers.splice(userIndex, 1);
      } else {
        selectedMembers.push(userId);
      }
    }
  };

  let selectedFormat = $state('board');

  let taskType = $state(3);

  const updateTaskType = (newType: number) => {
    taskType = newType;
  };

  let selectedRNA: number[] = $state([]);

  const toggleRNSSelection = (id: number) => {
    const index = selectedRNA.indexOf(id);
    if (index !== -1) {
      selectedRNA.splice(index, 1);
    } else {
      selectedRNA.push(id);
    }
  };
</script>

{#if isLoading}
  {@render loading()}
{:else if isError}
  {@render error()}
{:else if isAccessible}
  {@render accessible()}
{:else}
  {@render loading()}
  <!-- {@render fallback()} -->
{/if}

<svelte:head>
  <title
    >{$rnsQueries[3].isSuccess
      ? `${$rnsQueries[3].data.name} - Recommended Next Steps`
      : 'Loading'}</title
  >
</svelte:head>

<RnsCreateDialog
  {open}
  {onOpenChange}
  create={createRns}
  {startupId}
  {members}
  {status}
/>

{#snippet card(rns: any, ai = false, index: number)}
  <RnsCard
    {rns}
    {members}
    update={updatedEditRNS}
    {ai}
    addToRns={addToRNS}
    deleteRns={deleteRNS}
    {index}
    role={data.role}
  />
{/snippet}

{#snippet loading()}
  <div class="flex h-full flex-col gap-3">
    <div class="flex justify-between">
      <div class="flex gap-3">
        <div class="bg-background" class:hidden={data.role === 'Startup'}>
          <Skeleton class="h-9 w-[126px]" />
        </div>
        <div class="bg-background">
          <Skeleton class="h-9 w-[170px]" />
        </div>
        <div class="flex">
          {#each [1, 2] as item, index}
            <Skeleton
              class={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-background ${
                index !== 2 - 1 ? '-mr-1' : ''
              } `}
            >
              <span>?</span>
            </Skeleton>
          {/each}
        </div>
      </div>
      <div class="ml-auto bg-background">
        <Skeleton class="h-9 w-[90px]" />
      </div>
    </div>

    <div class="grid h-full grid-cols-4 gap-5">
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
    </div>
  </div>
{/snippet}

{#snippet error()}{/snippet}

{#snippet accessible()}
  <div class="flex items-center justify-between">
    <div class="flex gap-3">
      <div class="flex h-fit justify-between rounded-lg bg-background">
        <Tabs.Root value={selectedFormat}>
          <Tabs.List class="border">
            <Tabs.Trigger
              class="flex items-center gap-1"
              value="board"
              onclick={() => (selectedFormat = 'board')}
            >
              <Kanban class="h-4 w-4" />
              Board</Tabs.Trigger
            >
            <Tabs.Trigger
              class="flex items-center gap-1"
              value="table"
              onclick={() => (selectedFormat = 'table')}
            >
              <TableIcon class="h-4 w-4" />
              Table</Tabs.Trigger
            >
          </Tabs.List>
        </Tabs.Root>
      </div>
      <MembersFilter {members} {toggleMemberSelection} {selectedMembers} />
    </div>
    <div class="flex items-center gap-4">
      {#if selectedFormat !== 'table'}
        <ShowHideColumns {views} />
      {/if}
      {#if data.role !== 'Startup'}
        <Button
          class="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onclick={() => showDialog()}
        >
          <Plus class="h-4 w-4" />

          Add
        </Button>
        <div class="flex gap-1">
          <Button
            class="hover:bg-primary/90 flex items-center gap-2 rounded-br-none rounded-tr-none bg-primary px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={generatingRNS}
            onclick={() => generateRNSForSelected()}
          >
            {#if generatingRNS}
              <Loader class="mr-2 h-4 w-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="h-4 w-4" />Generate
            {/if}
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button
                class="border-primary/20 hover:bg-primary/90 rounded-bl-none rounded-tl-none border-l bg-primary px-2 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={generatingRNS}
              >
                <ChevronDown class="h-4 w-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="end"
              class="max-h-[300px] w-[300px] overflow-y-auto"
            >
              <DropdownMenu.Group class="space-y-1">
                {#each $rnsQueries[4].data as rna}
                  <div
                    class="cursor-pointer px-2 py-1.5 hover:bg-accent {$rnsQueries[1].data.some(
                      (rns: any) =>
                        rns.readinessType === rna.readinessLevel.readinessType
                    )
                      ? 'opacity-50'
                      : ''}"
                    on:click|stopPropagation={() => toggleRNSSelection(rna.id)}
                    on:keydown|stopPropagation
                  >
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRNA.includes(rna.id)}
                        class="h-4 w-4"
                      />
                      <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-2">
                          <span class="font-medium"
                            >{rna.readinessLevel.readinessType}</span
                          >
                          {#if $rnsQueries[1].data.some((rns: any) => rns.readinessType === rna.readinessLevel.readinessType)}
                            <span class="text-xs text-muted-foreground"
                              >(Has RNS)</span
                            >
                          {/if}
                        </div>
                        <span
                          class="line-clamp-2 text-xs text-muted-foreground"
                        >
                          {rna.rna.substring(0, 50) + '...'}
                        </span>
                      </div>
                    </div>
                  </div>
                {/each}
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/if}
    </div>
  </div>
  <div class="block w-full">
    {#if selectedFormat === 'board'}
      <KanbanBoardNew
        {columns}
        {handleDndFinalize}
        {handleDndConsider}
        {card}
        {showDialog}
        role={data.role}
        {updateStatus}
        {selectedMembers}
        {taskType}
      />
    {:else}
      <div class="h-fit w-full rounded-md border">
        <Table.Root class="rounded-lg bg-background">
          <Table.Header>
            <Table.Row class="text-centery h-12">
              <Table.Head class="pl-5">Type</Table.Head>
              <Table.Head class="">Description</Table.Head>
              <Table.Head class="">Target Level</Table.Head>
              <Table.Head class="">Term</Table.Head>
              <Table.Head class="">Assignee</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each $rnsQueries[1].data.filter((data: any) => data.isAiGenerated === false) as item}
              {#if selectedMembers.includes(item.assignee.id) || selectedMembers.length === 0}
                <Table.Row class="h-14 cursor-pointer">
                  <Table.Cell class="pl-5">{item.readinessType}</Table.Cell>
                  <Table.Cell class=""
                    >{item.description.substring(0, 100)}</Table.Cell
                  >
                  <Table.Cell class="">{item.targetLevelScore}</Table.Cell>
                  <Table.Cell class=""
                    ><Badge
                      class={`${item.status !== 7 ? 'bg-gray-700 hover:bg-gray-800' : 'bg-rose-700 hover:bg-rose-800'}`}
                      >{item.status !== 7 ? 'Short' : 'Long'} Term</Badge
                    ></Table.Cell
                  >
                  <Table.Cell class=""
                    >{members.filter(
                      (member: any) => member.userId === item.assignee.id
                    )[0]?.firstName}
                    {members.filter(
                      (member: any) => member.userId === item.assignee.id
                    )[0]?.lastName}</Table.Cell
                  >
                </Table.Row>
              {/if}
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet fallback()}
  <!-- TODO: TEMP FIX RANI -->

  <div class="flex h-full flex-col gap-3">
    <div class="flex justify-between">
      <div class="flex gap-3">
        <div class="bg-background" class:hidden={data.role === 'Startup'}>
          <Skeleton class="h-9 w-[126px]" />
        </div>
        <div class="bg-background">
          <Skeleton class="h-9 w-[170px]" />
        </div>
        <div class="flex">
          {#each [1, 2] as item, index}
            <Skeleton
              class={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-background ${
                index !== 2 - 1 ? '-mr-1' : ''
              } `}
            >
              <span>?</span>
            </Skeleton>
          {/each}
        </div>
      </div>
      <div class="ml-auto bg-background">
        <Skeleton class="h-9 w-[90px]" />
      </div>
    </div>

    <div class="grid h-full grid-cols-4 gap-5">
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-full" />
      </div>
    </div>
  </div>
{/snippet}
