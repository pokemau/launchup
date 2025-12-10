<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import ShortAnswerField from './AssessmentTypes/ShortAnswerField.svelte';
  import LongAnswerField from './AssessmentTypes/LongAnswerField.svelte';
  import FileUploadField from './AssessmentTypes/FileUploadField.svelte';
  import type { Assessment } from '$lib/types/assessment.types';
  import axiosInstance from '$lib/axios';
  import { toast } from 'svelte-sonner';

  interface Props {
    access: string;
    startupId: string;
    assessment: Assessment;
    isMentor?: boolean;
    onclose?: () => void;
    onsubmit?: (detail: {
      assessmentId: number;
      startupId: string;
      answer?: string;
      fileUrl?: string;
      fileName?: string;
    }) => void;
    onstatusChanged?: () => void;
  }

  const {
    access,
    startupId,
    assessment,
    isMentor = false,
    onclose,
    onsubmit,
    onstatusChanged
  }: Props = $props();

  let answerValue = $state('');
  let isSubmitting = $state(false);
  let isChangingStatus = $state(false);
  let fileUploadComponent: FileUploadField | undefined = $state(undefined);
  let readinessLevel = $state('1');
  let isLoadingReadinessLevel = $state(false);

  // Initialize form data with existing answer
  $effect(() => {
    if (assessment?.response) {
      answerValue = assessment.response.answerValue || '';
    }
  });

  // Fetch current readiness level when component loads (for mentor view)
  $effect(() => {
    if (isMentor && assessment?.assessment?.assessmentType && startupId) {
      fetchCurrentReadinessLevel();
    }
  });

  async function fetchCurrentReadinessLevel() {
    if (isLoadingReadinessLevel) return; // Prevent duplicate calls

    try {
      isLoadingReadinessLevel = true;
      const response = await axiosInstance.get(
        `/readinesslevel/readiness-level?startupId=${startupId}`,
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      );

      // Find the readiness level for this assessment's type
      const currentLevel = response.data.find(
        (rl: any) =>
          rl.readinessLevel.readinessType === assessment.assessment.assessmentType
      );

      if (currentLevel) {
        readinessLevel = currentLevel.readinessLevel.level.toString();
      }
    } catch (error) {
      console.error('Error fetching current readiness level:', error);
      // Keep default value of '1' if fetch fails
    } finally {
      isLoadingReadinessLevel = false;
    }
  }

  const isFileUploading = $derived(
    (fileUploadComponent as any)?.processing || false
  );

  async function handleSubmit(): Promise<void> {
    if (isFileUploading) {
      toast.error('Please wait for file upload to complete');
      return;
    }

    try {
      isSubmitting = true;

      // Upload pending file if exists
      if (
        fileUploadComponent &&
        typeof fileUploadComponent.uploadPendingFiles === 'function'
      ) {
        await fileUploadComponent.uploadPendingFiles();
      }

      onsubmit?.({
        assessmentId: assessment.assessment.id,
        startupId,
        answer: answerValue,
        fileUrl: assessment.response?.fileUrl,
        fileName: assessment.response?.fileName
      });

      toast.success('Assessment submitted successfully');
      // Don't close the form, let it refresh with updated data
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Failed to upload file or submit assessment');
    } finally {
      isSubmitting = false;
    }
  }

  async function rateAssessment(): Promise<void> {
    try {
      isChangingStatus = true;
      await axiosInstance.post(
        `/readinesslevel/startup/${startupId}/rate`,
        {
          readinessType: assessment.assessment.assessmentType,
          level: Number(readinessLevel)
        },
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      );

      toast.success(
        `${assessment.assessment.assessmentType} readiness level set to ${readinessLevel}`
      );
      onstatusChanged?.();
      onclose?.();
    } catch (error) {
      console.error('Error rating assessment:', error);
      toast.error('Failed to rate assessment');
    } finally {
      isChangingStatus = false;
    }
  }
</script>

<form class="flex flex-col gap-5 p-3" enctype="multipart/form-data">
  <Dialog.Header>
    <Dialog.Title class="text-2xl font-semibold">
      {assessment.assessment.name}
    </Dialog.Title>
    {#if isMentor}
      <Dialog.Description>
        Mentor View - Assessment Type: {assessment.assessment.assessmentType}
      </Dialog.Description>
    {/if}
  </Dialog.Header>

  <div class="flex-1 overflow-y-auto px-1">
    <div class="flex h-0 flex-col gap-5">
      {#if assessment.assessment.answerType === 'ShortAnswer'}
        <ShortAnswerField
          description={assessment.assessment.name}
          bind:value={answerValue}
          isReadOnly={isMentor}
        />
      {:else if assessment.assessment.answerType === 'LongAnswer'}
        <LongAnswerField
          description={assessment.assessment.name}
          bind:value={answerValue}
          isReadOnly={isMentor}
        />
      {:else if assessment.assessment.answerType === 'File'}
        <FileUploadField
          bind:this={fileUploadComponent}
          description={assessment.assessment.name}
          fileUrl={assessment.response?.fileUrl || ''}
          bind:value={answerValue}
          isReadOnly={isMentor}
          {access}
          {startupId}
          assessmentId={assessment.assessment.id.toString()}
          assessmentName={assessment.assessment.name}
          on:fileRemoved={() => onstatusChanged?.()}
        />
      {/if}
    </div>
  </div>

  <div class="flex justify-end gap-3">
    <Button variant="outline" onclick={() => onclose?.()}>Close</Button>

    {#if isMentor}
      <div class="flex items-center gap-3">
        <Select.Root type="single" bind:value={readinessLevel}>
          <Select.Trigger class="w-[180px]">
            Level {readinessLevel}
          </Select.Trigger>
          <Select.Content>
            {#each Array.from({ length: 9 }, (_, i) => (i + 1).toString()) as level}
              <Select.Item value={level}>Level {level}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <Button
          variant="default"
          disabled={isChangingStatus}
          onclick={rateAssessment}
        >
          {isChangingStatus ? 'Rating...' : 'Rate'}
        </Button>
      </div>
    {:else}
      <Button
        variant="default"
        disabled={isSubmitting || isFileUploading}
        onclick={handleSubmit}
      >
        {#if isFileUploading}
          Uploading file...
        {:else if isSubmitting}
          Submitting...
        {:else}
          Submit Assessment
        {/if}
      </Button>
    {/if}
  </div>
</form>
