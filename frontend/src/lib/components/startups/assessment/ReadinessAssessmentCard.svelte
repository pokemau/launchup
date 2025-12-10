<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { getReadinessStyles } from '$lib/utils';
  import axiosInstance from '$lib/axios';
  import { toast } from 'svelte-sonner';

  interface Props {
    name: string;
    assessmentStatus: string;
    assessmentType?: string;
    buttonProps?: Record<string, any>;
    isReadOnly?: boolean;
    isApplicable?: boolean;
    startupAssessmentId: number;
    access: string;
    ontoggle?: () => void;
  }

  const {
    name,
    assessmentStatus,
    assessmentType = '',
    buttonProps = {},
    isReadOnly = false,
    isApplicable = true,
    startupAssessmentId,
    access,
    ontoggle
  }: Props = $props();

  let isTogglingApplicability = $state(false);
  let currentIsApplicable = $state(isApplicable);

  $effect(() => {
    currentIsApplicable = isApplicable;
  });

  async function handleCheckboxChange(checked: boolean | 'indeterminate') {
    if (checked === 'indeterminate') return;

    try {
      isTogglingApplicability = true;
      await axiosInstance.patch(
        `/assessments/startup-assessment/${startupAssessmentId}/toggle-applicable`,
        { isApplicable: checked },
        { headers: { Authorization: `Bearer ${access}` } }
      );

      currentIsApplicable = checked;
      toast.success(
        `Assessment marked as ${checked ? 'applicable' : 'not applicable'}`
      );
      ontoggle?.();
    } catch (error) {
      console.error('Error toggling applicability:', error);
      toast.error('Failed to update applicability status');
      // Revert checkbox state on error
      currentIsApplicable = !checked;
    } finally {
      isTogglingApplicability = false;
    }
  }
</script>

<Card.Root class="mb-4">
  <Card.Content class="flex items-center justify-between px-6 py-5">
    <div class="flex items-center gap-4">
      <!-- Applicable Checkbox -->
      <div class="flex flex-col items-center gap-1">
        <Checkbox
          checked={currentIsApplicable}
          onCheckedChange={handleCheckboxChange}
          disabled={isTogglingApplicability}
          aria-label="Mark assessment as applicable"
        />
        <!-- <span class="text-xs text-muted-foreground"> -->
        <!--   {currentIsApplicable ? 'Applicable' : 'N/A'} -->
        <!-- </span> -->
      </div>

      <img src="/tasks.svg" alt="Assessment Icon" class="h-8 w-8 dark:invert" />
      <div class="flex flex-col gap-1">
        <span class="font-semibold text-lg" class:opacity-50={!currentIsApplicable}>
          {name}
        </span>
        <div class="flex gap-2">
          {#if assessmentType}
            <Badge 
              class={`w-fit rounded px-2 py-0.5 text-xs font-semibold ${getReadinessStyles(assessmentType as any)}`}
            >
              {assessmentType}
            </Badge>
          {/if}
          {#if !currentIsApplicable}
            <Badge class="w-fit rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 border-gray-300 text-gray-700">
              Not Applicable
            </Badge>
          {:else}
            <Badge 
              class={`w-fit rounded px-2 py-0.5 text-xs font-semibold ${
                assessmentStatus === 'Completed' 
                  ? 'bg-green-100 border-green-300 text-green-800' 
                  : 'bg-yellow-100 border-yellow-300 text-yellow-800'
              }`}
            >
              {assessmentStatus}
            </Badge>
          {/if}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <Button
        {...buttonProps}
        class="text-foreground bg-accent flex items-center justify-center gap-2 rounded-lg"
        disabled={!currentIsApplicable}
      >
        {isReadOnly ? 'View Assessment' : 'Start Assessment'}
      </Button>
    </div>
  </Card.Content>
</Card.Root>