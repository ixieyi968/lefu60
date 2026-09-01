"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Mail,
  MapPin,
  Music2,
  PartyPopper,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";

type Rsvp = {
  name: string;
  attending: "yes" | "family" | "no";
  guests: number;
  contact: string;
  message: string;
};

type Photo = {
  id: string;
  src: string;
  name: string;
  caption: string;
  rotation: string;
};

type WallNote = {
  id: string;
  author: string;
  avatar: string;
  text: string;
  status?: string;
};

const eventDate = new Date("2026-09-26T14:00:00+08:00");

const schedule = [
  { time: "14:00", title: "重返校园 · 共忆芳华" },
  { time: "18:00", title: "六十寿宴 · 归来仍是少年" },
];

const initialPhotos: Photo[] = [
  {
    id: "bbq-2025-1",
    src: "/bbq-2025-1.jpg",
    name: "浦江郊野公园烧烤趴",
    caption: "2025 浦江郊野公园烧烤趴",
    rotation: "rotate-[-2deg]",
  },
  {
    id: "bbq-2025-2",
    src: "/bbq-2025-2.jpg",
    name: "浦江郊野公园烧烤趴",
    caption: "2025 浦江郊野公园烧烤趴",
    rotation: "rotate-[1.5deg]",
  },
  {
    id: "teachers-day-2025",
    src: "/teachers-day-2025.jpg",
    name: "2025 教师节合影",
    caption: "2025 教师节合影",
    rotation: "rotate-[-1deg]",
  },
];

const initialWallNotes: WallNote[] = [
  {
    id: "wish-1",
    author: "老同门 A",
    avatar: "A",
    text: "愿张老师生日快乐，科研长青，饭局常在。",
  },
  {
    id: "wish-2",
    author: "实验室 B",
    avatar: "B",
    text: "这次不汇报、不组会，只负责开心相聚。",
  },
  {
    id: "wish-3",
    author: "毕业生 C",
    avatar: "C",
    text: "毕业多年还能被喊回家吃饭，真好。",
  },
];

