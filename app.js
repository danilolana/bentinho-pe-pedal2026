/**
 * Questionário Pé Pedal Bentinho
 * Sem dependências externas. As respostas ficam apenas no localStorage.
 */
(() => {
  "use strict";

  const elements = {
    certificate: document.querySelector("#certificate-button"),
    toast: document.querySelector("#toast"),
  };
  let toastTimer;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 4200);
  }

  // Fluxo antigo de questionário, mantido temporariamente fora de execução.
  if (false) {

  const STORAGE_KEY = "pe-pedal-bentinho-answers-v1";
  const MIN_TEXT_LENGTH = 10;
  const MAX_TEXT_LENGTH = 280;

  const questions = [
    {
      id: "activity",
      kicker: "Seu movimento",
      title: "O que trouxe você ao Kartódromo hoje?",
      help: "Escolha a atividade que melhor representa sua volta por aqui.",
      type: "radio",
      options: [
        "Caminhar",
        "Correr",
        "Pedalar",
        "Patinar ou andar de skate",
        "Passear com pet",
        "Descansar ou encontrar pessoas",
      ],
      error: "Escolha uma atividade para continuar.",
    },
    {
      id: "feeling",
      kicker: "Sua percepção",
      title: "Como seu corpo costuma sair deste circuito?",
      help: "Marque a sensação mais próxima da sua experiência.",
      type: "radio",
      options: [
        "Com mais energia",
        "Mais leve e tranquilo",
        "Cansado, mas satisfeito",
        "Igual a quando cheguei",
        "Com algum desconforto",
      ],
      error: "Escolha uma sensação para continuar.",
    },
    {
      id: "priorities",
      kicker: "Uma pista melhor",
      title: "O que mais ajudaria você a se movimentar neste espaço?",
      help: "Escolha até 3 itens.",
      type: "checkbox",
      max: 3,
      options: [
        "Mais sombra",
        "Água acessível",
        "Iluminação",
        "Sinalização de percursos",
        "Pisos e pistas melhores",
        "Mais segurança",
      ],
      error: "Escolha pelo menos 1 item (no máximo 3).",
    },
    {
      id: "energy",
      kicker: "Termômetro do dia",
      title: "De 1 a 5, como está sua disposição agora?",
      help: "1 significa muito baixa; 5 significa muito alta.",
      type: "range",
      min: 1,
      max: 5,
      default: 3,
    },
    {
      id: "suggestion",
      kicker: "Deixe sua marca",
      title: "Que ideia faria mais pessoas aproveitarem o Kartódromo?",
      help: `Escreva entre ${MIN_TEXT_LENGTH} e ${MAX_TEXT_LENGTH} caracteres. Não inclua dados pessoais.`,
      type: "textarea",
      placeholder: "Ex.: criar pontos de descanso ao longo do circuito...",
      error: `Escreva uma ideia com pelo menos ${MIN_TEXT_LENGTH} caracteres.`,
    },
  ];

  const elements = {
    form: document.querySelector("#question-form"),
    content: document.querySelector("#question-content"),
    error: document.querySelector("#form-error"),
    back: document.querySelector("#back-button"),
    next: document.querySelector("#next-button"),
    clear: document.querySelector("#clear-button"),
    review: document.querySelector("#review-button"),
    certificate: document.querySelector("#certificate-button"),
    completion: document.querySelector("#completion"),
    summary: document.querySelector("#answer-summary"),
    stepLabel: document.querySelector("#step-label"),
    progress: document.querySelector("#progress-bar"),
    progressTrack: document.querySelector('[role="progressbar"]'),
    toast: document.querySelector("#toast"),
  };

  let state = {
    current: 0,
    answers: loadAnswers(),
    completed: false,
  };
  let toastTimer;
  let certificateExperience;

  function loadAnswers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};

      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch (error) {
      console.warn("Não foi possível ler as respostas salvas.", error);
      return {};
    }
  }

  function saveAnswers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.answers));
      return true;
    } catch (error) {
      console.warn("Não foi possível salvar as respostas.", error);
      showToast(
        "Seu navegador bloqueou o armazenamento. As respostas valem nesta tela.",
      );
      return false;
    }
  }

  function escapeAttribute(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function renderQuestion() {
    const question = questions[state.current];
    state.completed = false;
    elements.form.hidden = false;
    elements.completion.hidden = true;
    elements.error.hidden = true;

    elements.stepLabel.textContent = `Pergunta ${state.current + 1} de ${questions.length}`;
    elements.progress.style.width = `${((state.current + 1) / questions.length) * 100}%`;
    elements.progressTrack.setAttribute("aria-valuenow", state.current + 1);
    elements.back.hidden = state.current === 0;
    elements.next.textContent =
      state.current === questions.length - 1
        ? "Registrar respostas"
        : "Continuar";

    elements.content.innerHTML = buildQuestionMarkup(question);
    bindDynamicEvents(question);

    const title = elements.content.querySelector(".question-title");
    if (title && state.current > 0) {
      title.setAttribute("tabindex", "-1");
      title.focus();
    }
  }

  function buildQuestionMarkup(question) {
    const heading = `
      <legend class="question-title">
        <span class="question-kicker">${question.kicker}</span>
        ${question.title}
      </legend>
      <p class="question-help" id="${question.id}-help">${question.help}</p>
    `;

    if (question.type === "radio" || question.type === "checkbox") {
      const selected = Array.isArray(state.answers[question.id])
        ? state.answers[question.id]
        : [state.answers[question.id]];

      const options = question.options
        .map((option, index) => {
          const checked = selected.includes(option) ? "checked" : "";
          return `
            <label class="option-card">
              <input
                type="${question.type}"
                name="${question.id}"
                value="${escapeAttribute(option)}"
                aria-describedby="${question.id}-help"
                ${checked}
              />
              <span>${option}</span>
            </label>
          `;
        })
        .join("");

      return `
        <fieldset class="question-fieldset">
          ${heading}
          <div class="options-grid">${options}</div>
        </fieldset>
      `;
    }

    if (question.type === "range") {
      const value = Number(state.answers[question.id] ?? question.default);
      return `
        <fieldset class="question-fieldset">
          ${heading}
          <div class="scale-wrap">
            <div class="scale-output" aria-hidden="true">
              <output id="range-output">${value}</output><span>de 5</span>
            </div>
            <input
              class="range-input"
              id="${question.id}"
              name="${question.id}"
              type="range"
              min="${question.min}"
              max="${question.max}"
              value="${value}"
              aria-describedby="${question.id}-help"
            />
            <div class="range-labels" aria-hidden="true">
              <span>Muito baixa</span>
              <span>Muito alta</span>
            </div>
          </div>
        </fieldset>
      `;
    }

    const answer = state.answers[question.id] ?? "";
    return `
      <fieldset class="question-fieldset">
        ${heading}
        <textarea
          class="text-answer"
          id="${question.id}"
          name="${question.id}"
          minlength="${MIN_TEXT_LENGTH}"
          maxlength="${MAX_TEXT_LENGTH}"
          placeholder="${question.placeholder}"
          aria-describedby="${question.id}-help ${question.id}-count"
        >${escapeAttribute(answer)}</textarea>
        <p class="character-count" id="${question.id}-count">
          <span>${String(answer).length}</span>/${MAX_TEXT_LENGTH}
        </p>
      </fieldset>
    `;
  }

  function bindDynamicEvents(question) {
    if (question.type === "range") {
      const input = elements.content.querySelector(".range-input");
      const output = elements.content.querySelector("#range-output");
      updateRangeBackground(input);
      input.addEventListener("input", () => {
        output.value = input.value;
        updateRangeBackground(input);
      });
    }

    if (question.type === "textarea") {
      const textarea = elements.content.querySelector(".text-answer");
      const counter = elements.content.querySelector(".character-count span");
      textarea.addEventListener("input", () => {
        counter.textContent = textarea.value.length;
        clearError();
      });
    }

    if (question.type === "checkbox") {
      const inputs = [
        ...elements.content.querySelectorAll('input[type="checkbox"]'),
      ];
      inputs.forEach((input) => {
        input.addEventListener("change", () => {
          const checked = inputs.filter((item) => item.checked);
          if (checked.length > question.max) {
            input.checked = false;
            showError(`Escolha no máximo ${question.max} itens.`);
          } else {
            clearError();
          }
        });
      });
    }

    elements.content
      .querySelectorAll('input[type="radio"]')
      .forEach((input) => input.addEventListener("change", clearError));
  }

  function updateRangeBackground(input) {
    const percentage =
      ((Number(input.value) - Number(input.min)) /
        (Number(input.max) - Number(input.min))) *
      100;
    input.style.background = `linear-gradient(to right, var(--terracotta) 0%, var(--terracotta) ${percentage}%, var(--line) ${percentage}%, var(--line) 100%)`;
  }

  function collectAnswer(question) {
    if (question.type === "radio") {
      return elements.form.elements[question.id].value || "";
    }

    if (question.type === "checkbox") {
      return [
        ...elements.form.querySelectorAll(
          `input[name="${question.id}"]:checked`,
        ),
      ].map((input) => input.value);
    }

    if (question.type === "range") {
      return Number(elements.form.elements[question.id].value);
    }

    return elements.form.elements[question.id].value
      .replace(/\s+/g, " ")
      .trim();
  }

  function validateAnswer(question, answer) {
    if (question.type === "radio" && !answer) {
      return question.error;
    }

    if (
      question.type === "checkbox" &&
      (answer.length < 1 || answer.length > question.max)
    ) {
      return question.error;
    }

    if (
      question.type === "range" &&
      (!Number.isInteger(answer) || answer < question.min || answer > question.max)
    ) {
      return "Escolha um valor válido entre 1 e 5.";
    }

    if (question.type === "textarea") {
      if (answer.length < MIN_TEXT_LENGTH) return question.error;
      if (answer.length > MAX_TEXT_LENGTH) {
        return `Reduza a resposta para até ${MAX_TEXT_LENGTH} caracteres.`;
      }
      if (/https?:\/\/|www\./i.test(answer)) {
        return "Não inclua links na resposta.";
      }
      if (
        /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(answer) ||
        /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/.test(answer)
      ) {
        return "Remova e-mails ou telefones. A participação deve ser anônima.";
      }
    }

    return "";
  }

  function showError(message) {
    elements.error.textContent = message;
    elements.error.hidden = false;
  }

  function clearError() {
    elements.error.hidden = true;
    elements.error.textContent = "";
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 4200);
  }

  function finishQuestionnaire() {
    state.completed = true;
    elements.form.hidden = true;
    elements.stepLabel.textContent = "Participação concluída";
    elements.progress.style.width = "100%";
    elements.completion.hidden = false;
    renderSummary();
    elements.completion.focus();
    certificateExperience?.open(true);
  }

  function renderSummary() {
    elements.summary.replaceChildren();

    questions.forEach((question) => {
      const row = document.createElement("p");
      const label = document.createElement("span");
      const value = document.createElement("strong");
      const answer = state.answers[question.id];

      label.textContent = question.kicker;
      value.textContent = Array.isArray(answer)
        ? answer.join(", ")
        : question.type === "range"
          ? `${answer} de 5`
          : answer;
      row.append(label, value);
      elements.summary.append(row);
    });
  }

  function resetQuestionnaire() {
    const hasAnswers = Object.keys(state.answers).length > 0;
    if (
      hasAnswers &&
      !window.confirm("Apagar suas respostas e recomeçar do início?")
    ) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Não foi possível limpar o armazenamento.", error);
    }

    state = { current: 0, answers: {}, completed: false };
    certificateExperience?.reset();
    renderQuestion();
    showToast("Respostas apagadas. O percurso recomeçou.");
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = questions[state.current];
    const answer = collectAnswer(question);
    const validationError = validateAnswer(question, answer);

    if (validationError) {
      showError(validationError);
      const firstInput = elements.content.querySelector("input, textarea");
      firstInput?.focus();
      return;
    }

    state.answers[question.id] = answer;
    saveAnswers();
    clearError();

    if (state.current === questions.length - 1) {
      finishQuestionnaire();
      return;
    }

    state.current += 1;
    renderQuestion();
  });

  elements.back.addEventListener("click", () => {
    if (state.current === 0) return;
    state.current -= 1;
    renderQuestion();
  });

  elements.clear.addEventListener("click", resetQuestionnaire);

  elements.review.addEventListener("click", () => {
    state.current = 0;
    renderQuestion();
  });

  }

  function initializeCertificateExperience() {
    const dialog = document.querySelector("#camera-dialog");
    const closeButton = document.querySelector("#camera-close");
    const cameraStep = document.querySelector("#camera-step");
    const certificateStep = document.querySelector("#certificate-step");
    const viewfinder = document.querySelector("#camera-viewfinder");
    const video = document.querySelector("#camera-video");
    const preview = document.querySelector("#camera-preview");
    const photoCanvas = document.querySelector("#photo-canvas");
    const cameraStatus = document.querySelector("#camera-status");
    const startButton = document.querySelector("#camera-start");
    const captureButton = document.querySelector("#camera-capture");
    const retakeButton = document.querySelector("#camera-retake");
    const fileInput = document.querySelector("#camera-file");
    const fileButton = document.querySelector(".photo-file-button");
    const detailsForm = document.querySelector("#certificate-details");
    const nameInput = document.querySelector("#certificate-name");
    const ratingInput = document.querySelector("#certificate-rating");
    const ratingOutput = document.querySelector("#certificate-rating-value");
    const faceConfirmation = document.querySelector("#face-confirmation");
    const certificateError = document.querySelector("#certificate-error");
    const certificateImage = document.querySelector("#certificate-image");
    const printButton = document.querySelector("#certificate-print");
    const downloadButton = document.querySelector("#certificate-download");
    const shareButton = document.querySelector("#certificate-share");
    const backButton = document.querySelector("#certificate-back");

    const requiredElements = [
      dialog,
      closeButton,
      cameraStep,
      certificateStep,
      viewfinder,
      video,
      preview,
      photoCanvas,
      cameraStatus,
      startButton,
      captureButton,
      retakeButton,
      fileInput,
      fileButton,
      detailsForm,
      nameInput,
      ratingInput,
      ratingOutput,
      faceConfirmation,
      certificateError,
      certificateImage,
      printButton,
      downloadButton,
      shareButton,
      backButton,
      elements.certificate,
    ];

    if (requiredElements.some((element) => !element)) {
      return {
        open: () => {},
        reset: () => {},
      };
    }

    const CERTIFICATE_WIDTH = 3508;
    const CERTIFICATE_HEIGHT = 2480;
    const CERTIFICATE_NAVY = "#082f5b";
    const CERTIFICATE_BLUE = "#0a3978";
    const CERTIFICATE_GOLD = "#c68a17";
    const CERTIFICATE_PAPER = "#fffefa";
    const certificateAssetSources = {
      curves: {
        src: "assets/certificate/certificate-curves.png",
        label: "as faixas curvas",
      },
      crest: {
        src: "assets/certificate/bento-crest.png",
        label: "o brasão institucional",
      },
      signature: {
        src: "assets/certificate/bento-signature.png",
        label: "a assinatura institucional",
      },
      seal: {
        src: "assets/certificate/bq-wax-seal.png",
        label: "o selo institucional",
      },
      medal: {
        src: "assets/certificate/score-medal.png",
        label: "a medalha da nota",
      },
    };
    const certificateAssets = Object.create(null);
    const certificateAssetPromises = Object.create(null);
    const certificateCanvas = document.createElement("canvas");
    certificateCanvas.width = CERTIFICATE_WIDTH;
    certificateCanvas.height = CERTIFICATE_HEIGHT;

    let cameraStream = null;
    let photoDataUrl = "";
    let certificateBlob = null;
    let certificateObjectUrl = "";
    let certificateFileName = "certificado-pe-pedal-bentinho-2026.png";
    let cameraRequestId = 0;

    function releaseCertificateOutput() {
      if (certificateObjectUrl) URL.revokeObjectURL(certificateObjectUrl);
      certificateBlob = null;
      certificateObjectUrl = "";
    }

    function loadImageAsset(key, { src, label }) {
      if (certificateAssets[key]) return Promise.resolve(certificateAssets[key]);
      if (certificateAssetPromises[key]) return certificateAssetPromises[key];

      certificateAssetPromises[key] = new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.addEventListener("load", () => {
          certificateAssets[key] = image;
          resolve(image);
        }, { once: true });
        image.addEventListener("error", () => {
          delete certificateAssetPromises[key];
          const error = new Error(`Falha ao carregar ${label}.`);
          error.certificateAssetLabel = label;
          reject(error);
        }, { once: true });
        image.src = src;
      });

      return certificateAssetPromises[key];
    }

    async function preloadCertificateAssets() {
      await Promise.all(
        Object.entries(certificateAssetSources).map(([key, asset]) =>
          loadImageAsset(key, asset),
        ),
      );
      return certificateAssets;
    }

    function updateRatingOutput() {
      const rating = Number(ratingInput.value);
      const formattedRating = rating
        .toFixed(1)
        .replace(".", ",");
      const min = Number(ratingInput.min);
      const max = Number(ratingInput.max);
      const progress = ((rating - min) / (max - min)) * 100;
      ratingInput.style.setProperty("--rating-progress", `${progress}%`);
      ratingOutput.value = `${formattedRating} de 5`;
      ratingOutput.textContent = `${formattedRating} de 5`;
    }

    function stopCamera() {
      cameraRequestId += 1;
      cameraStream?.getTracks().forEach((track) => track.stop());
      cameraStream = null;
      video.srcObject = null;
    }

    function setCameraStatus(message, isError = false) {
      cameraStatus.textContent = message;
      viewfinder.classList.toggle("has-error", isError);
      viewfinder.classList.remove("is-ready");
    }

    function showCameraError(error) {
      let message =
        "Não foi possível abrir a câmera. Você pode tentar novamente ou usar uma foto do aparelho.";

      if (!window.isSecureContext) {
        message =
          "A câmera exige HTTPS ou localhost. Abra o site em uma conexão segura ou use uma foto do aparelho.";
      } else if (error?.name === "NotAllowedError") {
        message =
          "O acesso à câmera foi bloqueado. Libere a permissão no navegador e tente novamente.";
      } else if (error?.name === "NotFoundError") {
        message =
          "Nenhuma câmera foi encontrada neste aparelho. Use uma foto do aparelho.";
      } else if (error?.name === "NotReadableError") {
        message =
          "A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.";
      }

      setCameraStatus(message, true);
      startButton.hidden = false;
      captureButton.disabled = true;
    }

    async function requestCamera() {
      stopCamera();
      const requestId = ++cameraRequestId;
      preview.hidden = true;
      video.hidden = false;
      viewfinder.classList.remove("has-photo", "has-error");
      setCameraStatus("Solicitando acesso à câmera…");
      startButton.hidden = true;
      captureButton.hidden = false;
      captureButton.disabled = true;
      retakeButton.hidden = true;
      fileButton.hidden = false;
      detailsForm.hidden = true;

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException(
            "A captura de câmera não está disponível.",
            "NotSupportedError",
          );
        }

        const requestedStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 1920 },
          },
        });
        if (requestId !== cameraRequestId) {
          requestedStream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStream = requestedStream;
        video.srcObject = cameraStream;
        await video.play();
        captureButton.disabled = false;
        viewfinder.classList.add("is-ready");
        cameraStatus.textContent =
          "Câmera pronta. Centralize o rosto e tire a foto.";
      } catch (error) {
        if (requestId !== cameraRequestId) return;
        console.warn("Não foi possível iniciar a câmera.", error);
        showCameraError(error);
      }
    }

    function drawImageCover(
      context,
      source,
      targetX,
      targetY,
      targetWidth,
      targetHeight,
      mirror = false,
    ) {
      const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
      const sourceHeight =
        source.videoHeight || source.naturalHeight || source.height;
      if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) {
        return false;
      }
      const sourceRatio = sourceWidth / sourceHeight;
      const targetRatio = targetWidth / targetHeight;
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;
      let cropX = 0;
      let cropY = 0;

      if (sourceRatio > targetRatio) {
        cropWidth = sourceHeight * targetRatio;
        cropX = (sourceWidth - cropWidth) / 2;
      } else {
        cropHeight = sourceWidth / targetRatio;
        cropY = (sourceHeight - cropHeight) / 2;
      }

      context.save();
      if (mirror) {
        context.translate(targetX + targetWidth, targetY);
        context.scale(-1, 1);
      }
      context.drawImage(
        source,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        mirror ? 0 : targetX,
        mirror ? 0 : targetY,
        targetWidth,
        targetHeight,
      );
      context.restore();
      return true;
    }

    function drawImageContain(context, source, x, y, width, height) {
      const sourceWidth = source.naturalWidth || source.width;
      const sourceHeight = source.naturalHeight || source.height;
      if (!sourceWidth || !sourceHeight || !width || !height) return false;

      const scale = Math.min(width / sourceWidth, height / sourceHeight);
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      context.drawImage(
        source,
        x + (width - drawWidth) / 2,
        y + (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      return true;
    }

    function showCapturedPhoto() {
      photoDataUrl = photoCanvas.toDataURL("image/jpeg", 0.9);
      preview.src = photoDataUrl;
      preview.hidden = false;
      video.hidden = true;
      viewfinder.classList.add("has-photo");
      viewfinder.classList.remove("is-ready", "has-error");
      captureButton.hidden = true;
      startButton.hidden = true;
      retakeButton.hidden = false;
      fileButton.hidden = true;
      detailsForm.hidden = false;
      certificateError.hidden = true;
      stopCamera();
      window.setTimeout(() => nameInput.focus(), 100);
    }

    function capturePhoto() {
      if (!video.videoWidth || !video.videoHeight) {
        setCameraStatus("A câmera ainda está preparando a imagem. Tente novamente.");
        return;
      }

      const context = photoCanvas.getContext("2d", { alpha: false });
      context.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
      drawImageCover(
        context,
        video,
        0,
        0,
        photoCanvas.width,
        photoCanvas.height,
        true,
      );
      showCapturedPhoto();
    }

    async function loadPhotoFile(file) {
      if (!file?.type.startsWith("image/")) {
        showCameraError({ name: "InvalidFile" });
        setCameraStatus("Escolha um arquivo de imagem válido.", true);
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        setCameraStatus("Escolha uma foto com até 15 MB.", true);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = objectUrl;
        });
        const context = photoCanvas.getContext("2d", { alpha: false });
        context.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
        drawImageCover(
          context,
          image,
          0,
          0,
          photoCanvas.width,
          photoCanvas.height,
        );
        showCapturedPhoto();
      } catch (error) {
        console.warn("Não foi possível ler a foto escolhida.", error);
        setCameraStatus("Não foi possível ler essa foto. Escolha outra imagem.", true);
      } finally {
        URL.revokeObjectURL(objectUrl);
        fileInput.value = "";
      }
    }

    function resetCapture() {
      photoDataUrl = "";
      releaseCertificateOutput();
      photoCanvas
        .getContext("2d")
        .clearRect(0, 0, photoCanvas.width, photoCanvas.height);
      certificateCanvas
        .getContext("2d")
        .clearRect(0, 0, certificateCanvas.width, certificateCanvas.height);
      preview.removeAttribute("src");
      preview.hidden = true;
      detailsForm.reset();
      updateRatingOutput();
      detailsForm.hidden = true;
      certificateError.hidden = true;
      certificateImage.removeAttribute("src");
      cameraStep.hidden = false;
      certificateStep.hidden = true;
      requestCamera();
    }

    function drawDiamond(context, x, y, width = 24, height = width) {
      context.beginPath();
      context.moveTo(x, y - height / 2);
      context.lineTo(x + width / 2, y);
      context.lineTo(x, y + height / 2);
      context.lineTo(x - width / 2, y);
      context.closePath();
      context.fill();
    }

    function drawTrackedText(context, text, centerX, y, tracking) {
      const characters = [...text];
      const textWidth = characters.reduce(
        (total, character) => total + context.measureText(character).width,
        tracking * Math.max(0, characters.length - 1),
      );
      let x = centerX - textWidth / 2;
      const previousAlignment = context.textAlign;
      context.textAlign = "left";
      characters.forEach((character) => {
        context.fillText(character, x, y);
        x += context.measureText(character).width + tracking;
      });
      context.textAlign = previousAlignment;
    }

    function fitParticipantName(context, name, maxWidth) {
      const maximumSize = 194;
      const minimumSize = 88;
      let fontSize = maximumSize;

      while (fontSize > minimumSize) {
        context.font = `400 ${fontSize}px "Great Vibes", "Segoe Script", cursive`;
        if (context.measureText(name).width <= maxWidth) break;
        fontSize -= 4;
      }

      context.font = `400 ${Math.max(fontSize, minimumSize)}px "Great Vibes", "Segoe Script", cursive`;
      return Math.max(fontSize, minimumSize);
    }

    function drawCertificateBorder(context) {
      const left = 190;
      const right = CERTIFICATE_WIDTH - 190;
      const top = 64;
      const bottom = CERTIFICATE_HEIGHT - 136;

      context.save();
      context.strokeStyle = CERTIFICATE_GOLD;
      context.fillStyle = CERTIFICATE_GOLD;
      context.lineWidth = 5;
      context.strokeRect(left, top, right - left, bottom - top);
      context.globalAlpha = 0.4;
      context.lineWidth = 2;
      context.strokeRect(left - 18, top - 18, right - left + 36, bottom - top + 36);
      context.globalAlpha = 1;
      drawDiamond(context, CERTIFICATE_WIDTH / 2, top, 34, 72);
      drawDiamond(context, CERTIFICATE_WIDTH / 2, bottom, 34, 72);
      drawDiamond(context, left, (top + bottom) / 2, 34, 72);
      drawDiamond(context, right, (top + bottom) / 2, 34, 72);
      context.restore();
    }

    function drawCertificateBackground(context) {
      context.fillStyle = CERTIFICATE_PAPER;
      context.fillRect(0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);

      const curveWidth = 1450;
      const curveHeight = 1275;
      drawImageContain(
        context,
        certificateAssets.curves,
        0,
        0,
        curveWidth,
        curveHeight,
      );

      context.save();
      context.translate(CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);
      context.rotate(Math.PI);
      drawImageContain(
        context,
        certificateAssets.curves,
        0,
        0,
        curveWidth,
        curveHeight,
      );
      context.restore();
    }

    function drawCertificateWatermarks(context) {
      context.save();
      context.globalCompositeOperation = "multiply";
      context.globalAlpha = 0.055;
      drawImageContain(context, certificateAssets.crest, 2700, 220, 940, 1010);
      context.globalAlpha = 0.065;
      drawImageContain(context, certificateAssets.crest, -260, 1530, 760, 815);
      context.restore();
    }

    function drawHeaderBicycle(context, centerX, centerY) {
      const scale = 1.25;
      context.save();
      context.translate(centerX, centerY);
      context.scale(scale, scale);
      context.strokeStyle = CERTIFICATE_GOLD;
      context.lineWidth = 6;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      context.arc(-43, 24, 29, 0, Math.PI * 2);
      context.arc(47, 24, 29, 0, Math.PI * 2);
      context.moveTo(-43, 24);
      context.lineTo(-12, -24);
      context.lineTo(13, 24);
      context.lineTo(-43, 24);
      context.lineTo(2, 24);
      context.lineTo(34, -18);
      context.lineTo(47, 24);
      context.moveTo(-22, -24);
      context.lineTo(-4, -24);
      context.moveTo(27, -18);
      context.lineTo(47, -24);
      context.stroke();
      context.restore();
    }

    function drawCertificateHeader(context) {
      const centerX = CERTIFICATE_WIDTH / 2;
      context.save();
      context.textAlign = "center";
      context.textBaseline = "alphabetic";
      context.fillStyle = CERTIFICATE_NAVY;
      context.font = '500 178px Lora, Georgia, serif';
      drawTrackedText(context, "CERTIFICADO", centerX, 356, 15);

      context.font = '700 112px Oswald, "Arial Narrow", sans-serif';
      context.fillText("PÉ PEDAL", centerX, 510);

      context.strokeStyle = CERTIFICATE_GOLD;
      context.fillStyle = CERTIFICATE_GOLD;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(1050, 530);
      context.lineTo(1370, 530);
      context.moveTo(2140, 530);
      context.lineTo(2380, 530);
      context.stroke();
      drawDiamond(context, 1370, 530, 20, 36);
      drawDiamond(context, 2140, 530, 20, 36);

      context.fillStyle = CERTIFICATE_BLUE;
      context.font = '700 170px Oswald, "Arial Narrow", sans-serif';
      context.fillText("BENTINHO", 1690, 705);
      drawHeaderBicycle(context, 2315, 646);

      context.strokeStyle = CERTIFICATE_GOLD;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(1180, 770);
      context.lineTo(1692, 770);
      context.moveTo(1816, 770);
      context.lineTo(2328, 770);
      context.stroke();
      context.fillStyle = CERTIFICATE_BLUE;
      drawDiamond(context, centerX, 770, 60, 60);
      context.beginPath();
      context.moveTo(1692, 770);
      context.lineTo(centerX, 805);
      context.lineTo(1816, 770);
      context.fill();
      context.restore();
    }

    function drawParticipantName(context, name) {
      const centerX = CERTIFICATE_WIDTH / 2;
      context.save();
      context.textAlign = "center";
      context.fillStyle = CERTIFICATE_NAVY;
      context.font = 'italic 600 43px Lora, Georgia, serif';
      context.fillText("Parabéns!", centerX, 955);

      fitParticipantName(context, name, 1740);
      context.fillText(name, centerX, 1235);

      context.strokeStyle = CERTIFICATE_GOLD;
      context.fillStyle = CERTIFICATE_GOLD;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(870, 1320);
      context.lineTo(2638, 1320);
      context.stroke();
      drawDiamond(context, centerX, 1320, 24, 34);

      context.fillStyle = CERTIFICATE_NAVY;
      context.font = '600 48px Manrope, Inter, Arial, sans-serif';
      context.fillText("Você agora é um Guardião do Parque.", centerX, 1435);
      context.restore();
    }

    function drawParticipantPhoto(context) {
      const x = 305;
      const y = 1500;
      const width = 540;
      const height = 720;
      const mat = 12;

      context.save();
      context.fillStyle = CERTIFICATE_PAPER;
      context.fillRect(x, y, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const hasPhoto = drawImageCover(
        context,
        photoCanvas,
        x + mat,
        y + mat,
        width - mat * 2,
        height - mat * 2,
      );

      if (!hasPhoto) {
        context.fillStyle = "#f3f4f4";
        context.fillRect(x + mat, y + mat, width - mat * 2, height - mat * 2);
        context.fillStyle = "#8a9198";
        context.textAlign = "center";
        context.font = "500 30px Inter, Arial, sans-serif";
        context.fillText("Foto indisponível", x + width / 2, y + height / 2);
      }

      context.strokeStyle = CERTIFICATE_GOLD;
      context.lineWidth = 6;
      context.strokeRect(x, y, width, height);
      context.restore();
    }

    function drawScore(context, rating) {
      const centerX = 1110;
      const formattedRating = rating.toFixed(1).replace(".", ",");
      context.save();
      context.textAlign = "center";
      context.fillStyle = CERTIFICATE_GOLD;
      context.font = '600 43px Lora, Georgia, serif';
      context.fillText("Nota:", centerX, 1605);
      context.globalCompositeOperation = "multiply";
      drawImageContain(context, certificateAssets.medal, 1005, 1640, 210, 285);
      context.globalCompositeOperation = "source-over";
      context.font = '500 94px Lora, Georgia, serif';
      context.fillText(formattedRating, centerX, 2055);
      context.restore();
    }

    function drawInstitutionalSeal(context) {
      context.save();
      context.globalCompositeOperation = "multiply";
      drawImageContain(context, certificateAssets.seal, 2680, 1510, 610, 610);
      context.restore();
    }

    function drawInstitutionalSignature(context) {
      const centerX = 1840;
      context.save();
      context.globalCompositeOperation = "multiply";
      drawImageContain(context, certificateAssets.signature, 1420, 1970, 840, 280);
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = CERTIFICATE_NAVY;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(1450, 2200);
      context.lineTo(2230, 2200);
      context.stroke();
      context.textAlign = "center";
      context.fillStyle = CERTIFICATE_NAVY;
      context.font = '700 39px Manrope, Inter, Arial, sans-serif';
      context.fillText("Colégio Técnico Bento Quirino", centerX, 2258);
      context.font = '500 33px Manrope, Inter, Arial, sans-serif';
      context.fillText("Formando gerações desde 1910", centerX, 2310);
      context.restore();
    }

    async function drawCertificate(name, rating) {
      await Promise.all([document.fonts?.ready, preloadCertificateAssets()]);
      const context = certificateCanvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D indisponível.");

      context.clearRect(0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT);
      drawCertificateBackground(context);
      drawCertificateWatermarks(context);
      drawCertificateHeader(context);
      drawParticipantName(context, name);
      drawParticipantPhoto(context);
      drawScore(context, rating);
      drawInstitutionalSeal(context);
      drawInstitutionalSignature(context);
      drawCertificateBorder(context);

      releaseCertificateOutput();
      certificateBlob = await canvasToBlob();
      certificateObjectUrl = URL.createObjectURL(certificateBlob);
      certificateImage.src = certificateObjectUrl;
      certificateImage.dataset.canvasWidth = String(certificateCanvas.width);
      certificateImage.dataset.canvasHeight = String(certificateCanvas.height);
      certificateFileName = `certificado-${name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45) || "participante"}-pe-pedal-2026.png`;
    }

    function canvasToBlob() {
      return new Promise((resolve, reject) => {
        certificateCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Não foi possível criar o arquivo."));
        }, "image/png");
      });
    }

    function downloadCertificate() {
      if (!certificateObjectUrl) return;
      const link = document.createElement("a");
      link.href = certificateObjectUrl;
      link.download = certificateFileName;
      link.click();
      showToast("Certificado baixado em PNG.");
    }

    function printCertificate() {
      if (!certificateObjectUrl) return;
      const printFrame = document.createElement("iframe");
      printFrame.title = "Impressão do certificado";
      printFrame.style.position = "fixed";
      printFrame.style.width = "1px";
      printFrame.style.height = "1px";
      printFrame.style.opacity = "0";
      printFrame.style.pointerEvents = "none";
      document.body.append(printFrame);

      const frameDocument = printFrame.contentDocument;
      const style = frameDocument.createElement("style");
      style.textContent =
        "@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0;width:297mm;height:210mm;overflow:hidden;background:#fff}body{display:grid;place-items:center}img{display:block;width:297mm;height:210mm;object-fit:contain;print-color-adjust:exact;-webkit-print-color-adjust:exact}";
      const image = frameDocument.createElement("img");
      image.alt = "Certificado Pé Pedal Bentinho 2026";
      image.src = certificateObjectUrl;
      frameDocument.head.append(style);
      frameDocument.body.append(image);
      image.addEventListener("load", () => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        window.setTimeout(() => printFrame.remove(), 60000);
      });
    }

    async function shareCertificate() {
      if (!certificateBlob) return;

      try {
        const file = new File([certificateBlob], certificateFileName, {
          type: "image/png",
        });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "Meu certificado Pé Pedal Bentinho 2026",
            text: "Completei o percurso de participação do Pé Pedal Bentinho 2026.",
            files: [file],
          });
          return;
        }

        downloadCertificate();
        showToast(
          "O compartilhamento de arquivos não está disponível. O certificado foi baixado.",
        );
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.warn("Não foi possível compartilhar o certificado.", error);
          showToast("Não foi possível compartilhar. Tente baixar o certificado.");
        }
      }
    }

    async function submitCertificate(event) {
      event.preventDefault();
      const name = nameInput.value.replace(/\s+/g, " ").trim();
      const rawRating = Number(ratingInput.value);
      const rating = Number.isFinite(rawRating)
        ? Math.min(5, Math.max(0, rawRating))
        : 5;

      if (name.length < 2) {
        certificateError.textContent =
          "Digite o nome que deve aparecer no certificado.";
        certificateError.hidden = false;
        nameInput.focus();
        return;
      }

      if (!faceConfirmation.checked) {
        certificateError.textContent =
          "Confirme que seu rosto aparece na foto para continuar.";
        certificateError.hidden = false;
        faceConfirmation.focus();
        return;
      }

      if (!photoDataUrl) {
        certificateError.textContent =
          "Tire uma foto ou escolha uma imagem do aparelho para continuar.";
        certificateError.hidden = false;
        return;
      }

      certificateError.hidden = true;
      const submitButton = detailsForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Gerando certificado…";

      try {
        await drawCertificate(name, rating);
        cameraStep.hidden = true;
        certificateStep.hidden = false;
        certificateStep.scrollIntoView({ block: "start" });
        certificateStep.querySelector("h2")?.focus?.();
      } catch (error) {
        console.error("Não foi possível gerar o certificado.", error);
        certificateError.textContent = error?.certificateAssetLabel
          ? `Não foi possível carregar ${error.certificateAssetLabel}. Recarregue a página e tente novamente.`
          : "Não foi possível gerar o certificado neste aparelho. Tente novamente.";
        certificateError.hidden = false;
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML =
          'Gerar certificado <span aria-hidden="true">↗</span>';
      }
    }

    function open(autoStart = false) {
      if (!dialog.open) dialog.showModal();
      document.body.classList.add("has-open-dialog");

      if (certificateObjectUrl) {
        cameraStep.hidden = true;
        certificateStep.hidden = false;
        return;
      }

      cameraStep.hidden = false;
      certificateStep.hidden = true;
      if (autoStart || !cameraStream) requestCamera();
    }

    function close() {
      stopCamera();
      document.body.classList.remove("has-open-dialog");
      if (dialog.open) dialog.close();
    }

    function reset() {
      stopCamera();
      photoDataUrl = "";
      releaseCertificateOutput();
      certificateFileName = "certificado-pe-pedal-bentinho-2026.png";
      detailsForm.reset();
      updateRatingOutput();
      preview.removeAttribute("src");
      preview.hidden = true;
      certificateImage.removeAttribute("src");
      photoCanvas
        .getContext("2d")
        .clearRect(0, 0, photoCanvas.width, photoCanvas.height);
      certificateCanvas
        .getContext("2d")
        .clearRect(0, 0, certificateCanvas.width, certificateCanvas.height);
      cameraStep.hidden = false;
      certificateStep.hidden = true;
      detailsForm.hidden = true;
      if (dialog.open) close();
    }

    captureButton.addEventListener("click", capturePhoto);
    startButton.addEventListener("click", requestCamera);
    retakeButton.addEventListener("click", resetCapture);
    fileInput.addEventListener("change", () => loadPhotoFile(fileInput.files[0]));
    detailsForm.addEventListener("submit", submitCertificate);
    ratingInput.addEventListener("input", updateRatingOutput);
    printButton.addEventListener("click", printCertificate);
    downloadButton.addEventListener("click", downloadCertificate);
    shareButton.addEventListener("click", shareCertificate);
    backButton.addEventListener("click", resetCapture);
    elements.certificate.addEventListener("click", () => open(true));
    closeButton.addEventListener("click", close);

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener("close", () => {
      stopCamera();
      document.body.classList.remove("has-open-dialog");
    });
    window.addEventListener("pagehide", () => {
      stopCamera();
      releaseCertificateOutput();
    });

    preloadCertificateAssets().catch((error) => {
      console.warn("Os assets do certificado serão carregados novamente na geração.", error);
    });

    return { open, reset };
  }

  function initializeCircuitMap() {
    const map = document.querySelector("#circuit-map");
    const svg = map?.querySelector(".circuit-blueprint");
    const path = map?.querySelector("#main-circuit-path");
    const marker = map?.querySelector("#circuit-marker");
    const progressOutput = map?.querySelector("#circuit-progress");
    const segmentOutput = map?.querySelector("#circuit-segment");
    const statusOutput = map?.querySelector("#circuit-status");
    const layerButtons = [
      ...document.querySelectorAll(".map-layer-button[data-map-layer]"),
    ];

    if (!map || !svg || !path || !marker || !progressOutput || !segmentOutput) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const pathLength = path.getTotalLength();
    const sampleCount = 220;
    const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
      const progress = index / sampleCount;
      const point = path.getPointAtLength(progress * pathLength);
      return { progress, x: point.x, y: point.y };
    });

    let currentProgress = 0.025;
    let autoProgress = currentProgress;
    let isExploring = false;
    let isPointerDown = false;
    let pointerFrame = 0;
    let animationFrame = 0;
    let lastAnimationTime = performance.now();
    let lastSpokenBucket = -1;
    let isMapVisible = true;
    let visibilityObserver;

    const segments = [
      { end: 0.17, label: "Reta principal" },
      { end: 0.39, label: "Miolo da pista" },
      { end: 0.56, label: "Alça norte" },
      { end: 0.77, label: "Alça leste" },
      { end: 0.9, label: "Retorno central" },
      { end: 1, label: "Chegada · Portão 6" },
    ];

    function getSegment(progress) {
      return (
        segments.find((segment) => progress <= segment.end) ??
        segments[segments.length - 1]
      ).label;
    }

    function positionMarker(progress, announce = false) {
      const normalizedProgress = ((progress % 1) + 1) % 1;
      const distance = normalizedProgress * pathLength;
      const point = path.getPointAtLength(distance);
      const nextPoint = path.getPointAtLength(
        Math.min(pathLength, distance + 3),
      );
      const angle =
        Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) *
        (180 / Math.PI);
      const percentage = Math.round(normalizedProgress * 100);
      const segment = getSegment(normalizedProgress);

      marker.setAttribute(
        "transform",
        `translate(${point.x} ${point.y}) rotate(${angle})`,
      );
      progressOutput.textContent = `${String(percentage).padStart(2, "0")}%`;
      segmentOutput.textContent = segment;
      currentProgress = normalizedProgress;

      const spokenBucket = Math.round(percentage / 10);
      if (
        announce &&
        statusOutput &&
        spokenBucket !== lastSpokenBucket
      ) {
        statusOutput.textContent = `${percentage}% da volta. ${segment}.`;
        lastSpokenBucket = spokenBucket;
      }
    }

    function setLayer(layer, announce = false) {
      map.dataset.layer = layer;
      layerButtons.forEach((button) => {
        const isActive = button.dataset.mapLayer === layer;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });

      if (announce && statusOutput) {
        const activeButton = layerButtons.find(
          (button) => button.dataset.mapLayer === layer,
        );
        statusOutput.textContent = `Camada ${activeButton?.textContent.trim() ?? layer} ativada.`;
      }
    }

    function clientPointToSvg(clientX, clientY) {
      const screenMatrix = svg.getScreenCTM();
      if (screenMatrix) {
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = clientX;
        svgPoint.y = clientY;
        return svgPoint.matrixTransform(screenMatrix.inverse());
      }

      const bounds = svg.getBoundingClientRect();
      return {
        x: ((clientX - bounds.left) / bounds.width) * 1000,
        y: ((clientY - bounds.top) / bounds.height) * 680,
      };
    }

    function findNearestProgress(point) {
      let nearest = samples[0];
      let nearestDistance = Number.POSITIVE_INFINITY;

      samples.forEach((sample) => {
        const distance =
          (sample.x - point.x) ** 2 + (sample.y - point.y) ** 2;
        if (distance < nearestDistance) {
          nearest = sample;
          nearestDistance = distance;
        }
      });

      const refinementSpan = 1 / sampleCount;
      let bestProgress = nearest.progress;
      for (let index = -8; index <= 8; index += 1) {
        const candidateProgress = Math.max(
          0,
          Math.min(1, nearest.progress + (index / 8) * refinementSpan),
        );
        const candidate = path.getPointAtLength(
          candidateProgress * pathLength,
        );
        const distance =
          (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          bestProgress = candidateProgress;
        }
      }

      return bestProgress;
    }

    function exploreAt(clientX, clientY) {
      const bounds = map.getBoundingClientRect();
      const relativeX = Math.max(
        0,
        Math.min(1, (clientX - bounds.left) / bounds.width),
      );
      const relativeY = Math.max(
        0,
        Math.min(1, (clientY - bounds.top) / bounds.height),
      );

      map.style.setProperty("--map-x", `${relativeX * 100}%`);
      map.style.setProperty("--map-y", `${relativeY * 100}%`);
      map.style.setProperty("--tilt-y", `${(relativeX - 0.5) * 2.4}deg`);
      map.style.setProperty("--tilt-x", `${(0.5 - relativeY) * 2.1}deg`);
      positionMarker(
        findNearestProgress(clientPointToSvg(clientX, clientY)),
      );
      autoProgress = currentProgress;
    }

    function queuePointerUpdate(event) {
      const { clientX, clientY } = event;
      if (pointerFrame) return;

      pointerFrame = window.requestAnimationFrame(() => {
        exploreAt(clientX, clientY);
        pointerFrame = 0;
      });
    }

    function beginExploring() {
      isExploring = true;
      map.classList.add("is-exploring");
    }

    function finishExploring() {
      if (isPointerDown) return;
      isExploring = false;
      autoProgress = currentProgress;
      map.classList.remove("is-exploring");
      map.style.setProperty("--tilt-x", "0deg");
      map.style.setProperty("--tilt-y", "0deg");
    }

    function animate(timestamp) {
      animationFrame = 0;
      if (!isMapVisible) return;

      const elapsed = Math.min(timestamp - lastAnimationTime, 64);
      lastAnimationTime = timestamp;

      if (!isExploring && !reducedMotion.matches) {
        autoProgress = (autoProgress + elapsed * 0.000034) % 1;
        positionMarker(autoProgress);
      }

      animationFrame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (animationFrame || !isMapVisible) return;
      lastAnimationTime = performance.now();
      animationFrame = window.requestAnimationFrame(animate);
    }

    map.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") {
        beginExploring();
        queuePointerUpdate(event);
      }
    });

    map.addEventListener("pointermove", (event) => {
      if (event.pointerType === "mouse" || isPointerDown) {
        beginExploring();
        queuePointerUpdate(event);
      }
    });

    map.addEventListener("pointerleave", finishExploring);

    map.addEventListener("pointerdown", (event) => {
      isPointerDown = true;
      beginExploring();
      map.setPointerCapture(event.pointerId);
      queuePointerUpdate(event);
    });

    map.addEventListener("pointerup", (event) => {
      isPointerDown = false;
      if (map.hasPointerCapture(event.pointerId)) {
        map.releasePointerCapture(event.pointerId);
      }
      finishExploring();
    });

    map.addEventListener("pointercancel", () => {
      isPointerDown = false;
      finishExploring();
    });

    map.addEventListener("keydown", (event) => {
      const keySteps = {
        ArrowRight: 0.012,
        ArrowDown: 0.012,
        ArrowLeft: -0.012,
        ArrowUp: -0.012,
        PageDown: 0.08,
        PageUp: -0.08,
      };

      if (event.key in keySteps) {
        event.preventDefault();
        positionMarker(currentProgress + keySteps[event.key], true);
        autoProgress = currentProgress;
        return;
      }

      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        positionMarker(event.key === "Home" ? 0 : 0.995, true);
        autoProgress = currentProgress;
      }
    });

    layerButtons.forEach((button) => {
      const selectLayer = (announce) =>
        setLayer(button.dataset.mapLayer, announce);

      button.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse") selectLayer(false);
      });
      button.addEventListener("focus", () => selectLayer(false));
      button.addEventListener("click", () => selectLayer(true));
    });

    document.addEventListener("visibilitychange", () => {
      lastAnimationTime = performance.now();
    });

    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(pointerFrame);
      visibilityObserver?.disconnect();
    });

    positionMarker(currentProgress);

    if ("IntersectionObserver" in window) {
      isMapVisible = false;
      visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          isMapVisible = entry.isIntersecting;
          if (isMapVisible) {
            startAnimation();
          } else {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
          }
        },
        { rootMargin: "120px 0px", threshold: 0.01 },
      );
      visibilityObserver.observe(map);
    } else {
      startAnimation();
    }
  }

  document.querySelectorAll("img[data-image-fallback]").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest("figure")?.classList.add("is-unavailable");
    });
  });

  initializeCertificateExperience();
  initializeCircuitMap();
})();
