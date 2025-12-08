<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import ApprovalDialog from './sub/ApprovalDialog.svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import { getBadgeColorObject, getStartupMemberCount } from '$lib/utils';

  export let startup: any;
  export let showDialog: boolean = false;
  export let toggleDialog: () => void;
  export let mentors: any[] = [];
  export let assessments: Array<{
    name: string;
    assessments: Array<{ id: number; name: string; fieldsCount: number }>;
  }> = [];
  export let approveStartup: (startupId: number, mentorId: any) => Promise<void>;
  export let assignAssessmentsToStartup: (startupId: number, assessmentTypeIds: number[]) => Promise<any>;
  export let access: string;

  const memberCount = getStartupMemberCount(startup);

  let showApprovalDialog = false;
  let isLoading = false;

  $: statusColors = getBadgeColorObject('Waitlisted');

  // Filter out empty assessment types and flatten to array with type info
  $: flatAssessments = assessments
    .filter((group) => group.assessments.length > 0) // Only include types with assessments
    .flatMap((group) =>
      group.assessments.map((asmt) => ({
        ...asmt,
        assessmentType: group.name // Add the type name to each assessment
      }))
    );

</script>

{#if startup}
  <Dialog.Root open={showDialog} onOpenChange={toggleDialog}>
    <Dialog.Content class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <!-- Dialog Header -->
      <Dialog.Header class="p-6 border-b">
        <Dialog.Title class="text-2xl font-bold text-foreground">
          {startup.capsuleProposal?.title || startup.name}
        </Dialog.Title>
      </Dialog.Header>

      <!-- Dialog Content -->
      <div class="p-6 pt-2 overflow-y-auto">
        <!-- Status Message with Waitlist Reason -->
        <div class="mb-6 p-4 rounded-lg {statusColors.bg} border {statusColors.border}">
          <h3 class="font-bold mb-1 {statusColors.text}">Status: Waitlisted</h3>
          {#if startup.waitlistMessages && startup.waitlistMessages.length > 0}
            <p class="text-sm mb-2 {statusColors.text}">
              Reason: {startup.waitlistMessages[0].message}
            </p>
            <div class="flex gap-2 text-xs opacity-75 {statusColors.text}">
              <span>
                Waitlisted by: {startup.waitlistMessages[0].manager.firstName} {startup.waitlistMessages[0].manager.lastName}
              </span>
              <span>
                ({new Date(startup.waitlistMessages[0].createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
              </span>
            </div>
          {:else}
            <p class="text-sm {statusColors.text}">This startup has been waitlisted.</p>
          {/if}
        </div>

        <!-- AI Analysis Summary Section -->
        {#if startup.capsuleProposal?.aiAnalysisSummary}
          <div class="border border-border bg-primary/10 rounded-lg p-4 mb-6">
            <h3 class="text-lg font-semibold text-foreground mb-3">AI Analysis Summary</h3>
            <p class="text-foreground leading-relaxed">
              {startup.capsuleProposal.aiAnalysisSummary}
            </p>
          </div>
        {/if}

        <!-- Detailed Application Information -->
        <div>
          <h3 class="text-xl font-bold text-foreground mb-4">Detailed Application Information</h3>
          <div class="border-t pt-4 space-y-14">
            <!-- Row: Description and Target Market -->
            <div class="flex flex-col gap-6">
              <div>
                <h4 class="font-semibold text-foreground mb-2">Startup Description</h4>
                <div class="border border-foreground/50 bg-secondary/10 rounded-lg p-3 h-full">
                  <p class="text-muted-foreground text-sm">
                    {startup.capsuleProposal?.description || 'No description available'}
                  </p>
                </div>
              </div>
              
              {#if startup.capsuleProposal?.targetMarket}
                <div>
                  <h4 class="font-semibold text-foreground mb-2">Target Market</h4>
                  <div class="border border-foreground/50 bg-secondary/10 rounded-lg p-3 h-full">
                    <p class="text-muted-foreground text-sm">
                      {startup.capsuleProposal.targetMarket}
                    </p>
                  </div>
                </div>
              {/if}

              {#if startup.capsuleProposal?.problemStatement}
                  <div>
                    <h4 class="font-semibold text-foreground mb-2">Problem Statement</h4>
                    <div class="border border-foreground/50 bg-secondary/10 rounded-lg p-3 h-full">
                      <p class="text-muted-foreground text-sm">
                        {startup.capsuleProposal.problemStatement}
                      </p>
                    </div>
                  </div>
                {/if}
                {#if startup.capsuleProposal?.solutionDescription}
                  <div>
                    <h4 class="font-semibold text-foreground mb-2">Solution Description</h4>
                    <div class="border border-foreground/50 bg-secondary/10 rounded-lg p-3 h-full">
                      <p class="text-muted-foreground text-sm">
                        {startup.capsuleProposal.solutionDescription}
                      </p>
                    </div>
                  </div>
                {/if}

                <div>
                  <h4 class="font-semibold text-foreground mb-2">Team Size</h4>
                  <div class="border border-foreground/50 bg-secondary/10 rounded-lg p-3 h-full">
                    <p class="text-muted-foreground text-sm">
                      {memberCount} member{memberCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {#if startup.capsuleProposal?.intellectualPropertyStatus}
                  <div>
                    <h4 class="font-semibold text-foreground mb-2">Intellectual Property</h4>
                    <div class="border border-foreground/50 bg-secondary/10 rounded-lg p-3 h-full">
                      <p class="text-muted-foreground text-sm">
                        {startup.capsuleProposal.intellectualPropertyStatus}
                      </p>
                    </div>
                  </div>
                {/if}
            </div>

            <!-- Historical Timeline -->
            {#if startup.capsuleProposal?.historicalTimeline && startup.capsuleProposal.historicalTimeline.length > 0}
              <div class="mt-6">
                <h4 class="font-semibold text-foreground mb-3">Historical Timeline</h4>
                <div class="border border-border bg-secondary/10 rounded-lg p-2">
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head class="font-bold text-foreground">Date</Table.Head>
                        <Table.Head class="font-bold text-foreground">Description</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {#each startup.capsuleProposal.historicalTimeline as timeline}
                        <Table.Row>
                          <Table.Cell class="text-muted-foreground">{timeline.monthYear}</Table.Cell>
                          <Table.Cell class="text-muted-foreground">{timeline.description}</Table.Cell>
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
                <h4 class="font-semibold text-foreground mb-3">Competitive Analysis</h4>
                <div class="border border-border bg-secondary/10 rounded-lg p-2">
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head class="font-bold text-foreground">Competitor</Table.Head>
                        <Table.Head class="font-bold text-foreground">Offering</Table.Head>
                        <Table.Head class="font-bold text-foreground">Pricing Strategy</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {#each startup.capsuleProposal.competitiveAdvantageAnalysis as competitor}
                        <Table.Row>
                          <Table.Cell class="text-muted-foreground">{competitor.competitorName}</Table.Cell>
                          <Table.Cell class="text-muted-foreground">{competitor.offer}</Table.Cell>
                          <Table.Cell class="text-muted-foreground">{competitor.pricingStrategy}</Table.Cell>
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
        <div class="flex justify-end gap-3 mt-8">
          <Button 
            variant="default"
            onclick={() => showApprovalDialog = true}
            class="transition-transform hover:scale-105 duration-200"
          >
            Approve
          </Button>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Root>

  <ApprovalDialog
    {startup}
    showDialog={showApprovalDialog}
    toggleDialog={() => showApprovalDialog = !showApprovalDialog}
    {mentors}
    assessments={flatAssessments}
    onApprove={approveStartup}
    {assignAssessmentsToStartup}
    {access}
  />
{/if}
