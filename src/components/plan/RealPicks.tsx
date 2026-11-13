import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ChevronLeft, LocateFixed, MapPin, Search, TrendingUp } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, PlanIdea, RealPick, RealPicks as RealPicksResult, RealSource, Where } from '../../services/ai';
import { feel } from '../../feel/feel';
import { FlowerBadge } from '../art/Flower';
import { Thinking } from '../ui/bits';
import { Photo } from '../ui/Photo';
import { PlanTask } from '../../types';

/** The typed area is remembered on this phone only, never in the family's saved answers. */
const AREA_KEY = 'myfamilyai_area';
const readArea = () => {
  try {
    return localStorage.getItem(AREA_KEY) || '';
  } catch {
    return '';
  }
};
const saveArea = (area: string) => {
  try {
    localStorage.setItem(AREA_KEY, area);
  } catch {
    // ignore
  }
};

const SOURCE_NOTE: Record<RealSource, string> = {
  'google-maps': 'Places and ratings from Google Maps. Check opening hours before you go.',
  'google-search': 'Titles from Google Search this week. Check the age rating first.',
  openstreetmap: 'Places from OpenStreetMap; photos from Wikipedia. Check opening hours before you go.',
  netflix: 'Ranked by this week’s Netflix Top 10. Check the age rating first.',
  'apple-chart': 'Ranked by this week’s Apple TV film chart. Check the age rating first.',
};

type Phase = { kind: 'where' } | { kind: 'loading'; near: string } | { kind: 'done'; result: RealPicksResult } | { kind: 'error'; message: string; where: Where };

/**
 * The last step of a plan: real places, or real films, for the idea the family chose. Facts come
 * from the data source; the AI's part is only the line on why each one suits them.
 */
export function RealPicks({ task, idea, who, onBack }: { task: PlanTask; idea: PlanIdea; who: string[]; onBack: () => void }) {
  const { brief } = useHousehold();
  const films = task === 'watch';
  const remembered = films ? '' : readArea();
  const [phase, setPhase] = useState<Phase>(() => (films || remembered ? { kind: 'loading', near: remembered } : { kind: 'where' }));
  const [area, setArea] = useState(remembered);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  const search = async (where: Where, near: string) => {
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setPhase({ kind: 'loading', near });
    try {
      const result = await ai.planReal(brief, task, who, { title: idea.title, summary: idea.summary }, where, c.signal);
      if (c.signal.aborted) return;
      if (where && 'area' in where) saveArea(where.area);
      feel('land');
      setPhase({ kind: 'done', result });
    } catch (err) {
      if (c.signal.aborted || (err as Error)?.name === 'AbortError') return;
      setPhase({ kind: 'error', message: aiErrorMessage(err), where });
    }
  };

  useEffect(() => {
    if (films) search(null, '');
    else if (remembered) search({ area: remembered }, remembered);
    return () => request.current?.abort();
    // Runs once for the idea this step opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useLocation = () => {
    if (!navigator.geolocation) return setLocError('This browser can’t share a location. Type an area instead.');
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Rounded here too, so an exact position never leaves the phone.
        const round = (n: number) => Math.round(n * 100) / 100;
        search({ lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) }, 'you');
      },
      () => {
        setLocating(false);
        setLocError('Location is off for this site. Type an area instead.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 }
    );
  };

  const submitArea = (e: React.FormEvent) => {
    e.preventDefault();
    const a = area.trim();
    if (!a) return;
    search({ area: a }, a);
  };

  return (
    <div className="grid gap-3">
      <button type="button" className="t-label bg-transparent border-0 p-0 min-h-[44px] flex items-center gap-1 justify-self-start" style={{ color: 'var(--accent-ink)' }} onClick={onBack}>
        <ChevronLeft size={18} strokeWidth={2.6} /> Back to ideas
      </button>

      <section className="real-hero">
        <p className="t-label ink-2">{films ? 'Real films for' : 'Real places for'}</p>
        <h2 className="t-title">{idea.title}</h2>
      </section>

      {phase.kind === 'where' && (
        <section className="card p-5 grid gap-3">
          <h3 className="t-head">Where should we look?</h3>
          <p className="t-small ink-2">Your location is used for this search only, rounded to about a kilometre, and never saved.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={useLocation} disabled={locating}>
            <LocateFixed size={18} strokeWidth={2.4} /> {locating ? 'Finding you…' : 'Use my location'}
          </button>
          <form className="grid grid-cols-[1fr_auto] gap-2" onSubmit={submitArea}>
            <input className="field" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Town or postcode" aria-label="Town, suburb or postcode" autoComplete="address-level2" />
            <button type="submit" className="btn" disabled={!area.trim()} aria-label="Search this area">
              <Search size={18} strokeWidth={2.4} />
            </button>
          </form>
          {locError && (
            <p role="alert" className="t-small" style={{ color: 'var(--danger)' }}>
              {locError}
            </p>
          )}
        </section>
      )}

      {phase.kind === 'loading' && (
        <section className="card p-5 grid gap-3" aria-busy>
          <Thinking label={films ? 'Checking what’s trending' : `Looking near ${phase.near || 'you'}`} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="skeleton shrink-0" style={{ width: films ? 44 : 40, height: films ? 64 : 40, borderRadius: 10 }} />
              <div className="grid gap-2 flex-1">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3.5 w-5/6" />
              </div>
            </div>
          ))}
        </section>
      )}

      {phase.kind === 'error' && (
        <section className="card p-5 grid gap-3" role="alert">
          <p className="t-body">{phase.message}</p>
          <div className="grid grid-cols-2 gap-2">
            {!films && (
              <button type="button" className="btn btn-sm" onClick={() => setPhase({ kind: 'where' })}>
                Change area
              </button>
            )}
            <button type="button" className={`btn btn-sm btn-primary ${films ? 'col-span-2' : ''}`} onClick={() => search(phase.where, area || 'you')}>
              Try again
            </button>
          </div>
        </section>
      )}

      {phase.kind === 'done' && <Results result={phase.result} films={films} onChangeArea={() => setPhase({ kind: 'where' })} />}
    </div>
  );
}

