import { useState, useEffect } from "react";
import { UploadForm, UploadFormData } from "@/components/UploadForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, Brain } from "lucide-react";
import { api, Collection, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import Header from "@/components/Header";
import { OntologyGraph } from "@/components/OntologyGraph";

// Small helper component to create a collection from the upload page
function CollectionCreator({ existingCollections, onCreated }: { existingCollections: Collection[]; onCreated: (c: Collection) => void }) {
  const [name, setName] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("컬렉션 이름을 입력하세요.");
      return;
    }
    if (existingCollections.find(c => c.name === trimmed)) {
      toast.error("동일한 이름의 컬렉션이 이미 존재합니다.");
      return;
    }
    try {
      setCreating(true);
      const col = await api.createCollection(trimmed);
      toast.success(`컬렉션 생성: ${col.name}`);
      setName("");
      onCreated(col);
    } catch (e: any) {
      console.error(e);
      toast.error(`생성 실패: ${e.message || e}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input placeholder="새 컬렉션 이름 입력" value={name} onChange={(e) => setName(e.target.value)} />
      <Button onClick={handleCreate} disabled={creating || !name.trim()}>
        {creating ? "생성 중..." : "컬렉션 생성"}
      </Button>
    </div>
  );
}

const Upload = () => {
  const [existingCollections, setExistingCollections] = useState<Collection[]>([]);
  const [uploadCollectionId, setUploadCollectionId] = useState<number | null>(null);
  const [documentStatuses, setDocumentStatuses] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<{ id: string, name: string }[]>([]);
  const [uploadResults, setUploadResults] = useState<{ name: string; status: "success" | "failed"; message?: string }[]>([]);

  useEffect(() => {
    // Load all documents for the multi-select
    const fetchAllDocs = async () => {
      try {
        const collections = await api.getCollections();
        setExistingCollections(collections);

        // Fetch docs for all collections to populate the picker
        // Optimization: In a real app with thousands of docs, we should use a search API instead.
        const allDocsPromises = collections.map(c => api.getDocuments(c.id).catch(() => []));
        const allDocsResults = await Promise.all(allDocsPromises);

        const flatDocs = allDocsResults.flat().map((d: any) => ({
          id: String(d.id),
          name: d.name
        }));
        setAvailableDocuments(flatDocs);
      } catch (e) {
        console.error("Failed to load documents", e);
      }
    };
    fetchAllDocs();
  }, []);

  useEffect(() => {
    if (!uploadCollectionId) return;

    let intervalId: number | null = null;
    const poll = async () => {
      try {
        const docs = await api.getDocuments(uploadCollectionId, true);
        setDocumentStatuses(docs);
        const hasProcessing = docs.some((doc: any) => doc.status === "processing");
        setPolling(hasProcessing);
        if (!hasProcessing && intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      } catch (e) {
        console.error(e);
      }
    };

    poll();
    intervalId = window.setInterval(poll, 5000);
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [uploadCollectionId]);

  const handleUpload = async ({ files, category, tags, relatedDocs, relationshipNote, policyNote }: UploadFormData) => {
    try {
      // 1. Get or Create Collection based on 'category'
      // We accept 'category' input as the Collection Name
      const collectionName = category.trim();
      let targetCollection = existingCollections.find(c => c.name === collectionName);

      if (!targetCollection) {
        try {
          targetCollection = await api.createCollection(collectionName);
          setExistingCollections(prev => [...prev, targetCollection!]);
        } catch (e: any) {
          if (e.message && e.message.includes("UNIQUE")) {
            // If race condition where it was just created, fetch it
            const refreshed = await api.getCollections();
            setExistingCollections(refreshed);
            targetCollection = refreshed.find(c => c.name === collectionName);
            if (!targetCollection) throw e;
          } else {
            throw e;
          }
        }
      }

      setUploadCollectionId(targetCollection.id);

      const token = localStorage.getItem("token");
      const headers: any = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const results = await Promise.allSettled(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("category", category);
          if (tags.length > 0) {
            formData.append("tags", tags.join(","));
          }
          if (relatedDocs.length > 0) {
            formData.append("relatedDocs", relatedDocs.join(","));
          }
          if (relationshipNote) {
            formData.append("relationship_note", relationshipNote);
          }
          if (policyNote) {
            formData.append("policy_note", policyNote);
          }

          const res = await fetch(`${API_BASE_URL}/collections/${targetCollection.id}/upload`, {
            method: "POST",
            headers: headers,
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || err.message || res.statusText || "Upload failed");
          }
          return file.name;
        })
      );

      const normalizedResults = results.map((result, index) => {
        const name = files[index]?.name || `file-${index + 1}`;
        if (result.status === "fulfilled") {
          return { name, status: "success" as const };
        }
        const reason = result.reason as Error;
        return { name, status: "failed" as const, message: reason?.message || "Upload failed" };
      });

      setUploadResults(normalizedResults);

      const failed = normalizedResults.filter(r => r.status === "failed");
      if (failed.length > 0) {
        toast.error(`${failed.length} file(s) failed to upload.`);
      }
      if (failed.length !== normalizedResults.length) {
        toast.success(`${normalizedResults.length - failed.length} file(s) uploaded successfully.`);
      }

      // We don't need to manually update document statuses immediately as polling will catch it
      // but we can trigger a refresh via the poll effect by ensuring uploadCollectionId is set.

    } catch (error: any) {
      console.error(error);
      toast.error(`업로드 실패: ${error.message}`);
      throw error;
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "processed") {
      return <Badge variant="secondary" className="text-green-700 bg-green-100 hover:bg-green-200">처리완료</Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive">실패</Badge>;
    }
    return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200">인덱싱 중</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">

          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold gradient-text">Document Upload</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select a collection (category) and upload the document with related tag metadata.
              Build your ontology by linking documents, categories, and tags into structured knowledge.
            </p>
          </div>

          {/* Collection Setting Card */}
          <Card className="ai-glow border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">컬렉션 설정</CardTitle>
              <CardDescription>문서를 그룹화할 컬렉션 이름을 설정하세요. 기존 이름을 입력하면 해당 컬렉션에 추가됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-center">
                <Input
                  placeholder="예: 회사 정책 문서, 기술 매뉴얼 등"
                  value={existingCollections.find(c => c.id === uploadCollectionId)?.name || ""}
                  onChange={() => { /* read-only display / created via 버튼으로 처리 */ }}
                  readOnly
                />
                <select
                  className="px-3 py-2 border rounded"
                  value={uploadCollectionId ?? ""}
                  onChange={async (e) => {
                    const id = Number(e.target.value || 0);
                    if (!id) return;
                    setUploadCollectionId(id);
                  }}
                >
                  <option value="">-- 기존 컬렉션 선택 --</option>
                  {existingCollections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <CollectionCreator existingCollections={existingCollections} onCreated={async (col) => {
                  setExistingCollections(prev => [...prev, col]);
                  setUploadCollectionId(col.id);
                }} />
              </div>
            </CardContent>
          </Card>

          {/* The Upload Form Component */}
          <UploadForm
            onUpload={handleUpload}
            className="w-full"
            availableDocuments={availableDocuments}
            initialCategory={existingCollections.find(c => c.id === uploadCollectionId)?.name || ''}
          />

          {uploadResults.length > 0 && (
            <Card className="ai-glow border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Upload Results
                </CardTitle>
                <CardDescription>
                  Detailed status for each uploaded file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploadResults.map((result) => (
                    <div key={result.name} className="flex items-start justify-between gap-4 rounded-lg border bg-background/50 p-4">
                      <div>
                        <p className="font-medium">{result.name}</p>
                        {result.status === "failed" && (
                          <p className="mt-1 text-xs text-destructive">{result.message}</p>
                        )}
                      </div>
                      {result.status === "success" ? (
                        <Badge variant="secondary" className="text-green-700 bg-green-100 hover:bg-green-200">Success</Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ontology Graph Visualization */}
          <OntologyGraph />

          {/* Indexing Status Section */}
          {uploadCollectionId && (
            <Card className="ai-glow border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  컬렉션 상태: {existingCollections.find(c => c.id === uploadCollectionId)?.name}
                </CardTitle>
                <CardDescription>
                  업로드된 문서들의 처리 상태를 실시간으로 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documentStatuses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    {polling ? "문서 상태를 확인 중입니다..." : "아직 인덱싱된 문서가 없습니다."}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentStatuses.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-background/50 border rounded-lg hover:bg-accent/5 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>ID: {doc.id}</span>
                              <span>•</span>
                              <span>{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        {renderStatusBadge(doc.status)}
                      </div>
                    ))}
                  </div>
                )}
                {polling && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    인덱싱 진행 중...
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default Upload;
