// Prune old Vercel deployments, keeping only the most recent N

// How to run in Powershell: run the following commands
// Step 1: $env:VERCEL_TOKEN="your-actual-token-here"
// Step 2: node scripts/prune-vercel-deployments.cjs

const VERCEL_TOKEN = process.env.VERCEL_TOKEN; // Your Vercel Personal Token
const KEEP = 5;                                // Number of prod deployments to keep

async function main() {

  // Step 1: List deployments
  const deploymentsRes = await fetch(
    "https://api.vercel.com/v6/deployments?app=portfolio-app&limit=100",
    {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    }
  );

  if (!deploymentsRes.ok) {
    throw new Error(
      `Failed to fetch deployments: ${deploymentsRes.status} ${deploymentsRes.statusText}`
    );
  }

  const { deployments } = await deploymentsRes.json();

  // Step 2: Filter production deployments
  const prodDeployments = deployments.filter((d) => d.target === "production");

  // Step 3: Sort by createdAt (newest first)
  prodDeployments.sort((a, b) => b.createdAt - a.createdAt);

  // Step 4: Identify which to delete
  const toDelete = prodDeployments.slice(KEEP);

  for (const dep of toDelete) {
    console.log(`Deleting: ${dep.url} (id: ${dep.uid})`);
    const delRes = await fetch(
      `https://api.vercel.com/v13/deployments/${dep.uid}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );

    if (!delRes.ok) {
      console.error(
        `❌ Failed to delete ${dep.url}: ${delRes.status} ${delRes.statusText}`
      );
    }
  }

  console.log(`✅ Pruned ${toDelete.length} old deployments, kept ${KEEP}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
