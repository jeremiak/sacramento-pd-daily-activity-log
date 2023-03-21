// deno-lint-ignore-file no-explicit-any

import _ from "npm:lodash@4.17";
// @deno-types="https://deno.land/x/dayjs@v1.11.7/types/index.d.ts"
import dayjs, { Dayjs } from "npm:dayjs@1.11.7";
import {
  DOMParser,
  Element,
  HTMLDocument,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";
import Queue from "npm:p-queue@7";

interface Incident {
  cmd: string | undefined;
  id: string | undefined;
  code: string | undefined;
  location: string;
  time: string;
  date: string;
  text: string;
}

async function scrapeDailyActivityLog(date: Dayjs): Promise<Incident[]> {
  console.log(
    `Attempting to scrape police activity logs for ${
      date.format("YYYY-MM-DD")
    }`,
  );
  const url = `https://apps.sacpd.org/Dailies/liveview.aspx?occ_date=${
    date.format("M/DD/YYYY")
  }`;
  const response = await fetch(url);
  const status: number = response.status;
  const html = await response.text();
  const doc: HTMLDocument | null = new DOMParser().parseFromString(
    html,
    "text/html",
  );

  if (status !== 200) throw new Error(`Error with ${url} - ${status}`);

  const rows: any[] = doc ? [...doc.querySelectorAll(".row .col-sm-12")] : [];
  const incidents: Incident[] = [];

  rows.forEach((row: Element) => {
    const cmdContent: Element | null = row.querySelector(".cmdContent");

    if (!cmdContent) return;
    const cmd: Element | null = row.querySelector("h4");
    const pElements: any[] = [...cmdContent.querySelectorAll("p")];

    const ps = [...pElements].filter((p: Element) => {
      // skip over empty paragraph elements
      return p.innerText.trim() !== "";
    });

    ps.forEach((p, i) => {
      if (i % 2 !== 0) return;

      const id: string | undefined = p.querySelector("strong")?.innerText;
      const code: string | undefined = p.querySelector("em")?.innerText;
      const locationAndTimeText = p.innerText.split(":")[1];
      const [location, time] = locationAndTimeText.split(" at ");
      const text = ps[i + 1].innerText;
      incidents.push({
        cmd: cmd?.innerText,
        id,
        code,
        location: location.trim(),
        date: date.format("YYYY-MM-DD"),
        time: time.replace(" hours.", ""),
        text,
      });
    });
  });

  console.log(
    `Found ${incidents.length} incidents listed on ${
      date.format("YYYY-MM-DD")
    }`,
  );

  return incidents;
}

const flags = parse(Deno.args, {
  boolean: ["skip-existing"],
  string: ["days"],
  default: { days: "100", "skip-existing": true },
});
const today = dayjs();
const daysToScrape = +flags.days;
const lastDateWithData = dayjs("2009-06-01");
const scraped: Incident[] = [];
const queue = new Queue({ concurrency: 4 });
const maxTries = 3;

function enqueue(date: Dayjs, tries = 1) {
  queue.add(async () => {
    console.log(`Enqueuing ${date.format("YYYY-MM-DD")}`);
    try {
      const s: Incident[] = await scrapeDailyActivityLog(date);
      scraped.push(...s);
    } catch (e) {
      if (tries === maxTries) {
        console.error("Max tries reached, not trying again\n", e);
      } else {
        console.error(e);
        enqueue(date, tries + 1);
      }
    }
  });
}

const existingFile = await Deno.readTextFile("./incidents.json");
const existing = JSON.parse(existingFile);

_.range(daysToScrape).forEach((d: number) => {
  if (d < 3) return; // skip the last few days, website doesn't seem to update
  const toScrapeDate = today.subtract(d, "d");
  const hasExistingData = existing.find((dd: Incident) =>
    dd.date === toScrapeDate.format("YYYY-MM-DD")
  );

  if (flags["skip-existing"] && hasExistingData) {
    console.log(
      `Skipping ${
        toScrapeDate.format("YYYY-MM-DD")
      }, already have data from that date`,
    );
    return;
  }
  if (toScrapeDate <= lastDateWithData) return;

  const date = toScrapeDate;
  enqueue(date);
});

await queue.onIdle();

console.log(`Saving to a file`);
const sorted = _.orderBy([...existing, ...scraped], ["date", "time", "id"]);
await Deno.writeTextFile("./incidents.json", JSON.stringify(sorted, null, 2));
console.log(`All done`);
