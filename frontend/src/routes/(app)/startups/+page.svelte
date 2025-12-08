<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton';
  import Button from '$lib/components/ui/button/button.svelte';
  import { RocketIcon, TargetIcon, CheckCircleIcon } from 'lucide-svelte';
  import { StartupCard } from '$lib/components/startups';
  import StartupStatusCard from '$lib/components/startups/base/StartupStatusCard.svelte';
  import StartupFilterButton from '$lib/components/startups/base/StartupFilterButton.svelte';
  import { QualificationStatus } from '$lib/enums/qualification-status.enum';
  import { Can } from '$lib/components/shared';
  import { useQuery } from '@sveltestack/svelte-query';
  import { getData } from '$lib/utils.js';
  import * as Dialog from '$lib/components/ui/dialog';
  import Application from '$lib/components/startup/Application.svelte';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';
  import axiosInstance from '$lib/axios';
  import { onMount } from 'svelte';

  let { data, form } = $props();

  const queryResult = useQuery(
    ['startups', 'list'],
    () => getData(`/startups/startups`, data.access),
    {
      initialData: data.startups,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always' // Always refetch when component mounts
    }
  );

  const role = data.role;

  const isLoading = $derived($queryResult.isLoading);
  const isError = $derived($queryResult.isError);
  const hasStartups = $derived(
    Array.isArray($queryResult.data) && $queryResult.data.length > 0
  );
  const listOfStartups = $derived(() => {
    if ($queryResult.isSuccess && hasStartups) {
      if (role === 'Mentor') {
        return $queryResult.data.filter(
          (startup: any) =>
            startup.qualificationStatus !== QualificationStatus.PENDING
        );
      }
      return $queryResult.data;
    }
    return [];
  });

  let search = $state('');
  let filter = $state('All Startups');
  let allInitiatives: any[] = $state([]);
  let completedInitiativesPercentage = $state(0);

  const pendingStartups = $derived(
    listOfStartups().filter(
      (startup: any) =>
        startup.qualificationStatus === QualificationStatus.PENDING
    )
  );
  const waitlistedStartups = $derived(
    listOfStartups().filter(
      (startup: any) =>
        startup.qualificationStatus === QualificationStatus.WAITLISTED
    )
  );
  const qualifiedStartups = $derived(
    listOfStartups().filter(
      (startup: any) =>
        startup.qualificationStatus === QualificationStatus.QUALIFIED
    )
  );
  const completedStartups = $derived(
    listOfStartups().filter(
      (startup: any) =>
        startup.qualificationStatus === QualificationStatus.COMPLETED
    )
  );

  const filteredStartups = $derived(() => {
    let base;
    if (filter === 'All Startups')
      base = pendingStartups
        .concat(waitlistedStartups)
        .concat(qualifiedStartups)
        .concat(completedStartups);
    else if (filter === 'Pending') base = pendingStartups;
    else if (filter === 'Waitlisted') base = waitlistedStartups;
    else if (filter === 'Qualified') base = qualifiedStartups;
    else if (filter === 'Completed') base = completedStartups;
    else
      base = pendingStartups
        .concat(waitlistedStartups)
        .concat(qualifiedStartups)
        .concat(completedStartups);

    if (role === 'Mentor') {
      base = base.filter(
        (startup: any) =>
          startup.qualificationStatus !== QualificationStatus.PENDING
      );
    }

    if (!search) return base;
    return base.filter((startup: any) =>
      startup.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Utility function to get initiatives for a single startup
  async function getInitiativesForStartup(startupId: number, access: string) {
    const res = await axiosInstance.get(`/initiatives?startupId=${startupId}`, {
      headers: { Authorization: `Bearer ${access}` }
    });
    return res.data;
  }

  // Fetch all initiatives for all startups
  async function getAllInitiativesForStartups(startups: any[], access: string) {
    const results = await Promise.all(
      startups.map((startup) => getInitiativesForStartup(startup.id, access))
    );
    // Flatten the array if each result is an array of initiatives
    return results.flat();
  }

  let showApplicationForm = $state(false);
  let selectedStartup = $state(null);
  const toggleApplicationForm = () => {
    showApplicationForm = !showApplicationForm;
    if (!showApplicationForm) {
      selectedStartup = null;
    }
  };

  $effect(() => {
    const handleOpenApplication = (event: CustomEvent) => {
      selectedStartup = event.detail.startup;
      showApplicationForm = true;
    };

    window.addEventListener(
      'openApplication',
      handleOpenApplication as EventListener
    );
    return () => {
      window.removeEventListener(
        'openApplication',
        handleOpenApplication as EventListener
      );
    };
  });

  // $effect(() => {
  //   const success = page.url.searchParams.get('success');

  //   if (form?.error) {
  //     let formError =
  //       form.error.length > 60
  //         ? form.error.substring(0, 60) + '...'
  //         : form.error;
  //     toast.error(formError);
  //   }

  //   if (success === 'true') {
  //     toast.success('Application successfull.');
  //     // Remove the 'success' parameter from the URL
  //     const url = new URL(page.url.href);
  //     url.searchParams.delete('success');
  //     history.replaceState(null, '', url);
  //   }
  // });

  $effect(() => {
    async function fetchInitiatives() {
      if ($queryResult.isSuccess && listOfStartups().length > 0) {
        const allInitiativesFetched = await getAllInitiativesForStartups(
          listOfStartups(),
          data.access!
        );
        allInitiatives = allInitiativesFetched;
        completedInitiativesPercentage =
          allInitiatives.length > 0
            ? (allInitiatives.filter((initiative) => initiative.status === 4)
                .length /
                allInitiatives.length) *
              100
            : 0;
      }
    }
    fetchInitiatives();
  });

  onMount(() => {
    $queryResult.refetch();
  });
</script>

<svelte:head>
  <title>LaunchUp - Startups</title>
</svelte:head>

<div class="mb-8 flex items-center justify-between">
  <div>
    <h2 class="text-3xl font-bold">Startups</h2>
    <p>Manage assigned startups</p>
  </div>
  <Can role={['Startup']} userRole={role}>
    <div class="flex gap-5">
      <a href="/apply">
        <Button class="flex items-center justify-center gap-2 rounded-lg">
          <RocketIcon class="h-4 w-4" /> Apply
        </Button>
      </a>
    </div>
  </Can>
</div>

<!-- Statistics Cards -->
<div class="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
  <div
    class="group flex flex-col gap-1 rounded-xl border border-border bg-gradient-to-br from-background to-background/50 p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
  >
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-medium text-muted-foreground">Total Startups</span>
      <RocketIcon class="h-5 w-5 text-primary opacity-60" />
    </div>
    <span class="text-4xl font-bold tracking-tight">{listOfStartups().length}</span>

    <div class="mt-4 pt-4 border-t border-border/50">
      <p class="text-xs text-muted-foreground mb-3 font-medium">Status Breakdown</p>
      <div class="gap-2 flex flex-wrap">
        {#if role === 'Startup'}
          <StartupStatusCard
            count={pendingStartups.length}
            label="Pending"
            borderColor="border-yellow-500"
            bgColor="bg-yellow-50 dark:bg-yellow-950"
            textColor="text-yellow-700 dark:text-yellow-300"
          />
          <StartupStatusCard
            count={waitlistedStartups.length}
            label="Waitlisted"
            borderColor="border-orange-500"
            bgColor="bg-orange-50 dark:bg-orange-950"
            textColor="text-orange-700 dark:text-orange-300"
          />
          <StartupStatusCard
            count={qualifiedStartups.length}
            label="Qualified"
            borderColor="border-green-500"
            bgColor="bg-green-50 dark:bg-green-950"
            textColor="text-green-700 dark:text-green-300"
          />
        {:else if role === 'Mentor'}
          <StartupStatusCard
            count={qualifiedStartups.length}
            label="Active"
            borderColor="border-blue-500"
            bgColor="bg-blue-50 dark:bg-blue-950"
            textColor="text-blue-700 dark:text-blue-300"
          />
        {/if}
        <StartupStatusCard
          count={completedStartups.length}
          label="Completed"
          borderColor="border-purple-500"
          bgColor="bg-purple-50 dark:bg-purple-950"
          textColor="text-purple-700 dark:text-purple-300"
        />
      </div>
    </div>
  </div>

  <div
    class="group flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-br from-background to-background/50 p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-muted-foreground">Initiatives Progress</span>
      <TargetIcon class="h-5 w-5 text-primary opacity-60" />
    </div>

    <div class="flex items-baseline gap-2">
      <span class="text-4xl font-bold tracking-tight"
        >{allInitiatives?.filter((initiative) => initiative?.status === 4)
          ?.length || 0}</span
      >
      <span class="text-xl text-muted-foreground">/ {allInitiatives?.length ?? 0}</span>
    </div>

    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-xs text-muted-foreground">Completion</span>
        <span class="text-sm font-semibold text-primary"
          >{completedInitiativesPercentage.toFixed(0)}%</span
        >
      </div>
      <div class="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out shadow-sm"
          style="width:{completedInitiativesPercentage.toFixed(0)}%"
        ></div>
      </div>
    </div>
  </div>

  <div
    class="group flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-br from-background to-background/50 p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-muted-foreground">Completion Rate</span>
      <CheckCircleIcon class="h-5 w-5 text-primary opacity-60" />
    </div>

    <span class="text-4xl font-bold tracking-tight"
      >{listOfStartups().length > 0
        ? Math.round(
            (completedStartups.length / listOfStartups().length) * 100
          )
        : 0}%</span
    >

    <div class="flex items-center gap-2 text-sm text-muted-foreground mt-1">
      <span class="font-semibold text-foreground">{completedStartups.length}</span>
      <span>of</span>
      <span class="font-semibold text-foreground">{listOfStartups().length}</span>
      <span>completed</span>
    </div>
  </div>
</div>

<!-- Search and Filters -->
<div class="mb-5">
  <div class="mb-2 flex w-[400px] items-center gap-2">
    <div class="relative flex-1">
      <input
        class="w-full rounded-lg border border-border bg-background px-4 py-2 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        type="text"
        placeholder="Search startups..."
        bind:value={search}
      />
      <button
        class="hover:bg-primary/90 absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-2 transition-colors"
        tabindex="-1"
        type="button"
      >
        <img src="/magnifying_glass.png" alt="Search" class="h-4 w-4" />
      </button>
    </div>
  </div>
  <div class="flex w-fit gap-0.5 rounded-xl border border-border">
    <StartupFilterButton
      label="All Startups"
      active={filter === 'All Startups'}
      onclick={() => (filter = 'All Startups')}
      rounded="left"
    />

    {#if role === 'Startup'}
      <StartupFilterButton
        label="Pending"
        active={filter === 'Pending'}
        onclick={() => (filter = 'Pending')}
      />
      <StartupFilterButton
        label="Waitlisted"
        active={filter === 'Waitlisted'}
        onclick={() => (filter = 'Waitlisted')}
      />
      <StartupFilterButton
        label="Qualified"
        active={filter === 'Qualified'}
        onclick={() => (filter = 'Qualified')}
      />
    {:else if role === 'Mentor'}
      <StartupFilterButton
        label="Active"
        active={filter === 'Qualified'}
        onclick={() => (filter = 'Qualified')}
      />
    {/if}
    <StartupFilterButton
      label="Completed"
      active={filter === 'Completed'}
      onclick={() => (filter = 'Completed')}
      rounded="right"
    />
  </div>
</div>

<!-- Startup Cards Grid -->
{#if isLoading}
  <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-10">
    {#each Array(8) as _, i}
      <div class="animate-pulse">
        <div class="rounded-xl bg-muted/50 border border-border">
          <Skeleton class="h-48 rounded-xl" />
        </div>
      </div>
    {/each}
  </div>
{:else if isError}
  <div>
    <p>Error fetching data. Contact support</p>
  </div>
{:else if hasStartups}
  <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-10">
    {#each filteredStartups() as startup}
      <StartupCard
        {startup}
        {role}
        initiatives={allInitiatives.filter(
          (initiative) => initiative.startup === startup.id
        )}
      />
    {/each}
  </div>
{:else}
  <div class="mt-20 text-center">
    <div class="mx-auto w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
      <RocketIcon class="h-12 w-12 text-muted-foreground/50" />
    </div>
    <h3 class="text-2xl font-bold mb-2">No startups found</h3>
    <p class="text-muted-foreground mb-6">
      {search ? 'Try adjusting your search criteria' : 'Get started by adding your first startup'}
    </p>
    <Can role={['Startup']} userRole={role}>
      <a href="/apply">
        <Button class="gap-2">
          <RocketIcon class="h-4 w-4" /> Apply Now
        </Button>
      </a>
    </Can>
  </div>
{/if}

<Dialog.Root open={showApplicationForm} onOpenChange={toggleApplicationForm}>
  <Dialog.Content class="h-4/5 max-w-[800px]">
    <Application access={data.access!} startup={selectedStartup} />
  </Dialog.Content>
</Dialog.Root>