function getTimeLeft() {
  const diff = Math.max(eventDate.getTime() - Date.now(), 0);

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [showGlassesTip, setShowGlassesTip] = useState(false);
  const [rsvpMessage, setRsvpMessage] = useState("");
  const [isOpened, setIsOpened] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [wallNotes, setWallNotes] = useState<WallNote[]>(initialWallNotes);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [form, setForm] = useState<Rsvp>({
    name: "",
    attending: "yes",
    guests: 1,
    contact: "",
    message: "",
  });

  useEffect(() => {
    setTimeLeft(getTimeLeft());
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    const saved = window.localStorage.getItem("lefu60-rsvp");

    if (saved) {
      const parsed = JSON.parse(saved) as Rsvp;
      setForm(parsed);
    }

    return () => window.clearInterval(timer);
  }, []);

  function submitRsvp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("lefu60-rsvp", JSON.stringify(form));
    setRsvpMessage("嗯，记得准时回来。");

    const message = form.message.trim();
    if (message) {
      setWallNotes((current) => [
        {
          id: `wish-${Date.now()}`,
          author: form.name.trim() || "一位同门",
          avatar: (form.name.trim() || "同").slice(0, 1).toUpperCase(),
          text: message,
          status: "待审核",
        },
        ...current,
      ]);
    }
  }

  function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!files.length) return;

    const promptedCaption = window.prompt("给这批照片加一句 caption，例如：2025 浦江郊野公园烧烤趴");
    if (promptedCaption === null) {
      event.target.value = "";
      return;
    }

    const rotations = ["rotate-[-2deg]", "rotate-[1.5deg]", "rotate-[-1deg]", "rotate-[2deg]"];
    const caption = promptedCaption.trim() || "新上传的珍贵史料";
    const nextPhotos = files.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      src: URL.createObjectURL(file),
      name: file.name,
      caption,
      rotation: rotations[(photos.length + index) % rotations.length],
    }));

    setPhotos((current) => [...nextPhotos, ...current].slice(0, 12));
    event.target.value = "";
  }

  function choosePhotos() {
    photoInputRef.current?.click();
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

  if (!isOpened) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#edf3ef] text-[#17202b]">
        <img
          src="/canopy-poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.64)_0%,rgba(255,255,255,0.32)_36%,rgba(238,244,239,0.14)_68%)]" />
        <audio ref={audioRef} src="/audio/pingfan-road.m4a" loop preload="auto" />

        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 text-center">
          <h1 className="max-w-5xl text-4xl font-bold leading-tight text-[#162033] sm:text-5xl lg:text-6xl">
            六十正当年，长聘也到手🎉
            <span className="mt-3 block">你导喊你回家吃饭啦!⛷️</span>
          </h1>
          <p className="mt-8 text-lg font-medium text-[#263145] sm:text-xl">
            2026年9月26日星期六 · 14:00
          </p>
          <button
            type="button"
            onClick={openInvitation}
            className="mt-10 inline-flex min-h-14 items-center gap-3 rounded-full bg-[#5f7657] px-9 text-lg font-bold text-white shadow-xl shadow-[#41533c]/20 transition hover:bg-[#4d6447] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/30"
          >
            <Mail className="h-5 w-5" aria-hidden="true" />
            打开邀请函
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef0ec] text-[#20251f]">
      <audio ref={audioRef} src="/audio/pingfan-road.m4a" loop preload="auto" />
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src="/invitation-cover.webp"
          alt="张老师生日会邀请封面"
          className="absolute inset-0 h-full w-full object-cover object-[52%_top] sm:object-center"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_31%,rgba(238,240,236,0.02)_0%,rgba(238,240,236,0.08)_13%,rgba(238,240,236,0.42)_34%,rgba(238,240,236,0.82)_78%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_70%,rgba(238,240,236,0.9)_0%,rgba(238,240,236,0.7)_26%,rgba(238,240,236,0)_56%)] sm:bg-[radial-gradient(ellipse_at_28%_66%,rgba(238,240,236,0.86)_0%,rgba(238,240,236,0.68)_28%,rgba(238,240,236,0)_58%)]" />
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
        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-between px-5 py-5 sm:min-h-[92vh] sm:px-8 sm:py-6 lg:px-10">
          <header className="flex items-center justify-between gap-4">
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

          <div className="max-w-5xl pb-8 pt-[46vh] sm:pb-10 sm:pt-[36vh] lg:pt-[34vh]">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#73836f]/35 bg-white/66 px-4 py-2 text-sm font-medium text-[#4e604a] backdrop-blur sm:mb-5 sm:text-base">
              <PartyPopper className="h-4 w-4" aria-hidden="true" />
              60正青春，Lab再集合
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-[#20251f] sm:text-5xl lg:text-6xl">
              <span className="block sm:whitespace-nowrap">六十正当年，长聘也到手。</span>
              <span className="mt-3 block text-[#6b7f5f]">你导喊你回家吃饭啦!</span>
            </h1>
            <div className="mt-8 grid max-w-[660px] gap-3 text-base sm:grid-cols-[270px_375px]">
              <div className="flex min-h-14 items-center gap-4 rounded-md border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur">
                <CalendarDays className="h-5 w-5 shrink-0 text-[#7f6344]" aria-hidden="true" />
                <span className="font-medium">2026 年 9 月 26 日，周六</span>
              </div>
              <a
                href="https://uri.amap.com/navigation?to=121.41013,31.04397,%E4%B8%8A%E6%B5%B7%E9%97%B5%E8%A1%8C%E7%99%BD%E9%87%91%E6%B1%89%E7%88%B5%E5%A4%A7%E9%85%92%E5%BA%97&mode=car&policy=1&src=lefu60.beer&coordinate=gaode&callnative=1"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-14 items-center gap-4 rounded-md border border-white/70 bg-white/72 px-4 py-3 shadow-sm backdrop-blur transition hover:border-[#b08a55]/60 hover:bg-white/85"
              >
                <MapPin className="h-5 w-5 shrink-0 text-[#7f6344]" aria-hidden="true" />
                <span>上海闵行白金汉爵大酒店（沪闵路1577号）</span>
              </a>
              <div className="grid gap-2 sm:col-start-1">
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
              <div className="flex min-h-10 items-center rounded-md border border-white/70 bg-[#f8f0dc]/82 px-4 py-2 text-xl font-semibold text-[#506744] shadow-sm backdrop-blur sm:col-start-2 sm:row-start-2">
                距离回家吃饭还有 {timeLeft.days} 天{" "}
                {String(timeLeft.hours).padStart(2, "0")}:
                {String(timeLeft.minutes).padStart(2, "0")}:
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plan" className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:px-10">
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
          <form onSubmit={submitRsvp} className="rounded-md bg-white p-5 shadow-sm sm:p-6">
            <label className="block text-sm font-semibold" htmlFor="name">
              姓名
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] px-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="请输入你的名字"
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
                      onChange={() => setForm({ ...form, attending: value as Rsvp["attending"] })}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block text-sm font-semibold" htmlFor="guests">
              出席人数
            </label>
            <input
              id="guests"
              type="number"
              min="1"
              max="10"
              value={form.guests}
              onChange={(event) => setForm({ ...form, guests: Number(event.target.value) })}
              className="mt-2 h-11 w-full rounded-md border border-[#cbd4c6] px-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
            />

            <label className="mt-5 block text-sm font-semibold" htmlFor="message">
              老师，我想大声告诉你：
            </label>
            <textarea
              id="message"
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="mt-2 min-h-28 w-full rounded-md border border-[#cbd4c6] px-3 py-3 outline-none transition focus:border-[#6b7f5f] focus:ring-2 focus:ring-[#6b7f5f]/20"
              placeholder="写几句想对老师说的话"
            />

            <button className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#5f7657] px-4 font-semibold text-white transition hover:bg-[#4d6447] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25">
              <Send className="h-4 w-4" aria-hidden="true" />
              提交 RSVP
            </button>
            {rsvpMessage && (
              <p className="mt-4 rounded-md bg-[#f8f0dc] px-4 py-3 text-sm font-semibold text-[#506744]">
                {rsvpMessage}
              </p>
            )}
          </form>
        </div>
        </div>
        <div className="lg:self-end">
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
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10">
          <p className="mb-3 text-sm font-semibold text-[#7f6344]">照片墙</p>
          <div className="lg:w-[1000px]">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">把照片也带回来。</h2>
            <p className="mt-5 text-lg leading-8 text-[#4d564a]">
              翻翻旧手机、硬盘和云盘。毕业照、实验室日常、团建、出差，还有那些当年觉得好笑、现在越看越有意思的照片。当然，和家人的合照、近照也欢迎，方便大家看看这些年彼此都“更新”成什么版本了。😂
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={addPhotos}
              className="sr-only"
            />
            <button
              type="button"
              onClick={choosePhotos}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#5f7657] px-5 font-semibold text-white transition hover:bg-[#4d6447] focus:outline-none focus:ring-4 focus:ring-[#b08a55]/25"
            >
              上传珍贵史料
            </button>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
            {photos.map((photo, index) => (
              <figure
                key={photo.id}
                className={`relative rounded-sm border border-[#e3dccb] bg-white p-3 pb-5 shadow-xl shadow-[#41533c]/15 transition hover:z-10 hover:scale-[1.02] ${photo.rotation} ${
                  index === 1 ? "sm:mt-10" : index === 2 ? "sm:mt-3" : ""
                }`}
              >
                <span className="absolute -top-3 left-1/2 h-7 w-24 -translate-x-1/2 rotate-[-3deg] bg-[#f3dfad]/75 shadow-sm" />
                <img
                  src={photo.src}
                  alt={photo.name}
                  className="aspect-[4/3] w-full rounded-[2px] object-cover"
                />
                <figcaption className="mt-3 font-serif text-lg font-bold leading-6 text-[#253024]">
                  {photo.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-10">
        <style>{`
          @keyframes guest-roll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .guest-roll-track {
            animation: guest-roll 28s linear infinite;
          }
          .guest-roll-track:hover {
            animation-play-state: paused;
          }
        `}</style>
        <p className="mb-3 text-sm font-semibold text-[#7f6344]">Guest Wall</p>
        <h2 className="font-serif text-3xl font-bold sm:text-4xl">先说两句，见面再聊。</h2>
        <div className="mt-7 overflow-hidden border-y border-[#d8ddd3] bg-[#f8f7f2] py-4">
          <div className="guest-roll-track flex w-max gap-4 pr-4">
            {wallNotes.map((note) => (
              <blockquote
                key={note.id}
                className="flex min-h-24 w-[320px] shrink-0 items-start gap-3 rounded-full border border-[#d9dfd3] bg-white/86 px-5 py-4 leading-7 text-[#4d564a] shadow-sm backdrop-blur"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5f7657] font-serif text-lg font-bold text-white">
                  {note.avatar}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#7f6344]">
                    {note.author}：
                    {note.status && <span className="ml-2 text-xs text-[#6b7f5f]">{note.status}</span>}
                  </span>
                  <span className="block text-base">“{note.text}”</span>
                </span>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

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
