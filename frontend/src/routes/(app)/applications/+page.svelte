<script lang="ts">
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { goto } from '$app/navigation';
  import StartupCard from '$lib/components/dashboard/StartupCard.svelte';
  import { PUBLIC_API_URL } from '$env/static/public';
  import type { PageData } from './$types';
  import { page } from '$app/stores';
  import PendingDialog from '$lib/components/dashboard/PendingDialog.svelte';
  import WaitlistedDialog from '$lib/components/dashboard/WaitlistedDialog.svelte';
  import QualifiedDialog from '$lib/components/dashboard/QualifiedDialog.svelte';
  import CompletedDialog from '$lib/components/dashboard/CompletedDialog.svelte';
  import axiosInstance from '$lib/axios';
  import { useQueries } from '@sveltestack/svelte-query';

  export let data: PageData;

  let access = data.access;

  $: selectedTab = $page.url.searchParams.get('tab') || 'pending';
  let applicants: any = [];

  let dialogLoading = false;
  let showDialog = false;
  let selectedStartup: any = null;
  let startupAssessments: Array<{
    name: string;
    assessmentStatus: string;
    assessmentFields?: any[];
  }> = [];

  async function fetchStartupAssessments(startupId: number) {
    try {
      const { data } = await axiosInstance.get(
        `/assessments/startup/${startupId}`,
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );
      startupAssessments = data ?? [];
    } catch (e) {
      console.error('Failed to load startup assessments', e);
      startupAssessments = [];
    }
  }

  async function openStartupDialog(startup: any) {
    selectedStartup = startup;
    if (startup?.id) {
      await fetchStartupAssessments(startup.id);
    }
    showDialog = true;
  }

  function toggleDialog() {
    showDialog = !showDialog;
    if (!showDialog) {
      selectedStartup = null;
      startupAssessments = [];
    }
  }

  // Assign multiple assessments to a startup
  async function assignAssessmentsToStartup(
    startupId: number,
    assessmentTypeIds: number[]
  ) {
    try {
      // Send all assessmentTypeIds in a single request as required by backend
      const response = await axiosInstance.post(
        `/assessments/startup-assessment`,
        {
          startupId,
          assessmentTypeIds
        },
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning assessments:', error);
      throw error;
    }
  }

  // Approve startup and assign mentor (unchanged)
  async function approveStartup(startupId: number, selectedMentor: any) {
    const response = await fetch(
      `${PUBLIC_API_URL}/startups/${startupId}/approve-applicant/`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`
        }
      }
    );

    if (response.ok) {
      const assignmentor = await fetch(
        `${PUBLIC_API_URL}/startups/${startupId}/appoint-mentors/`,
        {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`
          },
          body: JSON.stringify({
            mentorIds: [selectedMentor]
          })
        }
      );
      if (assignmentor.ok) {
        // Refetch the queries
        await Promise.all([
          $queries[0].refetch(),
          $queries[1].refetch(),
          $queries[2].refetch()
        ]);

        // Close the dialog
        showDialog = false;
        selectedStartup = null;
      }
    }
  }

  // waitlist startup
  async function waitlistStartup(startupId: number, message: string) {
    try {
      const response = await axiosInstance.patch(
        `/startups/${startupId}/waitlist-applicant`,
        {
          message: message,
          managerId: data.user.id
        },
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );
      if (response.status === 200) {
        // Refetch the queries
        await Promise.all([
          $queries[0].refetch(),
          $queries[1].refetch(),
          $queries[2].refetch()
        ]);

        // Close the dialog
        showDialog = false;
        selectedStartup = null;
      }
      return response.data;
    } catch (error) {
      console.error('Error waitlisting startup:', error);
      throw error;
    }
  }

  async function getAssessmentTypesWithFields() {
    const { data: grouped } = await axiosInstance.get('/assessments/grouped', {
      headers: {
        Authorization: `Bearer ${data.access}`
      }
    });

    const assessmentTypes = Object.entries(grouped).map(
      ([typeName, assessments]) => ({
        name: typeName,
        assessments: assessments
      })
    );

    return assessmentTypes;
  }

  const queries = useQueries([
    {
      queryKey: ['getAllStartups'],
      queryFn: async () => {
        const response = await axiosInstance.get(`/startups/all`, {
          headers: {
            Authorization: `Bearer ${data.access}`
          }
        });
        return response.data;
      },
      cacheTime: 0,
      staleTime: 0
    },
    {
      queryKey: ['mentors'],
      queryFn: async () =>
        (
          await axiosInstance.get(`/users?userRole=Mentor`, {
            headers: {
              Authorization: `Bearer ${data.access}`
            }
          })
        ).data,
      cacheTime: 0,
      staleTime: 0
    },
    {
      queryKey: ['assessments'],
      queryFn: async () => getAssessmentTypesWithFields(),
      cacheTime: 0,
      staleTime: 0
    }
  ]);

  async function markComplete(startupId: number) {
    try {
      dialogLoading = true;
      const response = await axiosInstance.patch(
        `/startups/${startupId}/mark-complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );
      if (response.status === 200) {
        // Refetch the queries
        await Promise.all([$queries[0].refetch(), $queries[1].refetch()]);

        // Close the dialog
        showDialog = false;
        selectedStartup = null;
      }
    } catch (error) {
      console.error('Error marking startup as complete:', error);
    } finally {
      dialogLoading = false;
    }
  }

  async function changeMentor(startupId: number, mentorId: number) {
    try {
      dialogLoading = true;
      const response = await axiosInstance.patch(
        `/startups/${startupId}/change-mentor`,
        { mentorId },
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );
      if (response.status === 200) {
        // Refetch the queries to update the data
        await Promise.all([$queries[0].refetch(), $queries[1].refetch()]);

        // Update the selectedStartup with new data
        const updatedStartup = $queries[0].data.find(
          (s: any) => s.id === startupId
        );
        if (updatedStartup) {
          selectedStartup = updatedStartup;
        }
      }
    } catch (error) {
      console.error('Error changing mentor:', error);
    } finally {
      dialogLoading = false;
    }
  }

  // Update applicants based on selected tab and query results
  $: if ($queries[0].isSuccess) {
    if ($queries[0].data.length > 0) {
      if (selectedTab === 'pending') {
        applicants = $queries[0].data.filter(
          (applicant: any) => applicant.qualificationStatus === 1
        );
      } else if (selectedTab === 'waitlisted') {
        applicants = $queries[0].data.filter(
          (applicant: any) => applicant.qualificationStatus === 2
        );
      } else if (selectedTab === 'qualified') {
        applicants = $queries[0].data.filter(
          (applicant: any) => applicant.qualificationStatus === 3
        );
      } else if (selectedTab === 'completed') {
        applicants = $queries[0].data.filter(
          (applicant: any) => applicant.qualificationStatus === 4
        );
      }
    } else {
      applicants = []; // Handle case when there are no applicants
    }
  }
</script>

<svelte:head>
  <title>LaunchUp - Applications</title>
</svelte:head>

{#if $queries[0].isLoading || $queries[1].isLoading || $queries[2].isLoading}
  <div class="flex h-64 items-center justify-center">
    <div class="flex items-center gap-3">
      <div class="loader"></div>
      <span>Fetching applications...</span>
    </div>
  </div>
{:else}
  {@const mentors = $queries[1].data}
  {@const assessments = $queries[2].data}
  {console.log(assessments)}
  <div class="flex flex-col gap-3">
    <div class="flex justify-between rounded-lg bg-background">
      <Tabs.Root value={selectedTab}>
        <Tabs.List class="bg-flutter-gray/20 border">
          <Tabs.Trigger
            value="pending"
            onclick={() => {
              selectedTab = 'pending';
              showDialog = false;
              goto('/applications?tab=pending');
            }}>Pending</Tabs.Trigger
          >
          <Tabs.Trigger
            value="waitlisted"
            onclick={() => {
              selectedTab = 'waitlisted';
              showDialog = false;
              goto('/applications?tab=waitlisted');
            }}>Waitlisted</Tabs.Trigger
          >
          <Tabs.Trigger
            value="qualified"
            onclick={() => {
              selectedTab = 'qualified';
              showDialog = false;
              goto('/applications?tab=qualified');
            }}>Qualified</Tabs.Trigger
          >
          <Tabs.Trigger
            value="completed"
            onclick={() => {
              selectedTab = 'completed';
              showDialog = false;
              goto('/applications?tab=completed');
            }}>Completed</Tabs.Trigger
          >
        </Tabs.List>
      </Tabs.Root>
    </div>

    <!-- Cards container -->
    <div class="space-y-4">
      {#if applicants.length > 0}
        {#each applicants as applicant}
          <StartupCard
            startup={applicant}
            {selectedTab}
            onOpenStartupDialog={() => {
              openStartupDialog(applicant);
            }}
          />
        {/each}
      {:else}
        <div class="flex h-32 items-center justify-center text-gray-500">
          <div class="text-center">
            <p class="text-lg font-medium">No applications found</p>
            <p class="text-sm">
              There are no {selectedTab === 'pending'
                ? 'pending applications'
                : selectedTab === 'waitlisted'
                  ? 'waitlisted applications'
                  : selectedTab === 'qualified'
                    ? 'qualified startups'
                    : 'completed applications'} at the moment.
            </p>
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if dialogLoading}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-background bg-opacity-90"
    >
      <div class="flex items-center gap-3 rounded-lg p-5 shadow-lg">
        <div class="loader"></div>
        <span>Loading...</span>
      </div>
    </div>
  {/if}

  <!-- Dialog components -->
  {#if selectedTab === 'pending'}
    <PendingDialog
      startup={selectedStartup}
      {showDialog}
      {toggleDialog}
      {waitlistStartup}
      mentors={mentors || []}
      assessments={assessments || []}
      {approveStartup}
      {assignAssessmentsToStartup}
      {access}
    />
  {:else if selectedTab === 'waitlisted'}
    <WaitlistedDialog
      startup={selectedStartup}
      {showDialog}
      {toggleDialog}
      mentors={mentors || []}
      assessments={assessments || []}
      {approveStartup}
      {assignAssessmentsToStartup}
      {access}
    />
  {:else if selectedTab === 'qualified'}
    <QualifiedDialog
      startup={selectedStartup}
      {showDialog}
      {toggleDialog}
      mentors={mentors || []}
      assessments={assessments || []}
      onMarkComplete={markComplete}
      onChangeMentor={changeMentor}
      {startupAssessments}
      {assignAssessmentsToStartup}
      refetchStartupAssessments={fetchStartupAssessments}
      {access}
    />
  {:else if selectedTab === 'completed'}
    <CompletedDialog
      startup={selectedStartup}
      {showDialog}
      {toggleDialog}
      {startupAssessments}
    />
  {/if}
{/if}

<style>
  .loader {
    border: 4px solid hsl(var(--muted));
    border-top: 4px solid hsl(var(--primary));
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
