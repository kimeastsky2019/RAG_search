export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/oag/api";

export interface Collection {
    id: number;
    name: string;
    xai_id: string;
    created_at: string;
    documents_count?: number;
    processing_count?: number;
    failed_count?: number;
    status?: string;
}

export interface ChatResponse {
    request_id: string;
    answer: string;
    citations: any[];
    cached: boolean;
    latency_ms: number;
}

export const api = {
    async getCollections(): Promise<Collection[]> {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/collections`, {
                headers: headers
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: "Failed to fetch collections" }));
                throw new Error(error.detail || `HTTP ${res.status}: Failed to fetch collections`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Failed to fetch collections");
        }
    },

    async createCollection(name: string): Promise<Collection> {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error("Collection name is required");
        }

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/collections`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ name: name.trim() }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Failed to create collection" }));
                throw new Error(err.detail || `HTTP ${res.status}: Failed to create collection`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Failed to create collection");
        }
    },

    async uploadDocument(collectionId: number, file: File): Promise<any> {
        if (!file || !(file instanceof File)) {
            throw new Error("Valid file is required");
        }
        if (!Number.isInteger(collectionId) || collectionId <= 0) {
            throw new Error("Valid collection ID is required");
        }

        const formData = new FormData();
        formData.append("file", file);

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/collections/${collectionId}/upload`, {
                method: "POST",
                headers: headers,
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Failed to upload document" }));
                throw new Error(err.detail || `HTTP ${res.status}: Failed to upload document`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Failed to upload document");
        }
    },

    async chat(query: string, collectionId?: number, filters?: any): Promise<ChatResponse> {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error("Query is required");
        }

        const body: Record<string, any> = { query: query.trim() };
        if (collectionId && Number.isInteger(collectionId) && collectionId > 0) {
            body.collection_id = collectionId;
        }
        if (filters && typeof filters === 'object') {
            body.filters = filters;
        }

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/chat`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Failed to chat" }));
                throw new Error(err.detail || `HTTP ${res.status}: Failed to chat`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Failed to chat");
        }
    },

    async login(username: string, password: string): Promise<any> {
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            throw new Error("Username is required");
        }
        if (!password || typeof password !== 'string' || password.length === 0) {
            throw new Error("Password is required");
        }

        const formData = new URLSearchParams();
        formData.append("username", username.trim());
        formData.append("password", password);

        try {
            const res = await fetch(`${API_BASE_URL}/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Login failed" }));
                throw new Error(err.detail || `HTTP ${res.status}: Login failed`);
            }
            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem("token", data.access_token);
            }
            return data;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Login failed");
        }
    },

    async getDocuments(collectionId: number, refresh?: boolean): Promise<any[]> {
        if (!Number.isInteger(collectionId) || collectionId <= 0) {
            throw new Error("Valid collection ID is required");
        }

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const refreshParam = refresh ? "?refresh=true" : "";
            const res = await fetch(`${API_BASE_URL}/collections/${collectionId}${refreshParam}`, {
                headers: headers
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: "Failed to fetch documents" }));
                throw new Error(error.detail || `HTTP ${res.status}: Failed to fetch documents`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Failed to fetch documents");
        }
    },

    async deleteDocument(documentId: number): Promise<any> {
        if (!Number.isInteger(documentId) || documentId <= 0) {
            throw new Error("Valid document ID is required");
        }

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
                method: "DELETE",
                headers: headers
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: "Failed to delete document" }));
                throw new Error(error.detail || `HTTP ${res.status}: Failed to delete document`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Failed to delete document");
        }
    },

    async deleteCollection(collectionId: number): Promise<any> {
        if (!Number.isInteger(collectionId) || collectionId <= 0) {
            throw new Error("Valid collection ID is required");
        }

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/collections/${collectionId}`, {
                method: "DELETE",
                headers: headers
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({ detail: "Failed to delete collection" }));
                throw new Error(error.detail || `HTTP ${res.status}: Failed to delete collection`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Failed to delete collection");
        }
    },

    async getStats(): Promise<any> {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/stats`, {
                headers: headers
            });

            if (!res.ok) {
                console.warn(`Failed to fetch stats: HTTP ${res.status}`);
                return null;
            }
            return res.json();
        } catch (error) {
            console.warn("Network error: Failed to fetch stats", error);
            return null;
        }
    },

    async register(email: string, password: string, fullName?: string): Promise<any> {
        if (!email || typeof email !== 'string' || email.trim().length === 0) {
            throw new Error("Email is required");
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new Error("Invalid email format");
        }

        try {
            const res = await fetch(`${API_BASE_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: email.trim(), 
                    password, 
                    full_name: fullName?.trim() 
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Registration failed" }));
                throw new Error(err.detail || `HTTP ${res.status}: Registration failed`);
            }
            return res.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Network error: Registration failed");
        }
    },

    logout() {
        localStorage.removeItem("token");
        window.location.hash = "#/login";
    }
};
