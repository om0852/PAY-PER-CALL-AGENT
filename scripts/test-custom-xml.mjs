async function testCustom() {
  const customXml = `<reviews>
  <review id="custom-1"><author>Satoshi</author><rating>5</rating><feedback>Decentralized AI agent micro-transactions with zero friction!</feedback></review>
</reviews>`;

  const res = await fetch("http://localhost:3000/api/buyer/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "Convert XML customer reviews to JSON and classify sentiment",
      xml: customXml,
      budget: 200000,
    }),
  });

  const data = await res.json();
  console.log("Steps executed:", data.steps?.length);
  console.log("Steps details:", JSON.stringify(data.steps?.map(s => ({ step: s.stepIndex, cat: s.category, input: s.input, result: s.result })), null, 2));
  console.log("Full output:", JSON.stringify(data.output, null, 2));
}

testCustom().catch(console.error);
