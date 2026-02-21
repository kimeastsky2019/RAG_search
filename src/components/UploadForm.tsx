import React, { useState, ChangeEvent, FormEvent, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Upload, X, FileText, Loader2, Sparkles, ChevronDown, ChevronUp, Tag, FolderOpen, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface UploadFormData {
    files: File[]
    category: string
    tags: string[]
    summary: string
}

interface UploadFormProps {
    onUpload: (data: UploadFormData) => Promise<void>
    className?: string
    disabled?: boolean
}

export function UploadForm({ onUpload, className, disabled }: UploadFormProps) {
    const [files, setFiles] = useState<File[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Ontology fields
    const [category, setCategory] = useState('')
    const [tags, setTags] = useState('')
    const [summary, setSummary] = useState('')
    const [showOntology, setShowOntology] = useState(false)

    // AI analysis
    const [analyzing, setAnalyzing] = useState(false)
    const [consulting, setConsulting] = useState('')

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const arr = Array.from(newFiles)
        setFiles(prev => {
            const existing = new Set(prev.map(f => `${f.name}-${f.size}`))
            const unique = arr.filter(f => !existing.has(`${f.name}-${f.size}`))
            return [...prev, ...unique]
        })
    }, [])

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files)
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files)
        }
    }

    const handleAIAnalyze = async () => {
        if (files.length === 0) {
            toast.error('분석할 파일을 먼저 선택해 주세요.')
            return
        }
        setAnalyzing(true)
        try {
            // Analyze the first file
            const result = await api.analyzeDocument(files[0])
            setCategory(result.category || '')
            setTags(result.tags?.join(', ') || '')
            setSummary(result.summary || '')
            setConsulting(result.consulting || '')
            setShowOntology(true)
            toast.success('AI 분석 완료! 메타데이터가 자동 입력되었습니다.')
        } catch (e: any) {
            toast.error(`AI 분석 실패: ${e.message}`)
        } finally {
            setAnalyzing(false)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (files.length === 0 || disabled) return

        setIsLoading(true)
        try {
            await onUpload({
                files,
                category,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                summary,
            })
            setFiles([])
            setCategory('')
            setTags('')
            setSummary('')
            setConsulting('')
        } catch (error) {
            console.error('Upload failed', error)
        } finally {
            setIsLoading(false)
        }
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0)

    return (
        <Card className={cn("w-full max-w-2xl mx-auto shadow-lg border-opacity-50", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    파일 업로드
                </CardTitle>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {/* File Drop Zone */}
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 transition-colors duration-200 ease-in-out flex flex-col items-center justify-center cursor-pointer min-h-[140px]",
                            isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                            files.length > 0 ? "bg-muted/30" : ""
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif"
                            multiple
                        />

                        {files.length > 0 ? (
                            <div className="w-full space-y-3 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{files.length}개 파일 선택됨</span>
                                        <span className="text-xs text-muted-foreground">
                                            총 {(totalSize / 1024 / 1024).toFixed(1)} MB
                                        </span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="ml-auto"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        파일 추가
                                    </Button>
                                </div>
                                <div className="max-h-40 overflow-auto rounded-md border bg-background/60 p-2 text-sm">
                                    <ul className="space-y-1">
                                        {files.map((f, idx) => (
                                            <li key={`${f.name}-${f.size}-${idx}`} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/50">
                                                <span className="truncate text-foreground">{f.name}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-muted-foreground">
                                                        {(f.size / 1024 / 1024).toFixed(1)} MB
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                                        onClick={() => removeFile(idx)}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-center space-y-2 text-muted-foreground">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <p className="font-medium text-foreground">클릭하거나 파일을 끌어다 놓으세요</p>
                                <p className="text-sm">PDF, DOCX, TXT, MD, 이미지 (최대 100MB)</p>
                                <p className="text-xs">여러 파일을 한꺼번에 선택할 수 있습니다</p>
                            </div>
                        )}
                    </div>

                    {/* AI Auto-Analyze Button */}
                    {files.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-primary/30 text-primary hover:bg-primary/5"
                            onClick={handleAIAnalyze}
                            disabled={analyzing || disabled}
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    AI 분석 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    AI 자동분석 (카테고리 / 태그 / 요약 자동 입력)
                                </>
                            )}
                        </Button>
                    )}

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

                    {/* Ontology Fields (collapsible) */}
                    <button
                        type="button"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                        onClick={() => setShowOntology(!showOntology)}
                    >
                        {showOntology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        온톨로지 메타데이터
                        {(category || tags || summary) && (
                            <Badge variant="secondary" className="ml-1 text-xs">입력됨</Badge>
                        )}
                    </button>

                    {showOntology && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <FolderOpen className="w-3.5 h-3.5" /> 카테고리
                                </Label>
                                <Input
                                    placeholder="예: 정책, 재무, 기술, 법률"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <Tag className="w-3.5 h-3.5" /> 태그
                                </Label>
                                <Input
                                    placeholder="쉼표로 구분 (예: 광주, 특구, 2026)"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                />
                                {tags && (
                                    <div className="flex flex-wrap gap-1">
                                        {tags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <FileText className="w-3.5 h-3.5" /> 요약
                                </Label>
                                <Textarea
                                    placeholder="문서 내용 요약 (AI 자동분석으로 자동 입력 가능)"
                                    value={summary}
                                    onChange={e => setSummary(e.target.value)}
                                    className="min-h-[60px] resize-none"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="pt-2">
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={files.length === 0 || isLoading || disabled}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                업로드 중... ({files.length}개)
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                {files.length > 0 ? `${files.length}개 파일 업로드` : '파일 업로드'}
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
