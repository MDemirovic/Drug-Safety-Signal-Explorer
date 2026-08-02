import { auth, currentUser } from "@clerk/nextjs/server";
import { Activity, Bot, Database, FileClock, RefreshCw, Search, Trash2 } from "lucide-react";
import type { Document, Filter } from "mongodb";
import Link from "next/link";
import { redirect } from "next/navigation";

import { deleteSnapshotAction, refreshSnapshotAction } from "@/app/admin/actions";
import { isAdminEmail } from "@/lib/auth/config";
import { getCollections } from "@/lib/db/collections";
import type { DrugSnapshotDocument } from "@/types/drug-snapshot";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function date(value: unknown) {
  if (!(value instanceof Date)) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function positivePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function adminHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin?${suffix}` : "/admin";
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-6 text-sm text-[var(--muted)]">
      {children}
    </p>
  );
}

function LogRows({ rows }: { rows: Document[] }) {
  if (!rows.length) return <Empty>No records are available.</Empty>;

  return (
    <div className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
      {rows.map((row) => (
        <details key={String(row._id)} className="group bg-white px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text)]">
            <span className="mr-3 text-xs font-bold text-[var(--signal-dark)]">
              {date(row.createdAt ?? row.computedAt)}
            </span>
            {String(row.service ?? row.query ?? row.outcome ?? "Record")}
          </summary>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-[#102f34] p-4 text-xs leading-5 text-[#d9f4ee]">
            {json(row)}
          </pre>
        </details>
      ))}
    </div>
  );
}

type AdminSearchParams = {
  notice?: string | string[];
  page?: string | string[];
  q?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: "/admin" });

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!isAdminEmail(email)) redirect("/");

  const rawParams = await searchParams;
  const notice = firstValue(rawParams.notice);
  const page = positivePage(firstValue(rawParams.page));
  const query = firstValue(rawParams.q)?.trim().slice(0, 100) ?? "";
  const pattern = query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const filter: Filter<DrugSnapshotDocument> = pattern
    ? { $or: [{ slug: pattern }, { normalizedName: pattern }] }
    : {};

  const collections = await getCollections();
  const [
    drugSnapshots,
    comparisons,
    summaries,
    apiLogs,
    searchLogs,
    totalDrugSnapshots,
    totalComparisons,
    totalSummaries,
    filteredDrugSnapshots,
  ] = await Promise.all([
    collections.drugSnapshots
      .find(filter)
      .sort({ computedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    collections.comparisonSnapshots.find({}).sort({ computedAt: -1 }).limit(20).toArray(),
    collections.aiSummaries.find({}).sort({ createdAt: -1 }).limit(20).toArray(),
    collections.apiLogs.find({}).sort({ createdAt: -1 }).limit(30).toArray(),
    collections.searchLogs.find({}).sort({ createdAt: -1 }).limit(30).toArray(),
    collections.drugSnapshots.countDocuments({}),
    collections.comparisonSnapshots.countDocuments({}),
    collections.aiSummaries.countDocuments({}),
    collections.drugSnapshots.countDocuments(filter),
  ]);

  const cards = [
    { label: "Drug snapshots", value: totalDrugSnapshots, icon: Database },
    { label: "Comparisons", value: totalComparisons, icon: Activity },
    { label: "AI summaries", value: totalSummaries, icon: Bot },
    { label: "Recent logs shown", value: apiLogs.length + searchLogs.length, icon: FileClock },
  ];
  const noticeMessage = {
    deleted: "Snapshot deleted successfully.",
    refreshed: "Snapshot refreshed successfully.",
    "not-found": "Snapshot was already absent; no changes were made.",
  }[notice ?? ""];

  return (
    <main className="relative flex-1 overflow-hidden px-5 py-10 sm:py-14">
      <div className="page-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] opacity-60" />
      <div className="relative mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Administration</p>
            <h1 className="font-display mt-3 text-5xl leading-none text-[var(--ink)] sm:text-7xl">
              Cache control room.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Inspect current aggregate cache records, operate drug snapshots, and review recent server
              activity. Signed in as {email}.
            </p>
          </div>
          <span className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-xs font-bold text-[var(--signal-dark)]">
            Admin only
          </span>
        </header>

        {noticeMessage && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--signal-pale)] px-4 py-3 text-sm font-semibold text-[var(--signal-dark)]">
            {noticeMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <section
              key={label}
              className="rounded-[1.4rem] border border-[var(--line)] bg-white p-5 shadow-[0_16px_45px_rgba(16,53,58,0.06)]"
            >
              <Icon className="h-5 w-5 text-[var(--signal-dark)]" />
              <p className="mt-5 text-xs font-bold tracking-[0.13em] text-[var(--muted)] uppercase">{label}</p>
              <p className="font-display mt-2 text-4xl text-[var(--ink)]">{value}</p>
            </section>
          ))}
        </div>

        <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_55px_rgba(16,53,58,0.07)] sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Mutable cache</p>
              <h2 className="font-display mt-2 text-3xl text-[var(--ink)]">Drug snapshots</h2>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Showing {drugSnapshots.length} of {filteredDrugSnapshots} matching records ({totalDrugSnapshots} total).
              </p>
            </div>
            <form action="/admin" className="flex w-full max-w-md gap-2" method="get">
              <label className="sr-only" htmlFor="snapshot-query">
                Search snapshots
              </label>
              <input
                id="snapshot-query"
                name="q"
                defaultValue={query}
                maxLength={100}
                placeholder="Search name or slug"
                className="h-10 min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 text-sm outline-none focus:border-[var(--signal)]"
              />
              <button className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--signal-dark)] px-4 text-xs font-bold text-white">
                <Search className="h-3.5 w-3.5" /> Search
              </button>
            </form>
          </div>

          {!drugSnapshots.length ? (
            <Empty>No cached drug snapshots match this page or search.</Empty>
          ) : (
            <div className="space-y-3">
              {drugSnapshots.map((snapshot) => (
                <article key={String(snapshot._id)} className="rounded-xl border border-[var(--line)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold capitalize text-[var(--ink)]">{snapshot.normalizedName}</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {snapshot.slug} · computed {date(snapshot.computedAt)} · expires {date(snapshot.expiresAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={refreshSnapshotAction}>
                        <input type="hidden" name="slug" value={snapshot.slug} />
                        <button className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--ink)] px-4 text-xs font-bold text-white">
                          <RefreshCw className="h-3.5 w-3.5" /> Refresh
                        </button>
                      </form>
                      <form action={deleteSnapshotAction}>
                        <input type="hidden" name="slug" value={snapshot.slug} />
                        <button className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--warning-line)] bg-[var(--warning-bg)] px-4 text-xs font-bold text-[var(--warning)]">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-bold text-[var(--signal-dark)]">
                      View snapshot JSON
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-[#102f34] p-4 text-xs leading-5 text-[#d9f4ee]">
                      {json(snapshot)}
                    </pre>
                  </details>
                </article>
              ))}
            </div>
          )}

          {(page > 1 || page * PAGE_SIZE < filteredDrugSnapshots) && (
            <nav aria-label="Drug snapshot pages" className="mt-6 flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold" href={adminHref(page - 1, query)}>
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-[var(--muted)]">Page {page}</span>
              {page * PAGE_SIZE < filteredDrugSnapshots ? (
                <Link className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold" href={adminHref(page + 1, query)}>
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>

        <div className="grid gap-8 xl:grid-cols-2">
          <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-6 sm:p-8">
            <p className="eyebrow">Cached analytics</p>
            <h2 className="font-display mt-2 mb-6 text-3xl text-[var(--ink)]">Comparison snapshots</h2>
            <LogRows rows={comparisons} />
          </section>
          <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-6 sm:p-8">
            <p className="eyebrow">Generated context</p>
            <h2 className="font-display mt-2 mb-6 text-3xl text-[var(--ink)]">AI summaries</h2>
            <LogRows rows={summaries} />
          </section>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-6 sm:p-8">
            <p className="eyebrow flex items-center gap-2"><FileClock className="h-4 w-4" />Service activity</p>
            <h2 className="font-display mt-2 mb-6 text-3xl text-[var(--ink)]">Recent API logs</h2>
            <LogRows rows={apiLogs} />
          </section>
          <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-6 sm:p-8">
            <p className="eyebrow flex items-center gap-2"><Search className="h-4 w-4" />Explorer activity</p>
            <h2 className="font-display mt-2 mb-6 text-3xl text-[var(--ink)]">Recent search logs</h2>
            <LogRows rows={searchLogs} />
          </section>
        </div>
      </div>
    </main>
  );
}
