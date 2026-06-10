# Camera API Setup Guide

## Overview

The Collection Report V2 feature utilizes the browser's `getUserMedia` API to capture machine meter photos. For security reasons, modern browsers restrict access to the camera to **Secure Contexts** only.

## Why is this complex setup required?

The Camera API (`getUserMedia`) is a powerful tool that can be abused for spying if not properly secured. To prevent this, browsers enforce a "Secure Context" requirement.

A page is considered to be in a secure context **only** if:

1. It is served via `https://` (SSL/TLS).
2. It is served from `http://localhost` or `http://127.0.0.1`.

When testing on mobile devices or other computers on a local network (e.g., `http://192.168.x.x`), the site is **not** in a secure context, and the browser will disable the camera API entirely, resulting in a "Camera API not available" error.

To solve this, we use a **Reverse Proxy** (Caddy) to wrap our HTTP application in an HTTPS layer.

---

## Windows Setup

### 1. Install Caddy

The easiest way to install Caddy on Windows is via `winget`:

```powershell
winget install Caddy
```

_Note: You may need to restart your terminal after installation._

### 2. Configure the Caddyfile

Create a file named `Caddyfile` in your project root directory:

```caddy
# Replace with your actual local IP address
192.168.0.39 {
    reverse_proxy localhost:3000
}

# Optional: Public Domain setup
# yourdomain.com {
#     reverse_proxy localhost:3000
# }
```

### 3. Run the Server

Caddy must bind to ports 80 and 443, which requires **Administrator privileges**.

1. Open **PowerShell as Administrator**.
2. Navigate to the project root:
   ```powershell
   cd /path/to/evolution-one-cms
   ```
3. Start Caddy:
   ```powershell
   caddy run
   ```

---

## Linux Setup

### 1. Install Caddy

Install Caddy using the official package manager for your distribution (e.g., Ubuntu):

```bash
sudo apt install -y debian-keyring
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### 2. Configure the Caddyfile

Edit the global Caddy configuration file:

```bash
sudo nano /etc/caddy/Caddyfile
```

Add your configuration:

```caddy
192.168.0.39 {
    reverse_proxy localhost:3000
}
```

### 3. Start the Service

Manage Caddy using `systemctl`:

```bash
sudo systemctl start caddy
sudo systemctl enable caddy
```

To apply changes after editing the Caddyfile:

```bash
sudo systemctl reload caddy
```

---

## Accessing the Site

### ⚠️ Critical URL Rule

**Do not include the port `:3000` in your browser URL.**

- ✅ **Correct**: `https://192.168.0.39`
- ❌ **Incorrect**: `https://192.168.0.39:3000`

Caddy handles the HTTPS on port 443 and forwards the traffic to port 3000 internally.

### Handling SSL Warnings

Since Caddy uses self-signed certificates for local IP addresses, your browser will show a "Your connection is not private" warning.

1. Click **Advanced**.
2. Click **Proceed to 192.168.x.x (unsafe)**.

The camera API will now be enabled.
