<script lang="ts">
  import { Label } from '$lib/components/ui/label/index.js';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textareav2';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import axiosInstance from '$lib/axios';
  import { useQuery } from '@sveltestack/svelte-query';
  import type { PageData } from './$types';
  import { toast } from 'svelte-sonner';
  import { Save, Loader, Eye } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  // Check if user is a mentor (readonly mode)
  const isMentor = $derived(data.role?.includes('Mentor') ?? false);

  const queryResult = useQuery(
    ['startupData', data.startupId],
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
      staleTime: 0,
      refetchOnWindowFocus: false
    }
  );

  // Local state for editing
  let title = $state('');
  let description = $state('');
  let problemStatement = $state('');
  let targetMarket = $state('');
  let solution = $state('');
  let objectives = $state('');
  let scope = $state('');
  let methodology = $state('');
  let saving = $state(false);

  // Update local state when data loads
  $effect(() => {
    if ($queryResult.isSuccess && $queryResult.data.capsuleProposal) {
      const proposal = $queryResult.data.capsuleProposal;
      title = proposal.title || '';
      description = proposal.description || '';
      problemStatement = proposal.problemStatement || '';
      targetMarket = proposal.targetMarket || '';
      // Map solutionDescription from backend to solution in frontend
      solution = proposal.solutionDescription || '';
      // Join objectives array with newlines
      objectives = Array.isArray(proposal.objectives) 
        ? proposal.objectives.join('\n') 
        : (proposal.objectives || '');
      scope = proposal.scope || '';
      methodology = proposal.methodology || '';
    }
  });

  async function saveCapsuleProposal() {
    saving = true;
    try {
      console.log('Saving capsule proposal with data:', {
        title,
        description,
        problemStatement,
        targetMarket,
        solution,
        objectives,
        scope,
        methodology
      });

      const response = await axiosInstance.patch(
        `/startups/${data.startupId}/capsule-proposal`,
        {
          title,
          description,
          problemStatement,
          targetMarket,
          solution,
          objectives,
          scope,
          methodology
        },
        {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        }
      );

      console.log('Capsule proposal saved successfully:', response.data);
      toast.success('Capsule proposal saved successfully');
      $queryResult.refetch();
    } catch (error: any) {
      console.error('Error saving capsule proposal:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save capsule proposal');
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Settings - Capsule Proposal</title>
</svelte:head>

<div class="flex h-[90vh] flex-col gap-5 overflow-y-auto">
  {#if $queryResult.isError}
    <div class="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
      <p class="font-medium">Failed to load capsule proposal data</p>
      <p class="text-sm">Please try refreshing the page</p>
    </div>
  {:else}
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-semibold">Capsule Proposal</h1>
        {#if isMentor}
          <Badge variant="secondary" class="flex items-center gap-1">
            <Eye class="h-3 w-3" />
            Mentor View - Read Only
          </Badge>
        {/if}
      </div>
      {#if $queryResult.isSuccess && !isMentor}
        <Button onclick={saveCapsuleProposal} disabled={saving}>
          {#if saving}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
            Saving...
          {:else}
            <Save class="mr-2 h-4 w-4" />
            Save Changes
          {/if}
        </Button>
      {/if}
    </div>
  <div class="grid w-[90%] grid-cols-1 gap-5">
    <div class="grid gap-2">
      <Label for="title">Title</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Input
          name="title"
          id="title"
          type="text"
          required
          readonly={isMentor}
          bind:value={title}
        />
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="description">Description</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Textarea
          id="description"
          rows={8}
          readonly={isMentor}
          bind:value={description}
          class="text-justify text-base"
        />
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="problemStatement">Problem Statement</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Textarea
          id="problemStatement"
          rows={8}
          readonly={isMentor}
          bind:value={problemStatement}
          class="text-justify text-base"
        />
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="targetMarket">Target Market</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Textarea
          id="targetMarket"
          rows={8}
          readonly={isMentor}
          bind:value={targetMarket}
          class="text-justify text-base"
        />
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="solution">Solution</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Textarea
          id="solution"
          rows={8}
          readonly={isMentor}
          bind:value={solution}
          class="text-justify text-base"
        />
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="objectives">Objectives</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Textarea
          id="objectives"
          rows={8}
          readonly={isMentor}
          bind:value={objectives}
          class="text-justify text-base"
        />
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="scope">Scope</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Textarea
          id="scope"
          rows={8}
          readonly={isMentor}
          bind:value={scope}
          class="text-justify text-base"
        />
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="methodology">Methodology</Label>
      {#if $queryResult.isLoading}
        <Skeleton class="h-10" />
      {:else}
        <Textarea
          id="methodology"
          rows={8}
          readonly={isMentor}
          bind:value={methodology}
          class="text-justify text-base"
        />
        {/if}
      </div>
    </div>
  {/if}
</div>
