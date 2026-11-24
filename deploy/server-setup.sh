#!/usr/bin/env bash
# One-time setup of the DecoThanks site on an Ubuntu server running nginx.
# Run it ON THE SERVER as root, from a checkout of this repo or after copying the deploy/ folder:
#
#   sudo bash deploy/server-setup.sh thanks.example.com "ssh-ed25519 AAAA... github-actions-deploy"
#
# What it does (safe to re-run):
#   1. creates a "deploy" user that can only write to /var/www/<domain>
#   2. lets the GitHub Actions key log in as that user (not as root)
#   3. installs an nginx site for <domain>, tests the config, and reloads nginx
#   4. gets a Let's Encrypt certificate with certbot, if certbot is installed
#
# It does not touch any other nginx site.
set -euo pipefail

DOMAIN="${1:?usage: server-setup.sh <domain> \"<deploy public key>\"}"
PUBKEY="${2:?usage: server-setup.sh <domain> \"<deploy public key>\"}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WEBROOT="/var/www/$DOMAIN"

echo "==> deploy user"
id deploy >/dev/null 2>&1 || adduser --system --group --shell /bin/bash --home /home/deploy deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qxF "$PUBKEY" /home/deploy/.ssh/authorized_keys || echo "$PUBKEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys

echo "==> web root $WEBROOT"
install -d -o deploy -g www-data -m 755 "$WEBROOT" "$WEBROOT/releases"
if [ ! -e "$WEBROOT/current" ]; then
  install -d -o deploy -g www-data -m 755 "$WEBROOT/releases/placeholder"
  echo '<!doctype html><title>DecoThanks</title><p>DecoThanks is setting the table. Check back soon.</p>' > "$WEBROOT/releases/placeholder/index.html"
  chown -R deploy:www-data "$WEBROOT/releases/placeholder"
  ln -sfn "$WEBROOT/releases/placeholder" "$WEBROOT/current"
  chown -h deploy:www-data "$WEBROOT/current"
fi

echo "==> nginx site"
sed "s/__DOMAIN__/$DOMAIN/g" "$HERE/nginx/site.conf.template" > "/etc/nginx/sites-available/$DOMAIN"
ln -sfn "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t
systemctl reload nginx

echo "==> certificate"
if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --register-unsafely-without-email || \
    echo "    certbot failed. Check that the DNS record for $DOMAIN exists, then run: certbot --nginx -d $DOMAIN"
else
  echo "    certbot is not installed. Either install it (apt install certbot python3-certbot-nginx) and re-run,"
  echo "    or use a Cloudflare Origin Certificate (see docs/DEPLOY.md)."
fi

echo
echo "Done. Add this line to the GitHub secret DEPLOY_KNOWN_HOSTS:"
for f in /etc/ssh/ssh_host_ed25519_key.pub; do
  [ -f "$f" ] && echo "    [$(curl -s -4 ifconfig.me || hostname -I | awk '{print $1}')]:PORT $(cut -d' ' -f1,2 "$f")   (replace PORT with your SSH port; drop [ ]:PORT if it is 22)"
done
