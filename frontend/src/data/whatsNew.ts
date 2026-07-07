/* ============================================================================
   "What's New" — the in-app feature log the SPA renders on /whats-new.

   This is the SINGLE SOURCE for the reader-facing feature log. It is the
   humanized, deep-linked projection of CHANGELOG.md, grouped by published
   release (newest first). Keeping it as data — not hand-written JSX per
   release — is what makes it AI-iterable: the `whats-new-populate` skill
   (~/.claude/skills/whats-new-populate/) prepends a new WHATS_NEW[0] block on
   every public release, one WhatsNewItem per user-facing change.

   COPY STANDARD (see notes/WHATS-NEW-FEATURE-DESIGN.md — obey it on every add):
     - Lead with the reader benefit, not the mechanism.
     - Name the problem it solves in plain words, then how to use it.
     - 1–3 sentences. If it needs more, it's two items.
     - No AI tells, no marketing fluff, no exclamation storms. Smart-reader
       register: warm, precise, concise. English-authored (chrome is localized,
       entries are not — the page says so).
     - Credit no contributors here (that's release notes / outreach).

   DEEP LINKS: `link.to` is an in-app SPA path (resolved under the /app router
   base by wouter). It MUST be a route that exists in App.tsx. Omit `link`
   entirely when no navigable surface fits (a per-book screen with no universal
   entry point, a logged-out page, or a pure backend fix) — never fake one.
   ============================================================================ */

export type WhatsNewCategory =
  | 'Reading'
  | 'Library'
  | 'Sync'
  | 'Account'
  | 'Admin'
  | 'Under the hood';

export interface WhatsNewItem {
  /** Human, benefit-led headline ("Find something to read tonight"). */
  title: string;
  /** 1–3 sentences: what it is + why it exists (the problem) + how to use it. */
  body: string;
  category: WhatsNewCategory;
  /** In-app deep link. `to` is an App.tsx route path; omit if none fits. */
  link?: { to: string; label: string };
}

export interface WhatsNewRelease {
  /** Release tag, e.g. "v4.1.5". */
  version: string;
  /** ISO date of the release (YYYY-MM-DD); rendered humanized. */
  date: string;
  /** Optional one-line framing for the release as a whole (rare — a launch or a
   *  corrective release). Kept short; most releases don't need it. */
  summary?: string;
  /** Newest-first is enforced by array order; items in reader-priority order. */
  items: WhatsNewItem[];
}

