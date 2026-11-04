const API_BASE = "https://vamshai.team-zyvorax.workers.dev";
const input = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const processButton = document.getElementById("process-btn");
const statusBox = document.getElementById("status");
const fileRow = document.getElementById("file-row");
const fileName = document.getElementById("file-name");
const resultStage = document.getElementById("result-stage");
const resultState = document.getElementById("result-state");
const downloadButton = document.getElementById("download-btn");
let selectedFile = null;
let resultUrl = null;
document.getElementById("year").textContent = new Date().getFullYear();

function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = "status " + type;
}
function clearResult() {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = null;
  downloadButton.classList.add("disabled");
  downloadButton.setAttribute("aria-disabled", "true");
  downloadButton.removeAttribute("href");
  resultStage.innerHTML = '<div class="empty-result"><div class="result-glyph">✧</div><b>Your result appears here</b><span>Upload an image to begin creating.</span></div>';
  resultState.textContent = "WAITING FOR IMAGE";
}
function setFile(file) {
  if (!file) return;
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/bmp"];
  if (!allowed.includes(file.type)) return setStatus("Please choose a PNG, JPG, WEBP or BMP image.", "error");
  if (file.size > 15 * 1024 * 1024) return setStatus("This image is larger than 15 MB. Please choose a smaller file.", "error");
  selectedFile = file;
  fileName.textContent = file.name;
  fileRow.hidden = false;
  dropzone.style.display = "none";
  processButton.disabled = false;
  clearResult();
  setStatus("Image ready. Start processing when you are ready.");
}
input.addEventListener("change", () => setFile(input.files[0]));
document.getElementById("clear-file").addEventListener("click", () => {
  selectedFile = null; input.value = ""; fileRow.hidden = true; dropzone.style.display = "flex"; processButton.disabled = true; setStatus(""); clearResult();
});
["dragenter", "dragover"].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.add("dragover"); }));
["dragleave", "drop"].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.remove("dragover"); }));
dropzone.addEventListener("drop", e => setFile(e.dataTransfer.files[0]));

processButton.addEventListener("click", async () => {
  if (!selectedFile) return;
  if (!API_BASE.startsWith("https://")) return setStatus("Backend is not connected yet. Deploy the Cloudflare Worker and add its URL in assets/app.js.", "error");
  const body = new FormData();
  body.append("file", selectedFile);
  if (document.getElementById("preview-mode").checked) body.append("preview", "true");
  processButton.disabled = true;
  processButton.textContent = "Processing image…";
  resultState.textContent = "PROCESSING";
  setStatus("AI is working on your image. Please wait.");
  try {
    const response = await fetch(API_BASE.replace(/\/$/, "") + "/api/remove-background", { method: "POST", body });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      let message = "Processing failed. Please try again.";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        message = data.error || data.message || message;
      }
      throw new Error(message);
    }
    if (!contentType.startsWith("image/")) throw new Error("The image service returned an unexpected response.");
    const blob = await response.blob();
    if (!blob.size) throw new Error("The processing service returned an empty image.");
    clearResult();
    resultUrl = URL.createObjectURL(blob);
    const image = document.createElement("img");
    image.alt = "AI background removed result";
    image.src = resultUrl;
    resultStage.replaceChildren(image);
    downloadButton.href = resultUrl;
    downloadButton.classList.remove("disabled");
    downloadButton.setAttribute("aria-disabled", "false");
    resultState.textContent = "COMPLETE";
    setStatus("Your transparent image is ready to download.", "success");
  } catch (error) {
    resultState.textContent = "NOT COMPLETE";
    setStatus(error.message || "Something went wrong. Please try again.", "error");
  } finally {
    processButton.disabled = !selectedFile;
    processButton.innerHTML = 'Remove background <span>→</span>';
  }
});
window.addEventListener("beforeunload", () => { if (resultUrl) URL.revokeObjectURL(resultUrl); });
