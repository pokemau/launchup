<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Select from '$lib/components/ui/select';
  import ConfirmCompleteDialog from './sub/ConfirmCompleteDialog.svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import * as Card from '$lib/components/ui/card/index.js';
  import { getBadgeColorObject, getStartupMemberCount } from '$lib/utils';
  import { toast } from 'svelte-sonner';
  import AssessmentPreviewDialog from './sub/AssessmentPreviewDialog.svelte';
  import { Edit2 } from 'lucide-svelte';

  export let startup: any;
  export let showDialog: boolean = false;
  export let toggleDialog: () => void;
  export let mentors: any[] = [];
  export let onMarkComplete: (startupId: number) => Promise<void>;
  export let onChangeMentor: (
    startupId: number,
    mentorId: number
  ) => Promise<void>;
  export let startupAssessments: Array<{
    id: number;
    assessment: {
      id: number;
      assessmentType: string;
      name: string;
    };
    status: string;
    fields: Array<{
      id: number;
      description: string;
      answerType: string;
      answer?: {
        answerValue?: string;
        fileUrl?: string;
        fileName?: string;
      };
    }>;
  }> = [];
  export let assessments: Array<{
    name: string;
    assessments: Array<{ id: number; name: string; fieldsCount: number }>;
  }> = [];
  export let assignAssessmentsToStartup: (
    startupId: number,
    assessmentTypeIds: number[]
  ) => Promise<any>;
  export let refetchStartupAssessments:
    | ((startupId: number) => Promise<void>)
    | undefined = undefined;
  export let access: string;

  let showConfirmCompleteModal = false;
  let selectedMentorId: string;

  // Edit assessments state
  let showEditAssessments = false;
  let selectedAssessments = new Set<number>();
  let previewOpen = false;
  let previewAssessment: {
    id: number;
    name: string;
    fields?: { id: number; label: string; fieldType: number }[];
  } | null = null;
  let isLoadingAssessments = false;

  const memberCount = getStartupMemberCount(startup);

  $: statusColors = getBadgeColorObject('Qualified');

  // Flatten assessments with type info
  $: flatAssessments = assessments
    .filter((group) => group.assessments.length > 0)
    .flatMap((group) =>
      group.assessments.map((asmt) => ({
        ...asmt,
        assessmentType: group.name
      }))
    );

  // Group flat assessments by type for UI display
  $: groupedAssessments = flatAssessments.reduce(
    (acc, asmt) => {
      const type = asmt.assessmentType || 'Other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(asmt);
      return acc;
    },
    {} as Record<string, typeof flatAssessments>
  );

  // Create a display-friendly version with assessment details at top level
  $: displayAssessments = startupAssessments.map(sa => ({
    id: sa.id,
    name: sa.assessment.name,
    assessmentType: sa.assessment.assessmentType,
    assessmentId: sa.assessment.id,
    status: sa.status,
    fields: sa.fields
  }));

  // Helper function to get status badge color
  function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-secondary/10 border-border text-foreground';
    }
  }

  // Initialize selectedAssessments from startupAssessments
  $: {
    if (startup && displayAssessments.length > 0 && !showEditAssessments) {
      selectedAssessments = new Set(
        displayAssessments
          .map((a) => flatAssessments.find((asmt) => asmt.name === a.name)?.id)
          .filter((id) => id !== undefined) as number[]
      );
    }
  }

  // Update selectedMentorId whenever startup changes
  $: {
    if (startup?.mentors?.[0]?.id) {
      selectedMentorId = String(startup.mentors[0].id);
    }
  }

  $: showSaveMentorButton =
    selectedMentorId && selectedMentorId !== String(startup?.mentors?.[0]?.id);

  function toggleAssessment(id: number, assessmentType: string) {
    const next = new Set(selectedAssessments);

    // Find all assessments of the same type
    const sameTypeAssessments = flatAssessments
      .filter((a) => a.assessmentType === assessmentType)
      .map((a) => a.id);

    // If clicking the already selected assessment, uncheck it
    if (next.has(id)) {
      next.delete(id);
    } else {
      // Remove all other assessments of the same type
      sameTypeAssessments.forEach((asmtId) => next.delete(asmtId));
      // Add the newly selected assessment
      next.add(id);
    }

    selectedAssessments = next;
  }

  function openPreview(asmt: {
    id: number;
    name: string;
    fields?: { id: number; label: string; fieldType: number }[];
  }) {
    previewAssessment = asmt;
    previewOpen = true;
  }

  function closePreview() {
    previewOpen = false;
  }

  function cancelEditAssessments() {
    showEditAssessments = false;
    // Reset selectedAssessments to original
    selectedAssessments = new Set(
      displayAssessments
        .map((a) => flatAssessments.find((asmt) => asmt.name === a.name)?.id)
        .filter((id) => id !== undefined) as number[]
    );
  }

  async function handleSaveAssessments() {
    if (selectedAssessments.size === 0) {
      toast.error('Please select at least one assessment.');
      return;
    }
    isLoadingAssessments = true;
    try {
      await assignAssessmentsToStartup(
        startup.id,
        Array.from(selectedAssessments)
      );

      // Refetch startup assessments if function is provided
      if (refetchStartupAssessments) {
        await refetchStartupAssessments(startup.id);
      }

      toast.success('Assessments updated successfully');
      showEditAssessments = false;
    } catch (error) {
      console.error('Error updating assessments:', error);
      toast.error('Failed to update assessments. Please try again.');
    } finally {
      isLoadingAssessments = false;
    }
  }

  async function handleMarkAsComplete() {
    try {
      await onMarkComplete(startup.id);
      toggleDialog();
    } catch (error) {
      console.error('Error marking startup as complete:', error);
    }
  }

  async function handleChangeMentor() {
    if (selectedMentorId) {
      try {
        await onChangeMentor(startup.id, Number(selectedMentorId));
      } catch (error) {
        console.error('Error changing mentor:', error);
      }
    }
  }
