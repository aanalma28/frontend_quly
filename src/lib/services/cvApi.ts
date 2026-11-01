import { apiRequest } from '#lib/utils/api.js';

export interface CvFileMetadata {
	id: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
	isPrimary: boolean;
	createdAt: string;
}

export async function listCvsApi(): Promise<CvFileMetadata[]> {
	const response = await apiRequest('cv');
	return (await response.json()) as CvFileMetadata[];
}

export async function uploadCvApi(file: File, isPrimary = true): Promise<CvFileMetadata> {
	const formData = new FormData();
	formData.append('file', file, file.name);
	formData.append('isPrimary', String(isPrimary));

	const response = await apiRequest('cv/upload', {
		method: 'POST',
		body: formData
	});
	return (await response.json()) as CvFileMetadata;
}

export async function setPrimaryCvApi(id: string): Promise<CvFileMetadata> {
	const response = await apiRequest(`cv/${id}/primary`, { method: 'PATCH' });
	return (await response.json()) as CvFileMetadata;
}

export async function downloadCvApi(id: string): Promise<Blob> {
	const response = await apiRequest(`cv/${id}/file`);
	return await response.blob();
}

export function formatFileSize(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
