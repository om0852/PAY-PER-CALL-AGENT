import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { withPayment } from "@/lib/x402/middleware";
import { SELLER_WALLETS } from "@/lib/x402/seed";

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

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to fetch target website: ${response.statusText}` },
      { status: 502 }
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const books: Array<{
    title: string;
    price: number;
    rating: string;
    inStock: boolean;
  }> = [];

  $("article.product_pod").each((_, elem) => {
    const title = $(elem).find("h3 a").attr("title") || $(elem).find("h3 a").text().trim();
    const priceText = $(elem).find("p.price_color").text().replace(/[^0-9.]/g, "");
    const price = parseFloat(priceText) || 0;
    const ratingClass = $(elem).find("p.star-rating").attr("class") || "";
    const rating = ratingClass.replace("star-rating", "").trim() || "Three";
    const inStock = $(elem).find(".instock.availability").length > 0;

    books.push({
      title,
      price,
      rating,
      inStock,
    });
  });

  return NextResponse.json(books.slice(0, 10));
}

export const POST = withPayment(handler, {
  category: "scraping",
  price: 50000, // 0.05 USDC
  payTo: SELLER_WALLETS.scraper,
  outputSchema,
});