/** Newest release first. The `whats-new-populate` skill prepends here. */
export const WHATS_NEW: WhatsNewRelease[] = [
  {
    version: 'v4.1.6',
    date: '2026-07-07',
    items: [
      {
        title: 'Reading position keeps up across your devices',
        body: 'If you read the same book on two devices, the one that was behind could refuse to jump forward — a manual sync just said "already synced". This happened when each device held a slightly different copy of the book (after a re-upload, a metadata edit, or a side-load). The server now recognises them as the same book, so the furthest position wins everywhere.',
        category: 'Sync',
        link: { to: '/account', label: 'Manage sync & app passwords' },
      },
      {
        title: 'Choose the interface font',
        body: 'Account settings now has body- and display-font pickers — a system sans-serif, a bookish serif, or monospace in place of the defaults. Each option previews in its own font, and your choice is saved to your account, so it follows you to every device and browser.',
        category: 'Account',
        link: { to: '/account', label: 'Open account settings' },
      },
      {
        title: 'Arrange the sidebar the way you use it',
        body: 'A Customize control at the top of the left rail turns the sidebar into an editable list: drag sections into the order you want — move Shelves to the top so you never scroll for it — and hide the ones you don\'t use. It works with the mouse, on touch, and with the keyboard, and your layout is saved to your account.',
        category: 'Library',
        link: { to: '/', label: 'Open your library' },
      },
      {
        title: 'Apply the exact Hardcover edition when fetching metadata',
        body: 'A Hardcover search result now has an Editions view, so you can drill into a book\'s individual editions — paperback, e-book, a translation — and apply the one you actually own. That puts the right edition ISBN and id on your book, which is what Hardcover reading-progress sync needs to match the right copy.',
        category: 'Library',
      },
      {
        title: 'A What\'s New page',
        body: 'This page. It lives in the Help ("?") menu and keeps a plain-English log of what changed in each release, newest first, each with a link straight to the thing it describes. A small dot on the Help menu points it out once after an update.',
        category: 'Under the hood',
      },
      {
        title: 'A much fuller Russian translation',
        body: 'Russian coverage roughly doubled this release, so far more of the interface reads in Russian instead of falling back to English. Pick it under interface language in your account settings.',
        category: 'Account',
        link: { to: '/account', label: 'Open account settings' },
      },
      {
        title: 'Upgrades no longer crash-loop after Hardcover annotation sync',
        body: 'If your library had ever synced highlights to Hardcover, an upgrade could get stuck restarting over and over and never finish booting. A one-time database step was double-counting your own sync records; it now checks the right thing and completes. No data is lost and no manual steps are needed.',
        category: 'Under the hood',
      },
      {
        title: 'Your profile picture shows in the new interface',
        body: 'A picture set in the classic account settings was ignored by the new interface, which showed a generic silhouette in the top bar and on your account page. Both now use your picture, falling back to the silhouette only when you haven\'t set one.',
        category: 'Account',
        link: { to: '/account', label: 'Open account settings' },
      },
      {
        title: 'The "Currently reading" marker shows on a book\'s page',
        body: 'A book you\'re partway through on KOReader or Kobo showed the "Currently reading" marker on the classic book page but nothing in the new interface. The new-UI book page now shows it too — with the synced percentage when it\'s known — while unread and finished books stay unmarked.',
        category: 'Reading',
        link: { to: '/', label: 'Open your library' },
      },
      {
        title: 'Marking a book unread clears its progress',
        body: 'Opening a book just to look could leave it stuck at something like "0.6% read" with no way to reset it — the switch flipped the status but left the percentage behind. Marking a book unread now also resets its progress and where the in-browser reader would resume, so it reads as untouched everywhere.',
        category: 'Reading',
      },
      {
        title: 'The new interface hides the smart shelves you turned off',
        body: 'Unticking entries under Magic Shelves Visibility only worked in the classic view — the new-UI sidebar still listed every smart shelf. It now honours the setting, so hidden smart shelves stay hidden in both interfaces.',
        category: 'Library',
        link: { to: '/account', label: 'Open account settings' },
      },
      {
        title: 'Fetch Metadata stops reusing one cover across a series',
        body: 'Searching for one volume of a series could return results where every volume carried an identical cover — and applying metadata then saved that wrong cover onto the book. The cover step now refuses artwork whose volume number disagrees with the book, and keeps the ISBN so the exact-edition cover can be found.',
        category: 'Library',
      },
      {
        title: 'Smaller fixes',
        body: 'Your shelves are listed directly under the SHELVES heading in the new-UI sidebar again instead of at the very bottom. The "Contribute here!" link on the partial-translation banner points at a page that exists again. And the browser-tab icon is refreshed to match the app.',
        category: 'Under the hood',
      },
    ],
  },
  {
    version: 'v4.1.5',
    date: '2026-07-03',
    items: [
      {
        title: 'Your "Currently Reading" shelf shows the right books',
        body: 'If your library links read status to a Calibre column, the Currently Reading shelf used to list everything you\'d ever marked read instead of the book you\'re partway through. In-progress state now comes straight from your KOReader and Kobo sync, finished books drop off, and "Yet to Read" counts books you\'ve never opened.',
        category: 'Reading',
        link: { to: '/shelves', label: 'Open your shelves' },
      },
      {
        title: 'KOReader sync works when your reader matches by filename',
        body: 'Some readers — and apps like Crossink — identify a book by its filename rather than its contents, which used to mean "no book found" and no synced progress. The server now recognises both, and your existing library is backfilled automatically, so an older or side-loaded copy can rejoin sync by switching KOReader\'s document-matching method to "filename".',
        category: 'Sync',
        link: { to: '/account', label: 'Manage sync & app passwords' },
      },
      {
        title: 'One stubborn PDF can no longer hang the whole server',
        body: 'Downloading certain PDFs could freeze inside the metadata step and leave every request stuck until it timed out. That step is now time-bounded and falls back to serving your original file, so you get your book instead of a wedged server.',
        category: 'Under the hood',
      },
      {
        title: 'The library\'s view-settings menu stays on-screen on phones',
        body: 'On narrow screens the toolbar wraps, and the gear menu could open off the left edge of the display. It now drops neatly below the toolbar and stays fully visible at any width.',
        category: 'Library',
        link: { to: '/', label: 'Open your library' },
      },
    ],
  },
  {
    version: 'v4.1.4',
    date: '2026-07-02',
    items: [
      {
        title: 'Quick edits are back: a hover pencil and inline tags',
        body: 'Hovering a book in your library or search results now shows a small pencil that drops you straight onto its edit page — no need to open the book first. And on a book\'s page you can add or remove individual tags right there, each with an ×, instead of hand-editing one long comma-separated list. Both appear only if you can edit.',
        category: 'Library',
        link: { to: '/', label: 'Open your library' },
      },
      {
        title: 'Read a series in order, with each book\'s number shown',
        body: 'Opening a series listed its books newest-first with no way to order them 1, 2, 3. A series now opens in reading order by default, the sort menu gains "Series order" (and its reverse), and every cover shows its position.',
        category: 'Reading',
        link: { to: '/series', label: 'Browse series' },
      },
      {
        title: 'Switching shelves no longer mixes both shelves\' books',
        body: 'Going straight from one shelf to another kept the first shelf\'s books on screen underneath the next one\'s — and removing a leftover book removed it from the shelf you were now on. Each shelf now shows only its own books, and the page counter resets when you switch.',
        category: 'Library',
        link: { to: '/shelves', label: 'Open your shelves' },
      },
      {
        title: 'Table view covers look right again',
        body: 'In Table view, cover thumbnails rendered as narrow slivers with the sides cropped off. They now show at a proper book-cover shape, and a title made of one long unbreakable string wraps in its cell instead of forcing the whole table to scroll sideways.',
        category: 'Library',
        link: { to: '/table', label: 'Open Table view' },
      },
      {
        title: 'App passwords work with the KOReader plugin',
        body: 'KOReader sync only accepted your main password, so OAuth- or LDAP-only accounts (which have none) got "Invalid password". You can now create a per-user app password for KOReader progress and annotation sync, the same as OPDS already allows.',
        category: 'Sync',
        link: { to: '/account', label: 'Create an app password' },
      },
      {
        title: 'Admin\'s "More server configuration" links behave properly',
        body: 'Those deep config cards on the Admin page now open in a new browser tab, so the new interface stays exactly where it was, and they point to the right place when you run behind a reverse-proxy subpath instead of breaking out to a 404.',
        category: 'Admin',
        link: { to: '/admin', label: 'Open Admin' },
      },
      {
        title: 'The sidebar respects the sections you\'ve turned off',
        body: 'If you or an admin hid sections such as Hot, Discover, Series, Authors or Publishers, the new-UI sidebar now leaves them out instead of always showing everything. Nothing changes if you never hid anything.',
        category: 'Library',
      },
      {
        title: 'Language and mobile polish',
        body: 'The read toggle mistakenly offered "mark as unread" on unread books in French and 16 other languages — all fixed. Logging out on mobile in the classic view works again, and a custom site title now appears in the new UI\'s top bar, login screen and browser tab.',
        category: 'Under the hood',
      },
    ],
  },
  {
    version: 'v4.1.3',
    date: '2026-07-01',
    summary: 'A corrective release for anyone who saw a stuck popup over the classic view.',
    items: [
      {
        title: 'The classic view\'s feedback popup can no longer get stuck',
        body: 'A "what made you switch back?" prompt was appearing on every classic page with no way to close it, and on phones it didn\'t even fit the screen. It now only shows right after you switch back from the new interface, every button dismisses it, and it fits and scrolls on small screens.',
        category: 'Under the hood',
      },
    ],
  },
  {
    version: 'v4.1.1',
    date: '2026-07-01',
    items: [
      {
        title: 'Edit identifiers, and choose which fetched values to apply',
        body: 'Editing a book in the new interface now has an Identifiers table — add, change or remove ISBN, ASIN, Google, DOI and the rest — and when you fetch metadata from the web, each result has a "Choose fields" checklist so you apply just the title, cover or identifiers you want instead of overwriting everything.',
        category: 'Library',
        link: { to: '/', label: 'Open your library' },
      },
      {
        title: 'Your KOReader/Kobo progress and identifier links are back',
        body: 'A book\'s page again shows your synced "KOReader progress: X%", and identifiers like Goodreads, StoryGraph, Hardcover and ISBN are clickable links out to the book on those sites rather than plain text.',
        category: 'Sync',
      },
      {
        title: 'Read/unread respects a custom Calibre column',
        body: 'If you link read status to a custom Calibre column, the new interface showed every book as unread and the read/unread filters returned everything. It now reads that column, so finished books get their checkmark and the filters work again.',
        category: 'Library',
      },
      {
        title: 'Works behind a reverse proxy, keeps your place, and shows its icon',
        body: 'Serving NextGen under a subpath (like host/cwa/) used to show a blank white page — every script, style and cover is now requested with the right prefix. Scrolling down, opening a book and pressing Back restores your position and loaded pages, the mobile menu drawer is solid and scrolls on its own, and the browser tab shows the Calibre-Web icon.',
        category: 'Under the hood',
      },
    ],
  },
  {
    version: 'v4.1.0',
    date: '2026-06-30',
    summary: 'The redesigned interface opens up to everyone, plus a set of new tools.',
    items: [
      {
        title: 'The new interface is offered to everyone — opt in when you\'re ready',
        body: 'After updating, a dismissible bar invites you to try the redesigned interface; your classic view stays the default until you choose to switch, and you can switch back any time from the top bar. Dismiss the bar and it stays gone until the next update.',
        category: 'Library',
        link: { to: '/', label: 'Explore your library' },
      },
      {
        title: 'A "Discover" shelf of random picks on your home page',
        body: 'The redesigned library opens with a set-apart Discover box — a row of random books from your collection to help you stumble onto something to read. Hit shuffle for a fresh set, or hide it and bring it back any time from View settings.',
        category: 'Reading',
        link: { to: '/discover', label: 'Browse Discover' },
      },
      {
        title: 'A redesigned "Change cover" screen',
        body: 'Picking a new cover now opens a polished page: your current cover with a one-tap lock so a metadata refresh can\'t overwrite it, a grid of candidates from every source (plus the one embedded in the book), and tabs to paste a URL or upload your own. Kobo users can flip on E-reader preview to see how each looks padded for the device. Reach it from a book\'s cover or its edit page.',
        category: 'Library',
      },
      {
        title: 'Email your users straight from the admin area',
        body: 'A new "Email Your Users" page lets you write a message and send it to everyone — or just the people you pick — handy for announcing new books or server updates. It uses the mail server you already set up, formats with HTML and a plain-text fallback, and has a "Send test to me" button so you can preview before sending.',
        category: 'Admin',
        link: { to: '/admin', label: 'Open Admin' },
      },
      {
        title: 'A polished sign-in and magic-link experience',
        body: 'The redesigned login page brings back "Remember me" and a show-password toggle, and choosing "Log in with a magic link" now opens a proper screen with the QR code, one-tap link copy, a live "waiting…" indicator and an expiry countdown.',
        category: 'Account',
      },
      {
        title: 'The Admin version number links to its release notes',
        body: 'The Calibre-Web NextGen version in the Admin page\'s Version Information table is now a link to that build\'s release notes, so you can see exactly what changed in what you\'re running.',
        category: 'Admin',
        link: { to: '/admin', label: 'Open Admin' },
      },
      {
        title: 'Uploads, sorting and proxy fixes',
        body: 'A book with a very long filename no longer fails to import, editing the title-sort regular expression now re-sorts your whole library immediately, the "Discover (Random Books)" row actually appears when enabled, and bulk actions and drag-to-merge work behind a reverse-proxy subpath.',
        category: 'Under the hood',
        link: { to: '/upload', label: 'Go to Upload' },
      },
    ],
  },
];

/** The newest release in the log — used to key the "unread" dot to the build. */
export const LATEST_WHATS_NEW_VERSION: string = WHATS_NEW[0]?.version ?? '';
