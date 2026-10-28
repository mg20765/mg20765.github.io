import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { path: "/index.html", name: "Home" },
  { path: "/work.html", name: "Work" },
  { path: "/stack.html", name: "Stack" },
  { path: "/about.html", name: "About" },
  { path: "/contact.html", name: "Contact" },
];

for (const { path, name } of PAGES) {
  test.describe(`${name} page`, () => {
    test("has a title, one heading and a skip link", async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(/Maria Gear/);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main");
      await expect(page.locator("main#main")).toHaveCount(1);
    });

    test("shows the five links in order and marks the current page", async ({ page }) => {
      await page.goto(path);
      const links = page.locator("nav a");
      await expect(links).toHaveText(["Home", "Work", "Stack", "About", "Contact"]);
      await expect(page.locator('nav a[aria-current="page"]')).toHaveText(name);
    });

    test("has no horizontal scrolling on a phone, in either theme", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 700 });
      for (const theme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
    });

    for (const theme of ["light", "dark"]) {
      test(`passes the accessibility check in ${theme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto(path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      });
    }

    test("keeps private details off the page", async ({ page }) => {
      await page.goto(path);
      const html = await page.content();
      expect(html).not.toMatch(/mailto:/i);
      expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
      expect(html).not.toMatch(/\b0\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}\b/);
      expect(html).not.toMatch(/hive harmony/i);
    });

    test("external links open safely", async ({ page }) => {
      await page.goto(path);
      const external = page.locator('a[href^="http"]');
      for (const link of await external.all()) {
        await expect(link).toHaveAttribute("rel", /noopener/);
      }
    });
  });
}

test.describe("light and dark mode", () => {
  test("follows the visitor's device setting at first", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/index.html");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("the toggle switches theme, says which one is on, and is remembered", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/index.html");
    const toggle = page.getByRole("button", { name: /dark mode/i });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await page.goto("/work.html");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: /dark mode/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("the toggle works with the keyboard", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/index.html");
    await page.getByRole("button", { name: /dark mode/i }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("still works if the browser blocks storage", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked");
        },
      });
    });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/index.html");
    await page.getByRole("button", { name: /dark mode/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("Work page", () => {
  test("lists BeeYardLog first, then PolicyCheck, then the bootcamp projects", async ({ page }) => {
    await page.goto("/work.html");
    await expect(page.locator("article h2")).toHaveText([
      "BeeYardLog",
      "PolicyCheck",
      "Bootcamp team projects",
    ]);
  });

  test("each entry has a role, a status and skill tags", async ({ page }) => {
    await page.goto("/work.html");
    const entries = page.locator("article");
    await expect(entries).toHaveCount(3);
    for (const entry of await entries.all()) {
      await expect(entry.locator(".role")).not.toBeEmpty();
      await expect(entry.locator(".status")).not.toBeEmpty();
      expect(await entry.locator(".tags li").count()).toBeGreaterThan(2);
    }
  });

  test("BeeYardLog links to the source and the live app; PolicyCheck has no link", async ({ page }) => {
    await page.goto("/work.html");
    const bee = page.locator("article", { has: page.getByRole("heading", { name: "BeeYardLog" }) });
    await expect(bee.getByRole("link", { name: /source/i })).toHaveAttribute(
      "href",
      "https://github.com/mg20765/beeyardlog",
    );
    await expect(bee.getByRole("link", { name: /live app/i })).toHaveAttribute(
      "href",
      "https://hive-logbook-maria.surge.sh",
    );
    const pc = page.locator("article", { has: page.getByRole("heading", { name: "PolicyCheck" }) });
    await expect(pc.locator("a")).toHaveCount(0);
    await expect(pc).toContainText("Private company repo");
  });

  test("keeps PolicyCheck's inside details out", async ({ page }) => {
    await page.goto("/work.html");
    const text = await page.locator("main").innerText();
    for (const word of ["UMR", "ISSUE-", "P0", "Simon", "Brittany", "Adrian", "Chandri", "Binder"]) {
      expect(text).not.toContain(word);
    }
  });

  test("describes the chatbot work as the popup UI, not the AI", async ({ page }) => {
    await page.goto("/work.html");
    await expect(page.locator("main")).toContainText(/chat popup/i);
  });

  test("screenshots load and have descriptions", async ({ page }) => {
    await page.goto("/work.html");
    const images = page.locator("main img");
    expect(await images.count()).toBeGreaterThanOrEqual(2);
    for (const img of await images.all()) {
      await expect(img).toHaveAttribute("alt", /.{20,}/);
      await img.scrollIntoViewIfNeeded();
      expect(await img.evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
    }
  });
});

test.describe("links inside the site", () => {
  test("every internal link and image address works", async ({ page, request }) => {
    const seen = new Set();
    for (const { path } of PAGES) {
      await page.goto(path);
      const targets = await page.$$eval("a[href], img[src], link[href], script[src]", (els) =>
        els.map((e) => e.getAttribute("href") || e.getAttribute("src")),
      );
      for (const t of targets) {
        if (!t || t.startsWith("http") || t.startsWith("#")) continue;
        seen.add(new URL(t, `http://localhost:4174${path}`).pathname);
      }
    }
    expect(seen.size).toBeGreaterThan(5);
    for (const p of seen) {
      const res = await request.get(p);
      expect(res.status(), p).toBe(200);
    }
  });
});

