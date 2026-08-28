import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const APP_URL = "http://127.0.0.1:8080/";
const DEBUG_PORT = 9333;
const EDGE_PATHS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const edgePath = EDGE_PATHS.find(existsSync);

if (!edgePath) throw new Error("Microsoft Edge não encontrado.");

const profileDirectory = await mkdtemp(path.join(os.tmpdir(), "pe-pedal-edge-"));
const screenshotPath = path.join(os.tmpdir(), "pe-pedal-certificate-flow-check.png");
const edge = spawn(
  edgePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDirectory}`,
    APP_URL,
  ],
  { stdio: "ignore" },
);
process.on("exit", () => edge.kill());

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getPageTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then(
        (response) => response.json(),
      );
      const pages = targets.filter(
        (item) => item.type === "page" && item.webSocketDebuggerUrl,
      );
      const target =
        pages.find((item) => item.url.startsWith(APP_URL)) || pages[0];
      if (target) return target;
    } catch {
      // Edge ainda está iniciando.
    }
    await delay(100);
  }
  throw new Error("Tempo esgotado ao conectar ao Edge.");
}

const target = await getPageTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextCommandId = 0;
const pendingCommands = new Map();
const browserErrors = [];

socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
    return;
  }

  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.text);
  }
  if (
    message.method === "Log.entryAdded" &&
    ["error", "warning"].includes(message.params.entry.level)
  ) {
    browserErrors.push(message.params.entry.text);
  }
});

function command(method, params = {}) {
  const id = ++nextCommandId;
  return new Promise((resolve, reject) => {
    pendingCommands.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (!pendingCommands.has(id)) return;
      pendingCommands.delete(id);
      reject(new Error(`Tempo esgotado no comando ${method}.`));
    }, 15000);
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(expression, message, timeout = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(message);
}

await command("Page.enable");
await command("Runtime.enable");
await command("Log.enable");
await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await command("Page.navigate", { url: APP_URL });
await waitFor(
  'document.readyState === "complete" && Boolean(document.querySelector("#certificate-button"))',
  "A página não terminou de carregar.",
);

await evaluate(`(() => {
  window.__certificateTest = { texts: [], downloads: [], printCalls: 0 };
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
    if (this.canvas.width === 3508 && this.canvas.height === 2480) {
      window.__certificateTest.texts.push({
        text: String(text),
        width: this.measureText(String(text)).width,
        font: this.font,
      });
    }
    return originalFillText.call(this, text, x, y, maxWidth);
  };

  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    if (this.download) {
      window.__certificateTest.downloads.push({
        fileName: this.download,
        usesBlob: this.href.startsWith("blob:"),
      });
      return;
    }
    return originalAnchorClick.call(this);
  };

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLIFrameElement && node.title === "Impressão do certificado") {
          node.contentWindow.print = () => { window.__certificateTest.printCalls += 1; };
        }
      }
    }
  }).observe(document.body, { childList: true });

  try {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  } catch {}
})()`);

await evaluate('document.querySelector("#certificate-button").click()');
await waitFor('document.querySelector("#camera-dialog").open', "O modal não abriu.");
await waitFor(
  '!document.querySelector("#camera-capture").disabled && document.querySelector("#camera-video").videoWidth > 0',
  "A câmera simulada não ficou pronta.",
);
const cameraMirror = await evaluate(
  'getComputedStyle(document.querySelector("#camera-video")).transform.includes("-1")',
);
if (!cameraMirror) throw new Error("A prévia da câmera frontal não está espelhada.");
await evaluate('document.querySelector("#camera-capture").click()');
await waitFor(
  '!document.querySelector("#certificate-details").hidden && document.querySelector("#camera-preview").src.startsWith("data:image/jpeg")',
  "A captura da webcam não gerou a prévia.",
);
await evaluate('document.querySelector("#camera-retake").click()');
await waitFor(
  'document.querySelector("#certificate-details").hidden && !document.querySelector("#camera-capture").disabled',
  "Refazer foto não reiniciou a câmera.",
);

async function uploadSyntheticPhoto(width, height) {
  await evaluate(`(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = ${width};
    canvas.height = ${height};
    const context = canvas.getContext("2d");
    context.fillStyle = "#7aa6cf";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f1c7a5";
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height * 0.38, Math.min(canvas.width, canvas.height) * 0.18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#173f70";
    context.fillRect(canvas.width * 0.25, canvas.height * 0.58, canvas.width * 0.5, canvas.height * 0.35);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "foto-teste.png", { type: "image/png" }));
    const input = document.querySelector("#camera-file");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor(
    '!document.querySelector("#certificate-details").hidden',
    "A foto não liberou o formulário.",
  );
}

