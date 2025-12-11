<script lang="ts">
  import { useQuery } from '@sveltestack/svelte-query';
  import axiosInstance from '$lib/axios';
  import { toast } from 'svelte-sonner';
  import * as Card from '$lib/components/ui/card/index.js';
  import ReadinessAssessmentCard from '$lib/components/startups/assessment/ReadinessAssessmentCard.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import ReadinessAssessmentForm from '$lib/components/startups/assessment/ReadinessAssessmentForm.svelte';
  import type { Assessment } from '$lib/types/assessment.types';
  import Loading from '$lib/components/startup/Loading.svelte';
  import { getReadinessTypes, getReadinessStyles } from '$lib/utils';
  import ShortAnswerField from '$lib/components/startups/assessment/AssessmentTypes/ShortAnswerField.svelte';
  import LongAnswerField from '$lib/components/startups/assessment/AssessmentTypes/LongAnswerField.svelte';
  import FileUploadField from '$lib/components/startups/assessment/AssessmentTypes/FileUploadField.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Select from '$lib/components/ui/select';
  import { Checkbox } from '$lib/components/ui/checkbox';

  const { data } = $props();
  const { access, startupId } = data;

  let showAssessmentForm = $state(false);
  let showTypeModal = $state(false);
  let selectedReadinessType = $state<string | null>(null);
  let assessmentAnswers = $state<Record<number, string>>({});
  let fileUploadComponents = $state<Record<number, FileUploadField>>({});
  let isSubmittingAssessment = $state<Record<number, boolean>>({});
  let readinessLevel = $state<string>('1');
  let isRatingAssessment = $state(false);
  let togglingApplicable = $state<Record<number, boolean>>({});

  const readinessLevelQuery = useQuery({
    queryKey: ['startupReadinessLevels', startupId],
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/readinesslevel/readiness-level?startupId=${startupId}`,
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );
      return response.data;
    }
  });

  const readinessLevelsByType = $derived(() => {
    const levels: Record<string, string> = {};
    $readinessLevelQuery.data?.forEach((item: any) => {
      levels[item.readinessLevel.readinessType] =
        item.readinessLevel.level.toString();
    });
    return levels;
  });

  function toggleAssessmentForm(): void {
    showAssessmentForm = !showAssessmentForm;
  }

  async function toggleAssessmentApplicability(
    startupAssessmentId: number,
    currentApplicable: boolean
  ): Promise<void> {
    try {
      togglingApplicable[startupAssessmentId] = true;

      await axiosInstance.patch(
        `/assessments/startup-assessment/${startupAssessmentId}/toggle-applicable`,
        {
          isApplicable: !currentApplicable
        },
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );

      toast.success(
        `Assessment marked as ${!currentApplicable ? 'applicable' : 'not applicable'}`
      );
      await $assessmentQuery.refetch();
    } catch (error: any) {
      console.error('Error toggling assessment applicability:', error);
      toast.error('Failed to update assessment applicability');
    } finally {
      togglingApplicable[startupAssessmentId] = false;
    }
  }

  function openTypeModal(typeName: string): void {
    selectedReadinessType = typeName;
    showTypeModal = true;
    readinessLevel = readinessLevelsByType()[typeName] || '1';
    const typeAssessments = assessmentsByType()[typeName] || [];
    typeAssessments.forEach((assessment: any) => {
      if (
        assessment.response?.answerValue &&
        !assessmentAnswers[assessment.assessment.id]
      ) {
        assessmentAnswers[assessment.assessment.id] =
          assessment.response.answerValue;
      }
    });
  }

  function closeTypeModal(): void {
    showTypeModal = false;
    selectedReadinessType = null;
    readinessLevel = '1';
  }

  async function rateAssessmentType(): Promise<void> {
    if (!selectedReadinessType) return;

    try {
      isRatingAssessment = true;
      await axiosInstance.post(
        `/readinesslevel/startup/${startupId}/rate`,
        {
          readinessType: selectedReadinessType,
          level: Number(readinessLevel)
        },
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      );

      toast.success(
        `${selectedReadinessType} readiness level set to ${readinessLevel}`
      );
      await $assessmentQuery.refetch();
      await $readinessLevelQuery.refetch();
    } catch (error) {
      console.error('Error rating assessment:', error);
      toast.error('Failed to rate assessment');
    } finally {
      isRatingAssessment = false;
    }
  }

  async function submitSingleAssessment(assessmentData: any): Promise<void> {
    const assessmentId = assessmentData.assessment.id;

    try {
      isSubmittingAssessment[assessmentId] = true;

      const fileComponent = fileUploadComponents[assessmentId];
      if (
        fileComponent &&
        typeof fileComponent.uploadPendingFiles === 'function'
      ) {
        await fileComponent.uploadPendingFiles();
      }

      await axiosInstance.post(
        `/startups/${startupId}/responses`,
        {
          responses: [
            {
              assessmentId: assessmentId,
              answerValue: assessmentAnswers[assessmentId] || '',
              fileUrl: assessmentData.response?.fileUrl || '',
              fileName: assessmentData.response?.fileName || ''
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );

      toast.success(`${assessmentData.assessment.name} submitted successfully`);
      await $assessmentQuery.refetch();
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      toast.error(`Failed to submit ${assessmentData.assessment.name}`);
    } finally {
      isSubmittingAssessment[assessmentId] = false;
    }
  }

  async function handleAssessmentSubmit(detail: {
    assessmentId: number;
    startupId: string;
    answer?: string;
    fileUrl?: string;
    fileName?: string;
  }): Promise<void> {
    const { assessmentId, startupId, answer, fileUrl, fileName } = detail;

    try {
      await axiosInstance.post(
        `/startups/${startupId}/responses`,
        {
          responses: [
            {
              assessmentId: assessmentId,
              answerValue: answer || '',
              fileUrl: fileUrl || '',
              fileName: fileName || ''
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );

      toast.success('Assessment submitted successfully');

      await $assessmentQuery.refetch();
      toggleAssessmentForm();
    } catch (error: any) {
      console.error('=== SUBMISSION ERROR ===');
      console.error('Error submitting assessment:', error);
      console.error('Error response:', error.response?.data);
      console.error('=== END ERROR ===');
      toast.error('Failed to submit assessment');
    }
  }

  const assessmentQuery = useQuery({
    queryKey: ['assessmentData', startupId],
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/assessments/startup/${startupId}`,
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );
      return response.data;
    }
  });

  const isLoading = $derived($assessmentQuery.isLoading);
  const isError = $derived($assessmentQuery.isError);
  let hasAssessment = $state(false);

  $effect(() => {
    if ($assessmentQuery.data) {
      hasAssessment = $assessmentQuery.data.length > 0;
    }
  });

  let selectedAssessment = $state<any | null>(null);

  function openAssessment(assessmentData: any): void {
    selectedAssessment = assessmentData;
    toggleAssessmentForm();
  }

  const displayedAssessments = $derived(() => {
    let filtered = $assessmentQuery.data;

    return (
      filtered?.sort((a: any, b: any) => {
        const getPriority = (assessment: any) => {
          if (!assessment.isApplicable) return 3;
          if (assessment.status === 'Pending') return 1;
          return 2;
        };
        return getPriority(a) - getPriority(b);
      }) || []
    );
  });

  const readinessTypes = getReadinessTypes();

  // Group assessments by readiness type
  const assessmentsByType = $derived(() => {
    const grouped: Record<string, any[]> = {};

    readinessTypes.forEach((type) => {
      grouped[type.name] = [];
    });

    displayedAssessments()?.forEach((assessment: any) => {
      const typeName = assessment.assessment?.assessmentType;
      if (typeName && grouped[typeName]) {
        grouped[typeName].push(assessment);
      }
    });

    return grouped;
  });
