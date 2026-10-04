import { medicalProfile } from "../medical-record/profile";
import { getMedicalRecord } from "../medical-record/store";
import { medicalContext } from "../medical-record/context";
import { searchExa } from "./exa-search";
import { appleHealthStore, importedHealth } from "./health-reader";
import { summarizeAppleHealth } from "./apple-health";
import {
  getRecentCheckins,
  getRecentMetrics,
  getRecentRuns,
  summarizeCheckins,
  summarizeMetrics,
  summarizeRuns,
} from "./health-data";

/**
 * Everything a doctor's brief draws on, gathered server-side:
 *  - the user's profile, energy check-ins, daily activity and runs (Postgres)
 *  - recent flagged lab results (Postgres)
 *  - live web research (Exa) on travel advisories and the destination city
 * Web queries are built from the destination only. No profile or health data
 * is ever sent to Exa.
 */

type ToolContext = { requestContext?: { get: (key: string) => unknown } };

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  publishedDate: string | null;
  summary: string;
}

export interface WebFindings {
  query: string;
  sources: WebSource[];
  /** Set when the search could not run, so the brief can say so honestly. */
  error?: string;
}

const OFFICIAL_TRAVEL_DOMAINS = [
  "wwwnc.cdc.gov",
  "cdc.gov",
  "travel.state.gov",
  "who.int",
  "gov.uk",
  "smartraveller.gov.au",
  "travel.gc.ca",
];

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const clip = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

// Cache of in-flight and finished searches, so parallel requests for the same
// query (the research cards and the brief) share one Exa call.
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; value: Promise<WebFindings> }>();

function research(
  query: string,
  numResults: number,
  includeDomains?: string[],
  signal?: AbortSignal,
): Promise<WebFindings> {
  const hit = cache.get(query);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  // Do not tie a shared search to one caller's abort signal.
  const value = runSearch(query, numResults, includeDomains);
  cache.set(query, { at: Date.now(), value });
  void value.then((v) => { if (v.error) cache.delete(query); });
  return value;
}

async function runSearch(
  query: string,
  numResults: number,
  includeDomains?: string[],
): Promise<WebFindings> {
  try {
    const { results } = await searchExa({ query, numResults, includeDomains });
    return {
      query,
      sources: results.map((r) => ({
        title: r.title.trim() || domainOf(r.url),
        url: r.url,
        domain: domainOf(r.url),
        publishedDate: r.publishedDate,
        summary: clip(r.highlights.join(" "), 420),
      })),
    };
  } catch (err) {
    console.warn("brief web research failed", err);
    return { query, sources: [], error: err instanceof Error ? err.message : "Search failed" };
  }
}

/** Official advisories: CDC travel health notices, State Dept., WHO outbreaks. */
export const searchTravelAdvisories = (destination: string | undefined, signal?: AbortSignal) =>
  research(
    destination
      ? `current CDC travel health notices, outbreak alerts, vaccine recommendations and travel restrictions for ${destination}`
      : "current CDC travel health notices and international travel restrictions",
    2,
    OFFICIAL_TRAVEL_DOMAINS,
    signal,
  );

/** Australia's Smartraveller advice for the destination. */
export const searchSmartraveller = (destination: string | undefined, signal?: AbortSignal) =>
  research(
    destination
      ? `Smartraveller travel advice and health risks for ${destination}`
      : "Smartraveller travel advice health risks overseas",
    2,
    ["smartraveller.gov.au"],
    signal,
  );

/** City specifics: care access, bringing medication, climate and air quality. */
export const searchCityDetails = (destination: string, signal?: AbortSignal) =>
  research(
    `travelers health guide ${destination}: hospitals and pharmacies, bringing prescription medication, altitude, air quality and climate`,
    2,
    undefined,
    signal,
  );

export interface Wellness {
  source: "demo" | "apple_health";
  checkins: ReturnType<typeof summarizeCheckins> & { latest: { date: string; energy: string; note?: string }[] };
  metrics: { days: number; averages: Record<string, number | null>; observations: string[]; daysBelowTarget: Record<string, number> };
  runs: ReturnType<typeof summarizeRuns>;
}

export interface BriefProfile {
  name: string;
  age?: number;
  conditions: string[];
  medications: string[];
  allergies: string[];
}

export interface FlaggedLab {
  biomarker: string;
  value: number;
  unit: string;
  flag: string;
  date: string;
}

export async function loadProfile(context?: ToolContext): Promise<BriefProfile | null> {
  return medicalProfile(medicalContext(context), !(await importedHealth(context)).connected);
}

export async function loadWellness(context?: ToolContext, days = 14): Promise<Wellness> {
  const health = await importedHealth(context, days);
  if (health.connected) {
    const s = summarizeAppleHealth(health.daily);
    return {
      source: "apple_health",
      checkins: { ...summarizeCheckins([]), latest: [] },
      metrics: s,
      runs: summarizeRuns([]),
    };
  }
  const [checkins, metrics, runs] = await Promise.all([
    getRecentCheckins(days),
    getRecentMetrics(days),
    getRecentRuns(10),
  ]);
  return {
    source: "demo",
    checkins: { ...summarizeCheckins(checkins), latest: checkins.slice(0, 5) },
    metrics: summarizeMetrics(metrics),
    runs: summarizeRuns(runs),
  };
}