async function generateCertificate(name, rating, width, height) {
  await uploadSyntheticPhoto(width, height);
  await evaluate(`(() => {
    window.__certificateTest.texts = [];
    const nameInput = document.querySelector("#certificate-name");
    const ratingInput = document.querySelector("#certificate-rating");
    nameInput.value = ${JSON.stringify(name)};
    ratingInput.value = ${JSON.stringify(String(rating))};
    ratingInput.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("#face-confirmation").checked = true;
    document.querySelector("#certificate-details").requestSubmit();
  })()`);
  await waitFor(
    '!document.querySelector("#certificate-step").hidden && document.querySelector("#certificate-image").complete && document.querySelector("#certificate-image").naturalWidth === 3508',
    `O certificado de ${name} não foi gerado.`,
    25000,
  );

  const result = await evaluate(`(() => {
    const image = document.querySelector("#certificate-image");
    const nameRecord = window.__certificateTest.texts.find((item) => item.text === ${JSON.stringify(name)});
    return {
      name: ${JSON.stringify(name)},
      rating: ${rating},
      canvasWidth: Number(image.dataset.canvasWidth),
      canvasHeight: Number(image.dataset.canvasHeight),
      pngWidth: image.naturalWidth,
      pngHeight: image.naturalHeight,
      renderedName: nameRecord?.text,
      nameWidth: Math.round(nameRecord?.width || 0),
      nameFont: nameRecord?.font || "",
      ratingText: window.__certificateTest.texts.some((item) => item.text === ${JSON.stringify(Number(rating).toFixed(1).replace(".", ","))}),
    };
  })()`);

  if (result.canvasWidth !== 3508 || result.canvasHeight !== 2480) {
    throw new Error("Resolução interna incorreta.");
  }
  if (result.pngWidth !== 3508 || result.pngHeight !== 2480) {
    throw new Error("Resolução do PNG incorreta.");
  }
  if (result.renderedName !== name || result.nameWidth > 1740 || !result.ratingText) {
    throw new Error(`Conteúdo dinâmico incorreto para ${name}.`);
  }
  return result;
}

const results = [];
results.push(await generateCertificate("Ana Silva", 0, 600, 900));

await evaluate('document.querySelector("#certificate-download").click()');
await waitFor('window.__certificateTest.downloads.length >= 1', "O download não foi acionado.");
const downloadOutput = await evaluate('window.__certificateTest.downloads[0]');
if (
  downloadOutput.fileName !== "certificado-ana-silva-pe-pedal-2026.png" ||
  !downloadOutput.usesBlob
) {
  throw new Error("Nome ou conteúdo do download incorreto.");
}

await evaluate('document.querySelector("#certificate-print").click()');
await waitFor('window.__certificateTest.printCalls >= 1', "A impressão não foi preparada.");
const printLayout = await evaluate(`(() => {
  const frame = [...document.querySelectorAll("iframe")].find((item) => item.title === "Impressão do certificado");
  const css = frame?.contentDocument?.querySelector("style")?.textContent || "";
  return /A4 landscape/.test(css) && /297mm/.test(css) && /210mm/.test(css);
})()`);
if (!printLayout) throw new Error("Layout A4 de impressão não encontrado.");

await evaluate('document.querySelector("#certificate-share").click()');
await waitFor('window.__certificateTest.downloads.length >= 2', "O fallback de compartilhamento não baixou o PNG.");

for (const testCase of [
  { name: "Maria Eduarda da Silva", rating: 2.5, width: 1200, height: 600 },
  { name: "João Pedro de Oliveira Santos", rating: 5, width: 600, height: 900 },
]) {
  await evaluate('document.querySelector("#certificate-back").click()');
  await waitFor('!document.querySelector("#camera-step").hidden', "Refazer foto não voltou ao formulário.");
  results.push(
    await generateCertificate(
      testCase.name,
      testCase.rating,
      testCase.width,
      testCase.height,
    ),
  );
}

const imageRect = await evaluate(`(() => {
  const image = document.querySelector("#certificate-image");
  image.scrollIntoView({ block: "center" });
  const rect = image.getBoundingClientRect();
  return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
})()`);
await delay(300);
const screenshot = await command("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: { ...imageRect, scale: 1 },
});
await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

const responsivePreview = [];
for (const viewport of [
  { width: 390, height: 844, profile: "viewport Chrome Android" },
  { width: 320, height: 568, profile: "viewport Safari iOS" },
]) {
  await command("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await delay(150);
  const measurement = await evaluate(`(() => {
    const image = document.querySelector("#certificate-image");
    const rect = image.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      viewportWidth: innerWidth,
      ratio: rect.width / rect.height,
    };
  })()`);
  if (
    measurement.width > measurement.viewportWidth ||
    Math.abs(measurement.ratio - 3508 / 2480) > 0.01
  ) {
    throw new Error(`Preview não responsivo em ${viewport.profile}.`);
  }
  responsivePreview.push({ profile: viewport.profile, ...measurement });
}

const meaningfulErrors = browserErrors.filter(
  (message) =>
    !/camera|media|permission/i.test(message),
);
if (meaningfulErrors.length) {
  throw new Error(`Erros do navegador: ${meaningfulErrors.join(" | ")}`);
}

console.log(JSON.stringify({
  ok: true,
  results,
  download: downloadOutput,
  cameraCapture: true,
  cameraMirror,
  shareFallback: true,
  printA4Landscape: printLayout,
  responsivePreview,
  screenshotPath,
  browserErrors: meaningfulErrors,
}, null, 2));

try {
  await command("Browser.close");
} catch {
  edge.kill();
}
socket.close();
await delay(1000);
const resolvedProfile = path.resolve(profileDirectory);
const resolvedTemp = path.resolve(os.tmpdir());
if (
  path.dirname(resolvedProfile) === resolvedTemp &&
  path.basename(resolvedProfile).startsWith("pe-pedal-edge-")
) {
  try {
    await rm(resolvedProfile, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 250,
    });
  } catch (error) {
    console.warn(`Perfil temporário mantido para limpeza do sistema: ${error.code}`);
  }
}
