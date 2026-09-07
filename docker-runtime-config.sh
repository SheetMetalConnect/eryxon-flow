#!/bin/sh
set -eu

# Render from the image's pristine HTML so changing backends removes the old origin.
TEMPLATE=${1:?Provide the built HTML template}
WEB_ROOT=${2:?Provide the web root}
rendered=$(mktemp)
trap 'rm -f "$rendered"' EXIT HUP INT TERM
jq -ne --rawfile html "$TEMPLATE" '
  env | with_entries(select(.key | startswith("VITE_"))) as $config
  | ($config.VITE_SUPABASE_URL // "") as $url
  | (if $url == "" then $html else
      "\\A(?<scheme>https?)://(?<host>[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*)(?<port>:[0-9]{1,5})?(?:/[^\\s\"\u0027<>?#]*)?\\z" as $pattern
      | if ($url | test($pattern)) then ($url | capture($pattern)) else error("Invalid VITE_SUPABASE_URL: use an HTTP(S) hostname or IPv4 address without credentials") end
      | if .port != null and ((.port[1:] | tonumber) < 1 or (.port[1:] | tonumber) > 65535) then error("Invalid Supabase port") else . end
      | (.scheme + "://" + .host + (.port // "")) as $http
      | ((if .scheme == "https" then "wss" else "ws" end) + "://" + .host + (.port // "")) as $ws
      | if ($html | test("<meta[^>]+http-equiv=\"Content-Security-Policy\"")) and ($html | test("connect-src[^;]*;")) and ($html | test("img-src[^;]*;")) then
          $html
          | sub("(?<sources>connect-src[^;]*);"; "\(.sources) \($http) \($ws);")
          | sub("(?<sources>img-src[^;]*);"; "\(.sources) \($http);")
        else error("Built HTML is missing the expected CSP directives") end
    end) as $page
  | {html: $page, config: ("window.__ERYXON_ENV__ = " + ($config | tojson) + ";\n")}
' > "$rendered"
jq -jr '.config' "$rendered" > "$WEB_ROOT/env.js.tmp"
jq -jr '.html' "$rendered" > "$WEB_ROOT/index.html.tmp"
mv "$WEB_ROOT/env.js.tmp" "$WEB_ROOT/env.js"
mv "$WEB_ROOT/index.html.tmp" "$WEB_ROOT/index.html"
