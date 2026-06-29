export function EyeOpen() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <g fill="currentColor">
        <path d="M10.5 8a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0" />
        <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7" />
      </g>
    </svg>
  );
}

export function EyeClosed() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <g fill="currentColor">
        <path d="m10.79 12.912l-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z" />
        <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708l-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6l-12-12l.708-.708l12 12z" />
      </g>
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M9.17 5a3.001 3.001 0 0 1 5.66 0zM7.1 5a5.002 5.002 0 0 1 9.8 0H23v2h-2v16H3V7H1V5zm.4 13.5v-8h2v8zm7-8v8h2v-8z"
        clip-rule="evenodd"
      />
    </svg>
  );
}

export function PackageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 2l8 4v12l-8 4l-8-4V6zm0 2.1L6.5 7L12 9.75L17.5 7zm-6 5.9l5 2.5v7.3l-5-2.5zm7 2.5l5-2.5v7.3l-5 2.5z"
      />
    </svg>
  );
}

export function GenderIcon({ isMale }: { isMale: boolean }) {
  const d = isMale
    ? "M18 1.5H6v5a6 6 0 1 0 12 0zm-6 13c-3.608 0-7.007.911-9.976 2.516L1.5 17.3v5.2h21v-5.2l-.524-.284A20.9 20.9 0 0 0 12 14.5"
    : "M12 1.5a6 6 0 0 0-6 6v5h12v-5a6 6 0 0 0-6-6m0 13c-3.608 0-7.007.911-9.976 2.516L1.5 17.3v5.2h21v-5.2l-.524-.284A20.9 20.9 0 0 0 12 14.5";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
      <path fill="currentColor" fill-rule="evenodd" d={d} clip-rule="evenodd" />
    </svg>
  );
}
