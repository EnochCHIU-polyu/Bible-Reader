import { getManifest, getChapter } from "./services/bibleData";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Languages,
  Library,
  LoaderCircle,
  Moon,
  Search,
  Send,
  StickyNote,
  Sun,
  X,
} from 'lucide-react';

import './styles.css';

const NOTES_KEY = 'parallel-notes-v6';
const THEME_KEY = 'parallel-theme-v6';
const READING_POSITION_KEY = 'parallel-reading-position-v1';


const MOBILE_LOCKED_HEADER_CSS = `
@media (max-width: 850px) {
  :root {
    --phone-safe-top: max(env(safe-area-inset-top, 0px), 20px);
    --phone-header-bar: 60px;
    --phone-header-height: calc(var(--phone-safe-top) + var(--phone-header-bar));
  }

  html, body, #root, main {
    width: 100% !important;
    height: 100% !important;
    min-height: 100% !important;
    overflow: hidden !important;
  }

  .top {
    box-sizing: border-box !important;
    position: fixed !important;
    z-index: 1000 !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: var(--phone-header-height) !important;
    min-height: var(--phone-header-height) !important;
    margin: 0 !important;
    padding: var(--phone-safe-top) 10px 4px !important;
    display: flex !important;
    align-items: center !important;
    gap: 7px !important;
    overflow: visible !important;
    transform: translateZ(0) !important;
    backface-visibility: hidden !important;
    contain: layout paint !important;
    touch-action: manipulation !important;
  }

  .top .brand {
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }

  .top .brand b,
  .top .brand small {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .top > button,
  .top .mobileLang {
    flex: 0 0 48px !important;
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    min-height: 48px !important;
    padding: 0 !important;
  }

  .top .mobileLang {
    flex-basis: auto !important;
    width: auto !important;
    min-width: 60px !important;
    padding-inline: 10px !important;
  }

  .reader {
    box-sizing: border-box !important;
    position: fixed !important;
    z-index: 1 !important;
    top: var(--phone-header-height) !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  .reader > .scroll {
    min-height: 0 !important;
    overscroll-behavior-y: contain !important;
    overflow-anchor: none !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .chapterSection,
  .chapterSection .row {
    overflow-anchor: none !important;
  }

  .error {
    position: fixed !important;
    z-index: 1100 !important;
    top: calc(var(--phone-header-height) + 8px) !important;
    left: 10px !important;
    right: 10px !important;
  }

  .shade,
  .drawerShade,
  .composerShade {
    z-index: 2000 !important;
  }
}
`;
const MOBILE_NOTE_CSS = `
@media (max-width: 850px) {
  html.noteOpen, html.noteOpen body { overflow: hidden !important; overscroll-behavior: none !important; }
  .composerShade {
    position: fixed !important;
    left: 0 !important;
    top: var(--note-top, 0px) !important;
    width: 100vw !important;
    height: var(--note-height, 100dvh) !important;
    z-index: 2147483000 !important;
    display: block !important;
    overflow: hidden !important;
    background: var(--surface, #151a16) !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    overscroll-behavior: none !important;
  }
  .composer {
    box-sizing: border-box !important;
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: max(8px, env(safe-area-inset-top)) 14px max(8px, env(safe-area-inset-bottom)) !important;
    display: grid !important;
    grid-template-rows: auto auto minmax(90px, 1fr) auto !important;
    gap: 10px !important;
    overflow: hidden !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: var(--surface, #151a16) !important;
    color: var(--text, #f2f3ef) !important;
    transform: none !important;
  }
  .composerHandle { display: none !important; }
  .composerTopbar { display: grid !important; grid-template-columns: 48px minmax(0,1fr) 48px !important; align-items: center !important; gap: 8px !important; padding: 0 !important; }
  .composerTitle { min-width: 0 !important; text-align: center !important; }
  .composerTitle small { display: block !important; font-size: 10px !important; letter-spacing: .12em !important; opacity: .65 !important; }
  .composerTitle strong { display: block !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
  .composerIconButton { width: 48px !important; height: 48px !important; display: grid !important; place-items: center !important; padding: 0 !important; border-radius: 14px !important; }
  .composerTopbarSpacer { width: 48px !important; height: 48px !important; }
  .composerVerse { max-height: 4.8em !important; overflow: auto !important; padding: 10px 12px !important; border-radius: 12px !important; background: rgba(127,127,127,.11) !important; font-size: 14px !important; line-height: 1.55 !important; }
  .composer textarea { box-sizing: border-box !important; width: 100% !important; height: 100% !important; min-height: 90px !important; margin: 0 !important; padding: 14px !important; resize: none !important; border-radius: 14px !important; font: inherit !important; font-size: 16px !important; line-height: 1.55 !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; -webkit-appearance: none !important; }
  .composer footer { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 10px !important; min-height: 48px !important; padding: 0 !important; }
  .composer footer span { min-width: 0 !important; font-size: 12px !important; opacity: .65 !important; }
  .composer footer button { min-height: 48px !important; padding: 0 18px !important; display: inline-flex !important; align-items: center !important; gap: 7px !important; border-radius: 14px !important; white-space: nowrap !important; }
}
`;
const chapterKey = (chapter) => `${chapter.book}.${chapter.chapter}`;

