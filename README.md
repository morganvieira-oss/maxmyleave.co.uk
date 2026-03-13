> [!WARNING]
> This is a read-only repository. Contributions are not accepted. The project is not actively maintained and may break without warning if upstream dependencies or the GOV.UK bank holidays API change. That said, occasional updates may be made to tidy code or address CVEs.

# maxmyleave

The best damn annual leave planner on the internet.

## What is it?

A tool that tells you the **exact days to book off work** by bridging bank holidays, long weekends, and gaps in the calendar. It should (in theory) maximise the number of consecutive days off for every day of annual leave you spend.

## Why does this exist?

A colleague mentioned she spends the start of every year watching YouTube shorts to figure out the best days to book off. Instead of waiting for someone else to do it, I built it myself.

## Features

- **Smart leave optimisation**: finds up to 5 optimal leave plans ranked by break length and efficiency (free days gained per leave day spent)
- **Three strategy types**: bridges gaps between bank holiday clusters, extends clusters at either end, or creates standalone long weekends (Friday/Monday bookings)
- **Must-have dates**: specify dates you need off regardless, and they'll be factored into the plan
- **UK region support**: covers England & Wales, Scotland, and Northern Ireland using the official GOV.UK bank holidays API
- **Remaining allowance tracking**: warns you if a plan would exceed your annual leave balance
- **Interactive calendar**: colour-coded view of your full year, showing bank holidays, booked leave, and resulting breaks at a glance

## How the algorithm works

The planner runs a greedy search over the year to find leave windows that maximise consecutive days off per leave day spent. Bank holidays are fetched from the [GOV.UK API](https://www.gov.uk/bank-holidays.json) and grouped into clusters of consecutive non-working days. Three strategies generate candidates around those clusters: **extension** (pad days before/after a cluster), **bridge** (fill the gap between two clusters), and **standalone** (plain Friday/Monday bookings as a fallback). Candidates are scored by break length, efficiency, and strategy type, then deduplicated and ranked to return the top 5 non-overlapping results.

## Tech stack

- [Next.js 15](https://nextjs.org/) (React 19, TypeScript)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [dayjs](https://day.js.org/) for date manipulation
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com/) via [@opennextjs/cloudflare](https://github.com/opennextjs/opennextjs-cloudflare)
- Bank holidays sourced from the [GOV.UK Bank Holidays API](https://www.gov.uk/bank-holidays.json)

## Deliberate trade-offs

**Q: Why Cloudflare Workers over Vercel?**<br>
A: Setup is dead simple. A single `wrangler deploy` and it's live, with no project config, billing setup, or dashboard fiddling needed.

**Q: Why dayjs over date-fns or native Intl?**<br>
A: Honestly, it came from AI-generated code. The algorithm was largely prototyped with AI assistance and dayjs is what it reached for. It works, so it stayed.

**Q: Why the GOV.UK API over a static JSON file?**<br>
A: It keeps the app up to date automatically. Bank holidays don't change often, but when they do (snap holidays, regional changes), the app picks them up without a code change.

**Q: Why Next.js over a lighter framework?**<br>
A: OpenGraph. Next.js makes it easy to add per-page metadata so the site previews properly in Google and social links. That was the only reason.

## AI use

Parts of this project were built with the help of Claude (Anthropic). All AI-generated code has been reviewed and is my responsibility.
