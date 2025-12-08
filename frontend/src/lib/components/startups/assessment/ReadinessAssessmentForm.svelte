<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import ShortAnswerField from './AssessmentTypes/ShortAnswerField.svelte';
  import LongAnswerField from './AssessmentTypes/LongAnswerField.svelte';
  import FileUploadField from './AssessmentTypes/FileUploadField.svelte';
  import type { Assessment } from '$lib/types/assessment.types';
  import { createEventDispatcher } from 'svelte';
  import axiosInstance from '$lib/axios';
  import { toast } from 'svelte-sonner';

  export let access: string;
  export let startupId: string;
  export let assessment: Assessment;
  export let isMentor = false;

  const dispatch = createEventDispatcher<{
    close: void;
    submit: {
      assessmentName: string;
      startupId: string;
      formData: Record<string, any>;
    };
    statusChanged: void;
  }>();

  let formData: Record<string, any> = {};
  let isSubmitting = false;
  let isInitialized = false;
  let isChangingStatus = false;
  let fileUploadComponents: Record<string, FileUploadField> = {};
  let readinessLevel = '1';
  let isLoadingReadinessLevel = false;

  $: {
    if (!isInitialized && assessment?.assessmentFields) {
      assessment.assessmentFields.forEach((field) => {
        formData[field.id] = field.answer || '';
      });
      isInitialized = true;
    }
  }

  // Fetch current readiness level when component loads (for mentor view)
  $: if (isMentor && assessment?.assessmentType && startupId) {
    fetchCurrentReadinessLevel();
  }

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
        (rl: any) => rl.readinessLevel.readinessType === assessment.assessmentType
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

  $: isAnyFileUploading = Object.values(fileUploadComponents).some(
    (component) => component?.processing
  );

  async function handleSubmit(): Promise<void> {
    if (isAnyFileUploading) {
      toast.error('Please wait for file uploads to complete');
      return;
    }

    try {
      isSubmitting = true;

      // Upload all pending files
      const fileUploadPromises = Object.entries(fileUploadComponents).map(
        async ([fieldId, component]) => {
          if (component && typeof component.uploadPendingFiles === 'function') {
            await component.uploadPendingFiles();
          }
        }
      );

      await Promise.all(fileUploadPromises);

      // Prepare submission data
      const submissionData: Record<string, any> = {};

      assessment.assessmentFields.forEach((field) => {
        submissionData[field.id] = formData[field.id] || '';
      });

      assessment.assessmentFields.forEach((field) => {
        if (field.type === 'File') {
        }
      });
      dispatch('submit', {
        assessmentName: assessment.name,
        startupId,
        formData: submissionData
      });

      toast.success('Assessment submitted successfully');
      // Don't close the form, let it refresh with updated data
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Failed to upload files or submit assessment');
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
          readinessType: assessment.assessmentType,
          level: Number(readinessLevel)
        },
        {
          headers: { Authorization: `Bearer ${access}` }
        }
      );

      toast.success(
        `${assessment.assessmentType} readiness level set to ${readinessLevel}`
      );
      dispatch('statusChanged');
      dispatch('close');
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
    <Dialog.Title class="text-2xl font-semibold">{assessment.name}</Dialog.Title
    >
    {#if isMentor}
      <Dialog.Description>
        Mentor View - Assessment Status: {assessment.assessmentStatus}
      </Dialog.Description>
    {/if}
  </Dialog.Header>

  <div class="flex-1 overflow-y-auto px-1">
    <div class="flex h-0 flex-col gap-5">
      {#each assessment.assessmentFields as field}
        {#if field.type === 'ShortAnswer'}
          <ShortAnswerField
            description={field.description}
            bind:value={formData[field.id]}
            isReadOnly={isMentor}
          />
        {:else if field.type === 'LongAnswer'}
          <LongAnswerField
            description={field.description}
            bind:value={formData[field.id]}
            isReadOnly={isMentor}
          />
        {:else if field.type === 'File'}
          <FileUploadField
            bind:this={fileUploadComponents[field.id]}
            description={field.description}
            fileUrl={field.answer}
            bind:value={formData[field.id]}
            isReadOnly={isMentor}
            {access}
            {startupId}
            assessmentId={field.id}
            assessmentName={assessment.name}
            on:fileRemoved={() => dispatch('statusChanged')}
          />
        {/if}
      {/each}
    </div>
  </div>

  <div class="flex justify-end gap-3">
    <Button variant="outline" onclick={() => dispatch('close')}>Close</Button>

    {#if isMentor}
      <div class="flex items-center gap-3">
        <Select.Root type="single" bind:value={readinessLevel}>
          <Select.Trigger class="w-[180px]">
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
          disabled={isChangingStatus}
          onclick={rateAssessment}
        >
          {isChangingStatus ? 'Rating...' : 'Rate'}
        </Button>
      </div>
    {:else}
      <Button
        variant="default"
        disabled={isSubmitting || isAnyFileUploading}
        onclick={handleSubmit}
      >
        {#if isAnyFileUploading}
          Uploading files...
        {:else if isSubmitting}
          Submitting...
        {:else}
          Submit Assessment
        {/if}
      </Button>
    {/if}
  </div>
</form>