function readReadingPosition() {
  try {
    return JSON.parse(localStorage.getItem(READING_POSITION_KEY) || 'null');
  } catch {
    return null;
  }
}

function readNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
  } catch {
    return {};
  }
}

function App() {
  const [manifest, setManifest] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [notes, setNotes] = useState(readNotes);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState('GEN');
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState('');
  const [mobileLanguage, setMobileLanguage] = useState('zh');
  const [composerVerse, setComposerVerse] = useState(null);
  const [draft, setDraft] = useState('');

  const saveTimer = useRef(null);
  const scroller = useRef(null);
  const loading = useRef(false);
  const requestController = useRef(null);
  const scrollAnchor = useRef(null);
  const jumpTarget = useRef(null);
  const previousScrollTop = useRef(0);
  const positionTimer = useRef(null);
  const restorePosition = useRef(readReadingPosition());
  const chaptersRef = useRef([]);
  const chapterCache = useRef(new Map());
  const chapterRequests = useRef(new Map());
  const navigationEpoch = useRef(0);
  const boundaryCheckFrame = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const loadedManifest = await getManifest(controller.signal);
        const savedPosition = restorePosition.current;
        const [savedBook, savedChapter] = savedPosition?.id?.split('.') || [];
        const savedMeta = loadedManifest.books.find((item) => item.code === savedBook);
        const validChapter = Number(savedChapter) >= 1 && Number(savedChapter) <= (savedMeta?.chapters || 0);
        const book = savedMeta && validChapter ? savedBook : 'GEN';
        const chapter = savedMeta && validChapter ? Number(savedChapter) : 1;
        const verses = await getChapter(book, chapter, controller.signal);
        const initial = [{ book, chapter, verses }];
        chapterCache.current.set(`${book}.${chapter}`, verses);
        chaptersRef.current = initial;
        setManifest(loadedManifest);
        setSelectedBook(book);
        setChapters(initial);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      setSaved(true);
    }, 250);
    return () => clearTimeout(saveTimer.current);
  }, [notes]);

  useEffect(() => { chaptersRef.current = chapters; }, [chapters]);

  const adjacentChapter = useCallback(
    (current, direction) => {
      if (!manifest) return null;
      const index = manifest.books.findIndex((book) => book.code === current.book);
      if (index < 0) return null;
      const book = manifest.books[index];

      if (direction > 0) {
        if (current.chapter < book.chapters) {
          return { book: current.book, chapter: current.chapter + 1 };
        }
        const nextBook = manifest.books[index + 1];
        return nextBook ? { book: nextBook.code, chapter: 1 } : null;
      }

      if (current.chapter > 1) {
        return { book: current.book, chapter: current.chapter - 1 };
      }
      const previousBook = manifest.books[index - 1];
      return previousBook
        ? { book: previousBook.code, chapter: previousBook.chapters }
        : null;
    },
    [manifest],
  );

  const getCachedChapter = useCallback(async (book, chapter, signal) => {
    const key = `${book}.${chapter}`;
    if (chapterCache.current.has(key)) return chapterCache.current.get(key);
    if (chapterRequests.current.has(key)) return chapterRequests.current.get(key);

    const request = getChapter(book, chapter, signal)
      .then((verses) => {
        chapterCache.current.set(key, verses);
        return verses;
      })
      .finally(() => chapterRequests.current.delete(key));
    chapterRequests.current.set(key, request);
    return request;
  }, []);

  const captureScrollAnchor = () => {
    const host = scroller.current;
    if (!host) return null;
    const hostTop = host.getBoundingClientRect().top;
    const node = [...host.querySelectorAll('[data-id]')].find(
      (item) => item.getBoundingClientRect().bottom > hostTop + 6,
    );
    return node
      ? { id: node.dataset.id, offset: node.getBoundingClientRect().top - hostTop }
      : null;
  };

  useLayoutEffect(() => {
    const anchor = scrollAnchor.current;
    if (!anchor || !scroller.current) return;
    const node = scroller.current.querySelector(
      `[data-id="${CSS.escape(anchor.id)}"]`,
    );
    if (node) {
      const hostTop = scroller.current.getBoundingClientRect().top;
      scroller.current.scrollTop +=
        node.getBoundingClientRect().top - hostTop - anchor.offset;
    }
    scrollAnchor.current = null;
  }, [chapters]);

  const loadAdjacent = useCallback(
    async (direction) => {
      if (query) return;
      const current = chaptersRef.current;
      if (!current.length) return;
      const edge = direction > 0 ? current.at(-1) : current[0];
      const target = adjacentChapter(edge, direction);
      if (!target) return;
      const targetKey = chapterKey(target);
      if (current.some((item) => chapterKey(item) === targetKey) || chapterRequests.current.has(targetKey)) return;

      const epoch = navigationEpoch.current;
      setError('');
      try {
        const verses = await getCachedChapter(target.book, target.chapter);
        if (epoch !== navigationEpoch.current) return;

        setChapters((live) => {
          if (epoch !== navigationEpoch.current) return live;
          const liveEdge = direction > 0 ? live.at(-1) : live[0];
          if (!liveEdge || chapterKey(liveEdge) !== chapterKey(edge)) return live;
          if (live.some((item) => chapterKey(item) === targetKey)) return live;

          const anchor = direction < 0 ? captureScrollAnchor() : null;
          const expanded = direction > 0
            ? [...live, { ...target, verses }]
            : [{ ...target, verses }, ...live];

          // Never remove already rendered chapters during normal scrolling.
          // Deleting from the top changes scrollHeight and can move the user's
          // viewport by an entire chapter. Only a prepend needs anchor recovery.
          if (direction < 0) scrollAnchor.current = anchor;
          chaptersRef.current = expanded;
          return expanded;
        });

        // Warm the chapter after the newly inserted one. This is cache-only and
        // causes no layout change, so the next boundary crossing feels instant.
        const warmTarget = adjacentChapter(target, direction);
        if (warmTarget && epoch === navigationEpoch.current) {
          getCachedChapter(warmTarget.book, warmTarget.chapter).catch(() => {});
        }
      } catch (err) {
        if (err.name !== 'AbortError' && epoch === navigationEpoch.current) setError(err.message);
      } finally {
      }
    },
    [adjacentChapter, getCachedChapter, query],
  );

  const checkBoundaries = useCallback(() => {
    const element = scroller.current;
    if (!element || query) return;
    const preloadDistance = Math.max(element.clientHeight * 2.5, 1600);
    const bottomDistance = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (element.scrollTop < preloadDistance) loadAdjacent(-1);
    if (bottomDistance < preloadDistance) loadAdjacent(1);
  }, [loadAdjacent, query]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return undefined;
    const handleScroll = () => {
      cancelAnimationFrame(boundaryCheckFrame.current);
      boundaryCheckFrame.current = requestAnimationFrame(() => {
        previousScrollTop.current = element.scrollTop;
        clearTimeout(positionTimer.current);
        positionTimer.current = window.setTimeout(() => {
          const anchor = captureScrollAnchor();
          if (anchor) localStorage.setItem(READING_POSITION_KEY, JSON.stringify(anchor));
        }, 150);
        checkBoundaries();
      });
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      cancelAnimationFrame(boundaryCheckFrame.current);
      clearTimeout(positionTimer.current);
      element.removeEventListener('scroll', handleScroll);
    };
  }, [checkBoundaries]);

  useEffect(() => {
    // A render can change scrollHeight without firing a new scroll event.
    // Recheck both edges after layout has settled.
    cancelAnimationFrame(boundaryCheckFrame.current);
    boundaryCheckFrame.current = requestAnimationFrame(checkBoundaries);
    return () => cancelAnimationFrame(boundaryCheckFrame.current);
  }, [chapters, checkBoundaries]);

  const goToVerse = useCallback(async (book, chapter, verse = 1) => {
    const epoch = ++navigationEpoch.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    loading.current = true;
    setBusy('jump');
    setError('');
    setPickerOpen(false);
    setDrawerOpen(false);
    setSelectedBook(book);
    scrollAnchor.current = null;
    restorePosition.current = null;
    jumpTarget.current = `${book}.${chapter}.${verse}`;

    try {
      const target = { book, chapter };
      const previous = adjacentChapter(target, -1);
      const next = adjacentChapter(target, 1);
      const candidates = [previous, target, next].filter(Boolean);
      const loaded = await Promise.all(candidates.map(async (item) => ({
        ...item,
        verses: await getCachedChapter(item.book, item.chapter, controller.signal),
      })));
      if (controller.signal.aborted || epoch !== navigationEpoch.current) return;

      // A direct book/chapter jump intentionally starts a new mounted stream.
      // Ordinary scrolling never deletes chapters from the current stream.
      chaptersRef.current = loaded;
      previousScrollTop.current = 0;
      if (scroller.current) scroller.current.scrollTop = 0;
      localStorage.setItem(READING_POSITION_KEY, JSON.stringify({ id: jumpTarget.current, offset: 0 }));
      setChapters(loaded);

      // Also warm one extra chapter in each direction without displaying it.
      const before = previous && adjacentChapter(previous, -1);
      const after = next && adjacentChapter(next, 1);
      [before, after].filter(Boolean).forEach((item) => {
        getCachedChapter(item.book, item.chapter).catch(() => {});
      });
    } catch (err) {
      if (err.name !== 'AbortError' && epoch === navigationEpoch.current) setError(err.message);
    } finally {
      if (epoch === navigationEpoch.current) {
        loading.current = false;
        setBusy('');
      }
    }
  }, [adjacentChapter, getCachedChapter]);

  useLayoutEffect(() => {
    if (!chapters.length) return;
    requestAnimationFrame(() => {
      const host = scroller.current;
      const savedPosition = restorePosition.current;
      if (host && savedPosition?.id) {
        const node = host.querySelector(`[data-id="${CSS.escape(savedPosition.id)}"]`);
        if (node) {
          const hostTop = host.getBoundingClientRect().top;
          host.scrollTop += node.getBoundingClientRect().top - hostTop - (savedPosition.offset || 0);
          previousScrollTop.current = host.scrollTop;
          restorePosition.current = null;
          return;
        }
      }
      if (jumpTarget.current) {
        host?.querySelector(`[data-id="${CSS.escape(jumpTarget.current)}"]`)
          ?.scrollIntoView({ block: 'center' });
        previousScrollTop.current = host?.scrollTop || 0;
        jumpTarget.current = null;
      }
    });
  }, [chapters]);

  const verses = useMemo(() => chapters.flatMap((item) => item.verses), [chapters]);
  const visibleVerses = useMemo(
    () =>
      verses.filter(
        (verse) =>
          !query ||
          `${verse.en} ${verse.zh} ${notes[verse.id] || ''}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [notes, query, verses],
  );

  const bookOrder = useMemo(
    () => new Map((manifest?.books || []).map((book, index) => [book.code, index])),
    [manifest],
  );

  const noteItems = useMemo(
    () =>
      Object.entries(notes)
        .filter(([, text]) => String(text).trim())
        .map(([id, text]) => {
          const [book, chapter, verse] = id.split('.');
          const meta = manifest?.books.find((item) => item.code === book);
          return {
            book,
            chapter: Number(chapter),
            verse: Number(verse),
            title: `${meta?.name || book} ${chapter}:${verse}`,
            zh: `${meta?.nameZh || ''} ${chapter}:${verse}`,
            text: String(text).trim(),
          };
        })
        .sort(
          (a, b) =>
            (bookOrder.get(a.book) ?? 999) - (bookOrder.get(b.book) ?? 999) ||
            a.chapter - b.chapter ||
            a.verse - b.verse,
        ),
    [bookOrder, manifest, notes],
  );

  const openComposer = (verse) => {
    if (!matchMedia('(max-width:850px)').matches) return;
    setComposerVerse(verse);
    setDraft(notes[verse.id] || '');
  };

  const saveComposer = () => {
    if (!composerVerse) return;
    setNotes((current) => ({ ...current, [composerVerse.id]: draft }));
    setComposerVerse(null);
  };

  return (
    <main>
      <style>{MOBILE_LOCKED_HEADER_CSS}</style>
      <style>{MOBILE_NOTE_CSS}</style>
      <header className="top">
        <div className="brand"><i><BookOpen /></i><b>Parallel Bible<small>ESV · 新譯本 · Notes</small></b></div>
        <label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search / 搜尋" /></label>
        <button className="nav" onClick={() => setPickerOpen(true)}><Library />Books</button>
        <button className="nav" onClick={() => setDrawerOpen(true)}><StickyNote />Notes{noteItems.length > 0 && <em>{noteItems.length}</em>}</button>
        <button className="mobileLang" onClick={() => setMobileLanguage((value) => (value === 'zh' ? 'en' : 'zh'))} aria-label="Switch Bible language"><Languages /><span>{mobileLanguage === 'zh' ? '繁中' : 'EN'}</span></button>
        <button onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))} aria-label="Toggle theme">{theme === 'light' ? <Moon /> : <Sun />}</button>
      </header>

      {error && <div className="error"><AlertTriangle />{error}</div>}

      <section className={`reader mobile-${mobileLanguage}`}>
        <div className="heads">
          <Head title="English" subtitle="English Standard Version" />
          <Head title="繁體中文" subtitle="中文新譯本" />
          <Head title="Notes" subtitle="Free writing space">{saved && <span><Check />Saved</span>}</Head>
        </div>
        <div className="scroll" ref={scroller}>

          {chapters.map((section) => (
            <section className="chapterSection" key={chapterKey(section)}>
              <div className="chapter">{section.verses[0]?.bookName} · {section.verses[0]?.bookNameZh}<strong>{section.chapter}</strong></div>
              {section.verses.filter((verse) => visibleVerses.includes(verse)).map((verse) => (
                <div className={`row ${notes[verse.id]?.trim() ? 'hasNote' : ''}`} key={verse.id} data-id={verse.id} onClick={() => openComposer(verse)}>
                  <Cell number={verse.verse} kind="en">{verse.en}</Cell>
                  <Cell number={verse.verse} chinese kind="zh">{verse.zh}</Cell>
                  <div className="note" onClick={(event) => event.stopPropagation()}>
                    <small>{verse.chapter}:{verse.verse}</small>
                    <textarea value={notes[verse.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [verse.id]: event.target.value }))} placeholder="Write freely…" />
                  </div>
                  <span className="mobileNoteDot"><StickyNote /></span>
                </div>
              ))}
            </section>
          ))}
          {busy === 'jump' && <Loading />}
        </div>
      </section>

      {pickerOpen && <Picker manifest={manifest} selectedBook={selectedBook} setSelectedBook={setSelectedBook} close={() => setPickerOpen(false)} go={goToVerse} />}
      {drawerOpen && <NotesDrawer items={noteItems} close={() => setDrawerOpen(false)} go={goToVerse} />}
      {composerVerse && <MobileComposer verse={composerVerse} value={draft} setValue={setDraft} close={() => setComposerVerse(null)} save={saveComposer} backgroundRef={scroller} />}
    </main>
  );
}

function Loading() { return <div className="loading"><LoaderCircle />Loading next chapter…</div>; }
function Head({ title, subtitle, children }) { return <header><div><b>{title}</b><small>{subtitle}</small></div>{children}</header>; }
function Cell({ number, chinese, kind, children }) { return <div className={`cell ${kind || ''}`} lang={chinese ? 'zh-Hant' : 'en'}><b>{number}</b><p>{children}</p></div>; }

function Picker({ manifest, selectedBook, setSelectedBook, close, go }) {
  const book = manifest?.books.find((item) => item.code === selectedBook) || manifest?.books[0];
  return <div className="shade" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="picker"><ModalHead title="Books & Chapters" subtitle="書卷與章節快速導覽" close={close} /><div className="pickbody"><div className="books"><BookColumn title="Old Testament · 舊約" books={manifest?.books.slice(0, 39) || []} selectedBook={selectedBook} setSelectedBook={setSelectedBook} /><BookColumn title="New Testament · 新約" books={manifest?.books.slice(39) || []} selectedBook={selectedBook} setSelectedBook={setSelectedBook} /></div><aside><span className="eyebrow">CHAPTER · 章</span><h2>{book?.nameZh}</h2><p>{book?.name}</p><div className="grid">{Array.from({ length: book?.chapters || 0 }, (_, index) => <button key={index + 1} onClick={() => go(book.code, index + 1)}>{index + 1}</button>)}</div></aside></div></section></div>;
}

function BookColumn({ title, books, selectedBook, setSelectedBook }) { return <div className="bookcol"><h3>{title}</h3>{books.map((book) => <button key={book.code} className={selectedBook === book.code ? 'active' : ''} onClick={() => setSelectedBook(book.code)}><span>{book.nameZh}</span><small>{book.name}</small><ChevronRight /></button>)}</div>; }

function NotesDrawer({ items, close, go }) {
  let lastGroup = '';
  return <div className="shade drawerShade" onMouseDown={(event) => event.target === event.currentTarget && close()}><aside className="drawer"><ModalHead title="My Notes" subtitle={`${items.length} notes · 按書卷、章、節排序`} close={close} /><div className="list">{items.length ? items.map((item) => { const group = `${item.book}.${item.chapter}`; const heading = group !== lastGroup; lastGroup = group; return <React.Fragment key={`${group}.${item.verse}`}>{heading && <div className="noteGroup">{item.title.split(':')[0]} · {item.zh.split(':')[0]}</div>}<button onClick={() => go(item.book, item.chapter, item.verse)}><i><StickyNote /></i><span><b>{item.title}</b><small>{item.zh}</small><p>{item.text}</p></span><ChevronRight /></button></React.Fragment>; }) : <div className="empty"><StickyNote /><b>No notes yet</b><span>Your verse notes will appear here.</span></div>}</div></aside></div>;
}

function MobileComposer({ verse, value, setValue, close, save, backgroundRef }) {
  const input = useRef(null);
  const [viewport, setViewport] = useState(() => ({
    height: Math.round(window.visualViewport?.height || window.innerHeight),
    top: Math.round(window.visualViewport?.offsetTop || 0),
  }));

  useLayoutEffect(() => {
    const vv = window.visualViewport;
    const update = () => setViewport({
      height: Math.round(vv?.height || window.innerHeight),
      top: Math.round(vv?.offsetTop || 0),
    });
    const reader = backgroundRef?.current;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.documentElement.classList.add('noteOpen');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    reader?.setAttribute('inert', '');
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.documentElement.classList.remove('noteOpen');
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      reader?.removeAttribute('inert');
    };
  }, [backgroundRef]);

  useEffect(() => {
    const timer = window.setTimeout(() => input.current?.focus({ preventScroll: true }), 120);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="composerShade" style={{ '--note-height': `${viewport.height}px`, '--note-top': `${viewport.top}px` }} onPointerDown={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
    <section className="composer" role="dialog" aria-modal="true" aria-label={`Note for ${verse.ref || `${verse.bookNameZh} ${verse.chapter}:${verse.verse}`}`}>
      <header className="composerTopbar">
        <button className="composerIconButton" onClick={close} aria-label="Cancel"><X /></button>
        <div className="composerTitle"><small>NOTE · 筆記</small><strong>{verse.bookNameZh} {verse.chapter}:{verse.verse}</strong></div>
        <span className="composerTopbarSpacer" aria-hidden="true" />
      </header>
      <div className="composerVerse" lang="zh-Hant">{verse.zh}</div>
      <textarea ref={input} value={value} onChange={(event) => setValue(event.target.value)} placeholder="寫下你的筆記…" aria-label={`Note for ${verse.bookNameZh} ${verse.chapter}:${verse.verse}`} />
      <footer><span>{value.length ? `${value.length} 字元` : '只儲存在此裝置'}</span><button onClick={save}><Check />儲存筆記</button></footer>
    </section>
  </div>;
}

function ModalHead({ title, subtitle, close }) { return <header className="modalhead"><div><b>{title}</b><small>{subtitle}</small></div><button onClick={close}><X /></button></header>; }

createRoot(document.getElementById('root')).render(<App />);