export function AppHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b-2 border-sky-600 bg-zinc-950 px-4 py-2 text-zinc-100">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        <img
          src="./redmine-reborn.svg"
          alt=""
          aria-hidden="true"
          className="h-8 w-12 shrink-0"
        />
        <span>
          Redmine{" "}
          <span className="inline-block bg-linear-to-b from-[#12f4ef] via-[#00b7ee] to-[#008ee0] bg-clip-text text-transparent">
            Reborn
          </span>
        </span>
      </h1>
    </header>
  );
}
