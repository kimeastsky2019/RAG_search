
const API_BASE_URL = import.meta.env.PROD
    ? "/ontology/api"
    : "http://localhost:5001/api";

export const api = {
    auth: {
        login: async (email: string) => {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            return handleResponse(res);
        },
    },
    datasets: {
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/datasets`);
            return handleResponse(res);
        },
        create: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/datasets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        },
    },
    ttl: {
        save: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/ttl`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        },
    },
    fuseki: {
        upload: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/fuseki/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        },
        status: async () => {
            const res = await fetch(`${API_BASE_URL}/fuseki/status`);
            return handleResponse(res);
        }
    },
    sparql: {
        execute: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/sparql/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        },
        history: async () => {
            const res = await fetch(`${API_BASE_URL}/sparql/history`);
            return handleResponse(res);
        },
    },
    policies: {
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/policies`);
            return handleResponse(res);
        },
        create: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/policies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${API_BASE_URL}/policies/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE_URL}/policies/${id}`, {
                method: "DELETE",
            });
            return handleResponse(res);
        },
    },
    analysis: {
        analyze: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        },
        list: async () => {
            const res = await fetch(`${API_BASE_URL}/analyses`);
            return handleResponse(res);
        },
    },
    proxy: {
        fetch: async (data: any) => {
            const res = await fetch(`${API_BASE_URL}/proxy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return handleResponse(res);
        }
    }
};

async function handleResponse(res: Response) {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `HTTP Error ${res.status}`);
    }
    return res.json();
}
