import { AssessmentTest, TestRole, TestScenario } from '../../types';
import { choice, match, multi, order, short, written } from '../questionKit';
import { questionSet } from './daSets';
import { fieldModule, programTask } from './programTask';

/**
 * The Frontend Engineer modules made for frontend work, built like the Data Analyst ones: Browser & DOM (form
 * validation and an accessibility audit) and React (a cart reducer and search, filter, sort and paging). Frontend also
 * takes JavaScript and Debugging for Software Development. Two question sets, then two coding tasks of four questions.
 */

const FE: TestRole[] = ['Frontend Engineer', 'Full Stack Engineer'];
const FIELD = 'Frontend Development';
const SCENARIO: TestScenario = {
  company: 'Fernway',
  role: 'Frontend Engineer',
  brief: `Fernway sells houseplants online. You're a frontend engineer on its shop.

Each coding task is one program that answers four questions: it's given the question (q1 to q4) on its first line and the data as JSON after it, and prints exactly what the question asks. Each question runs on two data sets.`,
};
const data = (v: unknown) => JSON.stringify(v);
const parse = <T,>(s: string) => JSON.parse(s) as T;

// =====================================================================================================
// Browser & DOM
// =====================================================================================================

type Form = { email: string; password: string; postcode: string; fields: Record<string, string> };
const FORM_A = data({ email: 'ruth.ames@fernway.co.uk', password: 'leafy', postcode: ' sw1a1aa ', fields: { name: 'Ruth', email: 'ruth@', phone: '' } });
const FORM_B = data({ email: 'ben @cole.dev', password: 'Monstera2026!', postcode: 'LS1 4DT', fields: { name: '', email: 'ben@cole.dev', phone: '0113 496 0000' } });
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const pwRules = (p: string) => [p.length >= 8 ? '' : 'length', /[A-Z]/.test(p) ? '' : 'uppercase', /[0-9]/.test(p) ? '' : 'number', /[^A-Za-z0-9]/.test(p) ? '' : 'symbol'].filter(Boolean);
const postcode = (p: string) => {
  const c = p.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(c) ? `${c.slice(0, -3)} ${c.slice(-3)}` : 'invalid';
};
const formErrors = (f: Record<string, string>) => {
  const out: Record<string, string> = {};
  if (!f.name?.trim()) out.name = 'Enter your name';
  if (!emailOk(f.email ?? '')) out.email = 'Enter a valid email address';
  if (f.phone && !/^[0-9 +]{10,15}$/.test(f.phone)) out.phone = 'Enter a valid phone number';
  return JSON.stringify(out);
};

type El = { tag: string; id?: string; attrs?: Record<string, string>; text?: string; children?: El[] };
const flat = (els: El[]): El[] => els.flatMap((e) => [e, ...flat(e.children ?? [])]);
const PAGE_A = data([
  { tag: 'header', children: [{ tag: 'img', id: 'logo', attrs: { src: 'logo.svg' } }, { tag: 'button', id: 'menu', attrs: { 'aria-label': 'Menu' } }, { tag: 'a', id: 'basket', attrs: { href: '/basket' } }] },
  { tag: 'main', children: [{ tag: 'h1', text: 'Houseplants' }, { tag: 'h3', text: 'Bestsellers' }, { tag: 'img', id: 'p1', attrs: { src: 'fig.jpg', alt: 'Fiddle leaf fig' } }, { tag: 'img', id: 'p2', attrs: { src: 'pot.jpg', alt: '' } }, { tag: 'img', id: 'p3', attrs: { src: 'fern.jpg' } }, { tag: 'button', id: 'add1', text: 'Add to basket' }, { tag: 'h2', text: 'Care guides' }, { tag: 'h4', text: 'Watering' }] },
  { tag: 'form', children: [{ tag: 'label', attrs: { for: 'q' }, text: 'Search' }, { tag: 'input', id: 'q' }, { tag: 'input', id: 'news' }, { tag: 'input', id: 'promo', attrs: { 'aria-label': 'Promo code' } }] },
]);
const PAGE_B = data([
  { tag: 'nav', children: [{ tag: 'a', id: 'home', text: 'Home' }, { tag: 'button', id: 'close' }, { tag: 'img', id: 'avatar', attrs: { src: 'me.png' } }] },
  { tag: 'h2', text: 'Your basket' },
  { tag: 'h3', text: 'Items' },
  { tag: 'h5', text: 'Delivery' },
  { tag: 'form', children: [{ tag: 'input', id: 'qty' }, { tag: 'label', attrs: { for: 'qty' }, text: 'Quantity' }, { tag: 'input', id: 'gift' }] },
]);
const imgsNoAlt = (els: El[]) => flat(els).filter((e) => e.tag === 'img' && e.attrs?.alt === undefined).length;
const unnamed = (els: El[]) => flat(els).filter((e) => (e.tag === 'button' || e.tag === 'a') && !e.text?.trim() && !e.attrs?.['aria-label']).map((e) => e.id).join(',');
const skips = (els: El[]) => {
  const hs = flat(els).filter((e) => /^h[1-6]$/.test(e.tag));
  return hs.filter((h, i) => i > 0 && Number(h.tag[1]) > Number(hs[i - 1].tag[1]) + 1).map((h) => h.text).join(',');
};
const unlabelled = (els: El[]) => {
  const all = flat(els);
  const labelled = new Set(all.filter((e) => e.tag === 'label').map((e) => e.attrs?.for));
  return all.filter((e) => e.tag === 'input' && !labelled.has(e.id) && !e.attrs?.['aria-label']).map((e) => e.id).join(',');
};

