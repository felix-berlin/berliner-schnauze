# Berliner Schnauze

![GitHub package.json version](https://img.shields.io/github/package-json/v/felix-berlin/berliner-schnauze?label=github&style=flat-square)
![Website](https://img.shields.io/website?style=flat-square&url=https%3A%2F%2Fberliner-schnauze.wtf)
[![codecov](https://codecov.io/gh/felix-berlin/berliner-schnauze/graph/badge.svg?token=1JIYWWF13A)](https://codecov.io/gh/felix-berlin/berliner-schnauze)

> Berlin dialect translator

---

## About

Berliner Schnauze is a translator for the Berlin dialect. It helps users understand and translate words and phrases unique to Berlin's culture and language.

---

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/felix-berlin/berliner-schnauze.git
   cd berliner-schnauze
   ```

2. Install dependencies:

   ```bash
   pnpm install

   ```

3. Set up secrets and a database: `pnpm dev` runs through Infisical (`npx infisical login` once) and needs a Postgres
   database. The walkthrough is in [docs/worktree-setup.md](docs/worktree-setup.md); `.env.example` lists the
   variables Docker Compose reads from the root `.env`.
4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open the URL `pnpm dev` prints (port `WEBSITE_PORT` from `.env.worktree`, else 4321).
