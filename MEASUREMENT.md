# Measuring retention without instrumenting the product

RakshaSutra's brand promise is **zero network calls, zero telemetry,
zero persistence** (see invariants in the popup/landing work). This
document is the alternative: how to read real retention signals using
*only* what the three extension stores already expose natively in their
developer dashboards — no analytics SDK, no ping, no uninstall URL.

## Kill metric

> **7-day retention < 15% → the "password generator as a standalone
> product" thesis is dead.**

If fewer than 15 installs in 100 are still active a week later, people
are trying it once (often just to copy one password) and not coming
back. That's a discovery/onboarding problem this doc can detect, but a
churn problem no UI tweak fixes — it would call for rethinking the
product, not the popup.

None of the three stores expose a literal "% of installs still active
after 7 days" cohort number. Each gives you adjacent raw numbers; the
sections below say exactly which numbers to pull and how to combine
them into an approximation of that metric.

---

## Chrome Web Store (primary distribution channel)

**Where:** [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → select RakshaSutra → **Analytics** (formerly "Statistics") tab.

What's there:

- **Users** chart — weekly active users (WAU), daily active users (DAU), with a trend line over time.
- **Acquisitions** → **Installs** and **Uninstalls**, broken down per day/week.
- A **Users (28 days)** breakdown by country, which is useful for sanity-checking that growth isn't just one geography spiking.

**How to approximate 7-day retention:**

1. Pick a week `W`. Note `installs(W)` from the Acquisitions panel.
2. Look at `WAU` exactly one week later (`W+1`). It includes returning
   users from *before* `W` too, so this overstates retention for a
   single cohort — but tracked over several consecutive weeks, a
   `WAU` that roughly tracks cumulative installs means people are
   sticking around; a `WAU` that plateaus or falls while installs keep
   climbing means new users aren't returning.
3. Cross-check with `uninstalls(W..W+1) / installs(W)`. A high
   uninstall rate within the first week is the sharpest available
   signal — Chrome reports uninstalls as their own event, not just an
   absence of activity, so this is the closest thing to a direct
   "didn't come back" number the dashboard gives you.

## Firefox Add-ons (AMO)

**Where:** [addons.mozilla.org Developer Hub](https://addons.mozilla.org/developers/) → RakshaSutra → **Statistics**.

What's there:

- **Users** tab — daily/weekly active users over time (AMO calls this "Average Daily Users", ADU).
- **Downloads** tab — daily install/download counts.
- A CSV export of the underlying daily series, which is the most
  precise way to do the cohort math by hand (pull `installs` per day
  and `ADU` 7 days later, same approach as above).

## Microsoft Edge Add-ons

**Where:** [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) → Edge Add-ons → RakshaSutra → **Analytics**.

What's there:

- **Acquisitions** — installs, uninstalls, and "active users" trend, similar shape to the Chrome dashboard.
- **Usage** — shows engagement trend (whether installed users are opening the popup), which Edge exposes a bit more directly than the other two stores.

---

## Reading all three together

Chrome will dominate total volume for almost any extension; treat
Firefox/Edge numbers as a smaller secondary sample, not separate
products. Compute the kill-metric approximation per store, then weight
by install volume rather than averaging the three percentages evenly.

## If this doc isn't enough — options for later (not implemented)

If the dashboards above turn out to be too coarse-grained or too
laggy to act on, and a privacy-safe signal becomes worth the tradeoff,
here are the options to evaluate — **do not build any of these without
a separate explicit decision**, since each is a deliberate exception to
the zero-network invariant:

1. **Static, no-param uninstall page.** Manifest V3 supports
   `chrome.runtime.setUninstallURL()` pointing at a static page (e.g.
   `rakshasutra.app/uninstalled`) with no query params, no IDs, no
   identifiers of any kind. A privacy-respecting pageview counter
   (e.g. Plausible/GoatCounter, which don't use cookies or fingerprint)
   on that single page gives an uninstall *count* without ever telling
   you *which* install uninstalled. This is the smallest possible
   exception to invariant #1, and it would need to be disclosed in the
   store listing's privacy section either way.
2. **Self-reported, opt-in feedback prompt** shown only after N days of
   continued use (detected entirely client-side, e.g. via
   `chrome.storage.local` install-date timestamp, never transmitted) —
   asks "still finding this useful?" with a link out to a survey. Zero
   automatic telemetry; only fires if the user clicks through.
3. **Do nothing additional** and accept that the store dashboards above
   are the ceiling of what's knowable without compromising the
   no-telemetry promise.

Option 1 is the only one that produces a real uninstall-rate number;
options 2/3 are lower-fidelity but cost nothing in trust.