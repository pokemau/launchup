<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import { RnaViewEditDeleteAiDialog, RnaViewEditDeleteDialog } from '.';

  let { rna, update, deleteRna, addToRna, role, readinessData } = $props();

  let open = $state(false);

  const closeDialog = () => {
    open = false;
  };
</script>

<Card.Root
  class="h-full min-w-[calc(25%-1.25rem*3/4)] cursor-pointer"
  onclick={() => {
    open = true;
  }}
>
  <Card.Content class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <h2 class="text-[15px] font-semibold leading-none tracking-tight">
        {rna.readinessLevel.readinessType}
      </h2>
    </div>
    <div class="break-words text-sm text-muted-foreground">
      {@html rna.rna.substring(0, 150) + `${rna.rna.length > 150 ? '...' : ''}`}
    </div>
    <div class="text-sm text-muted-foreground">
      Current Level: <Badge variant="secondary"
        >{rna.readinessLevel.level}
      </Badge>
    </div>
  </Card.Content>
</Card.Root>

{#if role === 'Startup'}
  <RnaViewEditDeleteDialog
    bind:open
    {rna}
    {update}
    {deleteRna}
    {readinessData}
    {closeDialog}
    {addToRna}
    {role}
  />
{:else}
  <RnaViewEditDeleteAiDialog
    bind:open
    {rna}
    {update}
    {deleteRna}
    {readinessData}
    {closeDialog}
    {addToRna}
    {role}
  />
{/if}
