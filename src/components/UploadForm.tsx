
import React, { useState, ChangeEvent, FormEvent, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X, FileText, Loader2, Tag, FolderOpen, Link, Check, ChevronsUpDown, StickyNote, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface UploadFormData {
    files: File[]
    category: string
    tags: string[]
    relatedDocs: string[]
    relationshipNote?: string
    policyNote?: string
}

export interface DocumentOption {
    id: string | number
    name: string
}

interface UploadFormProps {
    onUpload: (data: UploadFormData) => Promise<void>
    className?: string
    availableDocuments?: DocumentOption[]
    initialCategory?: string
}

export function UploadForm({ onUpload, className, availableDocuments = [], initialCategory }: UploadFormProps) {
    const [files, setFiles] = useState<File[]>([])
    const [category, setCategory] = useState(initialCategory || '')
    const [tags, setTags] = useState('')
    const [relatedDocs, setRelatedDocs] = useState<string[]>([])
    const [relationshipNote, setRelationshipNote] = useState('')
    const [policyNote, setPolicyNote] = useState('')
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files))
        }
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
            setFiles(Array.from(e.dataTransfer.files))
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (files.length === 0) return

        setIsLoading(true)
        try {
            await onUpload({
                files,
                category,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                relatedDocs: relatedDocs,
                relationshipNote,
                policyNote
            })
            // Reset form on success if needed, or let parent handle it
            setFiles([])
            setCategory('')
            setTags('')
            setRelatedDocs([])
            setRelationshipNote('')
            setPolicyNote('')
        } catch (error) {
            console.error('Upload failed', error)
            // Ideally show toast error here
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className={cn("w-full max-w-2xl mx-auto shadow-lg border-opacity-50", className)}>
            <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Upload className="w-6 h-6 text-primary" />
                    Upload Document
                </CardTitle>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">

                    {/* File Drop Zone */}
                    <div className="space-y-2">
                        <Label htmlFor="file-upload">Document Files</Label>
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 transition-colors duration-200 ease-in-out flex flex-col items-center justify-center cursor-pointer min-h-[160px]",
                                isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                                files.length > 0 ? "bg-muted/30" : ""
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.txt"
                                multiple
                            />

                            {files.length > 0 ? (
                                <div className="w-full space-y-3 animate-in fade-in zoom-in duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-lg">{files.length} files selected</span>
                                            <span className="text-sm text-muted-foreground">Upload will use the same metadata for all files.</span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="ml-auto hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setFiles([])
                                            }}
                                        >
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <div className="max-h-32 overflow-auto rounded-md border bg-background/60 p-3 text-sm text-muted-foreground">
                                        <ul className="space-y-1">
                                            {files.map((selected) => (
                                                <li key={`${selected.name}-${selected.size}`} className="flex items-center justify-between gap-4">
                                                    <span className="truncate text-foreground">{selected.name}</span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                        {(selected.size / 1024 / 1024).toFixed(2)} MB
                                                    </span>
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
                                    <p className="font-medium text-foreground">Click to upload or drag and drop</p>
                                    <p className="text-sm">PDF, DOCX or TXT (MAX. 10MB each)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Category */}
                        <div className="space-y-2">
                            <Label htmlFor="category" className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" /> Category
                            </Label>
                            <Input
                                id="category"
                                placeholder="e.g. Finance, Legal"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            />
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <Label htmlFor="tags" className="flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Tags
                            </Label>
                            <Input
                                id="tags"
                                placeholder="comma, separated, tags"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Related Docs */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Link className="w-4 h-4" /> Related Documents
                        </Label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between min-h-[40px] h-auto"
                                >
                                    {relatedDocs.length > 0
                                        ? <div className="flex flex-wrap gap-1">
                                            {relatedDocs.map((docId) => {
                                                const docName = availableDocuments?.find(d => String(d.id) === docId)?.name || docId
                                                return (
                                                    <Badge key={docId} variant="secondary" className="mr-1">
                                                        {docName}
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                        : "Select documents..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search documents..." />
                                    <CommandList>
                                        <CommandEmpty>No documents found.</CommandEmpty>
                                        <CommandGroup>
                                            {availableDocuments?.map((doc) => (
                                                <CommandItem
                                                    key={doc.id}
                                                    value={doc.name}
                                                    onSelect={() => {
                                                        setRelatedDocs((prev) => {
                                                            const idStr = String(doc.id)
                                                            return prev.includes(idStr)
                                                                ? prev.filter((f) => f !== idStr)
                                                                : [...prev, idStr]
                                                        })
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            relatedDocs.includes(String(doc.id)) ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {doc.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Relationship Note */}
                        <div className="space-y-2">
                            <Label htmlFor="relationshipNote" className="flex items-center gap-2">
                                <StickyNote className="w-4 h-4" /> Relationship Note
                            </Label>
                            <Textarea
                                id="relationshipNote"
                                placeholder="Describe the relationship with selected documents..."
                                value={relationshipNote}
                                onChange={(e) => setRelationshipNote(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>

                        {/* Policy Note */}
                        <div className="space-y-2">
                            <Label htmlFor="policyNote" className="flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Policy Note
                            </Label>
                            <Textarea
                                id="policyNote"
                                placeholder="Add any policy-related considerations..."
                                value={policyNote}
                                onChange={(e) => setPolicyNote(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>

                </CardContent>

                <CardFooter className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full md:w-auto min-w-[150px]"
                        disabled={files.length === 0 || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            `Upload ${files.length > 1 ? "Documents" : "Document"}`
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
