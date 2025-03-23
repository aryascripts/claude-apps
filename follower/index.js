// Canada Immigration Notices RSS Generator
// This script fetches the latest immigration notices and generates an RSS feed XML file

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// URL of the immigration notices page
const url =
  "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html";

// Function to format the current date in RFC 822 format (required for RSS)
function formatRFC822Date(date) {
  return date.toUTCString();
}

// Function to generate a unique GUID for each item
function generateGuid(title, link) {
  return Buffer.from(`${title}-${link}`).toString("base64");
}

// Main function to fetch the page and generate RSS
async function generateRSSFeed() {
  try {
    console.log("Fetching immigration notices...");

    // Fetch the HTML content
    const response = await axios.get(url);
    const html = response.data;

    // Load HTML into cheerio
    const $ = cheerio.load(html);

    // Find the notice items - targeting li elements inside the main tag
    const noticeItems = $("main li");

    // Get current date for the feed
    const currentDate = new Date();

    // Prepare RSS XML structure
    let rssContent = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Canada Immigration and Citizenship Notices</title>
  <link>${url}</link>
  <description>Latest notices from Immigration, Refugees and Citizenship Canada</description>
  <language>en-ca</language>
  <lastBuildDate>${formatRFC822Date(currentDate)}</lastBuildDate>
  <atom:link href="https://example.com/canada-immigration-feed.xml" rel="self" type="application/rss+xml" />
`;

    // Process up to 10 articles
    const itemCount = Math.min(noticeItems.length, 10);

    console.log(`Found ${itemCount} notices to process`);

    for (let i = 0; i < itemCount; i++) {
      const item = noticeItems.eq(i);

      // Extract title and link from the <a> tag within the <li>
      const linkElement = item.find("a");
      const title = linkElement.text().trim();
      const relativeLink = linkElement.attr("href");

      // Resolve relative URLs to absolute URLs
      const link = new URL(relativeLink, "https://www.canada.ca").href;

      // Generate RSS item
      rssContent += `  <item>
    <title><![CDATA[${title}]]></title>
    <link>${link}</link>
    <guid isPermaLink="false">${generateGuid(title, link)}</guid>
    <pubDate>${formatRFC822Date(currentDate)}</pubDate>
    <description><![CDATA[${title} - Click to read the full notice.]]></description>
  </item>
`;
    }

    // Close RSS structure
    rssContent += `</channel>
</rss>`;

    // Generate filename with current date
    const formattedDate = currentDate.toISOString().split("T")[0];
    const outputFile = path.join(__dirname, `canada-immigration-feed.xml`);
    fs.writeFileSync(outputFile, rssContent);

    console.log(`RSS feed generated successfully: ${outputFile}`);
  } catch (error) {
    console.error("Error generating RSS feed:", error.message);
  }
}

// Execute once immediately
generateRSSFeed().catch(console.error);
