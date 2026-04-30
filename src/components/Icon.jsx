const PATHS = {
  check: "M5 13l4 4L19 7",
  chevronDown: "M6 9l6 6 6-6",
  chevronLeft: "M15 18l-6-6 6-6",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  trash:
    "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z",
  share:
    "M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13",
  mail: "M4 6h16v12H4zM4 6l8 7 8-7",
  refresh:
    "M3 12a9 9 0 0115.5-6.4L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.4L3 16M3 21v-5h5",
  signOut:
    "M16 17l5-5-5-5M21 12H9M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h4",
  menu: "M3 6h18M3 12h18M3 18h18",
  pencil:
    "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z",
  hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
};

export default function Icon({
  name,
  size = 20,
  className = "",
  strokeWidth = 2,
}) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
