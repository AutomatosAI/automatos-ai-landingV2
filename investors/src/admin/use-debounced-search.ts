import { useEffect, useRef, useState } from "react";

import { cleanSearch, SEARCH_DEBOUNCE_MS } from "./investors-query";

/**
 * A search box's text, sent on after the typing pauses (300 ms). `value` is
 * the search the URL holds: when it changes from elsewhere (Back, clearing
 * the filters) the box shows it and a search still waiting is dropped; when
 * it only echoes what was typed, the box keeps the typing as it is (a
 * trailing space included).
 */
export function useDebouncedSearch(value: string, onSearch: (text: string) => void) {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);
  const send = useRef(onSearch);

  useEffect(() => {
    send.current = onSearch;
  }, [onSearch]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (pending.current !== null && cleanSearch(pending.current) !== value) {
      window.clearTimeout(timer.current);
      pending.current = null;
    }
  }, [value]);

  // The URL's search changed: follow it unless the box already says the same.
  if (value !== shown) {
    setShown(value);
    if (cleanSearch(text) !== value) setText(value);
  }

  function change(next: string) {
    setText(next);
    pending.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      pending.current = null;
      send.current(next);
    }, SEARCH_DEBOUNCE_MS);
  }

  return [text, change] as const;
}
