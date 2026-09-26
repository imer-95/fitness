import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Writes a text file and opens the system share sheet (save to Files,
 * iCloud Drive, Google Drive, send via mail …). On the web it downloads.
 */
export async function shareTextFile(filename: string, content: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: filename,
    UTI:
      mimeType === 'application/json'
        ? 'public.json'
        : mimeType === 'text/csv'
          ? 'public.comma-separated-values-text'
          : 'public.plain-text',
  });
}

/** Lets the user pick a text/JSON file and returns its content (or null if cancelled). */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'text/*', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (Platform.OS === 'web') {
    if (asset.file) return await asset.file.text();
    const response = await fetch(asset.uri);
    return await response.text();
  }
  return await new File(asset.uri).text();
}

export function timestampForFilename(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}`;
}
