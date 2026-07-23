# Bible Reader

A responsive bilingual Bible reader for English and Traditional Chinese, with continuous chapter reading, verse-linked notes, search, theme switching, and mobile-friendly controls.

## Features

- Side-by-side English and Traditional Chinese reading on larger screens
- Single-language mobile reading with quick language switching
- Book and chapter picker
- Continuous loading of previous and next chapters
- In-memory chapter caching and duplicate-request protection
- Stable chapter stream that avoids deleting rendered chapters while scrolling
- Reading-position restoration after a page reload
- Search across English text, Chinese text, and saved notes
- Verse-linked notes stored in the browser
- Mobile note editor that follows the visible viewport above the keyboard
- Fixed, safe-area-aware mobile header
- Light and dark themes

## Project Structure

The main application entry point is `main.jsx`.

Expected supporting files include:

```text
.
├── main.jsx
├── styles.css
├── services/
│   └── bibleData.js
├── package.json
└── README.md
```

`services/bibleData.js` must export:

```js
export async function getManifest(signal) {}
export async function getChapter(book, chapter, signal) {}
```

### Expected manifest shape

```js
{
  books: [
    {
      code: 'GEN',
      name: 'Genesis',
      nameZh: '創世記',
      chapters: 50
    }
  ]
}
```

### Expected verse shape

```js
{
  id: 'GEN.1.1',
  book: 'GEN',
  bookName: 'Genesis',
  bookNameZh: '創世記',
  chapter: 1,
  verse: 1,
  ref: 'Genesis 1:1',
  en: 'English verse text',
  zh: '中文經文'
}
```

## Run in GitHub Codespaces

1. Open the repository in GitHub Codespaces.
2. Wait for the development container to finish starting.
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open the forwarded port shown by Codespaces. For a typical Vite project, this is port `5173`.

To make Vite accessible from the Codespaces forwarded port, the `dev` script can use:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0"
  }
}
```

## Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview -- --host 0.0.0.0
```

## Browser Storage

The application uses browser `localStorage` for client-side preferences and data.

| Key | Purpose |
|---|---|
| `parallel-notes-v6` | Verse-linked notes |
| `parallel-theme-v6` | Light or dark theme preference |
| `parallel-reading-position-v1` | Last visible verse and screen offset |

Notes and reading position are local to the current browser and device. Clearing site data will remove them.

## Reading and Chapter Loading

The reader preloads chapters near the upper and lower scroll boundaries. Loaded chapter data is cached in memory, and duplicate in-flight requests are reused.

During normal scrolling, already rendered chapters remain mounted. This avoids large viewport jumps caused by deleting a chapter above the current position. A direct book or chapter selection intentionally starts a new chapter stream.

When a previous chapter is inserted above the current view, the application captures the first visible verse and restores the verse to the same screen offset after rendering.

## Mobile Behaviour

### Fixed header

The mobile header is fixed and respects `env(safe-area-inset-top)`. The reader begins below the calculated header height so chapter content and controls are not hidden behind the phone status area.

### Note editor

On mobile, tapping a verse opens a full-screen note editor. The editor uses `window.visualViewport` so the writing area resizes when the software keyboard opens. While the editor is active:

- Page scrolling is locked
- The Bible reader is made inert
- Background interactions are blocked
- The note textarea remains above the keyboard

### Language switching

The mobile language button switches between Traditional Chinese and English without changing the selected chapter.

## Development Notes

### Preserve chapter identity

Every chapter should use a stable key:

```js
const chapterKey = (chapter) => `${chapter.book}.${chapter.chapter}`;
```

Before inserting a chapter, check both the rendered chapter list and any in-flight request map. This prevents duplicate chapters during fast scrolling.

### Avoid trimming mounted chapters during scrolling

Do not remove chapters from the opposite end of the rendered list while the user is scrolling. Removing content above the viewport changes `scrollHeight` and can move the reader to the wrong verse.

If future memory limits require virtualization, use measured spacer elements that preserve the exact removed height rather than directly deleting chapter elements.

### Protect navigation from stale requests

A request started before a book or chapter change must not update the new reading session. Keep a navigation version or epoch and ignore results whose version no longer matches the active session.

### Keep the note editor reference explicit

If the mobile note editor needs to disable the reader, pass the reader reference as a prop. Do not access a ref that is scoped inside another component.

## Troubleshooting

### The Codespaces page does not open

- Confirm the development server is running.
- Check the **Ports** panel in Codespaces.
- Make the development port public or private as required.
- Ensure the server listens on `0.0.0.0`, not only `localhost`.

### Chapters appear in the wrong order

- Confirm each chapter has the correct `book` and `chapter` values.
- Reject stale requests after direct navigation.
- Prevent duplicate insertion using `chapterKey`.
- Do not mix results from an old navigation session into the current session.

### Scrolling jumps after a chapter loads

- Do not trim chapters from the top during downward scrolling.
- Capture and restore a verse anchor only when prepending content.
- Avoid adding visible loading rows inside the scroll stream because they change layout height.

### The mobile note editor is behind the keyboard

- Confirm `window.visualViewport` listeners are active.
- Confirm the editor height uses the visual viewport height.
- Keep the textarea font size at `16px` or larger to avoid automatic iPhone zoom.
- Check that external CSS is not overriding `.composerShade` or `.composer`.

### Reload does not return to the previous verse

- Confirm `parallel-reading-position-v1` exists in browser storage.
- Confirm the stored book and chapter still exist in the manifest.
- Confirm every rendered verse has a stable `data-id` matching its verse ID.

## Accessibility

- Header and note controls include accessible labels.
- The note editor uses `role="dialog"` and `aria-modal="true"`.
- The background reader becomes inert while the note editor is open.
- Interactive mobile controls use touch-friendly target sizes.
- Bible language content uses appropriate `lang` attributes.

## Privacy

Notes are stored locally in the browser. The current implementation does not sync notes to an account or remote database.

Do not store confidential information in notes unless the application is extended with suitable authentication, encryption, access control, backup, and privacy protections.

## License

Add the repository's chosen license here. If no license is provided, the source code remains protected by default copyright rules.