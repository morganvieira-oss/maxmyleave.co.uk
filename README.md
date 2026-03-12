<p align="center">
  <h1 align="center">maxmyleave</h1>
  <p align="center">The best damn annual leave planner on the internet.</p>
  <p align="center">
    <a href="https://maxmyleave.co.uk">maxmyleave.co.uk</a>
  </p>
</p>

> **Note:** This is a read-only repository — contributions are not accepted. The project is not actively maintained and may break without warning if upstream dependencies or the UK government bank holidays API introduce breaking changes. That said, occasional updates may be made to simplify code or address CVEs as they arise.

<img src="readme-public/landing-page.png" alt="maxmyleave planner screenshot" />

## What is it?

A tool that tells you the **exact days to book off work** by bridging bank holidays, long weekends, and gaps in the calendar. Which should (in theory) maxmimise the number of consecutive days off for every day of annual leave you spend.

## Features

- **Smart leave optimisation**: identifies up to 5 optimal leave plans ranked by break length and efficiency (free days gained per leave day spent)
- **Three strategy types**: bridges gaps between bank holiday clusters, extends clusters at either end, or creates standalone long weekends (Friday/Monday bookings)
- **Must-have dates**: specify dates you need off regardless, and they'll be factored into the plan
- **UK region support**: covers England & Wales, Scotland, and Northern Ireland using the official GOV.UK bank holidays API
- **Remaining allowance tracking**: warns you if a plan would exceed your annual leave balance
- **Interactive calendar**: colour-coded view of your full year, showing bank holidays, booked leave, and resulting breaks at a glance

## Why does this exist?

A colleague mentioned she spends the start of every year watching YouTube shorts to figure out the best days to book off. Instead of waiting for someone else to do it, I built it myself.

## Tech stack

- [Next.js 15](https://nextjs.org/) (React 19, TypeScript)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [dayjs](https://day.js.org/) for date manipulation
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com/) via [@opennextjs/cloudflare](https://github.com/opennextjs/opennextjs-cloudflare)
- Bank holidays sourced from the [GOV.UK Bank Holidays API](https://www.gov.uk/bank-holidays.json)

## Getting started

**Prerequisites:** Node.js, npm

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev
```

### Other commands

| Command | Description |
|---|---|
| `npm run build` | Production build |
| `npm start` | Run production build locally |
| `npm run lint` | Lint the codebase |
| `npm run preview` | Preview the Cloudflare Workers build locally |
| `npm run deploy` | Deploy to Cloudflare Workers |
