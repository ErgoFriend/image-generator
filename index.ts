import fastify from "fastify";
import puppeteer from 'puppeteer'
import ejs from 'ejs'

async function generateImage() {
  // Create a new page
  const browser = await puppeteer.launch({
    args: [
      '--hide-scrollbars',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-sandbox',
      '--no-zygote',
      '--single-process'
    ]
  })
  const page = await browser.newPage();
  await page.setViewport({
    width: 1200,
    height: 630
  })

  // Render some HTML from the relevant template
  const html = ejs.render(
    '<p>title:<%= title %></p><img src="<%= url %>" width="100" height="100" />',
    {
      title: 'タイトルです',
      url: "https://pbs.twimg.com/profile_images/1354479643882004483/Btnfm47p_400x400.jpg"
    })
  
  // Set the content to our rendered HTML
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  // Wait until all images and fonts have loaded
  await page.evaluate(async () => {
    const selectors = Array.from(document.querySelectorAll("img"));
    await Promise.all([
      document.fonts.ready,
      ...selectors.map((img) => {
        // Image has already finished loading, let’s see if it worked
        if (img.complete) {
          // Image loaded and has presence
          if (img.naturalHeight !== 0) return;
          // Image failed, so it has no height
          throw new Error("Image failed to load");
        }
        // Image hasn’t loaded yet, added an event listener to know when it does
        return new Promise((resolve, reject) => {
          img.addEventListener("load", resolve);
          img.addEventListener("error", reject);
        });
      }),
    ]);
  });

  const screenshotBuffer = await page.screenshot({
    fullPage: false,
    type: "png",
  });

  await page.screenshot({
    path: 'page.png',
    type: "png",
  });

  await page.close();
  
  return screenshotBuffer;
 }
 

const server = fastify({
  logger: true
})

server.get('/', async (request, reply) => {
  const image = await generateImage()
  // reply.type('application/json').code(200)
  reply.type('image/png').code(200)
  reply.send(image)
})

server.listen(4000, (err, address) => {
  if (err) throw err
  server.log.info(`server listening on ${address}`)
})