"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Expand,
  Mail,
  MapPin,
  MessageSquarePlus,
  Minimize,
  Music2,
  PartyPopper,
  Pause,
  Play,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  createWallNote,
  isSupabaseConfigured,
  listPhotoComments,
  listPhotos,
  listWallNotes,
  uploadPhoto,
} from "@/lib/supabase-client";
import type { PhotoComment, PhotoData, RsvpPayload, WallNote } from "@/lib/supabase-client";
import { PhotoCard } from "@/components/photo-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type Rsvp = RsvpPayload;

type Photo = PhotoData & { rotation: string };

type LoadedPhoto = PhotoData & {
  rotation?: string;
};

const photoRotations = ["rotate-[-2deg]", "rotate-[1.5deg]", "rotate-[-1deg]", "rotate-[2deg]"];

const eventDate = new Date("2026-09-26T14:00:00+08:00");

const schedule = [
  { time: "14:00", title: "重返校园 · 共忆芳华" },
  { time: "18:00", title: "六十寿宴 · 归来仍是少年" },
];

const initialWallNotes: WallNote[] = [];

function comparePhotos(a: PhotoData, b: PhotoData) {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

  const aYear = a.caption.match(/^\s*(\d{4})/)?.[1];
  const bYear = b.caption.match(/^\s*(\d{4})/)?.[1];
  if (aYear && bYear && aYear !== bYear) return Number(aYear) - Number(bYear);
  if (aYear !== bYear) return aYear ? -1 : 1;

  const captionOrder = a.caption.localeCompare(b.caption, "zh-CN", {
    numeric: true,
    sensitivity: "base",
  });
  if (captionOrder !== 0) return captionOrder;
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

function getTimeLeft() {
  const diff = Math.max(eventDate.getTime() - Date.now(), 0);

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

type HomeClientProps = {
  initialLoadedPhotos: LoadedPhoto[];
  initialLoadedWallNotes: WallNote[];
  initialLoadedComments: PhotoComment[];
  initialTimeLeft: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
  rsvpStatus: string;
  photoStatus: string;
};

export default function HomeClient({
  initialLoadedPhotos,
  initialLoadedWallNotes,
  initialLoadedComments,
  initialTimeLeft,
  rsvpStatus,
  photoStatus,
}: HomeClientProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoSlideshowRef = useRef<HTMLDivElement | null>(null);
  const wallStageRef = useRef<HTMLDivElement | null>(null);
  const lastPhotoTapRef = useRef<{ id: string; at: number } | null>(null);
  const [showGlassesTip, setShowGlassesTip] = useState(false);
  const rsvpMessage =
    rsvpStatus === "success"
      ? "收到，信息已更新。"
      : rsvpStatus === "error"
        ? "后台暂时没连上，稍后再试一次。"
        : "";
  const [isOpened, setIsOpened] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>(
    initialLoadedPhotos.map((photo, index) => ({
      ...photo,
      rotation: photo.rotation ?? photoRotations[index % photoRotations.length],
    })),
  );
  const [photoComments, setPhotoComments] = useState(initialLoadedComments);
  const [wallNotes, setWallNotes] = useState<WallNote[]>(
    initialLoadedWallNotes.length ? initialLoadedWallNotes : initialWallNotes,
  );
  const [isSavingRsvp, setIsSavingRsvp] = useState(false);
  const [photoMessage, setPhotoMessage] = useState(
    photoStatus === "success"
      ? "照片已上传，可以立即编辑、置顶或评论。"
      : photoStatus === "error"
        ? "照片上传失败，请稍后再试一次。"
        : "",
  );
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
  const [captionDraft, setCaptionDraft] = useState("");
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [isPhotoFullscreen, setIsPhotoFullscreen] = useState(false);
  const [isWallStageOpen, setIsWallStageOpen] = useState(false);
  const [isWallStageFullscreen, setIsWallStageFullscreen] = useState(false);
  const [isWallStagePaused, setIsWallStagePaused] = useState(false);
  const [isWallComposerOpen, setIsWallComposerOpen] = useState(false);
  const [isSavingWallNote, setIsSavingWallNote] = useState(false);
  const [wallNoteStatus, setWallNoteStatus] = useState("");
  const [wallNoteDraft, setWallNoteDraft] = useState({ author: "", message: "" });
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [form, setForm] = useState<Rsvp>({
    name: "",
    attending: "yes",
    guests: 1,
    contact: "",
    message: "",
  });
  const sortedPhotos = useMemo(() => [...photos].sort(comparePhotos), [photos]);
  const commentsByPhotoId = useMemo(() => {
    return photoComments.reduce<Record<string, PhotoComment[]>>((groups, comment) => {
      (groups[comment.photoId] ??= []).push(comment);
      return groups;
    }, {});
  }, [photoComments]);
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? null;
  const rollingWallNotes = wallNotes.length > 1 ? [...wallNotes, ...wallNotes] : wallNotes;
  const stageWallNotes = wallNotes.length > 1 ? [...wallNotes, ...wallNotes] : wallNotes;
  const photoOrderKey = sortedPhotos.map((photo) => photo.id).join("|");

  useEffect(() => {
    document.documentElement.classList.add("js-ready");
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    try {
      const saved = window.localStorage.getItem("lefu60-rsvp");

      if (saved) {
        const parsed = JSON.parse(saved) as Rsvp;
        setForm({
          name: parsed.name ?? "",
          attending: parsed.attending ?? "yes",
          guests: parsed.guests || 1,
          contact: parsed.contact ?? "",
          message: parsed.message ?? "",
        });
      }
    } catch (error) {
      console.warn("Local RSVP restore failed", error);
    }

    if (isSupabaseConfigured) {
      Promise.allSettled([listPhotos(), listWallNotes(), listPhotoComments()])
        .then(([photosResult, notesResult, commentsResult]) => {
          if (photosResult.status === "fulfilled") {
            setPhotos(
              photosResult.value.map((photo, index) => ({
                ...photo,
                rotation: photoRotations[index % photoRotations.length],
              })),
            );
          }

          if (notesResult.status === "fulfilled" && notesResult.value.length) {
            setWallNotes(notesResult.value);
          }

          if (commentsResult.status === "fulfilled") {
            setPhotoComments(commentsResult.value);
          }
        })
        .catch((error) => {
          console.warn("Supabase content load failed", error);
        });
    }

    return () => {
      document.documentElement.classList.remove("js-ready");
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsPhotoFullscreen(document.fullscreenElement === photoSlideshowRef.current);
      setIsWallStageFullscreen(document.fullscreenElement === wallStageRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!carouselApi) return;

    const updateCurrentSlide = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", updateCurrentSlide);
    carouselApi.on("reInit", updateCurrentSlide);

    return () => {
      carouselApi.off("select", updateCurrentSlide);
      carouselApi.off("reInit", updateCurrentSlide);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.reInit();
    carouselApi.scrollTo(0, true);
  }, [carouselApi, photoOrderKey]);

  useEffect(() => {
    if (!carouselApi || sortedPhotos.length < 2 || isCarouselPaused) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let autoplay: number | undefined;

    const stopAutoplay = () => {
      if (autoplay !== undefined) window.clearInterval(autoplay);
      autoplay = undefined;
    };
    const syncAutoplay = () => {
      stopAutoplay();
      if (!mediaQuery.matches && document.visibilityState === "visible") {
        autoplay = window.setInterval(() => carouselApi.scrollNext(), 5000);
      }
    };

    syncAutoplay();
    mediaQuery.addEventListener("change", syncAutoplay);
    document.addEventListener("visibilitychange", syncAutoplay);

    return () => {
      stopAutoplay();
      mediaQuery.removeEventListener("change", syncAutoplay);
      document.removeEventListener("visibilitychange", syncAutoplay);
    };
  }, [carouselApi, sortedPhotos.length, isCarouselPaused]);

  function rememberRsvp() {
    setIsSavingRsvp(true);

    try {
      window.localStorage.setItem("lefu60-rsvp", JSON.stringify(form));
    } catch (error) {
      console.warn("Local RSVP save failed", error);
    }
  }

  function preparePhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!files.length) return;

    setPendingPhotoFiles(files);
    setCaptionDraft("");
  }

  function closePhotoCaption() {
    setPendingPhotoFiles([]);
    setCaptionDraft("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function uploadPendingPhotos(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!pendingPhotoFiles.length) return;

    const caption = captionDraft.trim() || "新上传的珍贵史料";
    const uploaderName = form.name.trim() || "一位同门";
    setIsUploadingPhotos(true);
    setPhotoMessage("");

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured.");
      }

      const uploadedPhotos = await Promise.all(
        pendingPhotoFiles.map((file) => uploadPhoto(file, caption, uploaderName)),
      );

      const nextPhotos = uploadedPhotos.map((photo, index) => ({
        ...photo,
        rotation: photoRotations[(photos.length + index) % photoRotations.length],
      }));

      setPhotos((current) => [...nextPhotos, ...current]);
      setPhotoMessage("照片已上传，可以立即编辑、置顶或评论。");
      closePhotoCaption();
    } catch (error) {
      console.warn("Photo upload failed", error);
      setPhotoMessage("照片上传失败，请稍后再试一次。");
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  function handlePhotoTouchEnd(event: React.TouchEvent<HTMLElement>, photo: Photo) {
    const now = Date.now();
    const lastTap = lastPhotoTapRef.current;

    if (lastTap?.id === photo.id && now - lastTap.at < 360) {
      event.preventDefault();
      setSelectedPhotoId(photo.id);
      lastPhotoTapRef.current = null;
      return;
    }

    lastPhotoTapRef.current = { id: photo.id, at: now };
  }

  function handlePhotoChanged(updated: PhotoData) {
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === updated.id ? { ...updated, rotation: photo.rotation } : photo,
      ),
    );
  }

  async function togglePhotoFullscreen() {
    try {
      if (document.fullscreenElement === photoSlideshowRef.current) {
        await document.exitFullscreen();
      } else {
        await photoSlideshowRef.current?.requestFullscreen();
        setIsCarouselPaused(false);
      }
    } catch (error) {
      console.warn("Photo fullscreen failed", error);
    }
  }

  async function openWallStage() {
    setIsWallStageOpen(true);
    setIsWallStagePaused(false);
    try {
      await wallStageRef.current?.requestFullscreen();
    } catch (error) {
      console.warn("Wall fullscreen failed", error);
    }
  }

  async function closeWallStage() {
    if (document.fullscreenElement === wallStageRef.current) {
      await document.exitFullscreen().catch(() => undefined);
    }
    setIsWallStageOpen(false);
  }

  async function toggleWallStageFullscreen() {
    try {
      if (document.fullscreenElement === wallStageRef.current) {
        await document.exitFullscreen();
      } else {
        await wallStageRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.warn("Wall fullscreen failed", error);
    }
  }

  function openWallComposer() {
    setWallNoteDraft((current) => ({ ...current, author: current.author || form.name }));
    setWallNoteStatus("");
    setIsWallComposerOpen(true);
  }

  async function submitWallNote(event: { preventDefault: () => void }) {
    event.preventDefault();
    const author = wallNoteDraft.author.trim();
    const message = wallNoteDraft.message.trim();
    if (!author || !message) {
      setWallNoteStatus("请填写署名和留言内容。");
      return;
    }

    setIsSavingWallNote(true);
    setWallNoteStatus("");
    try {
      const note = await createWallNote(author, message);
      setWallNotes((current) => [note, ...current]);
      setWallNoteDraft({ author, message: "" });
      setWallNoteStatus("留言已发布。");
    } catch (error) {
      console.warn("Wall note submission failed", error);
      setWallNoteStatus("留言发布失败，内容已保留，请稍后再试。");
    } finally {
      setIsSavingWallNote(false);
    }
  }

  function openInvitation() {
    setIsOpened(true);
    setIsMuted(false);
    window.setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.muted = false;
      audio.play().catch(() => {
        setIsMuted(true);
      });
    }, 0);
  }

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.muted || audio.paused) {
      audio.muted = false;
      audio.play().catch(() => undefined);
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef0ec] text-[#20251f]">
      {!isOpened && (
        <section className="relative min-h-screen overflow-hidden bg-[#edf3ef] text-[#17202b]">
          <img
            src="/canopy-poster.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.64)_0%,rgba(255,255,255,0.32)_36%,rgba(238,244,239,0.14)_68%)]" />

          <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 text-center">
            <h1 className="max-w-5xl text-[31px] font-bold leading-tight text-[#162033] sm:text-5xl lg:text-6xl">
              <span className="block whitespace-nowrap">人生一甲子🎉乐福正当时</span>
              <span className="mt-3 block">你导喊你回家吃饭啦!⛷️</span>
            </h1>
            <p className="mt-8 text-lg font-medium text-[#263145] sm:text-xl">
              2026年9月26日星期六 · 14:00
            </p>
            <a
              href="#invitation"
              onClick={openInvitation}
              className="mt-10 inline-flex min-h-14 items-center gap-3 rounded-full bg-[#5f7657] px-9 text-lg font-bold text-white shadow-xl shadow-[#41533c]/20 transition hover:bg-[#4d6447] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/30"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              打开邀请函
            </a>
          </div>
        </section>
      )}
      <audio ref={audioRef} src="/audio/pingfan-road.m4a" loop preload="auto" />
      <section id="invitation" className="relative overflow-hidden sm:min-h-[92vh]">
        <div className="relative sm:absolute sm:inset-0 sm:h-full">
          <img
            src="/hero-clean.png"
            alt="张老师生日会邀请封面"
            className="h-auto w-full sm:absolute sm:inset-0 sm:h-full sm:object-cover sm:object-center"
          />
          <div className="absolute inset-x-5 top-5 z-20 flex items-center justify-between sm:hidden">
            <span className="text-sm font-semibold tracking-[0.14em] text-[#62715f]">
              LEFU60.BEER
            </span>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#eef0ec] sm:inset-0 sm:h-auto sm:bg-[radial-gradient(ellipse_at_50%_30%,rgba(238,240,236,0)_0%,rgba(238,240,236,0.04)_16%,rgba(238,240,236,0.38)_40%,rgba(238,240,236,0.86)_82%)]" />
          <div className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(238,240,236,0)_0%,rgba(238,240,236,0.16)_34%,rgba(238,240,236,0.78)_66%,rgba(238,240,236,0.94)_100%)] sm:block" />
        </div>
        <button
          type="button"
          onMouseEnter={() => setShowGlassesTip(true)}
          onMouseLeave={() => setShowGlassesTip(false)}
          onFocus={() => setShowGlassesTip(true)}
          onBlur={() => setShowGlassesTip(false)}
          className="absolute left-[37%] top-[18%] z-20 hidden h-16 w-56 rounded-full border border-transparent lg:block"
          aria-label="张老师眼镜彩蛋"
        />
        {showGlassesTip && (
          <div className="absolute left-[36%] top-[27%] z-30 hidden rounded-full bg-[#20251f] px-4 py-2 text-sm font-semibold text-white shadow-xl lg:block">
            导师视线已锁定：9 月 26 日见？
          </div>
        )}
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-5 pb-4 sm:min-h-[92vh] sm:justify-between sm:px-8 sm:py-6 lg:px-10">
          <header className="hidden items-center justify-between gap-4 sm:flex">
            <a href="#rsvp" className="text-sm font-semibold tracking-[0.14em] text-[#62715f]">
              LEFU60.BEER
            </a>
            <a
              href="#rsvp"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#5f7657] px-4 text-sm font-semibold text-white shadow-lg shadow-[#41533c]/15 transition hover:bg-[#4d6447]"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              RSVP
            </a>
          </header>

          <div className="-mt-20 max-w-5xl pb-2 pt-8 sm:mt-0 sm:pb-8 sm:pt-[38vh] lg:pt-[34vh]">
            <p className="absolute -mt-5 inline-flex items-center gap-1 text-xs font-semibold tracking-[0.04em] text-[#62715f] sm:static sm:mb-5 sm:gap-2 sm:rounded-full sm:border sm:border-[#73836f]/35 sm:bg-white/76 sm:px-4 sm:py-2 sm:text-base sm:font-medium sm:text-[#4e604a] sm:shadow-sm sm:backdrop-blur">
              <PartyPopper className="h-4 w-4" aria-hidden="true" />
              60正青春，Lab再集合
            </p>
            <h1 className="font-serif text-[29px] font-bold leading-tight text-[#20251f] min-[390px]:text-[31px] sm:text-5xl lg:text-6xl">
              <span className="block whitespace-nowrap">六十正当年🎉长聘也到手</span>
              <span className="mt-3 block text-[#6b7f5f]">你导喊你回家吃饭啦!</span>
            </h1>
            <div className="mt-8 grid max-w-[660px] gap-3 text-base sm:grid-cols-[270px_375px]">
              <div className="order-1 flex min-h-14 items-center gap-4 rounded-md border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur">
                <CalendarDays className="h-5 w-5 shrink-0 text-[#7f6344]" aria-hidden="true" />
                <span className="font-medium">2026 年 9 月 26 日，周六</span>
              </div>
              <a
                href="https://surl.amap.com/jkmXhJ8d75Q"
                target="_blank"
                rel="noreferrer"
                className="order-4 flex min-h-14 items-center gap-4 rounded-md border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur transition hover:border-[#b08a55]/60 hover:bg-white/85 sm:order-2"
                aria-label="导航到上海闵行白金汉爵大酒店，沪闵路1577号"
              >
                <MapPin className="h-5 w-5 shrink-0 text-[#7f6344]" aria-hidden="true" />
                <span className="leading-6">
                  <span className="block">上海闵行白金汉爵大酒店</span>
                  <span className="block text-sm text-[#5f6b5b]">沪闵路1577号 点击导航</span>
                </span>
              </a>
              <div className="order-2 grid gap-2 sm:order-3 sm:col-start-1">
                {schedule.map((item) => (
                  <article
                    key={item.time}
                    className="flex min-h-10 items-center gap-4 rounded-md border border-white/70 bg-white/72 px-4 py-2 shadow-sm backdrop-blur"
                  >
                    <div className="text-base font-semibold text-[#7f6344]">{item.time}</div>
                    <h3 className="text-base font-light">{item.title}</h3>
                  </article>
                ))}
              </div>
              <div className="order-5 flex min-h-10 items-center rounded-md border border-white/70 bg-[#f8f0dc]/82 px-4 py-2 text-xl font-semibold text-[#506744] shadow-sm backdrop-blur sm:col-start-2 sm:row-start-2">
                距离回家吃饭还有 {timeLeft.days} 天{" "}
                {String(timeLeft.hours).padStart(2, "0")}:
                {String(timeLeft.minutes).padStart(2, "0")}:
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plan" className="mx-auto grid max-w-6xl gap-8 px-5 pb-9 pt-5 sm:px-8 sm:pb-12 sm:pt-8 lg:-mt-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:px-10">
        <div className="flex min-h-full flex-col">
          <div>
            <p className="mb-3 text-sm font-semibold text-[#7f6344]">Happy Birthday</p>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">咱们的乐福老师60岁啦！🎂</h2>
          </div>
        <p className="relative z-10 mt-3 text-xl font-semibold leading-8 text-[#6b7f5f] sm:text-[22px] lg:w-[1000px]">
            顺便还有一个好消息：长聘稳稳拿下，未来五年继续坐镇学校，“定海神针”继续在岗。😎
        </p>

        <div className="mt-3">
          <div className="space-y-4 text-base leading-8 text-[#4d564a] sm:text-lg lg:w-[1000px]">
            <p>
              所以——毕业多年的各位，是时候回家集合了。诚邀已经毕业、散落各地的同学们携家属一起返校相聚。下午回学校走走，看看熟悉的校园，找找当年的回忆；晚上再一起吃饭、聊天、叙旧，为张老师庆祝生日，也给久未相聚的师门补上一场中秋团圆。🌕
            </p>
            <p className="text-lg font-semibold leading-8 text-[#6b7f5f]">
              家属欢迎，小朋友更欢迎。
            </p>
          </div>
        </div>
        <div id="rsvp" className="mt-8 max-w-3xl">
          <form
            action="/api/rsvp"
            method="post"
            onSubmit={rememberRsvp}
            className="rsvp-form rounded-md bg-white p-5 shadow-sm sm:p-6"
          >
            <label className="block text-sm font-semibold" htmlFor="name">
              姓名
            </label>
            <input
              id="name"
              name="name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] px-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="请输入你的名字"
            />

            <label className="mt-5 block text-sm font-semibold" htmlFor="contact">
              联系电话
            </label>
            <input
              id="contact"
              name="contact"
              required
              inputMode="tel"
              value={form.contact}
              onChange={(event) => setForm({ ...form, contact: event.target.value })}
              className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] px-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="方便活动前联系确认"
            />

            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">是否出席</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {[
                  ["yes", "必须回来 😎"],
                  ["family", "带家属回来 👨‍👩‍👧"],
                  ["no", "遗憾缺席 🥲"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[#cbd4c6] px-3 text-sm font-medium has-[:checked]:border-[#536b48] has-[:checked]:bg-[#eef3e9]"
                  >
                    <input
                      type="radio"
                      name="attending"
                      value={value}
                      checked={form.attending === value}
                      onChange={() =>
                        setForm({
                          ...form,
                          attending: value as Rsvp["attending"],
                          guests: Math.max(form.guests, 1),
                        })
                      }
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="guest-field">
                <label className="mt-5 block text-sm font-semibold" htmlFor="guests">
                  出席人数
                </label>
                <select
                  id="guests"
                  name="guests"
                  value={form.guests}
                  onChange={(event) => setForm({ ...form, guests: Number(event.target.value) })}
                  className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] bg-white px-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
                >
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>
                      {count} 人
                    </option>
                  ))}
                </select>
            </div>

            <label className="mt-5 block text-sm font-semibold" htmlFor="message">
              老师，我想大声告诉你：
            </label>
            <textarea
              id="message"
              name="message"
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="mt-2 min-h-28 w-full rounded-md border border-[#cbd4c6] px-3 py-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="写几句想对老师说的话"
            />

            <button
              type="submit"
              disabled={isSavingRsvp}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#5f7657] px-4 font-semibold text-white transition hover:bg-[#4d6447] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSavingRsvp ? "正在提交..." : "提交 / 更新 RSVP"}
            </button>
            {rsvpMessage && (
              <p id="rsvp-status" className="mt-4 rounded-md bg-[#f8f0dc] px-4 py-3 text-sm font-semibold text-[#506744]">
                {rsvpMessage}
              </p>
            )}
          </form>
        </div>
        </div>
        <div className="hidden lg:block lg:self-end">
          <figure className="rotate-[-2deg] overflow-hidden rounded-md border border-[#d9dfd3] bg-white p-2 shadow-xl shadow-[#41533c]/15">
            <img
              src="/birthday-invitation.png"
              alt="乐福老师生日会海报"
              className="h-auto w-full object-cover"
            />
          </figure>
        </div>
      </section>

      <section className="bg-[#f8f7f2]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
          <style>{`
            .photo-enhanced {
              display: none;
            }
            .photo-fallback {
              display: block;
            }
            .js-ready .photo-enhanced {
              display: block;
            }
            .js-ready .photo-fallback {
              display: none;
            }
          `}</style>
          <p className="mb-3 text-sm font-semibold text-[#7f6344]">照片墙</p>
          <div className="lg:w-[1000px]">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">把照片也带回来。</h2>
            <p className="mt-4 text-base leading-7 text-[#4d564a] sm:text-lg sm:leading-8">
              翻翻旧手机、硬盘和云盘。毕业照、实验室日常、团建、出差，还有那些当年觉得好笑、现在越看越有意思的照片。当然，和家人的合照、近照也欢迎，方便大家看看这些年彼此都“更新”成什么版本了。😂
            </p>
            <div className="photo-enhanced">
              <input
                ref={photoInputRef}
                id="photo-files"
                type="file"
                accept="image/*"
                multiple
                onChange={preparePhotos}
                className="sr-only"
              />
              <label
                htmlFor="photo-files"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#5f7657] px-5 font-semibold text-white transition hover:bg-[#4d6447] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingPhotos ? "正在上传..." : "上传珍贵史料"}
              </label>
              <p className="mt-3 text-sm font-medium leading-6 text-[#6b7f5f]">
                双击图片可放大查看并保存
              </p>
            </div>
            <form
              action="/api/photos"
              method="post"
              encType="multipart/form-data"
              className="photo-fallback mt-5 rounded-md border border-[#d8ddd3] bg-white/70 p-4"
            >
              <label className="block text-sm font-semibold" htmlFor="photo-fallback-files">
                上传照片
              </label>
              <input
                id="photo-fallback-files"
                name="photos"
                type="file"
                accept="image/*"
                multiple
                required
                className="mt-2 block w-full rounded-md border border-[#cbd4c6] bg-white px-3 py-2 text-sm outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-[#5f7657] file:px-3 file:py-2 file:font-semibold file:text-white focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              />
              <label className="mt-4 block text-sm font-semibold" htmlFor="photo-fallback-caption">
                一句话描述
              </label>
              <input
                id="photo-fallback-caption"
                name="caption"
                maxLength={120}
                className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] bg-white px-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
                placeholder="例如：2025 浦江郊野公园烧烤趴"
              />
              <input type="hidden" name="uploaderName" value={form.name} />
              <button
                type="submit"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-[#cbd4c6] bg-white px-5 font-semibold text-[#40513b] transition hover:bg-[#eef3e9]"
              >
                确认上传
              </button>
            </form>
            {photoMessage && (
              <p id="photos-status" className="mt-4 rounded-md bg-[#eef3e9] px-4 py-3 text-sm font-semibold text-[#506744]">
                {photoMessage}
              </p>
            )}
          </div>
          {sortedPhotos.length > 0 && (
            <div
              ref={photoSlideshowRef}
              className={isPhotoFullscreen ? "relative flex h-screen w-screen items-center bg-black" : "relative mt-8 sm:mt-10"}
              onMouseEnter={() => setIsCarouselPaused(true)}
              onMouseLeave={() => setIsCarouselPaused(false)}
              onFocusCapture={() => {
                if (!isPhotoFullscreen) setIsCarouselPaused(true);
              }}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsCarouselPaused(false);
                }
              }}
            >
              <Carousel
                setApi={setCarouselApi}
                opts={{ loop: true }}
                aria-label="照片滚动放映墙"
                className={isPhotoFullscreen ? "h-screen w-screen" : "mx-auto max-w-5xl"}
              >
                <CarouselContent className={isPhotoFullscreen ? "-ml-0 h-screen" : "-ml-0"}>
                  {sortedPhotos.map((photo) => (
                    <CarouselItem key={`slideshow-${photo.id}`} className={isPhotoFullscreen ? "h-screen pl-0" : "pl-0"}>
                      <figure className={isPhotoFullscreen ? "relative h-screen overflow-hidden bg-black" : "relative overflow-hidden rounded-md border border-[#d9dfd3] bg-[#20251f] shadow-xl shadow-[#41533c]/20"}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPhotoFullscreen) setSelectedPhotoId(photo.id);
                          }}
                          className={isPhotoFullscreen ? "block h-full w-full text-left focus:outline-none" : "block w-full text-left focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#f3dfad]/60"}
                          aria-label={`放大查看：${photo.caption}`}
                        >
                          <div className={isPhotoFullscreen ? "flex h-screen w-screen items-center justify-center overflow-hidden" : "flex aspect-[4/3] items-center justify-center overflow-hidden sm:aspect-[16/9]"}>
                            <img
                              src={photo.src}
                              alt={photo.name}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <figcaption className={isPhotoFullscreen ? "absolute inset-x-0 bottom-0 bg-black/72 px-8 py-5 pr-32 font-serif text-3xl font-bold leading-tight text-white backdrop-blur-sm" : "absolute inset-x-0 bottom-0 bg-[#17202b]/88 px-4 py-3 pr-20 font-serif text-base font-bold leading-6 text-white backdrop-blur-sm sm:px-6 sm:py-4 sm:pr-24 sm:text-xl sm:leading-7"}>
                            {photo.caption}
                          </figcaption>
                        </button>
                      </figure>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <button
                  type="button"
                  onClick={togglePhotoFullscreen}
                  className="absolute right-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/70 bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 focus:outline-none focus:ring-4 focus:ring-white/30 sm:right-4 sm:top-4"
                  aria-label={isPhotoFullscreen ? "退出照片全屏" : "照片全屏播放"}
                  title={isPhotoFullscreen ? "退出全屏" : "全屏播放"}
                >
                  {isPhotoFullscreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Expand className="h-5 w-5" aria-hidden="true" />}
                </button>
                {sortedPhotos.length > 1 && (
                  <>
                    <CarouselPrevious
                      className="left-3 h-10 w-10 border-white/70 bg-white/90 text-[#40513b] hover:bg-white sm:left-4"
                      aria-label="上一张照片"
                    />
                    <CarouselNext
                      className="right-3 h-10 w-10 border-white/70 bg-white/90 text-[#40513b] hover:bg-white sm:right-4"
                      aria-label="下一张照片"
                    />
                    <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-[#17202b]/78 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm sm:bottom-4 sm:right-4 sm:text-sm">
                      {currentSlide + 1} / {sortedPhotos.length}
                    </span>
                  </>
                )}
              </Carousel>
            </div>
          )}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-3 lg:items-start">
            {sortedPhotos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                comments={commentsByPhotoId[photo.id] ?? []}
                defaultAuthor={form.name}
                offsetClass={index === 1 ? "sm:mt-10" : index === 2 ? "sm:mt-3" : ""}
                onOpen={setSelectedPhotoId}
                onPhotoChanged={handlePhotoChanged}
                onCommentAdded={(comment) =>
                  setPhotoComments((current) => [...current, comment])
                }
                onTouchEnd={handlePhotoTouchEnd}
              />
            ))}
          </div>
        </div>
      </section>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#20251f]/70 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedPhotoId(null)}
        >
          <section
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-md bg-[#f8f7f2] shadow-2xl shadow-black/25"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#d8ddd3] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#7f6344]">照片墙</p>
                <h2 className="truncate font-serif text-xl font-bold text-[#20251f] sm:text-2xl">
                  {selectedPhoto.caption}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoId(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8ddd3] bg-white text-[#40513b] transition hover:bg-[#eef3e9] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25"
                aria-label="关闭照片查看"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[#20251f] p-3 sm:p-5">
              <img
                src={selectedPhoto.src}
                alt={selectedPhoto.caption}
                className="max-h-[68vh] w-auto max-w-full object-contain"
              />
            </div>
            <div className="border-t border-[#d8ddd3] px-4 py-3 sm:px-5">
              <p className="text-sm leading-6 text-[#5f6b5b]">长按图片保存到手机相册</p>
            </div>
          </section>
        </div>
      )}

      <section id="guest-wall" className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
        <style>{`
          @keyframes guest-roll {
            from { transform: translateY(0); }
            to { transform: translateY(-50%); }
          }
          .guest-roll-track {
            animation: guest-roll var(--guest-roll-duration, 24s) linear infinite;
          }
          .guest-roll-track:hover {
            animation-play-state: paused;
          }
          .guest-stage-track {
            animation: guest-roll var(--guest-stage-duration, 60s) linear infinite;
          }
          .guest-stage-track.is-paused {
            animation-play-state: paused;
          }
          .guest-wall-modal {
            display: none;
          }
          .guest-wall-modal:target {
            display: flex;
          }
          .rsvp-form:has(input[value="no"]:checked) .guest-field {
            display: none;
          }
        `}</style>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm font-semibold text-[#7f6344]">留言墙</p>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">先说两句，见面再聊。</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openWallComposer}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#5f7657] px-4 text-sm font-semibold text-white transition hover:bg-[#4d6447]"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              我要留言
            </button>
            <button
              type="button"
              onClick={openWallStage}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#cbd4c6] bg-white px-4 text-sm font-semibold text-[#40513b] transition hover:bg-[#eef3e9]"
            >
              <Expand className="h-4 w-4" aria-hidden="true" />
              大屏播放
            </button>
          </div>
        </div>
        <a
          href="#wall-all"
          className="mt-5 block h-48 cursor-pointer overflow-hidden border-y border-[#d8ddd3] bg-[#f8f7f2] py-3 transition hover:bg-white/65 sm:mt-7 sm:h-52"
          aria-label="查看所有留言"
        >
          {rollingWallNotes.length ? (
          <div
            className="guest-roll-track flex flex-col gap-2"
            style={{
              "--guest-roll-duration": `${Math.max(24, wallNotes.length * 4)}s`,
            } as React.CSSProperties}
          >
            {rollingWallNotes.map((note, index) => (
              <blockquote
                key={`${note.id}-${index}`}
                className="flex min-h-14 items-start gap-3 rounded-md border border-[#d9dfd3] bg-white/86 px-3 py-2 text-sm leading-5 text-[#4d564a] shadow-sm backdrop-blur"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5f7657] font-serif text-xs font-bold text-white">
                  {note.avatar}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-[#7f6344]">
                    {note.author}：
                  </span>
                  <span className="line-clamp-2 block text-sm">“{note.text}”</span>
                </span>
              </blockquote>
            ))}
          </div>
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm leading-6 text-[#6b7f5f]">
              留言提交后，会在这里滚动显示。
            </div>
          )}
        </a>
      </section>

      <div
        ref={wallStageRef}
        className={`fixed inset-0 flex h-screen w-screen flex-col overflow-hidden bg-[#17202b] text-white transition-opacity ${isWallStageOpen ? "z-[100] opacity-100" : "pointer-events-none -z-50 opacity-0"}`}
        aria-hidden={!isWallStageOpen}
        inert={!isWallStageOpen}
      >
        <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-white/15 bg-[#17202b]/92 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div>
            <p className="text-xs font-semibold text-[#f3dfad]">乐福老师 60 岁生日会</p>
            <h2 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">来宾留言</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsWallStagePaused((paused) => !paused)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-label={isWallStagePaused ? "继续播放留言" : "暂停留言播放"}
              title={isWallStagePaused ? "继续播放" : "暂停播放"}
            >
              {isWallStagePaused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={toggleWallStageFullscreen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-label={isWallStageFullscreen ? "退出浏览器全屏" : "进入浏览器全屏"}
              title={isWallStageFullscreen ? "退出全屏" : "进入全屏"}
            >
              {isWallStageFullscreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Expand className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={closeWallStage}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-label="关闭留言大屏"
              title="关闭"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden px-5 py-6 sm:px-[8vw] sm:py-8">
          {stageWallNotes.length ? (
            <div
              className={`${wallNotes.length > 1 ? "guest-stage-track" : ""} flex flex-col gap-4 ${isWallStagePaused ? "is-paused" : ""}`}
              style={{
                "--guest-stage-duration": `${Math.max(48, wallNotes.length * 4)}s`,
              } as React.CSSProperties}
            >
              {stageWallNotes.map((note, index) => (
                <blockquote
                  key={`stage-${note.id}-${index}`}
                  className="flex min-h-28 items-center gap-5 rounded-md border border-white/15 bg-white/10 px-5 py-5 shadow-lg backdrop-blur-sm sm:min-h-32 sm:gap-7 sm:px-8"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f3dfad] font-serif text-xl font-bold text-[#40513b] sm:h-16 sm:w-16 sm:text-2xl">
                    {note.avatar}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-[#f3dfad] sm:text-xl">{note.author}</span>
                    <span className="mt-2 block break-words font-serif text-xl leading-relaxed sm:text-3xl">“{note.text}”</span>
                  </span>
                </blockquote>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center font-serif text-3xl text-white/70">还没有留言，期待第一句话。</div>
          )}
        </div>
      </div>

      {isWallComposerOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#20251f]/60 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submitWallNote} className="w-full max-w-lg rounded-md bg-white p-5 shadow-2xl shadow-black/25 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#7f6344]">留言墙</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-[#20251f]">写下你的留言</h2>
              </div>
              <button type="button" onClick={() => setIsWallComposerOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#d8ddd3] text-[#40513b] hover:bg-[#eef3e9]" aria-label="关闭留言窗口">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold" htmlFor="wall-note-author">署名</label>
            <input
              id="wall-note-author"
              value={wallNoteDraft.author}
              onChange={(event) => setWallNoteDraft({ ...wallNoteDraft, author: event.target.value })}
              maxLength={40}
              required
              className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] px-3 outline-none focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="请输入你的名字"
            />
            <label className="mt-4 block text-sm font-semibold" htmlFor="wall-note-message">留言内容</label>
            <textarea
              id="wall-note-message"
              value={wallNoteDraft.message}
              onChange={(event) => setWallNoteDraft({ ...wallNoteDraft, message: event.target.value })}
              maxLength={500}
              required
              rows={5}
              className="mt-2 w-full resize-y rounded-md border border-[#cbd4c6] px-3 py-2 outline-none focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="想对老师或大家说些什么？"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#6b7f5f]">
              <span>{wallNoteStatus}</span>
              <span>{wallNoteDraft.message.length}/500</span>
            </div>
            <button type="submit" disabled={isSavingWallNote} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#5f7657] px-4 font-semibold text-white hover:bg-[#4d6447] disabled:opacity-60">
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSavingWallNote ? "正在发布..." : "发布留言"}
            </button>
          </form>
        </div>
      )}

      <div id="wall-all" className="guest-wall-modal fixed inset-0 z-[70] items-center justify-center bg-[#20251f]/55 px-4 py-6 backdrop-blur-sm">
          <section className="relative flex h-[66vh] w-full max-w-4xl flex-col rounded-md bg-[#f8f7f2] shadow-2xl shadow-black/25">
            <div className="flex items-center justify-between border-b border-[#d8ddd3] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#7f6344]">留言墙</p>
                <h2 className="font-serif text-2xl font-bold text-[#20251f]">所有留言</h2>
              </div>
              <a
                href="#guest-wall"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8ddd3] bg-white text-[#40513b] transition hover:bg-[#eef3e9] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25"
                aria-label="关闭留言墙"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {wallNotes.length ? (
                <div className="grid gap-3">
                  {wallNotes.map((note) => (
                    <blockquote
                      key={note.id}
                      className="flex items-start gap-3 rounded-md border border-[#d9dfd3] bg-white px-4 py-3 text-sm leading-6 text-[#4d564a] shadow-sm"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5f7657] font-serif text-sm font-bold text-white">
                        {note.avatar}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#7f6344]">
                          {note.author}：
                        </span>
                        <span className="block">“{note.text}”</span>
                      </span>
                    </blockquote>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-[#6b7f5f]">
                  留言提交后，会在这里显示。
                </div>
              )}
            </div>
          </section>
        </div>

      {pendingPhotoFiles.length > 0 && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#20251f]/55 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={uploadPendingPhotos}
            className="w-full max-w-md rounded-md bg-white p-5 shadow-2xl shadow-black/25"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#7f6344]">一句话描述</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-[#20251f]">
                  给这批照片加个标题
                </h2>
              </div>
              <button
                type="button"
                onClick={closePhotoCaption}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d8ddd3] text-[#40513b] transition hover:bg-[#eef3e9] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25"
                aria-label="取消上传照片"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold" htmlFor="photo-caption">
              照片描述
            </label>
            <input
              id="photo-caption"
              autoFocus
              value={captionDraft}
              onChange={(event) => setCaptionDraft(event.target.value)}
              maxLength={120}
              className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] px-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="例如：2025 浦江郊野公园烧烤趴"
            />
            <p className="mt-3 text-sm text-[#6b7f5f]">
              已选择 {pendingPhotoFiles.length} 张照片。
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closePhotoCaption}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-[#cbd4c6] px-4 font-semibold text-[#40513b] transition hover:bg-[#eef3e9]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isUploadingPhotos}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-[#5f7657] px-4 font-semibold text-white transition hover:bg-[#4d6447] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingPhotos ? "正在上传..." : "确认上传"}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMusic}
        className="fixed bottom-5 right-5 z-50 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/70 bg-[#f8f0dc] px-4 text-sm font-semibold text-[#40513b] shadow-lg shadow-[#41533c]/15 transition hover:bg-[#ead7ad] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25"
        aria-pressed={!isMuted}
        aria-label={isMuted ? "播放音乐" : "静音音乐"}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        )}
        {isMuted ? "播放音乐" : "静音"}
      </button>

      <footer className="border-t border-[#d8ddd3] bg-[#5f7657] py-8 text-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-2xl font-bold">乐福老师 Double Happy 生日会</p>
            <p className="mt-1 text-xs font-semibold tracking-[0.18em] text-white/60">
              LEFU&apos;S TURNING 60 · CORROSION LAB
            </p>
          </div>
          <p className="flex items-center gap-2 text-base text-white/70">
            <Music2 className="h-4 w-4" aria-hidden="true" />
            2026.09.26 · 学校见
          </p>
        </div>
        </div>
      </footer>
    </main>
  );
}
