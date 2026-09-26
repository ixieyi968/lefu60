"use client";

import { useState } from "react";
import { Check, ChevronDown, MessageCircle, Pencil, Pin, Send, X } from "lucide-react";
import {
  createPhotoComment,
  setPhotoPinned,
  updatePhotoCaption,
} from "@/lib/supabase-client";
import type { PhotoComment, PhotoData } from "@/lib/supabase-client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type DisplayPhoto = PhotoData & { rotation: string };

type PhotoCardProps = {
  photo: DisplayPhoto;
  comments: PhotoComment[];
  defaultAuthor: string;
  offsetClass: string;
  onOpen: (photoId: string) => void;
  onPhotoChanged: (photo: PhotoData) => void;
  onCommentAdded: (comment: PhotoComment) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLElement>, photo: DisplayPhoto) => void;
};

type PhotoModalActionsProps = {
  photo: PhotoData;
  comments: PhotoComment[];
  defaultAuthor: string;
  onPhotoChanged: (photo: PhotoData) => void;
  onCommentAdded: (comment: PhotoComment) => void;
};

export function PhotoCard({
  photo,
  comments,
  defaultAuthor,
  offsetClass,
  onOpen,
  onPhotoChanged,
  onCommentAdded,
  onTouchEnd,
}: PhotoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(photo.caption);
  const [authorDraft, setAuthorDraft] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [status, setStatus] = useState("");

  async function saveCaption(event: { preventDefault: () => void }) {
    event.preventDefault();
    const caption = captionDraft.trim();
    if (!caption) {
      setStatus("照片名称不能为空。");
      return;
    }

    setIsSavingCaption(true);
    setStatus("");
    try {
      const updated = await updatePhotoCaption(photo.id, caption);
      onPhotoChanged(updated);
      setIsEditing(false);
      setStatus("名称已保存。");
    } catch (error) {
      console.warn("Caption update failed", error);
      setStatus("保存失败，输入内容已保留。");
    } finally {
      setIsSavingCaption(false);
    }
  }

  async function togglePinned() {
    setIsSavingPin(true);
    setStatus("");
    try {
      const updated = await setPhotoPinned(photo.id, !photo.isPinned);
      onPhotoChanged(updated);
      setStatus(updated.isPinned ? "已置顶。" : "已取消置顶。");
    } catch (error) {
      console.warn("Pin update failed", error);
      setStatus("置顶状态保存失败，请稍后再试。");
    } finally {
      setIsSavingPin(false);
    }
  }

  async function submitComment(event: { preventDefault: () => void }) {
    event.preventDefault();
    const author = (authorDraft ?? defaultAuthor).trim();
    const body = commentDraft.trim();
    if (!author) {
      setStatus("请先填写署名。");
      return;
    }
    if (!body) {
      setStatus("评论内容不能为空。");
      return;
    }

    setIsSavingComment(true);
    setStatus("");
    try {
      const comment = await createPhotoComment(photo.id, author, body);
      onCommentAdded(comment);
      setCommentDraft("");
      setStatus("评论已发布。");
    } catch (error) {
      console.warn("Comment submission failed", error);
      setStatus("评论发布失败，输入内容已保留。");
    } finally {
      setIsSavingComment(false);
    }
  }

  return (
    <figure
      className={`relative rounded-sm border border-[#e3dccb] bg-white p-2 pb-3 shadow-xl shadow-[#41533c]/15 transition hover:z-10 sm:p-3 ${photo.rotation} ${offsetClass}`}
    >
      <button
        type="button"
        onDoubleClick={() => onOpen(photo.id)}
        onTouchEnd={(event) => onTouchEnd(event, photo)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onOpen(photo.id);
        }}
        className="block w-full touch-manipulation text-left focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25"
        aria-label={`双击放大查看：${photo.caption}`}
        title="双击放大查看"
      >
        <span className="absolute -top-3 left-1/2 h-7 w-24 -translate-x-1/2 rotate-[-3deg] bg-[#f3dfad]/75 shadow-sm" />
        <span className="block aspect-[4/3] overflow-hidden rounded-[2px] bg-[#eef0ec]">
          {/* Supabase image hosts are configured at runtime, so this cannot use next/image. */}
          {/* oxlint-disable-next-line next/no-img-element */}
          <img
            src={photo.src}
            alt={photo.name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-full w-full object-cover"
          />
        </span>
      </button>

      <div className="mt-3 min-w-0">
        {isEditing ? (
          <form onSubmit={saveCaption} className="grid gap-2">
            <label className="sr-only" htmlFor={`caption-${photo.id}`}>照片名称</label>
            <input
              id={`caption-${photo.id}`}
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              maxLength={120}
              className="h-10 w-full rounded-md border border-[#cbd4c6] px-3 text-sm outline-none focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={isSavingCaption} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md bg-[#5f7657] px-3 text-sm font-semibold text-white disabled:opacity-60">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{isSavingCaption ? "保存中" : "保存"}</span>
                <span className="sr-only sm:hidden">{isSavingCaption ? "保存中" : "保存"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCaptionDraft(photo.caption);
                  setIsEditing(false);
                  setStatus("");
                }}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md border border-[#cbd4c6] px-3 text-sm font-semibold text-[#40513b]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">取消</span>
                <span className="sr-only sm:hidden">取消</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <figcaption className="min-w-0 flex-1 break-words font-serif text-sm font-bold leading-5 text-[#253024] sm:text-lg sm:leading-6">
              {photo.caption}
            </figcaption>
            <div className="flex shrink-0 justify-end gap-2">
              <button type="button" onClick={() => { setCaptionDraft(photo.caption); setIsEditing(true); setStatus(""); }} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d8ddd3] text-[#40513b] hover:bg-[#eef3e9]" aria-label="编辑照片名称" title="编辑照片名称">
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={togglePinned} disabled={isSavingPin} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d8ddd3] hover:bg-[#f8f0dc] disabled:opacity-60 ${photo.isPinned ? "bg-[#f3dfad] text-[#7f6344]" : "text-[#40513b]"}`} aria-label={photo.isPinned ? "取消置顶" : "置顶照片"} aria-pressed={photo.isPinned} title={photo.isPinned ? "取消置顶" : "置顶照片"}>
                <Pin className="h-4 w-4" fill={photo.isPinned ? "currentColor" : "none"} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <Collapsible className="mt-3 border-t border-[#e3e7df] pt-2">
          <CollapsibleTrigger className="group flex min-h-9 w-full items-center justify-between text-sm font-semibold text-[#5f6b5b]">
            <span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" aria-hidden="true" />评论 {comments.length}</span>
            <ChevronDown className="h-4 w-4 transition group-data-[panel-open]:rotate-180" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {comments.length > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-[#f4f5f1] px-3 py-2 text-sm leading-5">
                    <p className="font-semibold text-[#7f6344]">{comment.author}</p>
                    <p className="mt-1 break-words text-[#4d564a]">{comment.body}</p>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={submitComment} className="mt-3 grid gap-2">
              <input value={authorDraft ?? defaultAuthor} onChange={(event) => setAuthorDraft(event.target.value)} maxLength={40} placeholder="你的署名" aria-label="评论署名" className="h-9 w-full rounded-md border border-[#cbd4c6] px-3 text-sm outline-none focus:border-[#6b7f5f]" />
              <textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength={500} rows={3} placeholder="写下评论" aria-label="评论内容" className="w-full resize-y rounded-md border border-[#cbd4c6] px-3 py-2 text-sm outline-none focus:border-[#6b7f5f]" />
              <button type="submit" disabled={isSavingComment} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#5f7657] px-3 text-sm font-semibold text-white disabled:opacity-60">
                <Send className="h-4 w-4" aria-hidden="true" />{isSavingComment ? "发布中" : "发布评论"}
              </button>
            </form>
          </CollapsibleContent>
        </Collapsible>
        {status && <p className="mt-2 text-xs font-semibold text-[#6b7f5f]">{status}</p>}
      </div>
    </figure>
  );
}

export function PhotoModalActions({
  photo,
  comments,
  defaultAuthor,
  onPhotoChanged,
  onCommentAdded,
}: PhotoModalActionsProps) {
  const [activePanel, setActivePanel] = useState<"caption" | "comments" | null>(null);
  const [captionDraft, setCaptionDraft] = useState(photo.caption);
  const [authorDraft, setAuthorDraft] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function saveCaption(event: { preventDefault: () => void }) {
    event.preventDefault();
    const caption = captionDraft.trim();
    if (!caption) {
      setStatus("照片名称不能为空。");
      return;
    }

    setIsSaving(true);
    setStatus("");
    try {
      const updated = await updatePhotoCaption(photo.id, caption);
      onPhotoChanged(updated);
      setActivePanel(null);
      setStatus("名称已保存。");
    } catch (error) {
      console.warn("Modal caption update failed", error);
      setStatus("保存失败，输入内容已保留。");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitComment(event: { preventDefault: () => void }) {
    event.preventDefault();
    const author = (authorDraft ?? defaultAuthor).trim();
    const body = commentDraft.trim();
    if (!author || !body) {
      setStatus("请填写署名和评论内容。");
      return;
    }

    setIsSaving(true);
    setStatus("");
    try {
      const comment = await createPhotoComment(photo.id, author, body);
      onCommentAdded(comment);
      setCommentDraft("");
      setStatus("评论已发布。");
    } catch (error) {
      console.warn("Modal comment submission failed", error);
      setStatus("评论发布失败，输入内容已保留。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCaptionDraft(photo.caption);
            setActivePanel(activePanel === "caption" ? null : "caption");
            setStatus("");
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold text-[#40513b] hover:bg-[#eef3e9]"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          修改名称
        </button>
        <button
          type="button"
          onClick={() => {
            setActivePanel(activePanel === "comments" ? null : "comments");
            setStatus("");
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold text-[#40513b] hover:bg-[#eef3e9]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          评论 {comments.length}
        </button>
      </div>

      {activePanel === "caption" && (
        <form onSubmit={saveCaption} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`modal-caption-${photo.id}`}>照片名称</label>
          <input
            id={`modal-caption-${photo.id}`}
            value={captionDraft}
            onChange={(event) => setCaptionDraft(event.target.value)}
            maxLength={120}
            className="h-10 min-w-0 flex-1 rounded-md border border-[#cbd4c6] px-3 text-sm outline-none focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
          />
          <button type="submit" disabled={isSaving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#5f7657] px-4 text-sm font-semibold text-white disabled:opacity-60">
            <Check className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "保存中" : "保存"}
          </button>
        </form>
      )}

      {activePanel === "comments" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)]">
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md bg-[#eef0ec] p-3">
            {comments.length ? comments.map((comment) => (
              <div key={comment.id} className="rounded-md bg-white px-3 py-2 text-sm leading-5">
                <p className="font-semibold text-[#7f6344]">{comment.author}</p>
                <p className="mt-1 break-words text-[#4d564a]">{comment.body}</p>
              </div>
            )) : <p className="text-sm text-[#6b7f5f]">还没有评论。</p>}
          </div>
          <form onSubmit={submitComment} className="grid gap-2">
            <input
              value={authorDraft ?? defaultAuthor}
              onChange={(event) => setAuthorDraft(event.target.value)}
              maxLength={40}
              placeholder="你的署名"
              aria-label="评论署名"
              className="h-9 rounded-md border border-[#cbd4c6] px-3 text-sm outline-none focus:border-[#6b7f5f]"
            />
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="写下评论"
              aria-label="评论内容"
              className="resize-y rounded-md border border-[#cbd4c6] px-3 py-2 text-sm outline-none focus:border-[#6b7f5f]"
            />
            <button type="submit" disabled={isSaving} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#5f7657] px-3 text-sm font-semibold text-white disabled:opacity-60">
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSaving ? "发布中" : "发布评论"}
            </button>
          </form>
        </div>
      )}

      {status && <p className="mt-2 text-xs font-semibold text-[#6b7f5f]">{status}</p>}
    </div>
  );
}
