<script lang="ts">
  import axiosInstance from '$lib/axios';
  import Button from '$lib/components/ui/button/button.svelte';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label/index.js';
  import { useQuery } from '@sveltestack/svelte-query';
  import type { PageData } from './$types';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import * as Select from '$lib/components/ui/select';
  import { Filter } from 'lucide-svelte';
  import axios from 'axios';
  import { toast } from 'svelte-sonner';
  import * as Table from '$lib/components/ui/table';
  import { getData, getReadinessLevels } from '$lib/utils';
  import { Textarea } from '$lib/components/ui/textarea';
  export let data: PageData;

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
      refetchOnWindowFocus: false
    }
  );

  const elevateData = useQuery(
    'elevateData',
    async () =>
      (
        await axiosInstance.get(`/elevate/${data.startupId}`, {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        })
      ).data,
    {
      cacheTime: 0,
      refetchOnWindowFocus: false
    }
  );

  const readinessData = useQuery(
    'readinessData',
    async () =>
      (
        await axiosInstance.get(
          `/readinesslevel/readiness-level?startupId=${data.startupId}`,
          {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          }
        )
      ).data,
    {
      cacheTime: 0,
      refetchOnWindowFocus: false
    }
  );

  const rnaData = useQuery('rnaDataElevate', async () =>
    getData(`/startup-rna/?startup_id=${data.startupId}`, data.access!)
  );

  const readinessLevel = useQuery(
    'readinessLevels',
    async () =>
      (
        await axiosInstance.get(`/readinesslevel/readiness-levels/`, {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        })
      ).data,
    {
      cacheTime: 0,
      refetchOnWindowFocus: false
    }
  );

  function getCurrentLevel(
    elevateLogs: any[],
    readinessType: string,
    levelsForType: any
  ) {
    // Try to find the log for this readinessType
    const logs = elevateLogs.filter(
      (log) => log.readinessLevel.readinessType === readinessType
    );
    if (logs.length === 0) {
      return levelsForType.readinessLevel.level;
    }
    logs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return logs[0].level;
  }

  let elevatedReadiness: any = [0, 0, 0, 0, 0, 0];
  let elevatedRemark: any = ['', '', '', '', '', ''];

  async function elevate() {
    const readinessToUpdate = elevatedReadiness
      .map((r: any, index: number) => ({
        readinessLevel: r,
        remark: elevatedRemark[index]
      }))
      .filter((item: any) => item.readinessLevel !== 0);

    if (readinessToUpdate.length === 0) {
      return;
    }

    const requests = readinessToUpdate.map((item: any) =>
      axiosInstance.post(
        `/elevate`,
        {
          startupId: Number(data.startupId),
          readinessLevelId: Number(item.readinessLevel),
          remark: item.remark ?? ''
        },
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      )
    );

    try {
      await axios.all(requests);
      toast.success('Elevated successfully');
      elevatedReadiness = [0, 0, 0, 0, 0, 0];
      elevatedRemark = ['', '', '', '', '', ''];
      $elevateData.refetch().then((res) => {
        res.data
          .sort((a, b) =>
            a.readinessLevel.readinessType.localeCompare(
              b.readinessLevel.readinessType
            )
          )
          .map((x, index) => (elevatedReadiness[index] = x.readinessLevel.id));
      });
    } catch (error) {
      console.error('Error updating readiness levels:', error);
    }
  }

  const getLevel = (levels: any, id) => {
    if (id === 0) return '';
    return levels.filter((level: any) => Number(level.id) === Number(id))[0]
      .level;
  };

  let t = false;

  $: if ($readinessData.isSuccess && !t) {
    t = true;
    $readinessData.data
      .sort((a, b) =>
        a.readinessLevel.readinessType.localeCompare(
          b.readinessLevel.readinessType
        )
      )
      .map((x, index) => {
        elevatedReadiness[index] = x.readinessLevel.id;
        elevatedRemark[index] = x.remark;
      });
  }
</script>

<svelte:head>
  <title>Settings - Elevate</title>
</svelte:head>
<div class="flex flex-col gap-5">
  <h1 class="text-xl font-semibold">Elevate</h1>
  {#if $readinessData.isError || $elevateData.isError || $queryResult.isError}
    <div class="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
      <p class="font-medium">Failed to load elevation data</p>
      <p class="text-sm">Please try refreshing the page</p>
    </div>
  {:else}
    <div class="flex items-center justify-between">
    {#if $readinessData.isLoading}
      <Skeleton class="h-10" />
    {:else}
      <div class="w-3/4 rounded-md border">
        <Table.Root class="rounded-lg bg-background">
          <Table.Header>
            <Table.Row class="text-centery h-12">
              <Table.Head class="pl-5">Type</Table.Head>
              <Table.Head class="">Initial Level</Table.Head>
              <Table.Head class="">Current Level</Table.Head>
              {#if data.role !== 'Startup'}
                <Table.Head class="">Next Level</Table.Head>
              {/if}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if $queryResult.isLoading && $elevateData.isLoading}
              <Skeleton class="h-40" />
            {:else}
              {#each $readinessData.data.sort( (a, b) => a.readinessLevel.readinessType.localeCompare(b.readinessLevel.readinessType) ) as r, index}
                {@const initial = $readinessData.data[index]}
                <Table.Row class="h-14 cursor-pointer">
                  <Table.Cell class="pl-5"
                    >{r.readinessLevel.readinessType}</Table.Cell
                  >
                  <Table.Cell class=""
                    >{initial.readinessLevel.level}</Table.Cell
                  >
                  <Table.Cell class="">
                    {#if $elevateData.data}
                      {getCurrentLevel(
                        $elevateData.data,
                        r.readinessLevel.readinessType,
                        r
                      )}
                    {:else}
                      <Skeleton class="h-6" />
                    {/if}
                  </Table.Cell>
                  {#if data.role !== 'Startup'}
                    <Table.Cell class="">
                      <Select.Root
                        type="single"
                        bind:value={elevatedReadiness[index]}
                      >
                        <Select.Trigger class="w-[100px]">
                          {#if elevatedReadiness[index] !== r.readinessLevel.id}
                            {getLevel(
                              getReadinessLevels(
                                r.readinessLevel.readinessType
                              ),
                              elevatedReadiness[index]
                            )}
                          {/if}
                        </Select.Trigger>
                        <Select.Content>
                          {#each getReadinessLevels(r.readinessLevel.readinessType) as item}
                            <Select.Item value={item.id}
                              >{item.level}</Select.Item
                            >
                          {/each}
                        </Select.Content>
                      </Select.Root>
                    </Table.Cell>
                  {/if}
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </div>
      {/if}
    </div>
    {#if data.role !== 'Startup'}
      <div><Button onclick={elevate}>Elevate</Button></div>
    {/if}
  {/if}
</div>
