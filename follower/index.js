const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const url =
  "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html";

function formatRFC822Date(date) {
  return date.toUTCString();
}

function parseDate(dateStr) {
  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function generateGuid(title, link) {
  return Buffer.from(`${title}-${link}`).toString("base64");
}

async function generateRSSFeed() {
  try {
    console.log("Notices...");

    // Fetch the HTML content
    const response = await axios.get(url);
    const html = response.data;

    // Load HTML into cheerio
    const $ = cheerio.load(html);

    const noticeItems = $("main li");

    const currentDate = new Date();

    let rssContent = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Custom follower</title>
  <link>${url}</link>
  <description></description>
  <language>en-ca</language>
  <lastBuildDate>${formatRFC822Date(currentDate)}</lastBuildDate>
  <atom:link href="https://example.com/follower.xml" rel="self" type="application/rss+xml" />
`;

    const itemCount = Math.min(noticeItems.length, 10);

    console.log(`Found ${itemCount} notices to process`);

    for (let i = 0; i < itemCount; i++) {
      const item = noticeItems.eq(i);

      const linkElement = item.find("a");
      const title = linkElement.text().trim();
      const relativeLink = linkElement.attr("href");

      const dateElement = item.find("span");
      const dateText = dateElement.text().trim();
      const pubDate = parseDate(dateText);

      const link = new URL(relativeLink, "https://www.canada.ca").href;

      rssContent += `  <item>
    <title><![CDATA[${title}]]></title>
    <link>${link}</link>
    <guid isPermaLink="false">${generateGuid(title, link)}</guid>
    <pubDate>${formatRFC822Date(pubDate)}</pubDate>
    <description><![CDATA[${title} - Published on ${dateText}]]></description>
  </item>
`;
    }

    rssContent += `</channel>
</rss>`;

    const outputFile = path.join(__dirname, `follower.xml`);
    fs.writeFileSync(outputFile, rssContent);

    console.log(`RSS feed generated successfully: ${outputFile}`);
  } catch (error) {
    console.error("Error generating RSS feed:", error.message);
  }
}

generateRSSFeed().catch(console.error);