export async function loadFlaggedLabs(context?: ToolContext): Promise<FlaggedLab[]> {
  const includeDemo = !(await importedHealth(context)).connected;
  const record = await getMedicalRecord(medicalContext(context));
  const latest = new Map<string, FlaggedLab>();
  for (const entry of record.entries) {
    const c = entry.content;
    if (entry.status !== 'current' || c.kind !== 'observation' || typeof c.data.value !== 'number' || !c.effectiveDate || (!includeDemo && entry.provenance.type === 'legacy_demo')) continue;
    const previous = latest.get(c.label);
    if (!previous || previous.date < c.effectiveDate) latest.set(c.label, { biomarker: c.label, value: c.data.value, unit: c.data.unit ?? '', flag: c.data.flag ?? 'normal', date: c.effectiveDate });
  }
  return [...latest.values()].filter(lab => !['', 'normal', 'in_range', 'ok', 'n'].includes(lab.flag.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}

export interface BriefContext {
  destination?: string;
  departureDate?: string;
  profile: BriefProfile | null;
  wellness: Wellness | null;
  labs: FlaggedLab[];
  advisories: WebFindings;
  smartraveller: WebFindings;
  cityDetails: WebFindings | null;
}

export async function buildBriefContext(
  input: { destination?: string; departureDate?: string },
  context?: ToolContext,
  signal?: AbortSignal,
): Promise<BriefContext> {
  const destination = input.destination?.trim() || undefined;
  const settle = <T>(p: Promise<T>, fallback: T) => p.catch((err) => { console.warn("brief context", err); return fallback; });
  const [profile, wellness, labs, advisories, smartraveller, cityDetails] = await Promise.all([
    settle(loadProfile(context), null),
    settle(loadWellness(context), null),
    settle(loadFlaggedLabs(context), []),
    searchTravelAdvisories(destination, signal),
    searchSmartraveller(destination, signal),
    destination ? searchCityDetails(destination, signal) : Promise.resolve(null),
  ]);
  return { destination, departureDate: input.departureDate?.trim() || undefined, profile, wellness, labs, advisories, smartraveller, cityDetails };
}

const fmt = (n: number | null | undefined, unit = "") => (n == null ? "not available" : `${n}${unit}`);

/** Plain-language activity and energy lines, grounded in the numbers above. */
export function wellnessLines(w: Wellness | null): string[] {
  if (!w) return [];
  const lines: string[] = [];
  const { checkins, metrics, runs } = w;
  const src = w.source === "apple_health" ? "Apple Health" : "Baymax tracking";
  if (checkins.total) {
    const c = checkins.counts as Record<string, number>;
    lines.push(
      `Energy (${checkins.total} recent check-ins): ${c.low ?? 0} low, ${c.okay ?? 0} okay, ${c.good ?? 0} good, ${c.great ?? 0} great; average ${checkins.averageEnergyScore}/4.${checkins.observations.length ? ` ${checkins.observations.join(" ")}` : ""}`,
    );
  }
  if (metrics.days) {
    lines.push(
      `Activity and habits (last ${metrics.days} days, ${src}): about ${fmt(metrics.averages.steps)} steps/day, ${fmt(metrics.averages.activeMinutes, " active min")}/day, ${fmt(metrics.averages.sleepHours, " h")} sleep/night, ${fmt(metrics.averages.hydrationMl, " ml")} water/day.`,
    );
    const below = metrics.daysBelowTarget;
    lines.push(
      `Days under general wellness targets: sleep ${below.sleep}, water ${below.hydration}, steps ${below.steps}, active minutes ${below.activeMinutes} (of ${metrics.days}).`,
    );
  }
  if (runs.total) {
    lines.push(
      `Running: ${runs.total} recent runs, ${runs.totalMiles} mi total, average pace ${runs.averagePaceMinPerMi} min/mi, last run ${runs.daysSinceLastRun} days ago.`,
    );
  }
  return lines;
}

const sourceLines = (f: WebFindings | null, fallbackNote: string) => {
  if (!f) return [];
  if (!f.sources.length) return [`- ${f.error ? "Could not be verified online right now." : "No relevant sources found."} ${fallbackNote}`];
  return f.sources.slice(0, 2).map((s) => `- ${s.title} (${s.domain}): ${s.summary || "See source."} ${s.url}`);
};

/** The deterministic section text appended to every brief. */
export function contextSections(ctx: BriefContext): string[] {
  const where = ctx.destination ? ` for ${ctx.destination}` : "";
  const out: string[] = [];
  out.push(
    "",
    `Travel advisories and restrictions${where} (live web search, verify before relying on it):`,
    ...sourceLines(ctx.advisories, "Please check CDC Travelers' Health and the destination's official health authority."),
  );
  out.push(
    "",
    `Australian government advice (Smartraveller)${where}:`,
    ...sourceLines(ctx.smartraveller, "Please check smartraveller.gov.au for current advice."),
  );
  if (ctx.cityDetails) {
    out.push("", `Notes on ${ctx.destination}:`, ...sourceLines(ctx.cityDetails, "Confirm local pharmacy and care access directly."));
  }
  const lines = wellnessLines(ctx.wellness);
  if (lines.length || ctx.labs.length) {
    out.push("", "Energy, activity and recent results (from my Baymax data):");
    lines.forEach((l) => out.push(`- ${l}`));
    ctx.labs.forEach((l) => out.push(`- Flagged lab: ${l.biomarker} ${l.value} ${l.unit} (${l.flag.replace(/_/g, " ")}) on ${l.date}`));
  }
  return out;
}
