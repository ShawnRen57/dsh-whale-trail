/** Decorative achievement branches; mirrored by CSS to frame each total. */
export function Laurel({side}:{side:'left'|'right'}) {
 return <svg className={`wt-laurel wt-laurel-${side}`} width="16" height="44" viewBox="0 0 22 56" fill="currentColor" aria-hidden="true" focusable="false">
  <path d="M19 53C3 43 1 24 12 5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  <path d="M12 10C8 6 10 2 15 0C17 5 15 8 12 10ZM8 18C2 17 0 12 2 8C7 9 10 13 8 18ZM6 28C0 26-1 21 1 17C6 19 8 23 6 28ZM8 38C1 37-1 32 0 28C6 28 10 32 8 38ZM13 47C6 49 2 44 2 40C8 38 12 41 13 47ZM19 53C13 57 8 54 6 50C11 47 16 48 19 53ZM8 23C8 17 11 13 16 13C17 18 13 22 8 23ZM7 33C7 27 10 23 15 24C15 29 12 32 7 33ZM10 43C9 37 12 33 17 33C18 38 15 42 10 43Z"/>
 </svg>;
}
