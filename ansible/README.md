# FixMyQuery Ansible Deployment

Deploys FixMyQuery to the shared production server (the same box that hosts altqr),
mirroring the altqr deployment style: releases + `current` symlink, PM2, and a
per-app Caddy config.

## Architecture

```
Internet → Caddy (:80, IP site — no domain, no TLS)
              │
              └── 178.105.43.147/FixMyQuery/*  →  Next.js standalone  :3002 (localhost)
                                                        │
                                                  PostgreSQL :5432 → fixmyquery DB
```

The playbook is **additive only**: it creates the `fixmyquery` PostgreSQL role and
database, its own Linux user (`/opt/fixmyquery`), one PM2 process, and
`/etc/caddy/apps/fixmyquery.conf`. The existing `altqr` database and app are never
modified.

## Prerequisites

- Ansible >= 2.16 installed locally
- SSH access to the server as root
- Server already provisioned (Node 22, pnpm, PM2, Caddy, PostgreSQL 16 — inherited
  from the altqr setup)

## Setup

### 1. Secrets

```bash
cd ansible
cp group_vars/vault.yml.template group_vars/vault.yml
# fill in: postgres password, JWT secret, Z.ai API key, SMTP (Brevo) credentials
```

`vault.yml` is gitignored. Plaintext is fine (qr practice); encrypt with
`ansible-vault` and add `--ask-vault-pass` if you prefer.

### 2. Deploy

```bash
cd ansible
ansible-playbook deploy.yml            # full deploy
ansible-playbook deploy.yml --tags app # code update only (pull, build, restart)
```

The app role clones `main` from GitHub, so **push before deploying**:

```bash
git push origin main
```

## Verification emails

Production sends through the Brevo relay (`noreply@altqr.cc` sender). Locally the
app uses Mailpit instead — see the repo README.

## Useful commands

```bash
ssh root@178.105.43.147 'pm2 list'                     # process status
ssh root@178.105.43.147 'pm2 logs fixmyquery-web'      # logs
ssh root@178.105.43.147 'journalctl -u pm2-fixmyquery' # PM2 systemd unit
```

## Rollback

Releases live in `/opt/fixmyquery/releases` (last 3 kept). To roll back:

```bash
ssh root@178.105.43.147
ln -sfn /opt/fixmyquery/releases/<older-timestamp> /opt/fixmyquery/current
sudo -u fixmyquery pm2 restart fixmyquery-web
```
