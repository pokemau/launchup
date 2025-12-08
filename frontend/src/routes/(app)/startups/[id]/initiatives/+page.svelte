<script lang="ts">
  import {
    AIColumn,
    AITabs,
    Can,
    Column,
    KanbanBoardNew,
    MembersFilter,
    ShowHideColumns
  } from '$lib/components/shared';
  import {
    getData,
    getColumns,
    getReadiness,
    getSavedTab,
    getSelectedTab,
    updateTab
  } from '$lib/utils';
  import { useQueriesState } from '$lib/stores/useQueriesState.svelte.js';
  import { useQueries } from '@sveltestack/svelte-query';
  import { page } from '$app/stores';
  import * as Card from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import axiosInstance from '$lib/axios';
  import axios from 'axios';
  import { toast } from 'svelte-sonner';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import {
    InitiativeCard,
    InitiativeCreateDialog
  } from '$lib/components/startups/initiatives';
  import {
    Ellipsis,
    Kanban,
    TableIcon,
    Loader,
    Sparkles,
    Plus
  } from 'lucide-svelte';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import * as Table from '$lib/components/ui/table';
  import HoveredRNSCard from '$lib/components/shared/hovered-rns-card.svelte';
  import { ChevronDown } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';


  let dropdownOpen = $state(false);

  const { data } = $props();
  const { access, startupId } = data;
  const initiativesQueries = useQueries([
    {
      queryKey: ['allowRNS', startupId],
      queryFn: () =>
        getData(`/startups/${startupId}/allow-initiatives/`, access!)
    },
    {
      queryKey: ['rnsDataInitiative', startupId],
      queryFn: () => getData(`/rns?startupId=${startupId}`, access!)
    },
    {
      queryKey: ['initiativesData', startupId],
      queryFn: () => getData(`/initiatives/?startupId=${startupId}`, access!)
    },
    {
      queryKey: ['startupData', startupId],
      queryFn: () => getData(`/startups/${startupId}`, access!)
    }
  ]);

  const { isLoading, isError } = $derived(useQueriesState($initiativesQueries));
  $initiativesQueries[0].refetch();
  const isAccessible = $derived($initiativesQueries[0].data);
  let selectedTab = $state(getSelectedTab('initiatives'));

  const updateInitiativeTab = (tab: string) => {
    selectedTab = updateTab('initiatives', tab);
  };

  const columns = $state(getColumns());
  const readiness = $state(getReadiness());
  const views = $derived(selectedTab === 'initiatives' ? columns : readiness);

  interface Member {
    userId: number;
    startupId: number;
    firstName: string;
    lastName: string;
    email: string;
    selected: boolean;
  }

  interface RNSTask {
    id: number;
    priorityNumber: number;
    description: string;
    hasInitiatives: boolean;
    readinessType: string;
    isAiGenerated: boolean;
    status: number;
  }

  const members = $derived(
    $initiativesQueries[3].isSuccess
      ? (() => {
          const data = $initiativesQueries[3].data;
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

  $initiativesQueries[1].refetch();
  const tasks = $derived(
    $initiativesQueries[1].isSuccess
      ? ($initiativesQueries[1].data as RNSTask[])
      : []
  );

  let status = $state(1);
  let selectedFormat = $state('board');
  const selectedMembers: any = $state([]);

  $effect(() => {
    // Handle URL params and column data
    const searchParam = $page.url.searchParams.get('tab');
    selectedTab = getSavedTab('initiatives', searchParam);

    if (!isLoading && $initiativesQueries[2].isSuccess) {
      columns.forEach((column) => {
        column.items = $initiativesQueries[2].data
          .filter(
            (data: any) =>
              data.isAiGenerated === false &&
              data.requestedStatus === column.value
          )
          .sort((a: any, b: any) => a.initiativeNumber - b.initiativeNumber);
      });
    }

    // Handle RNS task selection
    if ($initiativesQueries[1].isSuccess && $initiativesQueries[2].isSuccess) {
      // Get all RNS IDs that already have initiatives
      const rnsWithInitiatives = new Set(
        $initiativesQueries[2].data.map((initiative: any) => initiative.rns)
      );

      selectedRNS = tasks
        .filter((task) => !rnsWithInitiatives.has(task.id) && task.status !== 7)
        .map((task) => task.id);
    }
  });

  const createInitiative = async (payload: any) => {
    // Increment existing priority numbers
    const currentItems = await axiosInstance.get(
      `/initiatives/?startupId=${startupId}`,
      {
        headers: { Authorization: `Bearer ${access}` }
      }
    );
    const updatePromises = currentItems.data.map((item: any) =>
      axiosInstance.patch(
        `/initiatives/${item.id}/`,
        {
          priorityNumber: (item.priorityNumber || 0) + 1
        },
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      )
    );
    await Promise.all(updatePromises);

    await axiosInstance.post(
      '/initiatives/',
      {
        ...payload,
        priorityNumber: 1
      },
      {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      }
    );
    toast.success('Successfully created the Initiative');
    open = false;

    $initiativesQueries[2]
      .refetch()
      .then((res) => {
        columns.forEach((column) => {
          column.items = res.data.filter(
            (data: any) =>
              data.isAiGenerated === false &&
              data.requestedStatus === column.value
          );
        });
      })
      .finally(async () => await updateInitiativeNumber());
  };

  const deleteInitiative = async (id: number) => {
    await axiosInstance.delete(`/initiatives/${id}/`, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });
    toast.success('Successfuly deleted a task');

    $initiativesQueries[2]
      .refetch()
      .then((res) => {
        columns.forEach((column) => {
          column.items = res.data.filter(
            (data: any) =>
              data.isAiGenerated === false &&
              data.requestedStatus === column.value
          );
        });
      })
      .finally(async () => await updateInitiativeNumber());
  };

  const updatedEditInitiative = async (
    id: number,
    payload: any,
    showToast: boolean = true
  ) => {
    await axiosInstance.patch(`/initiatives/${id}/`, payload, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });
    if (showToast) toast.success('Successfuly updated Initiatives');
    $initiativesQueries[1].refetch();
    $initiativesQueries[2].refetch();

    updateInitiativeNumber();
  };

  function handleDndConsider(e: any, x: number) {
    columns[x].items = e.detail.items;
  }

  async function handleDndFinalize(e: any, x: number, status: number) {
    columns[x].items = e.detail.items;
    if (e.detail.info.trigger == 'droppedIntoZone') {
      const task = e.detail.items.find((t: any) => t.id == e.detail.info.id);
      await axiosInstance.patch(
        `/initiatives/${task.id}/roleDependent?role=${data.role}`,
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

    updateInitiativeNumber();
    $initiativesQueries[1].refetch();
    $initiativesQueries[2].refetch();
  }

  const updateInitiativeNumber = async () => {
    const updatePromises: any = [];

    let taskIds: any = [];
    let counters: any = [];
    // Completed
    columns[0].items.map((item: any) => {
      let indexOf = taskIds.indexOf(item.rns);

      if (indexOf === -1) {
        // New taskId, initialize it
        taskIds.push(item.rns);
        counters.push(1); // Start counter at 1
        indexOf = taskIds.length - 1; // Get the last index
      }

      const initiativeNumber = counters[indexOf]; // Get the current counter value
      item.initiativeNumber = initiativeNumber;

      updatePromises.push(
        axiosInstance.patch(
          `/initiatives/${item.id}/`,
          {
            initiativeNumber: initiativeNumber
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );

      counters[indexOf] += 1;
    });
    // Delayed
    columns[1].items.map((item: any) => {
      let indexOf = taskIds.indexOf(item.rns);

      if (indexOf === -1) {
        // New taskId, initialize it
        taskIds.push(item.rns);
        counters.push(1); // Start counter at 1
        indexOf = taskIds.length - 1; // Get the last index
      }

      const initiativeNumber = counters[indexOf]; // Get the current counter value
      item.initiativeNumber = initiativeNumber;

      updatePromises.push(
        axiosInstance.patch(
          `/initiatives/${item.id}/`,
          {
            initiativeNumber: initiativeNumber
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );

      counters[indexOf] += 1;
    });
    // Track
    columns[2].items.map((item: any) => {
      let indexOf = taskIds.indexOf(item.rns);

      if (indexOf === -1) {
        // New taskId, initialize it
        taskIds.push(item.rns);
        counters.push(1); // Start counter at 1
        indexOf = taskIds.length - 1; // Get the last index
      }

      const initiativeNumber = counters[indexOf]; // Get the current counter value
      item.initiativeNumber = initiativeNumber;

      updatePromises.push(
        axiosInstance.patch(
          `/initiatives/${item.id}/`,
          {
            initiativeNumber: initiativeNumber
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );

      counters[indexOf] += 1;
    });
    // Scheduled
    columns[3].items.map((item: any) => {
      let indexOf = taskIds.indexOf(item.rns);

      if (indexOf === -1) {
        // New taskId, initialize it
        taskIds.push(item.rns);
        counters.push(1); // Start counter at 1
        indexOf = taskIds.length - 1; // Get the last index
      }

      const initiativeNumber = counters[indexOf]; // Get the current counter value
      item.initiativeNumber = initiativeNumber;

      updatePromises.push(
        axiosInstance.patch(
          `/initiatives/${item.id}/`,
          {
            initiativeNumber: initiativeNumber
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );

      counters[indexOf] += 1;
    });
    // Discontinued
    columns[4].items.map((item: any) => {
      let indexOf = taskIds.indexOf(item.rns);

      if (indexOf === -1) {
        // New taskId, initialize it
        taskIds.push(item.rns);
        counters.push(1); // Start counter at 1
        indexOf = taskIds.length - 1; // Get the last index
      }

      const initiativeNumber = counters[indexOf]; // Get the current counter value
      item.initiativeNumber = initiativeNumber;

      updatePromises.push(
        axiosInstance.patch(
          `/initiatives/${item.id}/`,
          {
            initiativeNumber: initiativeNumber
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );

      counters[indexOf] += 1;
    });

    try {
      // Execute all update requests concurrently
      await Promise.all(updatePromises);
      // $rnsQueries[1].refetch();
    } catch (error) {
      $initiativesQueries[1].refetch();
      toast.error('Error updating');
      console.error('Failed to update tasks', error);
    }
  };

  const addToInitiatives = async (id: number, payload: any) => {
    await axiosInstance.patch(
      `/initiatives/${id}/`,
      {
        ...payload,
        status: 1,
        isAiGenerated: false
      },
      {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      }
    );
    toast.success('Successfuly added to Initiatives');
    $initiativesQueries[1].refetch().then(() => {
      $initiativesQueries[2]
        .refetch()
        .then((res) => {
          columns.forEach((column) => {
            column.items = res.data.filter(
              (data: any) =>
                data.isAiGenerated === false &&
                data.requestedStatus === column.value
            );
          });
        })
        .finally(async () => await updateInitiativeNumber());
    });
  };

  let generatingInitiatives = $state(false);
  let generatingType = 'Technology';
  let open = $state(false);

  const showDialog = () => {
    open = true;
  };

  const onOpenChange = () => {
    open = !open;
  };

  const updateStatus = (newStatus: number) => {
    status = newStatus;
  };

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

  let selectedRNS: number[] = $state([]);

  const toggleRNSSelection = (id: number) => {
    const index = selectedRNS.indexOf(id);
    if (index !== -1) {
      selectedRNS.splice(index, 1);
    } else {
      selectedRNS.push(id);
    }
  };

  const generateInitiativesForSelected = async () => {
    if (selectedRNS.length === 0) {
      toast.error('No RNS selected');
      return;
    }

    generatingInitiatives = true;
    try {
      // First, get all current initiatives
      const currentItems = await axiosInstance.get(
        `/initiatives/?startupId=${startupId}`,
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );

      // Increment priority numbers of all existing items so that new initiatives will be at the top of the column
      const updatePromises = currentItems.data.map((item: any) =>
        axiosInstance.patch(
          `/initiatives/${item.id}/`,
          { priorityNumber: (item.priorityNumber || 0) + selectedRNS.length }, // Increment by number of new items
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );

      await Promise.all(updatePromises);

      // Generate new initiatives with priority numbers starting from 1
      await axiosInstance.post(
        `/initiatives/generate-initiatives/`,
        {
          rnsIds: selectedRNS,
          no_of_initiatives_to_create: 1,
          startPriorityNumber: 1
        },
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );

      await Promise.all([
        $initiativesQueries[1].refetch(),
        $initiativesQueries[2].refetch()
      ]);

      // // Mark all new initiatives
      // const newInitiatives = columns[0].items.filter(item => !item.isNew);
      // for (const initiative of newInitiatives) {
      //   await axiosInstance.patch(
      //     `/initiatives/${initiative.id}/`,
      //     { isNew: true },
      //     {
      //       headers: {
      //         Authorization: `Bearer ${data.access}`
      //       }
      //     }
      //   );
      // }

      // selectedRNS = [];
      toast.success('Successfully generated initiatives for selected RNS');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to generate initiatives'
      );
    } finally {
      generatingInitiatives = false;
    }
  };
</script>

<svelte:head>
  <title
    >{$initiativesQueries[3].isSuccess
      ? `${$initiativesQueries[3].data.name} - Initiatives`
      : 'Loading'}</title
  >
</svelte:head>
{#if isLoading}
  {@render loading()}
{:else if isError}
  {@render error()}
{:else if isAccessible}
  {@render accessible()}
{:else}
  {@render fallback()}
{/if}

<HoveredRNSCard />

<InitiativeCreateDialog
  {open}
  {onOpenChange}
  {members}
  {startupId}
  create={createInitiative}
  {tasks}
  {status}
/>

{#snippet card(initiative: any, ai: any = false, index: number)}
  <InitiativeCard
    {initiative}
    {ai}
    {members}
    update={updatedEditInitiative}
    {deleteInitiative}
    addToInitiative={addToInitiatives}
    role={data.role}
    {tasks}
    {index}
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
              ?
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
          <Tabs.List class="border bg-flutter-gray/20">
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
      {#if selectedFormat === 'board'}
        <ShowHideColumns {views} />
      {/if}
      {#if data.role !== 'Startup'}
        <Button
          class="rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onclick={() => showDialog()}
        >
          <Plus class="h-4 w-4" />
          Add
        </Button>
        <div class="flex gap-1">
          <Button
            class="rounded-br-none rounded-tr-none border-l border-primary/20 bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={generatingInitiatives}
            onclick={() => generateInitiativesForSelected()}
          >
            {#if generatingInitiatives}
              <Loader class="mr-2 h-4 w-4 animate-spin" />
              Generating...
            {:else}
              <Sparkles class="h-4 w-4" />Generate
            {/if}
          </Button>
          <DropdownMenu.Root bind:open={dropdownOpen}>
            <DropdownMenu.Trigger>
              <Button
                class="rounded-bl-none rounded-tl-none border-l border-primary/20 bg-primary px-2 py-2 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={generatingInitiatives}
              >
                <ChevronDown class="h-4 w-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="end"
              class="max-h-[300px] w-[300px] overflow-y-auto"
              closeOnItemClick={false}
            >
              <DropdownMenu.Group class="space-y-1">
                {#each tasks
                  .filter((task) => task.status !== 7)
                  .sort((a, b) => a.priorityNumber - b.priorityNumber) as task}
                  <div
                    class="cursor-pointer px-2 py-1.5 hover:bg-accent {$initiativesQueries[2].data?.some(
                      (i: any) => i.rns === task.id
                    )
                      ? 'opacity-50'
                      : ''}"
                    on:click|stopPropagation={() => toggleRNSSelection(task.id)}
                    on:keydown|stopPropagation
                  >
                    <div class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRNS.includes(task.id)}
                        class="h-4 w-4"
                      />
                      <div class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-2">
                          <span class="font-medium"
                            >RNS #{task.priorityNumber}</span
                          >
                          {#if $initiativesQueries[2].data?.some((i: any) => i.rns === task.id)}
                            <span class="text-xs text-muted-foreground"
                              >(Has initiatives)</span
                            >
                          {/if}
                        </div>
                        <span
                          class="line-clamp-2 text-xs text-muted-foreground"
                        >
                          {task.description}
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
      />
    {:else}
      <div class="h-fit w-full rounded-md border">
        <Table.Root class="rounded-lg bg-background">
          <Table.Header>
            <Table.Row class="text-centery h-12">
              <Table.Head class="pl-5">Description</Table.Head>
              <Table.Head class="">Priority No.</Table.Head>
              <Table.Head class="">Initiative No.</Table.Head>
              <Table.Head class="">Assignee</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each $initiativesQueries[2].data.filter((item: RNSTask) => item.isAiGenerated === false) as item}
              {#if selectedMembers.includes(item.assignee) || selectedMembers.length === 0}
                <Table.Row class="h-14 cursor-pointer">
                  <Table.Cell class="pl-5"
                    >{item.description.substring(0, 100)}</Table.Cell
                  >
                  <Table.Cell class="">
                    {tasks.filter((task: RNSTask) => task.id === item.rns)[0]
                      ?.priorityNumber}
                  </Table.Cell>
                  <Table.Cell class="">{item?.initiativeNumber}</Table.Cell>
                  <Table.Cell class="">
                    {members.filter(
                      (member: Member) => member.userId === item.assignee
                    )[0]?.firstName}
                    {members.filter(
                      (member: Member) => member.userId === item.assignee
                    )[0]?.lastName}
                  </Table.Cell>
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
  <div class="text-2xl font-bold mt-10 text-center">
    {#if data.role === 'Startup'}
      Your mentor has not yet created Readiness and Needs Assessments.
    {:else if data.role === 'Mentor'}
      Please create Readiness and Needs Assessments for your startup.
    {:else}
      Something went wrong...
    {/if}
  </div>
{/snippet}
