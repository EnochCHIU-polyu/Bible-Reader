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
const CHAPTER_LIMIT = 4;
const chapterKey = (chapter) => `${chapter.book}.${chapter.chapter}`;

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
  const queuedDirection = useRef(0);
  const activeChapterRequest = useRef('');

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const loadedManifest = await getManifest(controller.signal);
        const verses = await getChapter('GEN', 1, controller.signal);
        setManifest(loadedManifest);
        setChapters([{ book: 'GEN', chapter: 1, verses }]);
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
      if (query || !currentChapters.length) return;
      if (loading.current) {
        // Do not lose a fast upward gesture while a downward request is finishing.
        queuedDirection.current = direction;
        return;
      }

      const edge = direction > 0 ? currentChapters.at(-1) : currentChapters[0];
      const target = adjacentChapter(edge, direction);
      if (!target) return;
      const targetKey = chapterKey(target);
      if (activeChapterRequest.current === targetKey || currentChapters.some((item) => chapterKey(item) === targetKey)) return;

      loading.current = true;
      activeChapterRequest.current = targetKey;
      setBusy(direction > 0 ? 'down' : 'up');
      setError('');
      const controller = new AbortController();
      requestController.current = controller;

      try {
        const verses = await getChapter(target.book, target.chapter, controller.signal);
        if (controller.signal.aborted) return;
        setChapters((current) => {
          const liveEdge = direction > 0 ? current.at(-1) : current[0];
          if (!liveEdge || chapterKey(liveEdge) !== chapterKey(edge)) return current;
          if (current.some((item) => chapterKey(item) === targetKey)) return current;

          const anchor = captureScrollAnchor();
          const next = direction > 0
            ? [...current, { ...target, verses }]
            : [{ ...target, verses }, ...current];
          const trimmed = direction > 0
            ? next.slice(-CHAPTER_LIMIT)
            : next.slice(0, CHAPTER_LIMIT);

          // Prepending changes scrollHeight. Restore the same visible verse after render.
          if (direction < 0 || next.length > CHAPTER_LIMIT) scrollAnchor.current = anchor;
          chaptersRef.current = trimmed;
          return trimmed;
        });
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        activeChapterRequest.current = '';
        loading.current = false;
        setBusy('');
        const pending = queuedDirection.current;
        queuedDirection.current = 0;
        if (pending) requestAnimationFrame(() => loadAdjacent(pending));
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
        if (
          movingDown &&
          element.scrollHeight - currentTop - element.clientHeight < 700
        ) {
          loadAdjacent(1);
        } else if (currentTop < 900 && (!movingDown || currentTop <= 8)) {
          loadAdjacent(-1);
        }
      });
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', handleScroll);
    };
  }, [loadAdjacent]);

  useEffect(() => {
    const element = scroller.current;
    if (!element || loading.current || query || !chapters.length) return;
    const bottomDistance = element.scrollHeight - element.scrollTop - element.clientHeight;
    // A completed prepend may not emit another scroll event, so check again here.
    if (element.scrollTop < 900) loadAdjacent(-1);
    else if (bottomDistance < 900) loadAdjacent(1);
  }, [chapters, loadAdjacent, query]);

  const goToVerse = useCallback(async (book, chapter, verse = 1) => {
    requestController.current?.abort();
    loading.current = true;
    setBusy('jump');
    setError('');
    try {
      const verses = await getChapter(book, chapter);
      jumpTarget.current = `${book}.${chapter}.${verse}`;
      const nextChapters = [{ book, chapter, verses }];
      chaptersRef.current = nextChapters;
      queuedDirection.current = 0;
      setChapters(nextChapters);
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
    if (!jumpTarget.current || !chapters.length) return;
    requestAnimationFrame(() => {
      scroller.current
        ?.querySelector(`[data-id="${CSS.escape(jumpTarget.current)}"]`)
        ?.scrollIntoView({ block: 'center' });
      previousScrollTop.current = scroller.current?.scrollTop || 0;
      jumpTarget.current = null;
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
          {busy === 'up' && <Loading />}
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
          {(busy === 'down' || busy === 'jump') && <Loading />}
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
  useEffect(() => { input.current?.focus(); }, []);
  return <div className="composerShade" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="composer" role="dialog" aria-modal="true" aria-label={`Note for ${verse.ref}`}><div className="composerHandle" /><header><button onClick={close} aria-label="Cancel"><X /></button><div><small>{verse.bookNameZh} · {verse.chapter}:{verse.verse}</small><strong>{verse.zh}</strong></div><button className="saveNote" onClick={save} aria-label="Save note"><Send /></button></header><textarea ref={input} value={value} onChange={(event) => setValue(event.target.value)} placeholder="寫下筆記…" /><footer><span>筆記將連結至 {verse.bookNameZh} {verse.chapter}:{verse.verse}</span><button onClick={save}><Check />完成</button></footer></section></div>;
}

function ModalHead({ title, subtitle, close }) { return <header className="modalhead"><div><b>{title}</b><small>{subtitle}</small></div><button onClick={close}><X /></button></header>; }

createRoot(document.getElementById('root')).render(<App />);