</script>

{#if isLoading}
  {@render loading()}
{:else if hasAssessment}
  {@render hasAssessments()}
{:else if !hasAssessment}
  {@render noAssessments()}
{:else if isError}
  {@render error()}
{/if}

{#snippet hasAssessments()}
  {#if data.role === 'Startup'}
    <h1>
      Your application has been approved. Please complete the following
      readiness assessments
    </h1>
  {:else}
    <h1>
      Here are the current assessments of the startup. Click on "View
      Assessment" to see their progress.
    </h1>
  {/if}
  <h2 class="mt-6 text-xl font-bold">Required Assessments</h2>

  {console.log(displayedAssessments())}

  <!-- Readiness Type Cards -->
  <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each readinessTypes as type}
      {@const assessments = assessmentsByType()[type.name] || []}
      {@const applicableAssessments = assessments.filter(
        (a: any) => a.isApplicable
      )}
      {@const completedCount = applicableAssessments.filter((a: any) => {
        const hasAnswer =
          a.response?.answerValue &&
          String(a.response.answerValue).trim() !== '';
        return a.status === 'Completed' && hasAnswer;
      }).length}
      {@const pendingCount = applicableAssessments.length - completedCount}
      {@const currentLevel = readinessLevelsByType()[type.name]}

      <Card.Root
        class={`cursor-pointer transition-all ${getReadinessStyles(type.name as any)}`}
        onclick={() => openTypeModal(type.name)}
      >
        <Card.Content class="p-6">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-xl font-bold">{type.name}</h3>
            {#if currentLevel}
              <span class="text-sm font-semibold opacity-80"
                >Level {currentLevel}</span
              >
            {/if}
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>Assessments: {assessments.length}</span>
            {#if assessments.length > 0}
              <div class="flex gap-2">
                {#if pendingCount > 0}
                  <span class="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-200 border border-amber-500/30">
                    {pendingCount} Pending
                  </span>
                {/if}
                {#if completedCount > 0}
                  <span class="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200 border border-emerald-500/30">
                    {completedCount} Done
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
  </div>

  <!-- Type Modal with Assessments -->
  <Dialog.Root open={showTypeModal} onOpenChange={closeTypeModal}>
    <Dialog.Content class="max-h-[85vh] max-w-[900px]">
      <Dialog.Header>
        <Dialog.Title class="text-2xl font-semibold">
          {selectedReadinessType} Assessments
        </Dialog.Title>
        <Dialog.Description>
          {#if data.role === 'Startup'}
            Complete all assessments below to improve your readiness level
          {:else}
            View and rate the startup's assessment responses
          {/if}
        </Dialog.Description>
      </Dialog.Header>

      <div class="max-h-[calc(85vh-180px)] overflow-y-auto px-4">
        {#if selectedReadinessType && assessmentsByType()[selectedReadinessType]?.length > 0}
          <div class="flex flex-col gap-6">
            {#each assessmentsByType()[selectedReadinessType] as assessmentData, index}
              {@const assessmentId = assessmentData.assessment.id}
              {@const isSubmitting =
                isSubmittingAssessment[assessmentId] || false}
              {@const hasAnswer =
                assessmentData.response?.answerValue &&
                String(assessmentData.response.answerValue).trim() !== ''}
              {@const isCompleted =
                assessmentData.status === 'Completed' && hasAnswer}
              {@const isToggling =
                togglingApplicable[assessmentData.id] || false}

              <div class="rounded-lg border p-4">
                <!-- Assessment Header -->
                <div class="mb-4 flex items-start justify-between gap-3">
                  <div class="flex flex-1 items-start gap-3">
                    <div class="flex items-center pt-1">
                      <Checkbox
                        checked={assessmentData.isApplicable}
                        disabled={isToggling}
                        onCheckedChange={() =>
                          toggleAssessmentApplicability(
                            assessmentData.id,
                            assessmentData.isApplicable
                          )}
                        aria-label="Toggle assessment applicability"
                      />
                    </div>
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold">
                        {assessmentData.assessment.name}
                      </h3>
                      <p class="text-sm text-muted-foreground">
                        Type: {assessmentData.assessment.answerType}
                      </p>
                      {#if !assessmentData.isApplicable}
                        <p
                          class="mt-1 text-xs text-orange-600 dark:text-orange-400"
                        >
                          Not applicable to this startup
                        </p>
                      {/if}
                    </div>
                  </div>
                  {#if assessmentData.isApplicable}
                    <Badge
                      variant={isCompleted ? 'default' : 'secondary'}
                      class={isCompleted 
                        ? 'bg-emerald-600/90 text-emerald-100 border border-emerald-500/30' 
                        : 'bg-amber-600/90 text-amber-100 border border-amber-500/30'}
                    >
                      {isCompleted ? 'Completed' : 'Pending'}
                    </Badge>
                  {/if}
                </div>

                <!-- Assessment Field Based on Type -->
                <div class="mb-4">
                  {#if assessmentData.assessment.answerType === 'ShortAnswer'}
                    <ShortAnswerField
                      description={assessmentData.assessment.name}
                      bind:value={assessmentAnswers[assessmentId]}
                      isReadOnly={data.role === 'Mentor' || !assessmentData.isApplicable}
                    />
                  {:else if assessmentData.assessment.answerType === 'LongAnswer'}
                    <LongAnswerField
                      description={assessmentData.assessment.name}
                      bind:value={assessmentAnswers[assessmentId]}
                      isReadOnly={data.role === 'Mentor' || !assessmentData.isApplicable}
                    />
                  {:else if assessmentData.assessment.answerType === 'File'}
                    <FileUploadField
                      bind:this={fileUploadComponents[assessmentId]}
                      description={assessmentData.assessment.name}
                      fileUrl={assessmentData.response?.fileUrl || ''}
                      bind:value={assessmentAnswers[assessmentId]}
                      isReadOnly={data.role === 'Mentor' || !assessmentData.isApplicable}
                      {access}
                      {startupId}
                      assessmentId={assessmentId.toString()}
                      assessmentName={assessmentData.assessment.name}
                      on:fileRemoved={() => $assessmentQuery.refetch()}
                    />
                  {/if}
                </div>

                <!-- Submit Button (Only for Startup) -->
                {#if data.role === 'Startup'}
                  <div class="flex justify-end">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={isSubmitting || !assessmentData.isApplicable}
                      onclick={() => submitSingleAssessment(assessmentData)}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                    </Button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center gap-3 py-8">
            <p class="text-muted-foreground">
              No assessments found for {selectedReadinessType}
            </p>
          </div>
        {/if}
      </div>

      <div class="flex items-center justify-between gap-3 border-t pt-4">
        {#if data.role === 'Mentor'}
          {@const typeAssessments = selectedReadinessType
            ? assessmentsByType()[selectedReadinessType] || []
            : []}
          {@const hasApplicableAssessments = typeAssessments.some(
            (a: any) => a.isApplicable
          )}
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">Rate Readiness Level:</span>
            <Select.Root type="single" bind:value={readinessLevel}>
              <Select.Trigger
                class="w-[120px]"
                disabled={!hasApplicableAssessments}
              >
                Level {readinessLevel}
              </Select.Trigger>
              <Select.Content>
                {#each Array.from( { length: 9 }, (_, i) => (i + 1).toString() ) as level}
                  <Select.Item value={level}>Level {level}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <Button
              variant="default"
              size="sm"
              disabled={isRatingAssessment || !hasApplicableAssessments}
              onclick={rateAssessmentType}
            >
              {isRatingAssessment ? 'Rating...' : 'Rate'}
            </Button>
            {#if !hasApplicableAssessments}
              <span class="text-xs text-muted-foreground">
                No applicable assessments to rate
              </span>
            {/if}
          </div>
        {/if}
        <Button variant="outline" onclick={closeTypeModal}>Close</Button>
      </div>
    </Dialog.Content>
  </Dialog.Root>

  <!-- Original Assessment Form Modal -->
  <Dialog.Root open={showAssessmentForm} onOpenChange={toggleAssessmentForm}>
    <Dialog.Content class="h-4/5 max-w-[800px]">
      {#if selectedAssessment}
        <ReadinessAssessmentForm
          {access}
          {startupId}
          assessment={selectedAssessment}
          onclose={toggleAssessmentForm}
          onsubmit={handleAssessmentSubmit}
          onstatusChanged={() => $assessmentQuery.refetch()}
          isMentor={data.role === 'Mentor'}
        />
      {/if}
    </Dialog.Content>
  </Dialog.Root>
{/snippet}

{#snippet noAssessments()}
  <Card.Root class="h-full">
    <Card.Content
      class="flex h-full flex-col items-center justify-center gap-5"
    >
      <img src="/pending.svg" alt="pending" class="h-[300px] w-[300px]" />
      <h1>
        This startup is currently not assigned with an assessment right now.
      </h1>
    </Card.Content>
  </Card.Root>
{/snippet}

{#snippet loading()}
  <Loading {data}></Loading>
{/snippet}

{#snippet error()}
  ERROR
{/snippet}
