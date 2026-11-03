import { choice, match, multi, order } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, codeTask, tagged } from './kit';

// ---------- Frontend ----------
export const FRONTEND_MODULE: ModuleSkeleton = {
  familyId: 'test-fe-01',
  aspects: [
    { id: 'html', name: 'HTML & Semantics', summary: 'The right element for the job, forms, and markup browsers and tools understand.' },
    { id: 'css', name: 'CSS & Layout', summary: 'The box model, specificity, flexbox and grid, and responsive layouts.' },
    { id: 'js', name: 'JavaScript', summary: 'The language itself: values, scope, async code and the event loop.' },
    { id: 'state', name: 'Components & State', summary: 'React components, hooks, and where state lives as an app grows.' },
    { id: 'a11y', name: 'Accessibility', summary: 'Keyboard, screen readers, contrast and focus: usable by everyone.' },
    { id: 'perf', name: 'Performance & Debugging', summary: 'Fast loads, smooth interactions, and finding what broke in production.' },
  ],
  tags: {
    'x-fe-2': ['js', P],
    'x-fe-4': ['state', J],
    'x-fe-3': ['state', P],
    'q-fe-1': ['state', S],
    'x-fe-5': ['state', S],
    'x-fe-8': ['state', S],
    'x-fe-7': ['a11y', J],
    'x-fe-1': ['perf', P],
    'x-fe-9': ['perf', P],
    'x-fe-6': ['perf', S],
  },
  bank: [
    // HTML & Semantics
    ...tagged(
      'html',
      B,
      match('m-fe-html-b1', 'The Right Element', 'Match each piece of a page to the element that fits it.', [
        ['The site’s main menu', '<nav>'],
        ['The page’s one main heading', '<h1>'],
        ['A self-contained blog post', '<article>'],
        ['Something that submits a form', '<button type="submit">'],
      ])
    ),
    ...tagged(
      'html',
      J,
      choice(
        'm-fe-html-j1',
        'Labelling an Input',
        'An email field has placeholder="Email" and no label. What is the best fix?',
        [
          'Add <label for="email">Email</label> tied to the input’s id; placeholders vanish while typing and aren’t reliably read out',
          'Make the placeholder text darker',
          'Add title="Email" to the input',
          'Put the word Email in a <div> above the input',
        ],
        0
      )
    ),
    ...tagged(
      'html',
      P,
      multi(
        'm-fe-html-p1',
        'Let the Browser Do It',
        'A sign-up form has custom JavaScript for all of these. Which can native HTML handle on its own? Tick all that apply.',
        [
          'Requiring a field: required',
          'Checking an email’s shape: type="email"',
          'Showing a numeric keypad on phones: inputmode="numeric"',
          'Offering saved addresses: autocomplete="street-address"',
          'Checking the username isn’t taken',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'html',
      S,
      choice(
        'm-fe-html-s1',
        'Content Search Engines Miss',
        'A product page renders everything client-side. Search results show “Loading…” for its title and description. What fixes it at the root?',
        [
          'Render the page’s HTML on the server (or at build time) so the content and meta tags are in the first response',
          'Add more keywords to the page',
          'Put the description in a hidden <div>',
          'Lazy-load the product data later',
        ],
        0
      )
    ),

    // CSS & Layout
    ...tagged(
      'css',
      B,
      choice(
        'm-fe-css-b1',
        'The Box Model',
        'A div has width: 200px, padding: 20px and border: 5px, with the default box-sizing. How wide is it on screen?',
        ['250px', '200px', '225px', '240px'],
        0
      )
    ),
    ...tagged(
      'css',
      J,
      choice(
        'm-fe-css-j1',
        'Centring',
        'Which centres a single child both horizontally and vertically inside its parent?',
        [
          'On the parent: display: flex; justify-content: center; align-items: center',
          'On the child: margin: auto; text-align: center',
          'On the child: vertical-align: middle',
          'On the parent: float: center',
        ],
        0
      )
    ),
    ...tagged(
      'css',
      P,
      choice(
        'm-fe-css-p1',
        'A Style That Won’t Apply',
        '.card .title { color: navy } is overridden by #sidebar h2 { color: grey } on the same heading. Why?',
        [
          'An id selector is more specific than two classes, so it wins whatever the order',
          'The later rule in the file always wins',
          'Colours on headings can’t be changed by classes',
          'The browser cached the old style',
        ],
        0
      )
    ),
    ...tagged(
      'css',
      S,
      choice(
        'm-fe-css-s1',
        'A Component That Fits Anywhere',
        'A product card must switch to a stacked layout when its container is narrow, whether it sits in a wide page or a narrow sidebar. What fits best?',
        [
          'Container queries: @container (max-width: 320px) on a container the card sits in',
          'Media queries on the viewport width',
          'JavaScript that measures the window on resize',
          'A separate card component for the sidebar',
        ],
        0
      )
    ),

    // JavaScript
    ...tagged(
      'js',
      B,
      choice(
        'm-fe-js-b1',
        'Equality',
        'What does 0 == "" give, and what does 0 === "" give?',
        ['true, then false: == converts types, === doesn’t', 'false, then false', 'true, then true', 'An error: you can’t compare a number with a string'],
        0
      )
    ),
    ...tagged(
      'js',
      J,
      codeTask(
        'm-fe-js-j1',
        'Basket Summary',
        `Write 'function solution(items)'.

'items' is a basket: [{ name, price, qty }]. Return { count, total } where count is the number of units and total is the sum of price × qty, rounded to 2 decimal places.

Example: solution([{ name: "Mug", price: 4.5, qty: 2 }]) returns { count: 2, total: 9 }.`,
        'items',
        `function solution(items) {
  const count = items.reduce((n, i) => n + i.qty, 0);
  const total = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  return { count, total };
}`,
        [
          ['Adds units and totals', '[[{"name":"Mug","price":4.5,"qty":2},{"name":"Tea","price":3.2,"qty":1}]]', '{"count":3,"total":12.2}'],
          ['Rounds away floating-point noise', '[[{"name":"Pen","price":0.1,"qty":3}]]', '{"count":3,"total":0.3}'],
          ['An empty basket', '[[]]', '{"count":0,"total":0}'],
        ],
        { minutes: 6 }
      ),
      order('m-fe-js-j2', 'The Event Loop', 'In what order does this log? console.log("A"); setTimeout(() => console.log("B"), 0); Promise.resolve().then(() => console.log("C")); console.log("D");', [
        'A',
        'D',
        'C',
        'B',
      ])
    ),
    ...tagged(
      'js',
      S,
      choice(
        'm-fe-js-s1',
        'A Growing Tab',
        'A dashboard’s memory climbs every time a user opens and closes a chart panel, until the tab crashes. What is the most likely cause?',
        [
          'The panel adds listeners or timers (resize, setInterval, subscriptions) and never removes them when it closes',
          'Too many CSS classes on the page',
          'Using const instead of let',
          'The browser’s cache is full',
        ],
        0
      )
    ),

    // Components & State
    ...tagged(
      'state',
      B,
      choice(
        'm-fe-state-b1',
        'Props and State',
        'In React, what is the difference between props and state?',
        [
          'Props are passed in by the parent and read-only; state is owned by the component and changes with setState',
          'Props are for numbers, state for strings',
          'State is shared by every component; props are private',
          'There is none; they are two names for the same thing',
        ],
        0
      )
    ),
    ...tagged(
      'state',
      P,
      codeTask(
        'm-fe-state-p1',
        'A Basket Reducer',
        `Write a reducer: 'function solution(state, action)' returns the new state without changing the old one.

state is { items: [{ id, qty }] }. Actions:
- { type: "add", id }: adds 1 to that item's qty, or adds { id, qty: 1 } at the end
- { type: "remove", id }: takes 1 off; an item that reaches 0 is removed
- { type: "clear" }: empties the basket
- anything else: returns state unchanged`,
        'state, action',
        `function solution(state, action) {
  switch (action.type) {
    case 'add':
      return state.items.some((i) => i.id === action.id)
        ? { items: state.items.map((i) => (i.id === action.id ? { ...i, qty: i.qty + 1 } : i)) }
        : { items: [...state.items, { id: action.id, qty: 1 }] };
    case 'remove':
      return { items: state.items.map((i) => (i.id === action.id ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0) };
    case 'clear':
      return { items: [] };
    default:
      return state;
  }
}`,
        [
          ['Adds a new item', '[{"items":[]},{"type":"add","id":"a"}]', '{"items":[{"id":"a","qty":1}]}'],
          ['Adds to an item already there', '[{"items":[{"id":"a","qty":1},{"id":"b","qty":2}]},{"type":"add","id":"b"}]', '{"items":[{"id":"a","qty":1},{"id":"b","qty":3}]}'],
          ['Removes an item at zero', '[{"items":[{"id":"a","qty":1},{"id":"b","qty":2}]},{"type":"remove","id":"a"}]', '{"items":[{"id":"b","qty":2}]}'],
          ['Clears the basket', '[{"items":[{"id":"a","qty":4}]},{"type":"clear"}]', '{"items":[]}'],
          ['Ignores unknown actions', '[{"items":[{"id":"a","qty":4}]},{"type":"oops"}]', '{"items":[{"id":"a","qty":4}]}'],
        ],
        { minutes: 8 }
      )
    ),

    // Accessibility
    ...tagged(
      'a11y',
      B,
      choice(
        'm-fe-a11y-b1',
        'Alt Text',
        'What alt text should a decorative divider image have?',
        ['alt="" so screen readers skip it', 'alt="image"', 'No alt attribute at all', 'alt="decorative divider line graphic"'],
        0
      )
    ),
    ...tagged(
      'a11y',
      P,
      choice(
        'm-fe-a11y-p1',
        'A Modal Dialog',
        'A custom modal opens. Which behaviour is right for keyboard and screen-reader users?',
        [
          'Focus moves into the dialog, Tab stays inside it, Escape closes it, and focus returns to the button that opened it',
          'Focus stays on the page behind so users don’t lose their place',
          'The dialog closes after 10 seconds',
          'Only the mouse can close it, to avoid accidents',
        ],
        0
      )
    ),
    ...tagged(
      'a11y',
      S,
      multi(
        'm-fe-a11y-s1',
        'Live Search Results',
        'A search box updates results as you type. What makes it usable with a screen reader? Tick all that apply.',
        [
          'Announce the result count in an aria-live="polite" region',
          'Keep focus in the input while results update',
          'Give results a real list structure and links or buttons',
          'Move focus to the first result on every keystroke',
          'Announce every result in full on each change',
        ],
        [0, 1, 2]
      )
    ),

    // Performance & Debugging
    ...tagged(
      'perf',
      B,
      choice(
        'm-fe-perf-b1',
        'A Blank Screen',
        'A page shows a blank screen in production but works locally. Where do you look first?',
        ['The browser’s console and network tab for errors and failed requests', 'Rewrite the page in another framework', 'Clear your own cache and assume it’s fixed', 'The server’s CPU graph'],
        0
      )
    ),
    ...tagged(
      'perf',
      J,
      multi(
        'm-fe-perf-j1',
        'Heavy Images',
        'A landing page loads 8 MB of photos. Which help? Tick all that apply.',
        [
          'Serve modern formats like WebP or AVIF',
          'Use srcset so phones get smaller images',
          'loading="lazy" for images below the fold',
          'Set width and height so the layout doesn’t jump',
          'Lazy-load the main hero image too',
        ],
        [0, 1, 2, 3]
      )
    ),
  ],
};
