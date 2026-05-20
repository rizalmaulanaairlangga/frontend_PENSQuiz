import { apiFetch } from "./api";

export type StorageVisibility = 'public' | 'private';

export interface UploadResult {
  url: string;
}

/**
 * Uploads a quiz cover image to Supabase Storage via the backend.
 */
export async function uploadQuizCover(quizId: string, visibility: StorageVisibility, file: File, session: any): Promise<string> {
  const formData = new FormData();
  formData.append('quizId', quizId);
  formData.append('visibility', visibility);
  formData.append('file', file);

  const res = await apiFetch<UploadResult>('/api/upload/quiz-cover', session, {
    method: 'POST',
    body: formData,
    // Note: Don't set Content-Type header when using FormData; fetch will set it with boundary
  });
  return res.url;
}

/**
 * Uploads a question image to Supabase Storage via the backend.
 */
export async function uploadQuestionImage(questionId: string, visibility: StorageVisibility, file: File, session: any): Promise<string> {
  const formData = new FormData();
  formData.append('questionId', questionId);
  formData.append('visibility', visibility);
  formData.append('file', file);

  const res = await apiFetch<UploadResult>('/api/upload/question-image', session, {
    method: 'POST',
    body: formData,
  });
  return res.url;
}

/**
 * Uploads a profile avatar image to Supabase Storage via the backend.
 */
export async function uploadProfileAvatar(file: File, session: any): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch<UploadResult>('/api/upload/profile-avatar', session, {
    method: 'POST',
    body: formData,
  });
  return res.url;
}

/**
 * Validates a file for image storage.
 */
export function validateImageFile(file: File, maxSizeMB: number): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPG, PNG, WebP, and AVIF images are allowed.';
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File is too large. Max size is ${maxSizeMB}MB.`;
  }
  return null;
}
