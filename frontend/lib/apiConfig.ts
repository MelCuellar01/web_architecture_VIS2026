/**
 * Development uses http://localhost:3000.
 * Production uses same-origin requests via an empty base URL.
 */
const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

const fallbackBaseUrl = process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "";

const configuredBaseUrl = envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : fallbackBaseUrl;

export const API_BASE_URL: string = configuredBaseUrl.replace(/\/$/, "");

export function apiUrl(path: string): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
}
