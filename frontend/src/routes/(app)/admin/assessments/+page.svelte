<script>
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Select from '$lib/components/ui/select';
  import { Badge } from '$lib/components/ui/badge';
  import { Textarea } from '$lib/components/ui/textarea';
  import {
    Plus,
    Edit2,
    Trash2,
    ClipboardList,
    FileText,
    Type,
    Upload,
    ChevronRight
  } from 'lucide-svelte';
  import { PUBLIC_API_URL } from '$env/static/public';
  import { ASSESSMENT_TYPES } from '$lib/types/assessment.types';
  import { invalidateAll } from '$app/navigation';

  const { data, form } = $props();

  const FIELD_TYPES = [
    { value: 1, label: 'Short Answer', icon: Type },
    { value: 2, label: 'Long Answer', icon: FileText },
    { value: 3, label: 'File Upload', icon: Upload }
  ];
  const ANSWER_TYPE_MAP = {
    ShortAnswer: 1,
    LongAnswer: 2,
    File: 3
  };

  // Modal states
  let showConfirm = $state(false);
  let confirmText = $state('');
  /** @type {(() => Promise<void>) | null} */
  let confirmAction = $state(null);

  // Create assessment state
  let showCreateTypeModal = $state(false);
  let createName = $state('');
  let createDescription = $state('');
  let selectedAssessmentType = $state('Technology');
  let selectedFieldType = $state('1');

  // Field edit state
  let showFieldEditModal = $state(false);
  /** @type {{ name: string; description?: string; answerType: string; assessmentType: string; id?: number }} */
  let editingField = $state({
    name: '',
    description: '',
    answerType: '1',
    assessmentType: 'Technology'
  });

  /** @type {Set<string>} */
  let expandedTypes = $state(new Set());

  async function refreshAssessments() {
    await invalidateAll();
  }

  /**
   * @param {string} text
   * @param {() => Promise<void>} action
   */
  function openConfirm(text, action) {
    confirmText = text;
    confirmAction = action;
    showConfirm = true;
  }

  /**
   * @param {string} typeName
   */
  function toggleType(typeName) {
    if (expandedTypes.has(typeName)) {
      expandedTypes.delete(typeName);
    } else {
      expandedTypes.add(typeName);
    }
    expandedTypes = new Set(expandedTypes);
  }

  /**
   * @param {any} assessment
   */
  function openAssessmentFields(assessment) {
    // Open edit modal directly
    openFieldModal(assessment);
  }

  /**
   * @param {any} assessment
   */
  function openFieldModal(assessment = null) {
    if (assessment) {
      // Convert backend enum name to numeric string value
      const answerTypeValue =
        typeof assessment.answerType === 'string'
          ? ANSWER_TYPE_MAP[assessment.answerType] || 1
          : assessment.answerType;

      editingField = {
        id: assessment.id,
        name: assessment.name,
        description: assessment.description || '',
        answerType: String(answerTypeValue),
        assessmentType: assessment.assessmentType || 'Technology'
      };
    } else {
      editingField = {
        name: '',
        description: '',
        answerType: '1',
        assessmentType: 'Technology'
      };
    }
    showFieldEditModal = true;
  }

  async function saveField() {
    if (!editingField.name?.trim()) return;

    const payload = {
      name: editingField.name.trim(),
      description: editingField.description?.trim() || null,
      answerType: Number(editingField.answerType),
      assessmentType: editingField.assessmentType.trim()
    };

    let res;
    if (editingField.id) {
      // Update existing assessment
      res = await fetch(`${PUBLIC_API_URL}/assessments/${editingField.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.access}`
        },
        body: JSON.stringify(payload)
      });
    }

    if (!res.ok) {
      console.error('Update assessment failed', res.status, await res.text());
      alert(`Update assessment failed (${res.status}).`);
      return;
    }

    showFieldEditModal = false;
    await refreshAssessments();
  }

  async function createAssessment() {
    if (!createName.trim()) return;
    const res = await fetch(`${PUBLIC_API_URL}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.access}`
      },
      body: JSON.stringify({
        name: createName.trim(),
        description: createDescription.trim() || null,
        assessmentType: selectedAssessmentType.trim(),
        answerType: Number(selectedFieldType)
      })
    });
    if (!res.ok) {
      console.error('Create assessment failed', res.status, await res.text());
      alert(`Create assessment failed (${res.status}). Check backend logs.`);
      return;
    }
    createName = '';
    createDescription = '';
    selectedAssessmentType = 'Technology';
    selectedFieldType = '1';
    showCreateTypeModal = false;
    await refreshAssessments();
  }

  async function deleteAssessment() {
    if (!editingField?.id) return;
    const res = await fetch(
      `${PUBLIC_API_URL}/assessments/${editingField.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${data.access}` }
      }
    );
    if (!res.ok) {
      console.error('Delete assessment failed', res.status, await res.text());
      alert(`Delete assessment failed (${res.status}).`);
      return;
    }
    showFieldEditModal = false;
    await refreshAssessments();
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Assessments</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        View all assessments organized by type
      </p>
    </div>
    <Button onclick={() => (showCreateTypeModal = true)} class="gap-2">
      <Plus class="h-4 w-4" />
      Add Assessment
    </Button>
  </div>

  <div class="rounded-lg border bg-card shadow-sm">
    <div
      class="bg-muted/50 flex items-center justify-between border-b px-6 py-4"
    >
      <h2 class="font-semibold">All Assessments by Type</h2>
      <span class="text-xs text-muted-foreground">
        {Object.keys(data.assessments || {}).length} types
      </span>
    </div>

    <div class="divide-y">
      {#each ASSESSMENT_TYPES as typeName}
        {@const assessments = data.assessments?.[typeName] || []}
        {@const isExpanded = expandedTypes.has(typeName)}

        <div>
          <!-- Type Header (Collapsible) -->
          <button
            class="hover:bg-muted/50 group flex w-full items-center justify-between px-6 py-4 text-left transition-colors"
            onclick={() => toggleType(typeName)}
          >
            <div class="flex items-center gap-3">
              <div
                class="bg-flutter-blue/10 group-hover:bg-flutter-blue/20 rounded-lg p-2 transition-colors"
              >
                <ClipboardList class="text-flutter-blue h-5 w-5" />
              </div>
              <div>
                <span class="font-medium">{typeName}</span>
                <span class="ml-2 text-xs text-muted-foreground">
                  {assessments.length}
                  {assessments.length === 1 ? 'assessment' : 'assessments'}
                </span>
              </div>
            </div>
            <ChevronRight
              class="h-4 w-4 text-muted-foreground transition-transform {isExpanded
                ? 'rotate-90'
                : ''}"
            />
          </button>

          <!-- Assessments List (Collapsible Content) -->
          {#if isExpanded}
            <div class="bg-muted/20 border-t px-6 py-4">
              {#if assessments.length > 0}
                <div class="space-y-2">
                  {#each assessments as assessment}
                    {@const AnswerTypeIcon =
                      FIELD_TYPES.find((t) => t.label === assessment.answerType)
                        ?.icon ?? FileText}
                    <button
                      class="hover:bg-card/80 hover:border-flutter-blue/30 w-full rounded-lg border bg-card p-4 text-left transition-colors"
                      onclick={() => openAssessmentFields(assessment)}
                    >
                      <div class="flex items-start gap-3">
                        <div class="rounded-lg bg-muted p-2">
                          <AnswerTypeIcon
                            class="h-4 w-4 text-muted-foreground"
                          />
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium">{assessment.name}</p>
                          <div class="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" class="text-xs">
                              {assessment.answerType}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight class="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  {/each}
                </div>
              {:else}
                <div
                  class="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div class="mb-3 rounded-full bg-muted p-3">
                    <FileText class="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p class="text-sm font-medium text-muted-foreground">
                    No assessments for {typeName}
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    Add assessments to this type to get started
                  </p>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Field Edit Modal -->
<Dialog.Root
  open={showFieldEditModal}
  onOpenChange={(v) => (showFieldEditModal = v)}
>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Update Assessment</Dialog.Title>
      <Dialog.Description>Update the assessment details</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 pt-4">
      <div class="grid gap-2">
        <Label for="assessmentName">Assessment Name</Label>
        <Input
          id="assessmentName"
          placeholder="e.g., Product Viability"
          bind:value={editingField.name}
        />
      </div>

      <div class="grid gap-2">
        <Label for="assessmentDescription">Description (Optional)</Label>
        <Textarea
          id="assessmentDescription"
          bind:value={editingField.description}
          placeholder="Describe what this assessment is about..."
          rows={3}
          class="resize-none"
        />
      </div>

      <div class="grid gap-2">
        <Label>Field Type</Label>
        <Select.Root type="single" bind:value={editingField.answerType}>
          <Select.Trigger class="w-full">
            {#snippet children()}
              {@const SelectedIcon =
                FIELD_TYPES.find(
                  (t) => t.value === Number(editingField.answerType)
                )?.icon ?? FileText}
              <div class="flex items-center gap-2">
                <SelectedIcon class="h-4 w-4" />
                {FIELD_TYPES.find(
                  (t) => t.value === Number(editingField.answerType)
                )?.label ?? 'Select type'}
              </div>
            {/snippet}
          </Select.Trigger>
          <Select.Content>
            {#each FIELD_TYPES as t}
              {@const Icon = t.icon}
              <Select.Item value={String(t.value)}>
                {#snippet children()}
                  <div class="flex items-center gap-2">
                    <Icon class="h-4 w-4" />
                    {t.label}
                  </div>
                {/snippet}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="grid gap-2">
        <Label for="assessmentType">Assessment Type</Label>
        <Select.Root type="single" bind:value={editingField.assessmentType}>
          <Select.Trigger class="w-full">
            {#snippet children()}
              <div class="flex items-center gap-2">
                <ClipboardList class="h-4 w-4" />
                <span>{editingField.assessmentType}</span>
              </div>
            {/snippet}
          </Select.Trigger>
          <Select.Content>
            {#each ASSESSMENT_TYPES as assessmentType}
              <Select.Item value={assessmentType}>
                {#snippet children()}
                  <div class="flex items-center gap-2">
                    <ClipboardList class="h-4 w-4" />
                    <span>{assessmentType}</span>
                  </div>
                {/snippet}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <Dialog.Footer class="mt-6">
      <Button
        variant="outline"
        onclick={() => {
          showFieldEditModal = false;
        }}>Cancel</Button
      >
      <Button onclick={saveField} disabled={!editingField.name?.trim()}>
        Update Assessment
      </Button>
    </Dialog.Footer>
    <div class="border-t pt-4">
      <Button
        variant="destructive"
        onclick={() =>
          openConfirm(
            `Delete "${editingField.name}"? This will permanently remove the assessment. This action cannot be undone.`,
            () => deleteAssessment()
          )}
        class="w-full gap-2"
      >
        <Trash2 class="h-4 w-4" />
        Delete Assessment
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<!-- Confirm Dialog -->
<Dialog.Root open={showConfirm} onOpenChange={(v) => (showConfirm = v)}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Confirm Action</Dialog.Title>
      <Dialog.Description class="pt-2">{confirmText}</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="mt-6">
      <Button
        variant="outline"
        onclick={() => {
          showConfirm = false;
        }}>Cancel</Button
      >
      <Button
        variant="destructive"
        onclick={async () => {
          if (confirmAction) {
            await confirmAction();
          }
          showConfirm = false;
        }}
      >
        Confirm
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Create Assessment Modal -->
<Dialog.Root
  open={showCreateTypeModal}
  onOpenChange={(v) => (showCreateTypeModal = v)}
>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Create New Assessment</Dialog.Title>
      <Dialog.Description
        >Add a new assessment to a specific type</Dialog.Description
      >
    </Dialog.Header>

    <div class="space-y-4 pt-4">
      <div class="grid gap-2">
        <Label for="createName">Assessment Name</Label>
        <Input
          id="createName"
          bind:value={createName}
          placeholder="e.g., Product Viability"
        />
      </div>

      <div class="grid gap-2">
        <Label for="createDescription">Description (Optional)</Label>
        <Textarea
          id="createDescription"
          bind:value={createDescription}
          placeholder="Describe what this assessment is about..."
          rows={3}
          class="resize-none"
        />
      </div>

      <div class="grid gap-2">
        <Label>Field Type</Label>
        <Select.Root type="single" bind:value={selectedFieldType}>
          <Select.Trigger class="w-full">
            {#snippet children()}
              {@const SelectedIcon =
                FIELD_TYPES.find((t) => t.value === Number(selectedFieldType))
                  ?.icon ?? FileText}
              <div class="flex items-center gap-2">
                <SelectedIcon class="h-4 w-4" />
                {FIELD_TYPES.find((t) => t.value === Number(selectedFieldType))
                  ?.label ?? 'Select type'}
              </div>
            {/snippet}
          </Select.Trigger>
          <Select.Content>
            {#each FIELD_TYPES as t}
              {@const Icon = t.icon}
              <Select.Item value={String(t.value)}>
                {#snippet children()}
                  <div class="flex items-center gap-2">
                    <Icon class="h-4 w-4" />
                    {t.label}
                  </div>
                {/snippet}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="grid gap-2">
        <Label for="assessmentType">Assessment Type</Label>
        <Select.Root type="single" bind:value={selectedAssessmentType}>
          <Select.Trigger class="w-full">
            {#snippet children()}
              <div class="flex items-center gap-2">
                <ClipboardList class="h-4 w-4" />
                <span>{selectedAssessmentType}</span>
              </div>
            {/snippet}
          </Select.Trigger>
          <Select.Content>
            {#each ASSESSMENT_TYPES as assessmentType}
              <Select.Item value={assessmentType}>
                {#snippet children()}
                  <div class="flex items-center gap-2">
                    <ClipboardList class="h-4 w-4" />
                    <span>{assessmentType}</span>
                  </div>
                {/snippet}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <Dialog.Footer class="mt-6">
      <Button
        variant="outline"
        onclick={() => {
          showCreateTypeModal = false;
          createName = '';
          createDescription = '';
          selectedFieldType = '1';
        }}
      >
        Cancel
      </Button>
      <Button onclick={createAssessment} disabled={!createName.trim()}>
        Create Assessment
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
