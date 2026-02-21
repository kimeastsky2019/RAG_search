import { useState, useEffect } from "react";
import { UploadForm, UploadFormData } from "@/components/UploadForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Brain, Plus, Database, Save, Sparkles, Loader2, Tag, FolderOpen, MessageSquare, Pencil } from "lucide-react";
import { api, Collection, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import Header from "@/components/Header";

const Upload = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [documentStatuses, setDocumentStatuses] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ name: string; status: "success" | "failed"; message?: string }[]>([]);

  // New collection creator
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creating, setCreating] = useState(false);

  // Collection ontology edit fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [consulting, setConsulting] = useState("");

  useEffect(() => {
    api.getCollections()
      .then(setCollections)
      .catch((e) => {
        console.error(e);
        toast.error("컬렉션 목록을 불러오지 못했습니다.");
      });
  }, []);

  // When selected collection changes, populate edit fields
  const selectedCollection = collections.find(c => String(c.id) === selectedCollectionId);

  useEffect(() => {
    if (selectedCollection) {
      setEditName(selectedCollection.name || "");
      setEditDescription(selectedCollection.description || "");
      setEditCategory(selectedCollection.category || "");
      setEditTags(selectedCollection.tags || "");
      setConsulting("");
    } else {
      setEditName("");
      setEditDescription("");
      setEditCategory("");
      setEditTags("");
      setConsulting("");
    }
  }, [selectedCollectionId]);

  // Poll document statuses
  useEffect(() => {
    const collId = Number(selectedCollectionId);
    if (!collId) {
      setDocumentStatuses([]);
      setPolling(false);
      return;
    }

    let intervalId: number | null = null;
    const poll = async () => {
      try {
        const docs = await api.getDocuments(collId, true);
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
  }, [selectedCollectionId]);

  const handleCreateCollection = async () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;
    if (collections.find(c => c.name === trimmed)) {
      toast.error("동일한 이름의 컬렉션이 이미 존재합니다.");
      return;
    }
    try {
      setCreating(true);
      const col = await api.createCollection(trimmed);
      toast.success(`컬렉션 생성: ${col.name}`);
      setCollections(prev => [...prev, col]);
      setSelectedCollectionId(String(col.id));
      setNewCollectionName("");
    } catch (e: any) {
      toast.error(`생성 실패: ${e.message || e}`);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCollection = async () => {
    const collId = Number(selectedCollectionId);
    if (!collId) return;

    try {
      setSaving(true);
      const updated = await api.updateCollection(collId, {
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
        category: editCategory.trim() || undefined,
        tags: editTags.trim() || undefined,
      });
      // Update in local state
      setCollections(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success("컬렉션 정보가 저장되었습니다.");
    } catch (e: any) {
      toast.error(`저장 실패: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAIAnalyze = async () => {
    const collId = Number(selectedCollectionId);
    if (!collId) return;

    try {
      setAnalyzing(true);
      const result = await api.analyzeCollection(collId);
      if (result.description) setEditDescription(result.description);
      if (result.category) setEditCategory(result.category);
      if (result.tags) setEditTags(result.tags);
      setConsulting(result.consulting || "");
      toast.success("AI 분석 완료! 메타데이터가 자동 입력되었습니다.");
    } catch (e: any) {
      toast.error(`AI 분석 실패: ${e.message || e}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async ({ files, category, tags, summary }: UploadFormData) => {
    const collId = Number(selectedCollectionId);
    if (!collId) {
      toast.error("컬렉션을 먼저 선택해 주세요.");
      return;
    }

    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        if (category) formData.append("category", category);
        if (tags.length > 0) formData.append("tags", tags.join(","));

        const res = await fetch(`${API_BASE_URL}/collections/${collId}/upload`, {
          method: "POST",
          headers,
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || res.statusText || "Upload failed");
        }
        return file.name;
      })
    );

    const normalized = results.map((result, index) => {
      const name = files[index]?.name || `file-${index + 1}`;
      if (result.status === "fulfilled") {
        return { name, status: "success" as const };
      }
      return { name, status: "failed" as const, message: (result.reason as Error)?.message };
    });

    setUploadResults(normalized);

    const failed = normalized.filter(r => r.status === "failed");
    const succeeded = normalized.length - failed.length;
    if (succeeded > 0) toast.success(`${succeeded}개 파일 업로드 성공`);
    if (failed.length > 0) toast.error(`${failed.length}개 파일 업로드 실패`);
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

  const hasOntologyChanges = selectedCollection && (
    editName !== (selectedCollection.name || "") ||
    editDescription !== (selectedCollection.description || "") ||
    editCategory !== (selectedCollection.category || "") ||
    editTags !== (selectedCollection.tags || "")
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold gradient-text">문서 업로드</h1>
            <p className="text-muted-foreground">
              컬렉션을 선택하고 파일을 업로드하세요.
            </p>
          </div>

          {/* Collection Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                컬렉션 선택 <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={selectedCollectionId}
                onValueChange={setSelectedCollectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="업로드할 컬렉션을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                      {typeof c.documents_count === "number" && ` (${c.documents_count}개)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="새 컬렉션 이름"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateCollection}
                  disabled={creating || !newCollectionName.trim()}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {creating ? "생성 중..." : "새로 만들기"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Collection Ontology Editor */}
          {selectedCollectionId && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-primary" />
                    컬렉션 온톨로지 설정
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary/5"
                    onClick={handleAIAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-1" />
                        AI 자동입력
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Collection Name */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Database className="w-3.5 h-3.5" /> 컬렉션 이름
                  </Label>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="컬렉션 이름"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <FileText className="w-3.5 h-3.5" /> 설명
                  </Label>
                  <Textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="컬렉션의 목적과 내용을 설명하세요 (AI 자동입력 가능)"
                    className="min-h-[60px] resize-none"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <FolderOpen className="w-3.5 h-3.5" /> 카테고리
                  </Label>
                  <Input
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    placeholder="예: 정책, 재무, 기술, 법률, 연구"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Tag className="w-3.5 h-3.5" /> 태그
                  </Label>
                  <Input
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    placeholder="쉼표로 구분 (예: 광주, 특구, 2026)"
                  />
                  {editTags && (
                    <div className="flex flex-wrap gap-1">
                      {editTags.split(",").map(t => t.trim()).filter(Boolean).map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Consulting Result */}
                {consulting && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-primary mb-1">AI 컨설팅</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{consulting}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <Button
                  onClick={handleSaveCollection}
                  disabled={saving || !hasOntologyChanges}
                  className="w-full"
                  variant={hasOntologyChanges ? "default" : "outline"}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {hasOntologyChanges ? "변경사항 저장" : "변경사항 없음"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upload Form */}
          <UploadForm
            onUpload={handleUpload}
            className="w-full"
            disabled={!selectedCollectionId}
          />

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">업로드 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploadResults.map((result) => (
                    <div key={result.name} className="flex items-center justify-between gap-4 rounded-lg border bg-background/50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{result.name}</p>
                        {result.status === "failed" && (
                          <p className="text-xs text-destructive mt-0.5">{result.message}</p>
                        )}
                      </div>
                      {result.status === "success" ? (
                        <Badge variant="secondary" className="text-green-700 bg-green-100 shrink-0">성공</Badge>
                      ) : (
                        <Badge variant="destructive" className="shrink-0">실패</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Indexing Status */}
          {selectedCollectionId && documentStatuses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  {selectedCollection?.name} 문서 상태
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documentStatuses.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between px-4 py-3 bg-background/50 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{doc.name}</span>
                      </div>
                      {renderStatusBadge(doc.status)}
                    </div>
                  ))}
                </div>
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
