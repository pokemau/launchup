<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card';
  import Input from '$lib/components/ui/input/input.svelte';
  import Textarea from '$lib/components/ui/textarea/textarea.svelte';
  import { PUBLIC_API_URL } from '$env/static/public';

  export let open: boolean = false;
  export let onOpenChange: () => void;
  export let assessment: { id: number; name: string; assessmentType?: string } | null = null;
  export let access: string;

  let fields: Array<{ id: number; description: string; answerType: string }> = [];
  let loading = false;
  let error = '';

  // Fetch fields when assessment changes and dialog is open
  $: if (assessment && open) {
    fetchAssessmentFields(assessment.id);
  }

  async function fetchAssessmentFields(assessmentId: number) {
    loading = true;
    error = '';
    fields = [];

    try {
      const response = await fetch(`${PUBLIC_API_URL}/assessments/${assessmentId}/fields`, {
        headers: {
          Authorization: `Bearer ${access}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assessment fields');
      }

      fields = await response.json();
    } catch (err) {
      console.error('Error fetching assessment fields:', err);
      error = 'Failed to load assessment fields';
    } finally {
      loading = false;
    }
  }

  function getFieldComponent(answerType: string) {
    switch (answerType) {
      case 'ShortAnswer':
        return 'short';
      case 'LongAnswer':
        return 'long';
      case 'File':
        return 'file';
      default:
        return 'short';
    }
  }
</script>

{#if assessment}
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Content class="sm:max-w-[700px]">
      <Dialog.Header>
        <Dialog.Title>{assessment.name}</Dialog.Title>
        <Dialog.Description>Assessment Preview</Dialog.Description>
      </Dialog.Header>

      <div class="space-y-3">
        {#if loading}
          <p class="text-sm text-muted-foreground">Loading assessment fields...</p>
        {:else if error}
          <p class="text-sm text-red-500">{error}</p>
        {:else if fields && fields.length > 0}
          {#each fields as field (field.id)}
            <Card.Root class="border bg-background">
              <Card.Header>
                <Card.Title class="text-base">{field.description}</Card.Title>
                <Card.Description class="text-xs">{field.answerType}</Card.Description>
              </Card.Header>
              <Card.Content>
                {#if getFieldComponent(field.answerType) === 'short'}
                  <Input class="w-full" type="text" placeholder="Sample short answer" disabled />
                {:else if getFieldComponent(field.answerType) === 'long'}
                  <Textarea class="w-full" rows={4} placeholder="Sample long answer" disabled />
                {:else if getFieldComponent(field.answerType) === 'file'}
                  <Input class="w-full" type="file" disabled />
                {:else}
                  <Input class="w-full" type="text" placeholder="Sample input" disabled />
                {/if}
              </Card.Content>
            </Card.Root>
          {/each}
        {:else}
          <p class="text-sm text-muted-foreground">No fields defined for this assessment.</p>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={onOpenChange}>Close</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if}
