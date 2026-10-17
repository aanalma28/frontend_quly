const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(
	/\/+$/,
	''
);

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export async function apiRequest(path: string, init?: RequestInit): Promise<Response> {
	const normalizedPath = path.replace(/^\/+/, '');
	const response = await fetch(`${API_BASE_URL}/${normalizedPath}`, init);

	if (!response.ok) {
		const responseMessage = await response.text();
		throw new ApiError(
			responseMessage || `API request failed with status ${response.status}`,
			response.status
		);
	}

	return response;
}