function Results({ result, films, onChangeArea }: { result: RealPicksResult; films: boolean; onChangeArea: () => void }) {
  const { picks, near, source, searchUrl } = result;
  return (
    <div className="grid gap-3">
      {!films && near && (
        <p className="t-small ink-2 flex items-center gap-1.5">
          <MapPin size={15} strokeWidth={2.4} aria-hidden /> Near {near}
          <button type="button" className="bg-transparent border-0 p-0 ml-1 min-h-[44px] font-semibold" style={{ color: 'var(--accent-ink)' }} onClick={onChangeArea}>
            Change
          </button>
        </p>
      )}
      {picks.length === 0 ? (
        <section className="card p-5 grid gap-3">
          <p className="t-body">{films ? 'We couldn’t reach the film chart just now.' : 'We couldn’t find listed places for this nearby.'}</p>
          <a className="btn btn-primary btn-block" href={searchUrl} target="_blank" rel="noreferrer">
            {films ? 'Search the web' : 'Search Google Maps'} <ArrowUpRight size={18} strokeWidth={2.4} />
          </a>
        </section>
      ) : (
        picks.map((p, i) => <PickCard key={p.id} pick={p} index={i} films={films} />)
      )}
      {picks.length > 0 && (
        <>
          <p className="t-small ink-3">{source ? SOURCE_NOTE[source] : ''} Why each one fits is written by AI.</p>
          <a className="btn btn-quiet btn-sm justify-self-center" href={searchUrl} target="_blank" rel="noreferrer">
            {films ? 'See more on the web' : 'See more on Google Maps'} <ArrowUpRight size={16} strokeWidth={2.4} />
          </a>
        </>
      )}
    </div>
  );
}

function PickCard({ pick, index, films }: { pick: RealPick; index: number; films: boolean }) {
  const reduce = useReducedMotion();
  const { byName } = useFamily();
  const people = pick.members.map(byName).filter(Boolean);
  const meta = [pick.kind, pick.distanceKm != null ? `${pick.distanceKm < 1 ? `${Math.round(pick.distanceKm * 1000)} m` : `${pick.distanceKm} km`} away` : pick.area].filter(Boolean).join(' · ');
  const facts = pick.facts.filter((f) => !f.startsWith('About:'));
  const [photo, setPhoto] = useState(Boolean(pick.image));
  const hero = !films && photo && pick.image;
  return (
    <motion.article
      className="card real-card"
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.06 + index * 0.08 }}
    >
      {index === 0 && <span className="tape tape-butter" style={{ top: -9, left: 22, transform: 'rotate(-3deg)', zIndex: 3 }} aria-hidden />}
      {hero && (
        <figure className="real-hero-photo">
          <Photo src={pick.image!} alt={pick.imageExample ? `Example photo: ${pick.imageExample}` : pick.name} onFail={() => setPhoto(false)} />
          {pick.imageExample && <figcaption className="real-example">Example photo of {pick.imageExample.toLowerCase()}, not this place</figcaption>}
        </figure>
      )}
      <div className={`flex gap-3.5 items-start ${hero ? 'real-under-photo' : ''}`}>
        {films ? (
          <span className="real-poster" aria-hidden>
            {photo && pick.image ? <Photo src={pick.image} onFail={() => setPhoto(false)} /> : <span className="real-poster-title">{pick.name}</span>}
          </span>
        ) : (
          <span className="real-pin" aria-hidden>
            <span>{index + 1}</span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="t-head">{pick.name}</h3>
          {meta && <p className="t-small ink-2 mt-0.5">{meta}</p>}
          {pick.trend && (
            <p className="real-trend mt-2">
              <TrendingUp size={15} strokeWidth={2.6} aria-hidden /> {pick.trend}
            </p>
          )}
        </div>
      </div>
      {pick.fit && <p className="t-body mt-3">{pick.fit}</p>}
      {facts.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Details">
          {facts.map((f) => (
            <li key={f} className="real-fact">
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3 mt-3">
        {people.length > 0 ? (
          <span className="flex items-center -space-x-2 shrink-0" aria-label={`Suits ${pick.members.join(', ')}`}>
            {people.slice(0, 3).map((p) => (
              <FlowerBadge key={p!.id} style={p!.style} size={26} />
            ))}
          </span>
        ) : (
          <span />
        )}
        <a className="btn btn-sm btn-soft" href={pick.url} target="_blank" rel="noreferrer" onClick={() => feel('tap')}>
          {films ? 'Details' : 'Open in Maps'} <ArrowUpRight size={16} strokeWidth={2.4} />
        </a>
      </div>
    </motion.article>
  );
}
