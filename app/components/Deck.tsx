"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { MENU_SLIDE, PLATFORMS } from "../slides";

type Theme = "dark" | "light";

/** Top bar: page title on the left, host/sponsor lockup on the right,
 *  both on the same line. The lockup is fixed on every slide; the title
 *  is only passed on the menu screen. */
function TopBar({ title }: { title?: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-3 z-30 flex items-center justify-between sm:inset-x-6 sm:top-4">
      <div>
        {title && (
          <span className="text-fg font-mono text-xs uppercase tracking-[0.35em] sm:text-sm">
            {title}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Image
          src="/kba-logo.png"
          alt="Kerala Blockchain Academy"
          width={367}
          height={518}
          priority
          className="h-[45px] w-auto sm:h-[55px]"
        />
        <div className="hidden leading-[1.2] md:block">
          <div className="text-fg text-[14px] font-bold uppercase tracking-wide sm:text-[15px]">Kerala</div>
          <div className="text-fg text-[14px] font-bold uppercase tracking-wide sm:text-[15px]">Blockchain</div>
          <div className="text-fg text-[14px] font-bold uppercase tracking-wide sm:text-[15px]">Academy</div>
        </div>
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.7 6.7 0 0 0 10.2 10.2Z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.25"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: direction === "right" ? "scaleX(-1)" : undefined }}
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CircleButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="btn flex h-9 w-9 items-center justify-center rounded-full border"
    >
      {children}
    </button>
  );
}

export default function Deck() {
  // null platformId = showing the card menu. Otherwise slideIdx is confined
  // to that platform's own slide list — stepping past either end returns to
  // the menu rather than spilling into another platform's slides.
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [theme, setTheme] = useState<Theme>("light");
  // Reveals the menu cards hidden by default — Ctrl+S+D held together, not
  // documented anywhere in the UI.
  const [hiddenUnlocked, setHiddenUnlocked] = useState(false);

  const platform = platformId ? PLATFORMS.find((p) => p.id === platformId) ?? null : null;
  const total = platform?.slides.length ?? 0;
  const slide = platform ? platform.slides[slideIdx] : MENU_SLIDE;

  useEffect(() => {
    // Reads the value the no-flash inline script (see layout.tsx) already
    // applied to <html> before hydration. Must run post-mount, not as a
    // lazy useState initializer, or server/client markup would mismatch.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("deck-theme", next);
      } catch {
        /* private-mode storage denial is fine — theme just won't persist */
      }
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const goToMenu = useCallback(() => {
    setPlatformId(null);
    setSlideIdx(0);
  }, []);

  const goTo = useCallback(
    (id: string) => {
      if (id === "menu") {
        goToMenu();
        return;
      }
      for (const p of PLATFORMS) {
        const i = p.slides.findIndex((s) => s.id === id);
        if (i >= 0) {
          setPlatformId(p.id);
          setSlideIdx(i);
          return;
        }
      }
    },
    [goToMenu],
  );

  // Steps within the current platform's flow; stepping past either end
  // returns to the menu (nav stays confined to one platform at a time).
  const step = useCallback(
    (delta: number) => {
      if (!platform) return;
      const next = slideIdx + delta;
      if (next < 0 || next >= platform.slides.length) {
        goToMenu();
      } else {
        setSlideIdx(next);
      }
    },
    [platform, slideIdx, goToMenu],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Space on a focused button (e.g. interactive slides) should click it,
      // not also advance the deck.
      if (e.key === " " && (e.target as HTMLElement)?.closest?.("button")) return;
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        toggleTheme();
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (!platform) return; // arrow/Home/End/Esc nav only applies inside a platform's flow
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          step(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          step(-1);
          break;
        case "Home":
          e.preventDefault();
          setSlideIdx(0);
          break;
        case "End":
          e.preventDefault();
          setSlideIdx(platform.slides.length - 1);
          break;
        case "Escape":
          e.preventDefault();
          goToMenu();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [platform, step, toggleTheme, toggleFullscreen, goToMenu]);

  // Separate listener: runs even while Ctrl is held (the nav listener above
  // bails out on any modifier key). Toggles on each fresh press of the combo
  // — held.size guards against keydown's repeat-while-held firing it
  // over and over.
  useEffect(() => {
    const held = new Set<string>();
    let triggered = false;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.ctrlKey && (k === "s" || k === "d")) {
        e.preventDefault(); // stop the browser's Save Page dialog on Ctrl+S
        held.add(k);
        if (held.has("s") && held.has("d") && !triggered) {
          triggered = true;
          setHiddenUnlocked((v) => !v);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      held.delete(k);
      if (k === "control" || k === "s" || k === "d") triggered = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const SlideComp = slide.component;

  return (
    <main className="text-fg fixed inset-0 select-none overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* ambient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, var(--blob1), transparent 70%)",
            opacity: "var(--blob1-opacity)",
          }}
        />
        <div
          className="absolute -bottom-48 -right-40 h-[36rem] w-[36rem] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, var(--blob2), transparent 70%)",
            opacity: "var(--blob2-opacity)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            opacity: "var(--grid-opacity)",
          }}
        />
      </div>

      {/* progress bar — only meaningful inside a platform's flow */}
      {platform && (
        <div className="absolute inset-x-0 top-0 z-20 h-[3px]" style={{ background: "var(--chrome-bg)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${((slideIdx + 1) / total) * 100}%`, background: "var(--grad-progress)" }}
          />
        </div>
      )}

      <TopBar title={platform ? undefined : "Interactive Demo"} />

      {/* slide — keyed so entrance animations replay on every navigation */}
      <div
        key={slide.id}
        className="absolute inset-0 z-10 animate-[fade-in_0.4s_ease_both]"
      >
        <SlideComp goTo={goTo} hiddenUnlocked={hiddenUnlocked} />
      </div>

      {/* bottom chrome */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center px-6 py-3">
        <div className="text-muted-2 hidden font-mono text-xs tracking-wide sm:block">
          {platform ? "← → navigate · Esc menu · D theme · F fullscreen" : "D theme · F fullscreen"}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <CircleButton onClick={toggleTheme} ariaLabel="Toggle light / dark theme">
            {theme === "light" ? <SunIcon /> : <MoonIcon />}
          </CircleButton>
          {platform && (
            <>
              <CircleButton onClick={goToMenu} ariaLabel="Back to menu">
                <GridIcon />
              </CircleButton>
              <CircleButton onClick={() => step(-1)} ariaLabel="Previous slide">
                <ChevronIcon direction="left" />
              </CircleButton>
              <span className="text-muted-2 min-w-14 text-center font-mono text-xs">
                {slideIdx + 1} / {total}
              </span>
              <CircleButton onClick={() => step(1)} ariaLabel="Next slide">
                <ChevronIcon direction="right" />
              </CircleButton>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
