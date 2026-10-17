async function main() {
  const res = await fetch("http://localhost:3000/api/buyer/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "Convert XML customer reviews to JSON and classify sentiment",
      budget: 200000,
      maxConcurrency: 3,
    }),
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("=== Mission Summary ===");
  console.log(data.summary);
  console.log("\n=== Deliverables Output Keys ===");
  console.log(Object.keys(data.output || {}));
  console.log("\n=== Steps Count ===");
  console.log(data.steps?.length);
  console.log("\n=== Steps Breakdown ===");
  data.steps?.forEach((s) => {
    console.log(`Step ${s.stepIndex}: [${s.category}] ${s.serviceName} - ${s.description}`);
  });
  console.log("\n=== XML Input Snippet ===");
  console.log(typeof data.output?.xmlSource === "string" ? data.output.xmlSource.slice(0, 150) + "..." : "No XML");
  console.log("\n=== Converted JSON Root ===");
  console.log(JSON.stringify(data.output?.xmlToJson, null, 2).slice(0, 300) + "...");
  console.log("\n=== Sentiment Result ===");
  console.log(JSON.stringify(data.output?.sentiment, null, 2));
}

main().catch(console.error);
