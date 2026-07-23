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
const CHAPTER_LIMIT = 8;

const MOBILE_COMPOSER_CSS = `
@media (max-width: 850px) {
  .composerShade { position:fixed!important; left:0!important; top:var(--vv-top,0px)!important; z-index:1000!important; width:100vw!important; height:var(--vv-height,100dvh)!important; display:flex!important; align-items:stretch!important; background:var(--surface,#151a16)!important; overflow:hidden!important; overscroll-behavior:none!important; touch-action:none!important; }
  .composer { box-sizing:border-box!important; width:100%!important; height:100%!important; max-height:none!important; margin:0!important; padding:8px 14px max(10px,env(safe-area-inset-bottom))!important; display:flex!important; flex-direction:column!important; gap:10px!important; overflow:hidden!important; border:0!important; border-radius:0!important; background:var(--surface,#151a16)!important; box-shadow:none!important; touch-action:auto!important; }
  .composerShade.keyboardOpen { background:var(--surface,#151a16)!important; }
  .composerShade.keyboardOpen .composer { height:100%!important; max-height:100%!important; border-radius:0!important; padding-bottom:6px!important; }
  .composerHandle { flex:0 0 auto!important; width:44px!important; height:5px!important; margin:0 auto 2px!important; border-radius:99px!important; background:currentColor!important; opacity:.28!important; }
  .composerTopbar { min-width:0!important; display:grid!important; grid-template-columns:48px minmax(0,1fr) 48px!important; align-items:center!important; gap:8px!important; padding:0!important; }
  .composerTitle { min-width:0!important; text-align:center!important; }
  .composerTitle small { display:block!important; font-size:10px!important; letter-spacing:.12em!important; opacity:.62!important; }
  .composerTitle strong { display:block!important; overflow:hidden!important; text-overflow:ellipsis!important; white-space:nowrap!important; font-size:16px!important; }
  .composerIconButton { width:48px!important; height:48px!important; display:grid!important; place-items:center!important; padding:0!important; border-radius:15px!important; touch-action:manipulation; }
  .composerIconButton svg { width:24px!important; height:24px!important; }
  .composerTopbarSpacer { width:48px!important; height:48px!important; }
  .composerVerse { flex:0 0 auto!important; max-height:4.6em!important; overflow:auto!important; padding:10px 12px!important; border-radius:12px!important; font-size:14px!important; line-height:1.55!important; background:rgba(127,127,127,.1)!important; opacity:.82!important; }
  .composer textarea { box-sizing:border-box!important; flex:1 1 auto!important; min-height:96px!important; width:100%!important; resize:none!important; padding:14px!important; border-radius:14px!important; font:inherit!important; font-size:16px!important; line-height:1.55!important; -webkit-appearance:none; }
  .composer footer { flex:0 0 auto!important; display:flex!important; align-items:center!important; justify-content:space-between!important; gap:12px!important; padding:0!important; }
  .composer footer span { min-width:0!important; font-size:12px!important; opacity:.62!important; }
  .composer footer button { min-height:48px!important; padding:0 18px!important; display:inline-flex!important; align-items:center!important; gap:7px!important; border-radius:14px!important; white-space:nowrap!important; touch-action:manipulation; }
  .composer footer button svg { width:18px!important; }
  .keyboardOpen .composerVerse { max-height:3.1em!important; padding-block:7px!important; }
  .keyboardOpen .composer footer { display:none!important; }
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
  const chaptersRef = useRef([]);
  const inFlightChapter = useRef('');
  const positionTimer = useRef(null);
  const restorePosition = useRef(readReadingPosition());

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const loadedManifest = await getManifest(controller.signal);
        const savedPosition = restorePosition.current;
        const [savedBook, savedChapter] = savedPosition?.id?.split('.') || [];
        const validBook = loadedManifest.books.some((book) => book.code === savedBook);
        const book = validBook ? savedBook : 'GEN';
        const chapter = validBook && Number(savedChapter) > 0 ? Number(savedChapter) : 1;
        const verses = await getChapter(book, chapter, controller.signal);
        setManifest(loadedManifest);
        setChapters([{ book, chapter, verses }]);
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
      const currentChapters = chaptersRef.current;
      if (query || !currentChapters.length || loading.current) return;
      const edge = direction > 0 ? currentChapters.at(-1) : currentChapters[0];
      const target = adjacentChapter(edge, direction);
      if (!target) return;
      const targetKey = chapterKey(target);
      if (inFlightChapter.current === targetKey || currentChapters.some((item) => chapterKey(item) === targetKey)) return;

      loading.current = true;
      inFlightChapter.current = targetKey;
      setBusy(direction > 0 ? 'down' : 'up');
      setError('');
      const controller = new AbortController();
      requestController.current = controller;

      try {
        const verses = await getChapter(target.book, target.chapter, controller.signal);
        if (controller.signal.aborted) return;
        setChapters((current) => {
          // The functional update is the source of truth; stale scroll callbacks
          // can never insert the same chapter twice.
          if (current.some((item) => chapterKey(item) === targetKey)) return current;
          const anchor = captureScrollAnchor();
          const next = direction > 0
            ? [...current, { ...target, verses }]
            : [{ ...target, verses }, ...current];
          const trimmed = direction > 0
            ? next.slice(-CHAPTER_LIMIT)
            : next.slice(0, CHAPTER_LIMIT);
          // Preserve the visible verse when prepending or when trimming the top.
          if (direction < 0 || next.length > CHAPTER_LIMIT) scrollAnchor.current = anchor;
          return trimmed;
        });
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (inFlightChapter.current === targetKey) inFlightChapter.current = '';
        loading.current = false;
        setBusy('');
      }
    },
    [adjacentChapter, query],
  );

  useEffect(() => {
    const element = scroller.current;
    if (!element) return undefined;
    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const currentTop = element.scrollTop;
        const movingDown = currentTop >= previousScrollTop.current;
        previousScrollTop.current = currentTop;

        clearTimeout(positionTimer.current);
        positionTimer.current = window.setTimeout(() => {
          const anchor = captureScrollAnchor();
          if (anchor) localStorage.setItem(READING_POSITION_KEY, JSON.stringify(anchor));
        }, 120);

        if (
          movingDown &&
          element.scrollHeight - currentTop - element.clientHeight < 1800
        ) {
          loadAdjacent(1);
        } else if (!movingDown && currentTop < 700) {
          loadAdjacent(-1);
        }
      });
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(positionTimer.current);
      element.removeEventListener('scroll', handleScroll);
    };
  }, [loadAdjacent]);

  useEffect(() => {
    const element = scroller.current;
    if (!element || loading.current || query) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    // Re-check after every chapter render. This prevents a fast swipe from
    // getting stuck when no new scroll event fires after loading completes.
    if (distanceFromBottom < 1800) loadAdjacent(1);
    else if (element.scrollTop < 700 && chapters.length > 1) loadAdjacent(-1);
  }, [chapters, loadAdjacent, query]);

  const goToVerse = useCallback(async (book, chapter, verse = 1) => {
    requestController.current?.abort();
    loading.current = true;
    setBusy('jump');
    setError('');
    try {
      const verses = await getChapter(book, chapter);
      restorePosition.current = null;
      jumpTarget.current = `${book}.${chapter}.${verse}`;
      setChapters([{ book, chapter, verses }]);
      setPickerOpen(false);
      setDrawerOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      loading.current = false;
      setBusy('');
    }
  }, []);

  useLayoutEffect(() => {
    if (!chapters.length) return;
    requestAnimationFrame(() => {
      const savedPosition = restorePosition.current;
      if (savedPosition?.id) {
        const host = scroller.current;
        const node = host?.querySelector(`[data-id="${CSS.escape(savedPosition.id)}"]`);
        if (host && node) {
          const hostTop = host.getBoundingClientRect().top;
          host.scrollTop += node.getBoundingClientRect().top - hostTop - (savedPosition.offset || 0);
          previousScrollTop.current = host.scrollTop;
          restorePosition.current = null;
          return;
        }
      }
      if (jumpTarget.current) {
        scroller.current
          ?.querySelector(`[data-id="${CSS.escape(jumpTarget.current)}"]`)
          ?.scrollIntoView({ block: 'center' });
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
      <style>{MOBILE_COMPOSER_CSS}</style>
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
          {busy === 'jump' && <Loading />}
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

        </div>
      </section>

      {pickerOpen && <Picker manifest={manifest} selectedBook={selectedBook} setSelectedBook={setSelectedBook} close={() => setPickerOpen(false)} go={goToVerse} />}
      {drawerOpen && <NotesDrawer items={noteItems} close={() => setDrawerOpen(false)} go={goToVerse} />}
      {composerVerse && <MobileComposer verse={composerVerse} value={draft} setValue={setDraft} close={() => setComposerVerse(null)} save={saveComposer} />}
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

function MobileComposer({ verse, value, setValue, close, save }) {
  const input = useRef(null);
  const [viewport, setViewport] = useState({ height: window.innerHeight, top: 0 });

  useLayoutEffect(() => {
    const vv = window.visualViewport;
    const update = () => setViewport({
      height: Math.round(vv?.height || window.innerHeight),
      top: Math.round(vv?.offsetTop || 0),
    });
    const stopBackgroundGesture = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.composer')) event.preventDefault();
    };
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('touchmove', stopBackgroundGesture, { passive: false, capture: true });
    const oldBodyOverflow = document.body.style.overflow;
    const oldHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    scroller.current?.setAttribute('inert', '');
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('touchmove', stopBackgroundGesture, { capture: true });
      document.body.style.overflow = oldBodyOverflow;
      document.documentElement.style.overflow = oldHtmlOverflow;
      scroller.current?.removeAttribute('inert');
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => input.current?.focus({ preventScroll: true }), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const keyboardOpen = viewport.height < window.innerHeight * 0.78;
  return <div className={`composerShade ${keyboardOpen ? 'keyboardOpen' : ''}`}
    style={{ '--vv-height': `${viewport.height}px`, '--vv-top': `${viewport.top}px` }}
    onMouseDown={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()}>
    <section className="composer" role="dialog" aria-modal="true" aria-label={`Note for ${verse.ref}`}>
      <div className="composerHandle" />
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