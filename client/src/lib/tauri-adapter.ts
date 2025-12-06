import { open } from '@tauri-apps/plugin-dialog';

/**
 * Tauri adapter for file operations
 * Only used when running in Tauri environment
 */

export async function openFilePicker(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[]> {
  // Only use Tauri file picker in Tauri environment
  if (!import.meta.env.TAURI) {
    return [];
  }

  try {
    const selected = await open({
      multiple: options?.multiple || false,
      filters: options?.accept ? [{
        name: 'Documents',
        extensions: options.accept.split('.').filter(ext => ext.trim()).map(ext => ext.replace('.', ''))
      }] : undefined
    });

    if (!selected) return [];

    // Convert selected paths to File objects
    const files: File[] = [];
    if (Array.isArray(selected)) {
      for (const path of selected) {
        const fileName = path.split(/[/\\]/).pop() || 'unknown';
        files.push(createFileFromPath(path, fileName));
      }
    } else {
      const fileName = selected.split(/[/\\]/).pop() || 'unknown';
      files.push(createFileFromPath(selected, fileName));
    }

    return files;
  } catch (error) {
    console.error('Tauri file picker error:', error);
    return [];
  }
}

function createFileFromPath(path: string, name: string): File {
  // Create a mock File object for Tauri environment
  // In real implementation, you might need to read the actual file content
  const blob = new Blob([''], { type: 'application/octet-stream' });
  return new File([blob], name, {
    type: 'application/octet-stream',
    lastModified: Date.now()
  });
}

export function isTauriEnvironment(): boolean {
  return import.meta.env.TAURI === true;
}