<script lang="ts">
  import { Textarea } from '$lib/components/ui/textareav2';
  import AssessmentLabel from './AssessmentLabel.svelte';
  
  export let description: string;
  export let value: string;
  export let isReadOnly = false;
</script>

<div class="grid gap-2">
  <!-- <AssessmentLabel description={description} /> -->
  <Textarea
    rows={6}
    placeholder={isReadOnly ? "No answer provided yet" : "Enter your answer"}
    bind:value
    readonly={isReadOnly}
    class={isReadOnly ? "cursor-default" : ""}
  />
</div>
