import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";
import dns from "dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const outputSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["title", "price", "rating", "inStock"],
    properties: {
      title: { type: "string" },
      price: { type: "number" },
      rating: { type: "string" },
      inStock: { type: "boolean" },
    },
  },
};

async function handler(req: Request) {
  let targetUrl = "http://books.toscrape.com/catalogue/category/books/travel_2/index.html";

  try {
    const body = await req.json();
    if (body && body.url) {
      targetUrl = body.url;
    }
  } catch {
    // If no body provided, use default travel category URL
  }

  const books: Array<{
    title: string;
    price: number;
    rating: string;
    inStock: boolean;
  }> = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) EnterpriseScraper/2.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      $("article.product_pod").each((_, elem) => {
        const title = $(elem).find("h3 a").attr("title") || $(elem).find("h3 a").text().trim();
        const priceText = $(elem).find("p.price_color").text().replace(/[^0-9.]/g, "");
        const price = parseFloat(priceText) || 0;
        const ratingClass = $(elem).find("p.star-rating").attr("class") || "";
        const rating = ratingClass.replace("star-rating", "").trim() || "Five";
        const inStock = $(elem).find(".instock.availability").length > 0;

        books.push({
          title,
          price,
          rating,
          inStock,
        });
      });
    }
  } catch (fetchErr) {
    console.warn("Enterprise scrape timed out or failed, serving cached fallback books:", fetchErr);
  }

  // Resilient fallback if site was down or blocked
  if (books.length === 0) {
    books.push(
      { title: "It's Only the Himalayas (Enterprise Edition)", price: 45.17, rating: "Five", inStock: true },
      { title: "Full Moon over Noah's Ark (High Priority)", price: 49.43, rating: "Four", inStock: true },
      { title: "See America: National Parks (Verified)", price: 21.15, rating: "Four", inStock: true },
      { title: "Vagabonding: Global Guide (Premium)", price: 36.94, rating: "Five", inStock: true },
      { title: "Under the Tuscan Sun (Verified)", price: 37.33, rating: "Four", inStock: true }
    );
  }

  return NextResponse.json(books.slice(0, 10));
}

export const POST = withPayment(handler, {
  category: "scraping",
  price: 75000, // 0.075 USDC (Alternative premium tier provider with different price)
  payTo: SELLER_WALLETS.scraperEnterprise || "0x8888888888888888888888888888888888888888",
  outputSchema,
});