const DOM_TEST = fieldModule({
  id: 'test-fe-dom',
  skill: 'Browser & DOM',
  field: FIELD,
  category: 'Frontend',
  roles: FE,
  description: 'Two question sets (CSS layout; performance and accessibility), then two coding tasks of four questions each: a checkout form’s validation (email, password rules, UK postcodes, the error messages) and an accessibility audit of a page (images without alt text, unnamed buttons and links, skipped headings, unlabelled inputs).',
  skillsTested: ['HTML', 'CSS', 'Accessibility', 'Forms', 'Web Performance'],
  scenario: SCENARIO,
  sets: [
    ...questionSet(
      'fe-dom-s1',
      'CSS Layout',
      'The product grid',
      `\`\`\`css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.card { display: flex; flex-direction: column; }
.card .price { margin-top: auto; }
\`\`\``,
      [
        choice('fe-dom-s1-a', 'How Many Columns', 'On a 1000px-wide container, how does the grid lay out its columns?', ['As many 220px-or-wider columns as fit (4 here), sharing the spare width', 'Exactly 220px columns, leaving a gap at the end', 'One column per card, scrolling sideways', 'Always 3 columns'], 0),
        short('fe-dom-s1-b', 'Pushed Down', 'What does margin-top: auto do to .price inside the column flexbox? (A few words.)', ['pushes it to the bottom', 'pushes it to the bottom of the card', 'moves it to the bottom', 'sticks it to the bottom', 'pushes price to the bottom']),
        match('fe-dom-s1-c', 'The Right Tool', 'Match each layout job to the tool for it.', [
          ['A responsive grid of product cards', 'CSS grid with auto-fill'],
          ['A row of buttons that wraps', 'Flexbox with flex-wrap'],
          ['A header that stays at the top while scrolling', 'position: sticky'],
          ['A modal over the page', 'position: fixed'],
        ]),
        written(
          'fe-dom-s1-d',
          'Long Names',
          'A product called “Philodendron Pink Princess Variegated Extra Large” breaks the card layout on mobile. How would you handle long names?',
          ['Lets text wrap and stops overflow (overflow-wrap: anywhere / min-width: 0 on flex or grid children)', 'Or clamps to a set number of lines with an ellipsis (line-clamp), with the full name still available', 'Checks it at small widths and doesn’t rely on a fixed height'],
          'Let the name wrap and stop it forcing the card wider: overflow-wrap: anywhere on the title and min-width: 0 on the grid or flex child. If cards need even heights, clamp to two lines with -webkit-line-clamp and an ellipsis, keeping the full name in the product page and title attribute. Then check at 320px.'
        ),
      ]
    ),
    ...questionSet(
      'fe-dom-s2',
      'Performance and Accessibility',
      'Lighthouse report',
      `Lighthouse on the product page (mobile):

Largest Contentful Paint    4.8 s   (hero image, 2.4 MB JPEG)
Cumulative Layout Shift     0.31    (images without width and height)
Interaction to Next Paint   180 ms
Accessibility               72      (images without alt text, low contrast on price, unlabelled search box)`,
      [
        multi('fe-dom-s2-a', 'Speed Fixes', 'Which would improve LCP and CLS? Tick all that apply.', ['Serve the hero as a smaller, modern format (AVIF/WebP) at the right size', 'Give images width and height (or aspect-ratio)', 'Preload the hero image', 'Add more JavaScript animations', 'Lazy-load the hero image'], [0, 1, 2]),
        short('fe-dom-s2-b', 'Good CLS', 'What is the threshold for a “good” Cumulative Layout Shift score? (A number.)', ['0.1', '0.10', '< 0.1', 'under 0.1', 'less than 0.1']),
        choice('fe-dom-s2-c', 'Decorative Images', 'A decorative leaf pattern image adds nothing to the content. What alt should it have?', ['alt="" (empty), so screen readers skip it', 'alt="image"', 'No alt attribute at all', 'alt="decorative leaf pattern image"'], 0),
        written(
          'fe-dom-s2-d',
          'The Search Box',
          'The search box is an input with a placeholder “Search plants” and no label. Why is that a problem, and how do you fix it?',
          ['Explains placeholders aren’t labels: they disappear when typing and aren’t reliably announced, so screen reader and voice-control users lose the purpose', 'Adds a proper label (visible, or visually hidden) linked with for/id, or aria-label as a fallback', 'Mentions role="search" / a form landmark or keeping the placeholder as a hint only'],
          'A placeholder isn’t a label: it vanishes as soon as you type, is often low contrast, and isn’t reliably read out, so screen reader and voice users can’t tell what the box is. Add <label for="search">Search plants</label> (visually hidden if the design needs it) or at least aria-label, and wrap it in a form with role="search".'
        ),
      ]
    ),
  ],
  tasks: [
    programTask({
      id: 'fe-dom-t1',
      title: 'Checkout Validation',
      language: 'javascript',
      prompt: `The data is { email, password, postcode, fields }.

Q1. Print true if email is valid (some text without spaces or @, an @, more such text, a dot, and more), otherwise false.
Q2. Print which password rules fail, in this order, separated by commas: length (at least 8 characters), uppercase, number, symbol (anything that isn't a letter or digit). Print ok if none fail.
Q3. Print the UK postcode tidied (spaces removed, upper case, then one space before the last three characters, e.g. SW1A 1AA), or invalid if it doesn't match the format: 1–2 letters, a digit, an optional letter or digit, then a digit and two letters.
Q4. Validate fields (name, email, phone) and print the errors as JSON: name "Enter your name" if empty or spaces; email "Enter a valid email address" if not valid (as in Q1); phone "Enter a valid phone number" only if filled in and not 10–15 characters of digits, spaces and +. Print {} if there are none, keys in the order name, email, phone.`,
      questions: ['is the email valid', 'failing password rules, or ok', 'tidy postcode or invalid', 'field errors as JSON'],
      data: [
        ['right on the first form', FORM_A],
        ['right on the second form', FORM_B],
      ],
      expected: [(i) => String(emailOk(parse<Form>(i).email)), (i) => pwRules(parse<Form>(i).password).join(',') || 'ok', (i) => postcode(parse<Form>(i).postcode), (i) => formErrors(parse<Form>(i).fields)],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const d = JSON.parse(rest.join('\\n'));
const emailOk = (e) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e);
if (question === 'q1') console.log(emailOk(d.email));
else if (question === 'q2') {
  const p = d.password;
  const fails = [p.length >= 8 ? '' : 'length', /[A-Z]/.test(p) ? '' : 'uppercase', /[0-9]/.test(p) ? '' : 'number', /[^A-Za-z0-9]/.test(p) ? '' : 'symbol'].filter(Boolean);
  console.log(fails.join(',') || 'ok');
} else if (question === 'q3') {
  const c = d.postcode.replace(/\\s+/g, '').toUpperCase();
  console.log(/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(c) ? c.slice(0, -3) + ' ' + c.slice(-3) : 'invalid');
} else if (question === 'q4') {
  const f = d.fields, out = {};
  if (!(f.name || '').trim()) out.name = 'Enter your name';
  if (!emailOk(f.email || '')) out.email = 'Enter a valid email address';
  if (f.phone && !/^[0-9 +]{10,15}$/.test(f.phone)) out.phone = 'Enter a valid phone number';
  console.log(JSON.stringify(out));
}
`,
    }),
    programTask({
      id: 'fe-dom-t2',
      title: 'Accessibility Audit',
      language: 'javascript',
      prompt: `The data is a page as a tree of elements: { tag, id, attrs, text, children }. Look through every element, however deeply nested, in document order.

Q1. Print how many img elements have no alt attribute at all (alt="" is fine: it's decorative).
Q2. Print the ids of buttons and links (a) with no accessible name (no text and no aria-label), separated by commas.
Q3. Print the text of every heading that skips a level going down (e.g. an h3 straight after an h1), separated by commas.
Q4. Print the ids of inputs with no label (no label whose for is the input's id, and no aria-label), separated by commas.`,
      questions: ['images with no alt attribute', 'unnamed buttons and links', 'headings that skip a level', 'unlabelled inputs'],
      data: [
        ['right on the first page', PAGE_A],
        ['right on the second page', PAGE_B],
      ],
      expected: [(i) => String(imgsNoAlt(parse<El[]>(i))), (i) => unnamed(parse<El[]>(i)), (i) => skips(parse<El[]>(i)), (i) => unlabelled(parse<El[]>(i))],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const page = JSON.parse(rest.join('\\n'));
const flat = (els) => els.flatMap((e) => [e, ...flat(e.children || [])]);
const all = flat(page);
if (question === 'q1') console.log(all.filter((e) => e.tag === 'img' && (e.attrs || {}).alt === undefined).length);
else if (question === 'q2') console.log(all.filter((e) => (e.tag === 'button' || e.tag === 'a') && !(e.text || '').trim() && !(e.attrs || {})['aria-label']).map((e) => e.id).join(','));
else if (question === 'q3') {
  const hs = all.filter((e) => /^h[1-6]$/.test(e.tag));
  console.log(hs.filter((h, i) => i > 0 && Number(h.tag[1]) > Number(hs[i - 1].tag[1]) + 1).map((h) => h.text).join(','));
} else if (question === 'q4') {
  const labelled = new Set(all.filter((e) => e.tag === 'label').map((e) => (e.attrs || {}).for));
  console.log(all.filter((e) => e.tag === 'input' && !labelled.has(e.id) && !(e.attrs || {})['aria-label']).map((e) => e.id).join(','));
}
`,
    }),
  ],
});

// =====================================================================================================
// React
// =====================================================================================================

type Item = { sku: string; price: number; qty: number };
type Action = { type: 'ADD'; sku: string; price: number } | { type: 'REMOVE'; sku: string } | { type: 'SET_QTY'; sku: string; qty: number };
type Cart = { items: Item[] };
const reduce = (s: Cart, a: Action): Cart => {
  if (a.type === 'ADD') {
    const found = s.items.find((i) => i.sku === a.sku);
    return { items: found ? s.items.map((i) => (i.sku === a.sku ? { ...i, qty: i.qty + 1 } : i)) : [...s.items, { sku: a.sku, price: a.price, qty: 1 }] };
  }
  if (a.type === 'REMOVE') return s.items.some((i) => i.sku === a.sku) ? { items: s.items.filter((i) => i.sku !== a.sku) } : s;
  if (!s.items.some((i) => i.sku === a.sku)) return s;
  if (a.qty <= 0) return { items: s.items.filter((i) => i.sku !== a.sku) };
  return s.items.find((i) => i.sku === a.sku)!.qty === a.qty ? s : { items: s.items.map((i) => (i.sku === a.sku ? { ...i, qty: a.qty } : i)) };
};
type CartRun = { actions: Action[] };
const CART_A = data({ actions: [{ type: 'ADD', sku: 'FIG', price: 45 }, { type: 'ADD', sku: 'POT', price: 12 }, { type: 'ADD', sku: 'FIG', price: 45 }, { type: 'REMOVE', sku: 'FEED' }, { type: 'SET_QTY', sku: 'POT', qty: 3 }, { type: 'SET_QTY', sku: 'POT', qty: 3 }] });
const CART_B = data({ actions: [{ type: 'ADD', sku: 'FERN', price: 18.5 }, { type: 'SET_QTY', sku: 'FERN', qty: 0 }, { type: 'ADD', sku: 'MIST', price: 6.25 }, { type: 'ADD', sku: 'MIST', price: 6.25 }, { type: 'REMOVE', sku: 'FERN' }, { type: 'ADD', sku: 'LAMP', price: 39 }] });
const runCart = (r: CartRun) => {
  let s: Cart = { items: [] };
  const noops: number[] = [];
  r.actions.forEach((a, i) => {
    const n = reduce(s, a);
    if (n === s) noops.push(i);
    s = n;
  });
  return { s, noops };
};

type Product = { name: string; price: number; inStock: boolean; tags: string[] };
type Search = { products: Product[]; query: string; min: number; max: number; page: number; size: number };
const PRODUCTS: Product[] = [
  { name: 'Monstera Deliciosa', price: 32, inStock: true, tags: ['large', 'easy'] },
  { name: 'Fiddle Leaf Fig', price: 45, inStock: false, tags: ['large'] },
  { name: 'Snake Plant', price: 18, inStock: true, tags: ['easy', 'low-light'] },
  { name: 'Mini Monstera', price: 22, inStock: true, tags: ['easy'] },
  { name: 'Calathea Orbifolia', price: 28, inStock: true, tags: ['pet-safe'] },
  { name: 'Peace Lily', price: 18, inStock: false, tags: ['low-light'] },
  { name: 'Pothos', price: 12, inStock: true, tags: ['easy', 'trailing'] },
];
const SEARCH_A = data({ products: PRODUCTS, query: 'MONSTERA', min: 15, max: 30, page: 2, size: 2 });
const SEARCH_B = data({ products: PRODUCTS.slice(1), query: 'lily', min: 10, max: 20, page: 1, size: 3 });
const sorted = (ps: Product[]) => [...ps].sort((a, b) => a.price - b.price || (a.name < b.name ? -1 : 1));

const REACT_TEST = fieldModule({
  id: 'test-fe-react',
  skill: 'React',
  field: FIELD,
  category: 'Frontend',
  roles: FE,
  description: 'Two question sets (hooks and effects; state and rendering), then two coding tasks of four questions each: a cart reducer (the state after a run of actions, item count, total, and which actions changed nothing) and search, filter, sort and paging over the product list.',
  skillsTested: ['React', 'State Management', 'Hooks', 'JavaScript'],
  scenario: SCENARIO,
  sets: [
    ...questionSet(
      'fe-react-s1',
      'Hooks and Effects',
      'ProductPage.jsx',
      `\`\`\`jsx
function ProductPage({ id }) {
  const [product, setProduct] = useState(null);
  useEffect(() => {
    fetch(\`/api/products/\${id}\`).then((r) => r.json()).then(setProduct);
  }, []);
  if (!product) return <Spinner />;
  return <h1>{product.name}</h1>;
}
\`\`\``,
      [
        choice('fe-react-s1-a', 'The Stale Page', 'Navigating from one product to another (a new id) keeps showing the first product. Why?', ['The effect’s dependency array is empty, so it doesn’t run again when id changes', 'useState can’t hold objects', 'fetch caches the first answer', 'The Spinner hides the update'], 0),
        short('fe-react-s1-b', 'The Fix', 'What should the dependency array be? (As written in code.)', ['[id]', '[ id ]']),
        multi('fe-react-s1-c', 'Rules of Hooks', 'Which break the rules of hooks? Tick all that apply.', ['Calling useState inside an if', 'Calling useEffect inside a loop', 'Calling a hook from a regular helper function that isn’t a hook or component', 'Calling two useState hooks one after another at the top of a component', 'Calling a custom hook from a component'], [0, 1, 2]),
        written(
          'fe-react-s1-d',
          'A Race',
          'A user clicks quickly through three products and sometimes sees the wrong one. Why can that happen with this effect, and how would you fix it?',
          ['Explains responses can arrive out of order, so an older request can set state after a newer one', 'Fixes it with a cleanup that ignores stale responses (an ignore flag) or AbortController to cancel the old request', 'Includes id in the dependencies (or uses a data-fetching library that handles it)'],
          'Each click starts a fetch, and they can finish in any order, so the first product’s slow response can land last and overwrite the right one. Return a cleanup from the effect that sets ignore = true (or aborts with AbortController), only call setProduct if not ignored, and put id in the dependency array. A library like React Query does this for you.'
        ),
      ]
    ),
    ...questionSet(
      'fe-react-s2',
      'State and Rendering',
      'BasketList.jsx',
      `\`\`\`jsx
function BasketList({ items }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(items.reduce((n, i) => n + i.price * i.qty, 0));
  }, [items]);
  return (
    <ul>
      {items.map((item, index) => <BasketRow key={index} item={item} />)}
      <li>Total: £{total}</li>
    </ul>
  );
}
\`\`\``,
      [
        choice('fe-react-s2-a', 'Derived State', 'What’s a better way to get total?', ['Work it out while rendering (or with useMemo); it doesn’t need its own state and effect', 'Keep it in a global store', 'Use two effects', 'Store it in a ref'], 0),
        choice('fe-react-s2-b', 'The Key', 'Why is key={index} a problem here?', ['When items are removed or reordered, rows keep the wrong item’s state; a stable id should be the key', 'Keys must be strings', 'Index keys are slower to type', 'It’s fine for any list'], 0),
        order('fe-react-s2-c', 'When State Changes', 'Put what happens after setState in order.', ['React schedules a re-render', 'The component function runs again', 'React compares the new output with the old', 'Only the changed DOM is updated', 'Effects whose dependencies changed run']),
        written(
          'fe-react-s2-d',
          'Too Many Renders',
          'The basket page re-renders every row whenever any input on the page changes. How would you find out why, and what might you change?',
          ['Uses the React DevTools Profiler (highlight updates) to see what renders and why', 'Moves state down closer to where it’s used, or splits components', 'Memoises rows (React.memo) with stable props/callbacks (useCallback/useMemo) where it’s worth it'],
          'Open the React DevTools Profiler with “highlight updates” to see which components render and why. Usually the state lives too high up: move the input’s state into its own component so typing doesn’t re-render the list. Where rows still re-render needlessly, wrap BasketRow in React.memo and pass stable props (useCallback for handlers), and measure again.'
        ),
      ]
    ),
  ],
  tasks: [
    programTask({
      id: 'fe-react-t1',
      title: 'The Cart Reducer',
      language: 'javascript',
      prompt: `The data is { actions }: a run of actions on a cart that starts empty ({ items: [] }). Write a reducer (state, action) → state that never changes the old state:
• ADD { sku, price }: add the sku with qty 1, or add 1 to its qty if it's there
• REMOVE { sku }: remove that sku (if it isn't there, return the same state object)
• SET_QTY { sku, qty }: set its qty; 0 or less removes it; if the sku isn't there or the qty is already that, return the same state object

Q1. Print the final state as JSON (items in the order first added; each { sku, price, qty }).
Q2. Print the number of items (the sum of qty).
Q3. Print the total (price × qty, added up) to 2 decimal places.
Q4. Print the indexes of the actions that returned the same state object (nothing changed), separated by commas, or none.`,
      questions: ['the final state as JSON', 'the number of items', 'the total, 2 dp', 'indexes of actions that changed nothing, or none'],
      data: [
        ['right on the first run', CART_A],
        ['right on the second run', CART_B],
      ],
      expected: [
        (i) => JSON.stringify(runCart(parse<CartRun>(i)).s),
        (i) => String(runCart(parse<CartRun>(i)).s.items.reduce((n, x) => n + x.qty, 0)),
        (i) => runCart(parse<CartRun>(i)).s.items.reduce((n, x) => n + x.qty * x.price, 0).toFixed(2),
        (i) => runCart(parse<CartRun>(i)).noops.join(',') || 'none',
      ],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const { actions } = JSON.parse(rest.join('\\n'));
function reducer(s, a) {
  if (a.type === 'ADD') {
    const found = s.items.find((i) => i.sku === a.sku);
    return { items: found ? s.items.map((i) => (i.sku === a.sku ? { ...i, qty: i.qty + 1 } : i)) : [...s.items, { sku: a.sku, price: a.price, qty: 1 }] };
  }
  if (a.type === 'REMOVE') return s.items.some((i) => i.sku === a.sku) ? { items: s.items.filter((i) => i.sku !== a.sku) } : s;
  const cur = s.items.find((i) => i.sku === a.sku);
  if (!cur) return s;
  if (a.qty <= 0) return { items: s.items.filter((i) => i.sku !== a.sku) };
  return cur.qty === a.qty ? s : { items: s.items.map((i) => (i.sku === a.sku ? { ...i, qty: a.qty } : i)) };
}
let s = { items: [] }; const noops = [];
actions.forEach((a, i) => { const n = reducer(s, a); if (n === s) noops.push(i); s = n; });
if (question === 'q1') console.log(JSON.stringify(s));
else if (question === 'q2') console.log(s.items.reduce((n, x) => n + x.qty, 0));
else if (question === 'q3') console.log(s.items.reduce((n, x) => n + x.qty * x.price, 0).toFixed(2));
else if (question === 'q4') console.log(noops.join(',') || 'none');
`,
    }),
    programTask({
      id: 'fe-react-t2',
      title: 'Search, Filter, Sort and Page',
      language: 'javascript',
      prompt: `The data is { products, query, min, max, page, size }; each product is { name, price, inStock, tags }. This is the logic behind the shop's product list.

Q1. Print the names of products whose name contains query, ignoring case, separated by commas (in the list's order).
Q2. Print the names of products that are in stock and priced from min to max (inclusive), separated by commas.
Q3. Print every product's name sorted by price, cheapest first, and by name A–Z when the price is the same, separated by commas.
Q4. Sort as in Q3, then print the names on page number page (pages start at 1, size products per page), separated by commas, or nothing if the page is empty.`,
      questions: ['names matching the query, ignoring case', 'in stock and priced min to max', 'sorted by price then name', 'one page of the sorted list'],
      data: [
        ['right on the first list', SEARCH_A],
        ['right on the second list', SEARCH_B],
      ],
      expected: [
        (i) => parse<Search>(i).products.filter((p) => p.name.toLowerCase().includes(parse<Search>(i).query.toLowerCase())).map((p) => p.name).join(','),
        (i) => parse<Search>(i).products.filter((p) => p.inStock && p.price >= parse<Search>(i).min && p.price <= parse<Search>(i).max).map((p) => p.name).join(','),
        (i) => sorted(parse<Search>(i).products).map((p) => p.name).join(','),
        (i) => {
          const d = parse<Search>(i);
          return sorted(d.products).slice((d.page - 1) * d.size, d.page * d.size).map((p) => p.name).join(',');
        },
      ],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const d = JSON.parse(rest.join('\\n'));
const sorted = () => [...d.products].sort((a, b) => a.price - b.price || (a.name < b.name ? -1 : 1));
if (question === 'q1') console.log(d.products.filter((p) => p.name.toLowerCase().includes(d.query.toLowerCase())).map((p) => p.name).join(','));
else if (question === 'q2') console.log(d.products.filter((p) => p.inStock && p.price >= d.min && p.price <= d.max).map((p) => p.name).join(','));
else if (question === 'q3') console.log(sorted().map((p) => p.name).join(','));
else if (question === 'q4') console.log(sorted().slice((d.page - 1) * d.size, d.page * d.size).map((p) => p.name).join(','));
`,
    }),
  ],
});

export const FRONTEND_MODULE_TESTS: AssessmentTest[] = [DOM_TEST, REACT_TEST];