</script>

{#if startup}
  <Dialog.Root open={showDialog} onOpenChange={toggleDialog}>
    <Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
      <!-- Dialog Header -->
      <Dialog.Header class="border-b p-6">
        <Dialog.Title class="text-2xl font-bold text-foreground">
          {startup.capsuleProposal?.title || startup.name}
        </Dialog.Title>
      </Dialog.Header>

      <!-- Dialog Content -->
      <div class="overflow-y-auto p-6 pt-2">
        <!-- Status Message -->
        <div
          class="mb-6 rounded-lg border p-4 {statusColors.bg} {statusColors.border}"
        >
          <h3 class="mb-1 font-bold {statusColors.text}">Status: Qualified</h3>
          <p class="text-sm {statusColors.text}">
            This startup has been approved and assigned readiness level
            assessments.
          </p>
        </div>

        <!-- Assessments and Mentor Section -->
        <div class="mb-8">
          <!-- Assigned Assessments -->
          <div class="mb-6">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-lg font-medium">Assigned Assessments</h3>
              {#if !showEditAssessments}
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => (showEditAssessments = true)}
                  class="gap-2"
                >
                  <Edit2 class="h-3.5 w-3.5" />
                  Edit
                </Button>
              {/if}
            </div>

            {#if showEditAssessments}
              <!-- Edit Mode - Radio Selection Grouped by Type -->
              <p class="mb-4 text-sm text-muted-foreground">
                Select one assessment per type for this startup to complete
              </p>
              {#if flatAssessments && flatAssessments.length > 0}
                <div class="mb-4 space-y-4">
                  {#each Object.entries(groupedAssessments) as [type, typeAssessments]}
                    <div class="space-y-2">
                      <h4 class="text-sm font-semibold text-foreground">
                        {type}
                      </h4>
                      <div class="space-y-2">
                        {#each typeAssessments as asmt (asmt.id)}
                          <Card.Root class="bg-secondary/10 border">
                            <div class="flex items-center justify-between p-3">
                              <label
                                class="flex cursor-pointer select-none items-center gap-3"
                              >
                                <input
                                  type="radio"
                                  name="assessment-{type}"
                                  class="h-4 w-4 accent-primary"
                                  checked={selectedAssessments.has(asmt.id)}
                                  on:change={() =>
                                    toggleAssessment(asmt.id, type)}
                                />
                                <span class="font-medium text-foreground"
                                  >{asmt.name}</span
                                >
                              </label>
                              <Button
                                variant="outline"
                                size="sm"
                                onclick={() => openPreview(asmt)}
                                class="shrink-0"
                              >
                                View Details
                              </Button>
                            </div>
                          </Card.Root>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="mb-4 text-sm text-muted-foreground">
                  No assessments available.
                </p>
              {/if}

              <!-- Action buttons for edit mode -->
              <div class="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onclick={cancelEditAssessments}
                  disabled={isLoadingAssessments}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onclick={handleSaveAssessments}
                  disabled={selectedAssessments.size === 0 ||
                    isLoadingAssessments}
                >
                  {isLoadingAssessments ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            {:else}
              <!-- Read-only view -->
              {#if displayAssessments.length === 0}
                <p class="text-sm text-muted-foreground">
                  No assessments assigned.
                </p>
              {:else}
                <div class="flex flex-wrap gap-2">
                  {#each displayAssessments as a}
                    <span
                      class="rounded-full border px-3 py-1 text-sm font-medium {getStatusColor(a.status)}"
                    >
                      {a.name} ({a.assessmentType})
                    </span>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>

          <!-- Assigned Mentor Section -->
          <div class="space-y-2">
            <h3 class="text-lg font-medium">Assigned Mentor</h3>
            <div class="flex flex-col gap-3">
              <div class="flex-1">
                <Select.Root type="single" bind:value={selectedMentorId}>
                  <Select.Trigger class="w-full">
                    {#if startup?.mentors?.[0]}
                      <div class="flex w-full flex-wrap items-center gap-2">
                        <span>
                          {mentors.find(
                            (m) =>
                              String(m.id) ===
                              (selectedMentorId ??
                                String(startup.mentors[0].id))
                          )?.firstName}
                          {' '}
                          {mentors.find(
                            (m) =>
                              String(m.id) ===
                              (selectedMentorId ??
                                String(startup.mentors[0].id))
                          )?.lastName}
                        </span>
                        {#if mentors.find((m) => String(m.id) === (selectedMentorId ?? String(startup.mentors[0].id)))?.email}
                          <span
                            class="ml-auto mr-2 whitespace-nowrap text-sm text-muted-foreground"
                          >
                            {mentors.find(
                              (m) =>
                                String(m.id) ===
                                (selectedMentorId ??
                                  String(startup.mentors[0].id))
                            )?.email}
                          </span>
                        {/if}
                      </div>
                    {:else}
                      Select Mentor
                    {/if}
                  </Select.Trigger>
                  <Select.Content>
                    {#each mentors as mentor}
                      <Select.Item value={String(mentor.id)}>
                        <div class="flex w-full items-center gap-2">
                          <span>{mentor.firstName} {mentor.lastName}</span>
                          {#if mentor.email}
                            <span
                              class="ml-auto whitespace-nowrap text-sm text-muted-foreground"
                              >{mentor.email}</span
                            >
                          {/if}
                        </div>
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
              {#if showSaveMentorButton}
                <Button
                  onclick={handleChangeMentor}
                  class="self-end transition-transform duration-200 hover:scale-105"
                >
                  Save Mentor
                </Button>
              {/if}
            </div>
          </div>
        </div>

        <!-- AI Analysis Summary Section -->
        {#if startup.capsuleProposal?.aiAnalysisSummary}
          <div class="bg-primary/10 mb-6 rounded-lg border border-border p-4">
            <h3 class="mb-3 text-lg font-semibold text-foreground">
              AI Analysis Summary
            </h3>
            <p class="leading-relaxed text-foreground">
              {startup.capsuleProposal.aiAnalysisSummary}
            </p>
          </div>
        {/if}

        <!-- Detailed Application Information -->
        <div>
          <h3 class="mb-4 text-xl font-bold text-foreground">
            Detailed Application Information
          </h3>
          <div class="space-y-6 border-t pt-4">
            <!-- Standard information sections -->
            <div class="flex flex-col gap-6">
              <div>
                <h4 class="mb-2 font-semibold text-foreground">
                  Startup Description
                </h4>
                <div
                  class="border-foreground/50 bg-secondary/10 h-full rounded-lg border p-3"
                >
                  <p class="text-sm text-muted-foreground">
                    {startup.capsuleProposal?.description ||
                      'No description available'}
                  </p>
                </div>
              </div>

              {#if startup.capsuleProposal?.targetMarket}
                <div>
                  <h4 class="mb-2 font-semibold text-foreground">
                    Target Market
                  </h4>
                  <div
                    class="border-foreground/50 bg-secondary/10 h-full rounded-lg border p-3"
                  >
                    <p class="text-sm text-muted-foreground">
                      {startup.capsuleProposal.targetMarket}
                    </p>
                  </div>
                </div>
              {/if}

              {#if startup.capsuleProposal?.problemStatement}
                <div>
                  <h4 class="mb-2 font-semibold text-foreground">
                    Problem Statement
                  </h4>
                  <div
                    class="border-foreground/50 bg-secondary/10 h-full rounded-lg border p-3"
                  >
                    <p class="text-sm text-muted-foreground">
                      {startup.capsuleProposal.problemStatement}
                    </p>
                  </div>
                </div>
              {/if}

              {#if startup.capsuleProposal?.solutionDescription}
                <div>
                  <h4 class="mb-2 font-semibold text-foreground">
                    Solution Description
                  </h4>
                  <div
                    class="border-foreground/50 bg-secondary/10 h-full rounded-lg border p-3"
                  >
                    <p class="text-sm text-muted-foreground">
                      {startup.capsuleProposal.solutionDescription}
                    </p>
                  </div>
                </div>
              {/if}

              <div>
                <h4 class="mb-2 font-semibold text-foreground">Team Size</h4>
                <div
                  class="border-foreground/50 bg-secondary/10 h-full rounded-lg border p-3"
                >
                  <p class="text-sm text-muted-foreground">
                    {memberCount} member{memberCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {#if startup.capsuleProposal?.intellectualPropertyStatus}
                <div>
                  <h4 class="mb-2 font-semibold text-foreground">
                    Intellectual Property
                  </h4>
                  <div
                    class="border-foreground/50 bg-secondary/10 h-full rounded-lg border p-3"
                  >
                    <p class="text-sm text-muted-foreground">
                      {startup.capsuleProposal.intellectualPropertyStatus}
                    </p>
                  </div>
                </div>
              {/if}
            </div>

            <!-- Historical Timeline -->
            {#if startup.capsuleProposal?.historicalTimeline && startup.capsuleProposal.historicalTimeline.length > 0}
              <div class="mt-6">
                <h4 class="mb-3 font-semibold text-foreground">
                  Historical Timeline
                </h4>
                <div
                  class="bg-secondary/10 rounded-lg border border-border p-2"
                >
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head class="font-bold text-foreground"
                          >Date</Table.Head
                        >
                        <Table.Head class="font-bold text-foreground"
                          >Description</Table.Head
                        >
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {#each startup.capsuleProposal.historicalTimeline as timeline}
                        <Table.Row>
                          <Table.Cell class="text-muted-foreground"
                            >{timeline.monthYear}</Table.Cell
                          >
                          <Table.Cell class="text-muted-foreground"
                            >{timeline.description}</Table.Cell
                          >
                        </Table.Row>
                      {/each}
                    </Table.Body>
                  </Table.Root>
                </div>
              </div>
            {/if}

            <!-- Competitive Analysis -->
            {#if startup.capsuleProposal?.competitiveAdvantageAnalysis && startup.capsuleProposal.competitiveAdvantageAnalysis.length > 0}
              <div class="mt-6">
                <h4 class="mb-3 font-semibold text-foreground">
                  Competitive Analysis
                </h4>
                <div
                  class="bg-secondary/10 rounded-lg border border-border p-2"
                >
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head class="font-bold text-foreground"
                          >Competitor</Table.Head
                        >
                        <Table.Head class="font-bold text-foreground"
                          >Offering</Table.Head
                        >
                        <Table.Head class="font-bold text-foreground"
                          >Pricing Strategy</Table.Head
                        >
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {#each startup.capsuleProposal.competitiveAdvantageAnalysis as competitor}
                        <Table.Row>
                          <Table.Cell class="text-muted-foreground"
                            >{competitor.competitorName}</Table.Cell
                          >
                          <Table.Cell class="text-muted-foreground"
                            >{competitor.offer}</Table.Cell
                          >
                          <Table.Cell class="text-muted-foreground"
                            >{competitor.pricingStrategy}</Table.Cell
                          >
                        </Table.Row>
                      {/each}
                    </Table.Body>
                  </Table.Root>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-8 flex justify-end gap-3">
          <Button
            onclick={() => (showConfirmCompleteModal = true)}
            class="transition-transform duration-200 hover:scale-105"
          >
            Mark as Complete
          </Button>
        </div>

        <ConfirmCompleteDialog
          showDialog={showConfirmCompleteModal}
          toggleDialog={() =>
            (showConfirmCompleteModal = !showConfirmCompleteModal)}
          onConfirm={handleMarkAsComplete}
        />

        <AssessmentPreviewDialog
          open={previewOpen}
          onOpenChange={closePreview}
          assessment={previewAssessment}
          {access}
        />
      </div>
    </Dialog.Content>
  </Dialog.Root>
{/if}
