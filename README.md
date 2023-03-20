# Sacramento PD daily activity log

A machine readable dataset scraped from the [Sacramento Police Department's Daily Activity Log](https://apps.sacpd.org/Dailies/liveview.aspx).

```
deno run --allow-read=incidents.json --allow-write=incidents.json --allow-net ./scrape.ts
```