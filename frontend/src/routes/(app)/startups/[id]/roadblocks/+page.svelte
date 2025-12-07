<script lang="ts">
  import {
    // AIColumn,
    // AITabs,
    Can,
    Column,
    KanbanBoard,
    KanbanBoardNew,
    MembersFilter,
    ShowHideColumns
  } from '$lib/components/shared';
  import {
    getData,
    getColumns,
    getSavedTab,
    getSelectedTab,
    updateTab
    // getReadiness
  } from '$lib/utils';
  import { useQueriesState } from '$lib/stores/useQueriesState.svelte.js';
  import { useQueries } from '@sveltestack/svelte-query';
  import * as Card from '$lib/components/ui/card';
  import { page } from '$app/stores';
  import axiosInstance from '$lib/axios.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { toast } from 'svelte-sonner';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { RoadblocksCard } from '$lib/components/startups/roadblocks';
  import { RoadblocksCreateDialog } from '$lib/components/startups/roadblocks';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import {
    Ellipsis,
    Kanban,
    Loader,
    Sparkles,
    TableIcon,
    ChevronDown,
    Check,
    Plus
  } from 'lucide-svelte';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';

  interface Member {
    userId: number;
    startupId: number;
    firstName: string;
    lastName: string;
    email: string;
    selected: boolean;
  }

  interface Roadblock {
    id: number;
    description: string;
    fix: string;
    isAiGenerated: boolean;
    status: number;
    requestedStatus: number;
    riskNumber: number;
    assignee: number;
  }

  const { data } = $props();
  const { access, startupId } = data;

  const roadblocksQueries = useQueries([
    {
      queryKey: ['allowRoadblocks', startupId],
      queryFn: () =>
        getData(`/startups/${startupId}/allow-roadblocks/`, access!)
    },
    {
      queryKey: ['roadblocksData', startupId],
      queryFn: () => getData(`/roadblocks/?startupId=${startupId}`, access!)
    },
    {
      queryKey: ['startupData', startupId],
      queryFn: () => getData(`/startups/${startupId}`, access!)
    }
  ]);

  const { isLoading, isError } = $derived(useQueriesState($roadblocksQueries));
  const isAccessible = $derived($roadblocksQueries[0].data);

  const columns = $state(getColumns());
  const members = $derived(
    $roadblocksQueries[2].isSuccess
      ? (() => {
          const data = $roadblocksQueries[2].data;
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

  let numToGenerate = $state(3);

  $effect(() => {
    if ($roadblocksQueries[1].isSuccess) {
      const roadblocksCount = ($roadblocksQueries[1].data as Roadblock[])
        .length;
      if (roadblocksCount >= 3) {
        numToGenerate = 1;
      } else if (roadblocksCount >= 1) {
        numToGenerate = 2;
      } else {
        numToGenerate = 3;
      }
    }

    if (!isLoading) {
      columns.forEach((column) => {
        column.items = ($roadblocksQueries[1].data as Roadblock[]).filter(
          (data: Roadblock) => data.requestedStatus === column.value
        );
      });
    }
  });

  const updatedEditRoadblock = async (
    id: number,
    payload: any,
    showToast: boolean = true
  ) => {
    await axiosInstance.patch(`/roadblocks/${id}/`, payload, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });

    if (showToast) toast.success('Successfuly updated the RNA');
    $roadblocksQueries[1].refetch().then((res) => {
      columns.forEach((column) => {
        column.items = (res.data as Roadblock[]).filter(
          (data: Roadblock) => data.requestedStatus === column.value
        );
      });
    });
    $roadblocksQueries[2].refetch();
    updateRiskNumber();
  };

  const deleteRoadblock = async (id: number) => {
    await axiosInstance.delete(`/roadblocks/${id}/`, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });
    toast.success('Successfuly deleted a task');
    $roadblocksQueries[1]
      .refetch()
      .then((res) => {
        columns.forEach((column) => {
          column.items = (res.data as Roadblock[]).filter(
            (data: Roadblock) => data.requestedStatus === column.value
          );
        });
      })
      .finally(async () => await updateRiskNumber());
    $roadblocksQueries[2].refetch();
  };

  function handleDndConsider(e: any, x: number) {
    columns[x].items = e.detail.items;
  }

  async function handleDndFinalize(e: any, x: number, status: number) {
    columns[x].items = e.detail.items;
    if (e.detail.info.trigger == 'droppedIntoZone') {
      const task = e.detail.items.find((t: any) => t.id == e.detail.info.id);
      await axiosInstance.patch(
        `/roadblocks/${task.id}/roleDependent?role=${data.role}`,
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

    updateRiskNumber();
    $roadblocksQueries[1].refetch();
    $roadblocksQueries[2].refetch();
  }

  const updateRiskNumber = async () => {
    const updatePromises: any = [];

    let counter = 1;
    // Completed
    columns[0].items.map((item: any) => {
      item.riskNumber = counter;
      updatePromises.push(
        axiosInstance.patch(
          `/roadblocks/${item.id}/`,
          {
            riskNumber: counter
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );
      counter++;
    });
    // Delayed
    columns[1].items.map((item: any) => {
      item.riskNumber = counter;
      updatePromises.push(
        axiosInstance.patch(
          `/roadblocks/${item.id}/`,
          {
            riskNumber: counter
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );
      counter++;
    });
    // Track
    columns[2].items.map((item: any) => {
      item.riskNumber = counter;
      updatePromises.push(
        axiosInstance.patch(
          `/roadblocks/${item.id}/`,
          {
            riskNumber: counter
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );
      counter++;
    });
    // Scheduled
    columns[3].items.map((item: any) => {
      item.riskNumber = counter;
      updatePromises.push(
        axiosInstance.patch(
          `/roadblocks/${item.id}/`,
          {
            riskNumber: counter
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );
      counter++;
    });
    // Discontinued
    columns[4].items.map((item: any) => {
      item.riskNumber = counter;
      updatePromises.push(
        axiosInstance.patch(
          `/roadblocks/${item.id}/`,
          {
            riskNumber: counter
          },
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      );
      counter++;
    });

    try {
      // Execute all update requests concurrently
      await Promise.all(updatePromises);
    } catch (error) {
      $roadblocksQueries[1].refetch();
      toast.error('Error updating');
      console.error('Failed to update tasks', error);
    }
  };

  let generatingRoadblocks: boolean = $state(false);
  let open = $state(false);

  const showDialog = () => {
    open = true;
  };

  const onOpenChange = () => {
    open = !open;
  };

  const createRoadblock = async (payload: any) => {
    // Increment existing risk numbers
    const currentItems = await axiosInstance.get(
      `/roadblocks/?startupId=${startupId}`,
      {
        headers: { Authorization: `Bearer ${access}` }
      }
    );
    const updatePromises = currentItems.data.map((item: any) =>
      axiosInstance.patch(
        `/roadblocks/${item.id}/`,
        {
          riskNumber: (item.riskNumber || 0) + 1
        },
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      )
    );
    await Promise.all(updatePromises);

    await axiosInstance.post(
      '/roadblocks/',
      {
        ...payload,
        riskNumber: 1,
        status: 1
      },
      {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      }
    );
    toast.success('Successfully created the Roadblock');
    open = false;
    $roadblocksQueries[1]
      .refetch()
      .then((res) => {
        columns.forEach((column) => {
          column.items = (res.data as Roadblock[])
            .filter((data: Roadblock) => data.status === column.value)
            .sort((a: any, b: any) => b.riskNumber - a.riskNumber);
        });
      })
      .finally(async () => {
        await updateRiskNumber();
      });
  };

  const generateRoadblocks = async (count: number) => {
    generatingRoadblocks = true;
    try {
      // Increment existing risk numbers
      const currentItems = await axiosInstance.get(
        `/roadblocks/?startupId=${startupId}`,
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      );
      const updatePromises = currentItems.data.map((item: any) =>
        axiosInstance.patch(
          `/roadblocks/${item.id}/`,
          {
            riskNumber: (item.riskNumber || 0) + count
          },
          {
            headers: { Authorization: `Bearer ${access}` }
          }
        )
      );
      await Promise.all(updatePromises);

      await axiosInstance.post(
        `/roadblocks/generate-roadblocks/`,
        {
          startupId: data.startupId,
          no_of_roadblocks_to_create: count
        },
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );

      await $roadblocksQueries[1].refetch(); // Refetch all roadblocks including new AI-generated ones
      await updateRiskNumber();

      toast.success(`Successfully generated ${count} Roadblocks`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to generate roadblocks'
      );
    } finally {
      generatingRoadblocks = false;
    }
  };

  let status = $state(4);
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
</script>

<svelte:head>
  <title
    >{$roadblocksQueries[2].isSuccess
      ? `${$roadblocksQueries[2].data.name} - Roadblocks`
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
  {@render loading()}
  <!-- {@render fallback()} -->
{/if}

<RoadblocksCreateDialog
  {open}
  {onOpenChange}
  create={createRoadblock}
  {startupId}
  {members}
  {status}
/>

{#snippet card(roadblocks: any, index: number)}
  <RoadblocksCard
    {roadblocks}
    {members}
    ai={false}
    update={updatedEditRoadblock}
    deleteRoadblocks={deleteRoadblock}
    role={data.role}
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
              }`}
            />
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

{#snippet error()}
  error
{/snippet}

{#snippet accessible()}
  <div class="flex items-center justify-between">
    <div class="flex gap-3">
      <div class="flex h-fit justify-between rounded-lg bg-background">
        <Tabs.Root value={selectedFormat}>
          <Tabs.List class="bg-flutter-gray/20 border">
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
    <div class="flex items-center gap-3">
      <ShowHideColumns views={columns} />
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
            class="border-primary/20 hover:bg-primary/90 rounded-br-none rounded-tr-none border-l bg-primary px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={generatingRoadblocks}
            onclick={() => generateRoadblocks(numToGenerate)}
          >
            {#if generatingRoadblocks}
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
                disabled={generatingRoadblocks}
              >
                <ChevronDown class="h-4 w-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="end"
              class="max-h-[150px] w-[100px] overflow-y-auto"
            >
              <DropdownMenu.RadioGroup
                value={numToGenerate.toString()}
                onValueChange={(val) => (numToGenerate = Number(val))}
                class="space-y-1"
              >
                {#each [1, 2, 3, 4, 5] as count}
                  <DropdownMenu.RadioItem
                    value={count.toString()}
                    class="flex cursor-pointer items-center justify-between px-2 py-1.5 hover:bg-accent"
                  >
                    <span>{count}</span>
                    <!-- <Check class="h-4 w-4 ml-auto" /> -->
                  </DropdownMenu.RadioItem>
                {/each}
              </DropdownMenu.RadioGroup>
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
        role={data.role}
        {updateStatus}
        {selectedMembers}
        {showDialog}
      />
    {:else}
      <div class="h-fit w-full rounded-md border">
        <Table.Root class="rounded-lg bg-background">
          <Table.Header>
            <Table.Row class="text-centery h-12">
              <Table.Head class="pl-5">Description</Table.Head>
              <Table.Head class="">Risk Number</Table.Head>
              <Table.Head class="">Assignee</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each ($roadblocksQueries[1].data as Roadblock[]).filter((item: Roadblock) => item.isAiGenerated === false) as item}
              {#if selectedMembers.includes(item.assignee) || selectedMembers.length === 0}
                <Table.Row class="h-14 cursor-pointer">
                  <Table.Cell class="pl-5"
                    >{item.description.substring(0, 100)}</Table.Cell
                  >
                  <Table.Cell class="">{item.riskNumber}</Table.Cell>
                  <Table.Cell class=""
                    >{members.filter(
                      (member: Member) => member.userId === item.assignee
                    )[0]?.firstName}
                    {members.filter(
                      (member: Member) => member.userId === item.assignee
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
  <div>fallback</div>
{/snippet}
