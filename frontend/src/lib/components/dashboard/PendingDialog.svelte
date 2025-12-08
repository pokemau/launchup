<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Dialog from '$lib/components/ui/dialog';
  import WaitlistDialog from './sub/WaitlistDialog.svelte';
  import ApprovalDialog from './sub/ApprovalDialog.svelte';
  import * as Table from '$lib/components/ui/table/index.js';
  import { getBadgeColorObject, getStartupMemberCount } from '$lib/utils';

  export let startup: any;
  export let showDialog: boolean = false;
  export let toggleDialog: () => void;
  export let waitlistStartup: (
    startupId: number,
    message: string
  ) => Promise<any>;
  export let mentors: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }[] = [];
  export let assessments: Array<{
    name: string;
    assessments: Array<{ id: number; name: string; fieldsCount: number }>;
  }> = [];
  export let approveStartup: (
    startupId: number,
    mentorId: any
  ) => Promise<void>;
  export let assignAssessmentsToStartup: (
    startupId: number,
    assessmentTypeIds: number[]
  ) => Promise<any>;
  export let access: string;

  let showWaitlistDialog = false;
  let showApprovalDialog = false;

  $: statusColors = getBadgeColorObject('Pending');

  // Filter out empty assessment types and flatten to array with type info
  $: flatAssessments = assessments
    .filter((group) => group.assessments.length > 0) // Only include types with assessments
    .flatMap((group) =>
      group.assessments.map((asmt) => ({
        ...asmt,
        assessmentType: group.name // Add the type name to each assessment
      }))
    );

  function toggleWaitlistDialog() {
    showWaitlistDialog = !showWaitlistDialog;
  }

  function toggleApprovalDialog() {
    showApprovalDialog = !showApprovalDialog;
  }

  const memberCount = getStartupMemberCount(startup);
</script>

{#if startup}
  {@const startupData = startup}
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
          class="mb-6 rounded-lg p-4 {statusColors.bg} border {statusColors.border}"
        >
          <h3 class="mb-1 font-bold {statusColors.text}">Status: Pending</h3>
          <p class="text-sm {statusColors.text}">
            This startup application is awaiting review.
          </p>
        </div>

        <!-- AI Analysis Summary Section -->
        {#if startup.capsuleProposal?.aiAnalysisSummary}
          <div class="mb-6 rounded-lg border border-border p-4">
            <h3 class="mb-3 text-lg font-semibold text-foreground">
              AI Analysis Summary
            </h3>
            <p class="leading-relaxed text-muted-foreground">
              {startup.capsuleProposal.aiAnalysisSummary}
            </p>
          </div>
        {/if}

        <!-- Detailed Application Information -->
        <div>
          <h3 class="mb-4 text-xl font-bold text-foreground">
            Detailed Application Information
          </h3>
          <div class="space-y-14 border-t pt-4">
            <!-- Row: Description and Target Market -->
            <div class="flex flex-col gap-6">
              <div>
                <h4 class="mb-2 font-semibold text-foreground">
                  Startup Description
                </h4>
                <div class="h-full rounded-lg border border-border p-3">
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
                  <div class="h-full rounded-lg border border-border p-3">
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
                  <div class="h-full rounded-lg border border-border p-3">
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
                  <div class="h-full rounded-lg border border-border p-3">
                    <p class="text-sm text-muted-foreground">
                      {startup.capsuleProposal.solutionDescription}
                    </p>
                  </div>
                </div>
              {/if}

              <div>
                <h4 class="mb-2 font-semibold text-foreground">Team Size</h4>
                <div class="h-full rounded-lg border border-border p-3">
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
                  <div class="h-full rounded-lg border border-border p-3">
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
                <div class="rounded-lg border border-border p-2">
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
                <div class="rounded-lg border border-border p-2">
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
            variant="outline"
            class="transition-transform duration-200 hover:scale-105"
            onclick={toggleWaitlistDialog}
          >
            Waitlist
          </Button>
          <Button
            class="transition-transform duration-200 hover:scale-105"
            onclick={toggleApprovalDialog}
          >
            Approve
          </Button>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Root>

  <WaitlistDialog
    showDialog={showWaitlistDialog}
    toggleDialog={toggleWaitlistDialog}
    startupId={startup?.id}
    {waitlistStartup}
  />

  <ApprovalDialog
    {startup}
    showDialog={showApprovalDialog}
    toggleDialog={toggleApprovalDialog}
    {mentors}
    assessments={flatAssessments}
    onApprove={approveStartup}
    {assignAssessmentsToStartup}
    {access}
  />
{/if}
