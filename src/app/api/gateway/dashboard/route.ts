import { NextResponse } from "next/server"
import { format, subDays, startOfMonth, subMonths } from "date-fns"


export async function GET(request: Request) {
try {
console.log("START: /api/gateway/dashboard");
const { searchParams } = new URL(request.url);
const { headers } = request;
const startDateParam = searchParams.get("start_date");
const endDateParam = searchParams.get("end_date");


const endDate = endDateParam ? new Date(endDateParam) : new Date();
const startDate = startDateParam ? new Date(startDateParam) : subDays(endDate, 90);
const monthlyPnlStartDate = startOfMonth(subMonths(endDate, 11));

const formattedStartDate = format(startDate, "yyyy-MM-dd");
const formattedEndDate = format(endDate, "yyyy-MM-dd");
const formattedMonthlyPnlStartDate = format(monthlyPnlStartDate, "yyyy-MM-dd");

console.log("Fetching downstream data...");
const [
  equityResponse,
  twrResponse,
  monthlyPnlResponse,
  benchmarkResponse,
  assetSummaryResponse,
] = await Promise.all([
  fetch(`${request.url.split('/api')[0]}/api/query/equity-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`, { headers, next: { tags: ['performance-data'] } }),
  fetch(`${request.url.split('/api')[0]}/api/query/twr?start_date=${formattedStartDate}&end_date=${formattedEndDate}`, { headers, next: { tags: ['performance-data'] } }),
  fetch(`${request.url.split('/api')[0]}/api/query/monthly-pnl?start_date=${formattedMonthlyPnlStartDate}&end_date=${formattedEndDate}`, { headers, next: { tags: ['performance-data'] } }),
  fetch(`${request.url.split('/api')[0]}/api/query/benchmark-chart?start_date=${formattedStartDate}&end_date=${formattedEndDate}&threshold=200`, { headers, next: { tags: ['performance-data'] } }),
  fetch(`${request.url.split('/api')[0]}/api/query/asset-summary`, { headers, next: { tags: ['asset-data'] } }),
]);
console.log("Downstream data fetched. Validating responses...");

for (const response of [equityResponse, twrResponse, monthlyPnlResponse, benchmarkResponse, assetSummaryResponse]) {
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error fetching dashboard data: ${response.url} - ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch from ${response.url}. Status: ${response.status}. Body: ${errorText}`);
  }
}

console.log("All responses are OK. Parsing JSON bodies...");
const [
  equityData,
  twrData,
  monthlyPnlData,
  benchmarkData,
  assetSummaryData,
] = await Promise.all([
  equityResponse.json(),
  twrResponse.json(),
  monthlyPnlResponse.json(),
  benchmarkResponse.json(),
  assetSummaryResponse.json(),
]);
console.log("JSON bodies parsed successfully.");

console.log("END: /api/gateway/dashboard - Success");
return NextResponse.json({
  equityData,
  twrData,
  monthlyPnlData,
  benchmarkData,
  assetSummaryData,
});


} catch (error) {
console.error("Error in /api/gateway/dashboard:", error);
return NextResponse.json(
{ error: "Failed to fetch dashboard data" },
{ status: 500 }
);
}
}