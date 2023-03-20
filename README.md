# Sacramento PD daily activity log

A machine readable dataset scraped from the [Sacramento Police Department's Daily Activity Log](https://apps.sacpd.org/Dailies/liveview.aspx).

[![Scrape police activity log data](https://github.com/jeremiak/sacramento-pd-daily-activity-log/actions/workflows/scrape.yml/badge.svg)](https://github.com/jeremiak/sacramento-pd-daily-activity-log/actions/workflows/scrape.yml)

## Running

```
deno run --allow-read=incidents.json --allow-write=incidents.json --allow-net ./scrape.ts
```

### Options

* `--days=<INT>` - set the number of days of data to scrape, defaults to 100
* `--skip-existing=<BOOL>` - skip scraping days when we already have incidents for that date, defaults to true
