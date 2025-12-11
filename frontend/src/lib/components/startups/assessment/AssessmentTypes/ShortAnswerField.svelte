<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import AssessmentLabel from './AssessmentLabel.svelte';
  
  export let description: string;
  export let value: string;
  export let isReadOnly = false;
</script>

<div class="grid gap-2">
  <!-- <AssessmentLabel description={description} /> -->
  <Input
    type="text"
    placeholder={isReadOnly ? "No answer provided" : "Enter your answer"}
    bind:value
    readonly={isReadOnly}
    class={isReadOnly ? "cursor-default" : ""}
  />
</div>