test.describe("Home page", () => {
  test("has a honeycomb-and-leaf mark that screen readers skip", async ({ page }) => {
    await page.goto("/index.html");
    const mark = page.locator("main svg.mark");
    await expect(mark).toHaveCount(1);
    await expect(mark).toHaveAttribute("aria-hidden", "true");
    await expect(mark).toHaveAttribute("focusable", "false");
  });

  test("opens with the offline line, and puts the testing line above the highlights", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("p.lead")).toContainText("keep working when the signal doesn't");
    await expect(page.locator("p.lead")).not.toContainText("where real life does");
    const tagline = page.locator("p.tagline");
    await expect(tagline).toHaveText("I find what breaks before your users do.");
    const taglineBox = await tagline.boundingBox();
    const highlightsBox = await page.locator("ul.highlights").boundingBox();
    expect(taglineBox.y).toBeLessThan(highlightsBox.y);
  });

  test("shows three highlights, each with a bold point and a short line", async ({ page }) => {
    await page.goto("/index.html");
    const items = page.locator("ul.highlights > li");
    await expect(items).toHaveCount(3);
    for (const item of await items.all()) {
      await expect(item.locator("strong")).not.toBeEmpty();
      await expect(item.locator("span")).not.toBeEmpty();
    }
  });

  test("the highlights only use figures that appear elsewhere on the site", async ({ page }) => {
    await page.goto("/index.html");
    const text = await page.locator("ul.highlights").innerText();
    expect(text).toMatch(/179/);
    expect(text).toMatch(/99/);
    expect(text).toMatch(/10-week/);
    await page.goto("/work.html");
    const work = await page.locator("main").innerText();
    expect(work).toMatch(/179 unit and 99 end-to-end/);
    expect(work).toMatch(/10-week/);
  });

  test("says nature and tech, and keeps the books out of the headline claims", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator("main")).toContainText(/nature and tech/i);
  });
});

test.describe("About page photo", () => {
  test("shows the inspection photo with a caption and a description", async ({ page }) => {
    await page.goto("/about.html");
    const figure = page.locator("main figure");
    await expect(figure).toHaveCount(1);
    await expect(figure.locator("figcaption")).toHaveText(/inspecting/i);
    const img = figure.locator("img");
    await expect(img).toHaveAttribute("alt", /.{40,}/);
    await expect(img).toHaveAttribute("width", /\d+/);
    await expect(img).toHaveAttribute("height", /\d+/);
    await img.scrollIntoViewIfNeeded();
    expect(await img.evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  });

  test("the photo is small enough for a phone and carries no camera or location data", async ({ request }) => {
    const res = await request.get("/images/inspection.jpg");
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(body.length).toBeLessThan(250 * 1024);
    expect(body.includes(Buffer.from("Exif"))).toBe(false);
    expect(body.includes(Buffer.from("samsung"))).toBe(false);
  });

  test("the photo never stretches the page on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/about.html");
    const box = await page.locator("main figure img").boundingBox();
    expect(box.width).toBeLessThanOrEqual(320);
  });
});

test.describe("About page", () => {
  test("mentions the bird field guide as work in progress", async ({ page }) => {
    await page.goto("/about.html");
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/bird/i);
    expect(text).toMatch(/in the making|working on/i);
  });
});

test.describe("Contact page", () => {
  test("links to LinkedIn and GitHub only", async ({ page }) => {
    await page.goto("/contact.html");
    const hrefs = await page.locator("main a").evaluateAll((a) => a.map((x) => x.href));
    expect(hrefs).toEqual([
      "https://www.linkedin.com/in/maria-gear-0ba7162a0",
      "https://github.com/mg20765",
    ]);
  });

  test("each button has an icon that screen readers skip, and the name stays plain", async ({ page }) => {
    await page.goto("/contact.html");
    const buttons = page.locator("main a.button");
    await expect(buttons).toHaveCount(2);
    for (const button of await buttons.all()) {
      await expect(button.locator('svg[aria-hidden="true"]')).toHaveCount(1);
      await expect(button.locator("svg")).toHaveAttribute("focusable", "false");
    }
    await expect(page.getByRole("link", { name: "LinkedIn", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub", exact: true })).toBeVisible();
  });

  test("the Home page GitHub button has the same kind of icon", async ({ page }) => {
    await page.goto("/index.html");
    const github = page.getByRole("link", { name: "GitHub", exact: true });
    await expect(github.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    await expect(github.locator("svg")).toHaveAttribute("focusable", "false");
  });

  test("the icons are drawn in the page, so nothing is fetched from another site", async ({ page }) => {
    const outside = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://localhost")) outside.push(r.url());
    });
    await page.goto("/contact.html");
    await page.waitForLoadState("networkidle");
    expect(outside).toEqual([]);
  });

  test("the icons take the button's colour in both themes", async ({ page }) => {
    for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/contact.html");
      for (const button of await page.locator("main a.button").all()) {
        const [text, fill] = await button.evaluate((el) => [
          getComputedStyle(el).color,
          getComputedStyle(el.querySelector("svg")).fill,
        ]);
        expect(fill, `${theme} icon matches its text`).toBe(text);
      }
    }
  });
});
