<script lang="ts">
  import axiosInstance from '$lib/axios';
  import Button from '$lib/components/ui/button/button.svelte';
  import * as Card from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label/index.js';
  import { useQuery } from '@sveltestack/svelte-query';
  import type { PageData } from './$types';
  import { Skeleton } from '$lib/components/ui/skeleton';

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
      staleTime: 0
    }
  );
</script>

<svelte:head>
  <title>Settings - General</title>
</svelte:head>
<div class="flex flex-col gap-5">
  <h1 class="text-xl font-semibold">General</h1>
  {#if $queryResult.isError}
    <div class="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
      <p class="font-medium">Failed to load startup data</p>
      <p class="text-sm">Please try refreshing the page</p>
    </div>
  {:else}
    <div class="grid w-2/3 grid-cols-1 gap-5">
      <div class="grid gap-2">
        <Label for="firstName">Startup Name</Label>
        {#if $queryResult.isLoading}
          <Skeleton class="h-10" />
        {:else}
          <Input
            name="firstName"
            id="firstName"
            type="text"
            required
            readonly
            value={$queryResult.data.name}
          />
        {/if}
      </div>
      <div class="grid gap-2">
        <Label for="lastName">Group Name</Label>
        {#if $queryResult.isLoading}
          <Skeleton class="h-10" />
        {:else}
          <Input
            name="lastName"
            id="lastName"
            type="text"
            required
            readonly
            value={$queryResult.data.groupName}
          />
        {/if}
      </div>
    </div>
  {/if}
</div>
