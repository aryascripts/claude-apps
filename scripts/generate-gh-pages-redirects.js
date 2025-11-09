const fs = require('fs');

const netlifyBase = 'https://aryascripts.netlify.app';

function createRedirectHtml(targetPath) {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecting...</title>
    <script>
      let currentPath = window.location.pathname;
      if (currentPath.startsWith('/page-apps')) {
        currentPath = currentPath.replace('/page-apps', '');
      }
      if (!currentPath.startsWith('/')) {
        currentPath = '/' + currentPath;
      }
      if (currentPath !== '/' && currentPath.endsWith('/')) {
        currentPath = currentPath.slice(0, -1);
      }
      const netlifyBase = "${netlifyBase}";
      const redirectUrl = netlifyBase + currentPath;
      window.location.replace(redirectUrl);
    </script>
    <meta http-equiv="refresh" content="0; url=${netlifyBase}${targetPath}" />
    <link rel="canonical" href="${netlifyBase}${targetPath}" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        text-align: center;
        padding: 2rem;
      }
      .container {
        max-width: 500px;
      }
      a {
        color: white;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Redirecting...</h1>
      <p>You are being redirected to the Web Tools Collection.</p>
      <p><a href="${netlifyBase}${targetPath}">Click here if you are not redirected automatically</a>.</p>
    </div>
  </body>
</html>`;
  return html;
}

// Create root redirect
fs.writeFileSync('docs/index.html', createRedirectHtml('/'));

// Create redirects for each tool
const tools = ['/counter', '/bmp-convert'];

tools.forEach(toolPath => {
  const dirPath = `docs${toolPath}`;
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(`${dirPath}/index.html`, createRedirectHtml(toolPath));
});

// Create .nojekyll file
fs.writeFileSync('docs/.nojekyll', '# Prevent Jekyll processing\n');

console.log('Redirect files generated successfully!');

