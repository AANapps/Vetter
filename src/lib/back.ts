// Back buttons go to the page the person was actually on before, like the browser's back, and only fall back to a
// page's usual parent (e.g. All tests) when there is nothing in Vetter to go back to, such as a shared link opened
// straight. Each page Vetter adds to the history records how many steps into the app it is
const depth = (): number => (typeof history.state?.vetterDepth === 'number' ? history.state.vetterDepth : 0);

export const pushPage = (url: string) => history.pushState({ vetterDepth: depth() + 1 }, '', url);
// Swapping the address in place keeps the step count, so back still knows where it is
export const replacePage = (url: string) => history.replaceState(history.state, '', url);

export const backOr = (fallback: () => void) => (depth() > 0 ? history.back() : fallback());
