<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Spinner from 'lucide-svelte/icons/loader-circle';
  import X from 'lucide-svelte/icons/x';
  import Download from 'lucide-svelte/icons/download';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import AssessmentLabel from './AssessmentLabel.svelte';
  import axiosInstance from '$lib/axios';
  import { toast } from 'svelte-sonner';
  import * as AlertDialog from '$lib/components/ui/alert-dialog';

  export let description: string;
  export let files: FileList | null = null;
  export let fileUrl: string | undefined = undefined;
  export let isReadOnly = false;
  export let value: string = '';
  export let access: string;
  export let startupId: string;
  export let assessmentId: string;
  export let assessmentName: string;

  const dispatch = createEventDispatcher<{ fileRemoved: void }>();
  const UPLOAD_FOLDER = 'assessments';

  let processing = false;
  let pendingFiles: File[] = [];
  let uploadedFiles: Array<{ url: string; fileName: string }> = [];
  let showDeleteConfirm = false;
  let fileToDeleteIndex: number | null = null;
  let initialized = false;

  // Initialize uploaded files from existing JSON data
  $: {
    // Check value prop first (from answerValue), then fileUrl as fallback
    const dataSource = value || fileUrl;
    if (dataSource && !initialized) {
      try {
        const parsed = JSON.parse(dataSource);
        if (parsed.files && Array.isArray(parsed.files)) {
          uploadedFiles = parsed.files;
          initialized = true;
        }
      } catch {
        // Not JSON, ignore - might be empty string or non-JSON data
        initialized = true;
      }
    } else if (!dataSource && !initialized) {
      initialized = true;
    }
  }

  // Update value whenever uploadedFiles changes
  function updateValue(): void {
    if (uploadedFiles.length > 0) {
      value = JSON.stringify({ files: uploadedFiles });
    } else {
      value = '';
    }
  }

  function makeAbsoluteUrl(url: string): string {
    return url?.startsWith('http') ? url : `https://${url}`;
  }

  function handleFileSelection(selectedFiles: FileList | null): void {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    pendingFiles = [...pendingFiles, ...newFiles];

    files = null;
  }

  function removePendingFile(index: number): void {
    pendingFiles = pendingFiles.filter((_, i) => i !== index);
  }

  function confirmRemoveUploadedFile(index: number): void {
    fileToDeleteIndex = index;
    showDeleteConfirm = true;
  }

  async function removeUploadedFile(): Promise<void> {
    if (isReadOnly || fileToDeleteIndex === null) return;

    const index = fileToDeleteIndex;
    const fileToRemove = uploadedFiles[index];

    try {
      const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index);
      uploadedFiles = newUploadedFiles;

      const newValue = newUploadedFiles.length > 0
        ? JSON.stringify({ files: newUploadedFiles })
        : '';

      value = newValue;

      const payload = {
        startupId: parseInt(startupId, 10),
        assessmentName,
        responses: [
          {
            assessmentId,
            answerValue: newValue
          }
        ]
      };

      await axiosInstance.post(
        '/assessments/submit',
        payload,
        {
          headers: {
            Authorization: `Bearer ${access}`
          }
        }
      );

      toast.success('File removed successfully');

      dispatch('fileRemoved');
    } catch (error) {
      console.error('Failed to remove file from database:', error);
      uploadedFiles = [
        ...uploadedFiles.slice(0, index),
        fileToRemove,
        ...uploadedFiles.slice(index)
      ];
      updateValue();
      toast.error('Failed to remove file');
    } finally {
      showDeleteConfirm = false;
      fileToDeleteIndex = null;
    }
  }

  function cancelRemove(): void {
    showDeleteConfirm = false;
    fileToDeleteIndex = null;
  }

  async function downloadFile(file: { url: string; fileName: string }): Promise<void> {
    try {
      const response = await fetch(makeAbsoluteUrl(file.url));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    }
  }

  export async function uploadPendingFiles(): Promise<void> {
    if (pendingFiles.length === 0) {
      return;
    }

    processing = true;

    try {
      if (pendingFiles.length === 1) {
        const formData = new FormData();
        formData.append('file', pendingFiles[0]);

        const response = await axiosInstance.post(
          `/upload/single?folder=${UPLOAD_FOLDER}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        uploadedFiles = [
          ...uploadedFiles,
          { url: response.data.url, fileName: response.data.originalName }
        ];
      } else {
        const formData = new FormData();
        pendingFiles.forEach((file) => {
          formData.append('files', file);
        });

        const response = await axiosInstance.post(
          `/upload/multiple?folder=${UPLOAD_FOLDER}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        const newUploadedFiles = response.data.files.map((file: any) => ({
          url: file.url,
          fileName: file.originalName
        }));

        uploadedFiles = [...uploadedFiles, ...newUploadedFiles];
      }

      updateValue();
      pendingFiles = [];

    } catch (error) {
      console.error(`File upload failed for ${description}:`, error);
      throw error;
    } finally {
      processing = false;
    }
  }

  $: if (files) {
    handleFileSelection(files);
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    const droppedFiles = event.dataTransfer?.files || null;
    handleFileSelection(droppedFiles);
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  export { processing };
</script>

<div class="grid gap-2">
  <!-- <AssessmentLabel {description} /> -->

  {#if uploadedFiles.length > 0}
    <div class="space-y-2">
      <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Uploaded Files ({uploadedFiles.length}):
      </div>
      {#each uploadedFiles as file, index}
        <div
          class="flex items-center justify-between gap-3 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
        >
          <span class="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
            {file.fileName}
          </span>

          <div class="flex flex-shrink-0 items-center gap-2">
            <a
              href={makeAbsoluteUrl(file.url)}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
              title="Preview file"
            >
              <ExternalLink size={14} />
              <span>Preview</span>
            </a>

            <button
              type="button"
              onclick={() => downloadFile(file)}
              class="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
              title="Download file"
            >
              <Download size={14} />
              <span>Download</span>
            </button>

            {#if !isReadOnly}
              <button
                type="button"
                onclick={() => confirmRemoveUploadedFile(index)}
                class="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                title="Remove file"
              >
                <X size={16} />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if pendingFiles.length > 0 && !isReadOnly}
    <div class="space-y-2">
      <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Pending Upload ({pendingFiles.length}):
      </div>
      {#each pendingFiles as file, index}
        <div
          class="flex items-center justify-between rounded bg-yellow-50 p-2 dark:bg-yellow-900/20"
        >
          <span class="flex-1 truncate text-gray-700 dark:text-gray-300">
            {file.name}
          </span>
          <button
            type="button"
            onclick={() => removePendingFile(index)}
            class="ml-2 flex-shrink-0 p-1 text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if !isReadOnly}
    <label
      for="fileUpload-{description}"
      class="flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-400 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
      ondrop={handleDrop}
      ondragover={handleDragOver}
    >
      {#if processing}
        <div class="flex flex-col items-center justify-center gap-3">
          <Spinner class="mr-2 h-6 w-6 animate-spin" />
          <span class="text-sm">Uploading files...</span>
        </div>
      {:else}
        <div class="text-center">
          <p>Drop multiple files here or click to upload</p>
          <p class="mt-1 text-xs text-gray-500">
            You can upload multiple files at once
          </p>
        </div>
      {/if}
    </label>
    <input
      id="fileUpload-{description}"
      type="file"
      class="hidden"
      multiple
      bind:files
    />
  {:else if uploadedFiles.length === 0 && !fileUrl}
    <div class="text-sm text-muted-foreground">No file uploaded</div>
  {/if}
</div>

<!-- Confirmation Dialog -->
<AlertDialog.Root open={showDeleteConfirm}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove File</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove
        <span class="font-semibold">
          {fileToDeleteIndex !== null ? uploadedFiles[fileToDeleteIndex]?.fileName : ''}
        </span>?
        This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={cancelRemove}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={removeUploadedFile}
        class="bg-red-600 hover:bg-red-700"
      >
        Remove
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
