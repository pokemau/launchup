<script lang="ts">
  import { useQueriesState } from '$lib/stores/useQueriesState.svelte.js';
  import { getData } from '$lib/utils';
  import { useQueries } from '@sveltestack/svelte-query';
  import { RnaCard, RnaCreateDialog } from '$lib/components/startups/rna';
  import { Button } from '$lib/components/ui/button';
  import { Loader, Plus, Sparkles } from 'lucide-svelte';
  import axiosInstance from '$lib/axios';
  import { toast } from 'svelte-sonner';
  import { Skeleton } from '$lib/components/ui/skeleton';

  const { data } = $props();
  const { access, startupId } = data;

  const rnaQueries = useQueries([
    {
      queryKey: ['allowRNA', startupId],
      queryFn: () => getData(`/startups/${startupId}/allow-rnas/`, access)
    },
    {
      queryKey: ['rnaData', startupId],
      queryFn: () => getData(`/rna/?startupId=${startupId}`, access)
    },
    {
      queryKey: ['readinessData', startupId],
      queryFn: () =>
        getData(
          `/startups/startup-readiness-level?startupId=${startupId}`,
          access
        )
    },
    {
      queryKey: ['startupData', startupId],
      queryFn: () => getData(`/startups/${startupId}`, access)
    },
    {
      queryKey: ['rnaComplete', startupId],
      queryFn: () => getData(`/rna/${startupId}/check-complete`, access)
    }
  ]);

  const { isLoading, isError } = $derived(useQueriesState($rnaQueries));
  $rnaQueries[0].refetch();
  const isAccessible = $derived($rnaQueries[0].data);

  let open = $state(false);
  const onOpenChange = () => {
    open = !open;
  };

  let generatingRNA = $state(false);

  const generateRNA = async () => {
    generatingRNA = true;
    await axiosInstance.get(`/rna/${data.startupId}/generate-rna/`, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });
    generatingRNA = false;
    toast.success('Successfuly generated RNA');
    $rnaQueries[1].refetch();
    $rnaQueries[4].refetch();
  };

  const addToRNA = async (id: number) => {
    const toBeAdded = $rnaQueries[1].data.find((item: any) => item.id === id);
    const existingItem = $rnaQueries[1].data.find(
      (d: any) =>
        d.isAiGenerated === false &&
        d.readinessLevel.readinessType ===
          toBeAdded.readinessLevel.readinessType
    );

    if (existingItem) {
      await axiosInstance.delete(`/rna/${existingItem.id}/`, {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      });
      toast.info('Existing RNA data with the same readiness type deleted');
    }

    await axiosInstance.patch(
      `/rna/${id}/`,
      {
        isAiGenerated: false
      },
      {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      }
    );
    toast.success('Successfuly added to RNA');
    $rnaQueries[1].refetch().then(() => (open = false));
    $rnaQueries[4].refetch();
  };

  const createRNA = async (payload: any) => {
    const cleanPayload = {
      ...payload,
      readiness_level_id: Number(payload.readiness_level_id),
      startup_id: Number(payload.startup_id)
    };

    await axiosInstance.post(
      '/rna',
      { ...cleanPayload, status },
      {
        headers: {
          Authorization: `Bearer ${data.access}`
        }
      }
    );
    toast.success('Successfully created the RNA');
    open = false;
    $rnaQueries[1].refetch();
    $rnaQueries[4].refetch();
  };

  const editRNA = async (id: number, payload: any) => {
    await axiosInstance.patch(`/rna/${id}/`, payload, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });
    toast.success('Successfuly updated the RNA');
    open = false;
    $rnaQueries[1].refetch();
    $rnaQueries[4].refetch();
  };

  const deleteRNA = async (id: number, index: number) => {
    await axiosInstance.delete(`/rna/${Number(id)}/`, {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });
    toast.success('Successfuly deleted the RNA');
    $rnaQueries[1].refetch();
    $rnaQueries[4].refetch();
  };

  const readinessData = $derived(
    $rnaQueries[2].isSuccess
      ? $rnaQueries[2].data
          .slice(-6)
          .sort((a: any, b: any) =>
            a.readinessLevel.readinessType.localeCompare(
              b.readinessLevel.readinessType
            )
          )
      : []
  );

  const isAllRNAComplete = $derived(
    $rnaQueries[4].isSuccess && $rnaQueries[4].data === true
  );
</script>

<svelte:head>
  <title
    >{$rnaQueries[3].isSuccess
      ? `${$rnaQueries[3].data.name} - Readiness and Needs Assessment`
      : 'Loading'}</title
  >
</svelte:head>

{#if isLoading}
  {@render loading()}
{:else if isError}
  {@render error()}
{:else if isAccessible}
  {@render accessible()}
{:else if !isAccessible}
  {@render inaccessible()}
{:else}
  {@render fallback()}
{/if}

<RnaCreateDialog
  {open}
  {onOpenChange}
  create={createRNA}
  {startupId}
  {readinessData}
/>

{#snippet loading()}
  <div class="flex h-full flex-col gap-3">
    {#if data.role !== 'Startup'}
      <div class="flex justify-between">
        <div class="bg-background">
          <Skeleton class="h-9 w-[127px]" />
        </div>
        <div class="ml-auto bg-background">
          <Skeleton class="h-9 w-[82px]" />
        </div>
      </div>
    {/if}

    <div class="grid h-full grid-cols-4 gap-5">
      <div class="h-full w-full bg-background">
        <Skeleton class="h-[180px]" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-[180px]" />
      </div>
      <div class="h-full w-full bg-background">
        <Skeleton class="h-[180px]" />
      </div>
    </div>
  </div>
{/snippet}

{#snippet error()}{/snippet}

{#snippet accessible()}
  <div class="flex items-center justify-between">
    <div class="ml-auto flex items-center gap-3">
      {#if data.role !== 'Startup'}
        <Button onclick={() => (open = true)}
          ><Plus class="h-4 w-4" />Add</Button
        >

        <Button
          onclick={generateRNA}
          disabled={generatingRNA || isAllRNAComplete}
        >
          {#if generatingRNA}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
          {:else}
            <Sparkles class="h-4 w-4" />
          {/if}
          Generate</Button
        >
      {/if}
    </div>
  </div>

  <div
    class="mt-5 grid max-h-[40rem] w-full grid-cols-4 gap-5 overflow-auto rounded-xl border-2 p-10"
  >
    {#if $rnaQueries[1].data.length === 0}
      <h1 class="text-gray-600">There are currently no RNAs created...</h1>
    {/if}
    {#each $rnaQueries[1].data as rna}
      <RnaCard
        {rna}
        {readinessData}
        update={editRNA}
        addToRna={addToRNA}
        deleteRna={deleteRNA}
        role={data.role}
      ></RnaCard>
    {/each}
  </div>
{/snippet}

{#snippet inaccessible()}
  <div class="text-2xl font-bold mt-10 text-center">
    {#if data.role === 'Startup'}
      Your mentor has not yet rated your startup's readiness levels.
    {:else if data.role === 'Mentor'}
      Please rate your startup's readiness levels to access the Readiness and
    Needs Assessment.
    {:else}
      Something went wrong...
    {/if}
  </div>
{/snippet}

{#snippet fallback()}
  <div class="text-2xl font-bold mt-10 text-center">Something went wrong...</div>
{/snippet}
