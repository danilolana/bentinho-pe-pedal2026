/**
 * Questionário Pé Pedal Bentinho
 * Sem dependências externas. As respostas ficam apenas no localStorage.
 */
(() => {
  "use strict";

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

    const certificateCanvas = document.createElement("canvas");
    certificateCanvas.width = 1600;
    certificateCanvas.height = 1131;

    let cameraStream = null;
    let photoDataUrl = "";
    let certificateDataUrl = "";
    let certificateFileName = "certificado-pe-pedal-bentinho-2026.png";
    let cameraRequestId = 0;

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

    function drawCoverImage(context, source, mirror = false) {
      const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
      const sourceHeight =
        source.videoHeight || source.naturalHeight || source.height;
      const targetWidth = photoCanvas.width;
      const targetHeight = photoCanvas.height;
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
      context.clearRect(0, 0, targetWidth, targetHeight);
      if (mirror) {
        context.translate(targetWidth, 0);
        context.scale(-1, 1);
      }
      context.drawImage(
        source,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );
      context.restore();
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
      drawCoverImage(context, video, true);
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
        drawCoverImage(context, image, false);
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
      certificateDataUrl = "";
      photoCanvas
        .getContext("2d")
        .clearRect(0, 0, photoCanvas.width, photoCanvas.height);
      certificateCanvas
        .getContext("2d")
        .clearRect(0, 0, certificateCanvas.width, certificateCanvas.height);
      preview.removeAttribute("src");
      preview.hidden = true;
      detailsForm.reset();
      detailsForm.hidden = true;
      certificateError.hidden = true;
      certificateImage.removeAttribute("src");
      cameraStep.hidden = false;
      certificateStep.hidden = true;
      requestCamera();
    }

    function roundedRectPath(context, x, y, width, height, radius) {
      const corner = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.moveTo(x + corner, y);
      context.lineTo(x + width - corner, y);
      context.quadraticCurveTo(x + width, y, x + width, y + corner);
      context.lineTo(x + width, y + height - corner);
      context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - corner,
        y + height,
      );
      context.lineTo(x + corner, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - corner);
      context.lineTo(x, y + corner);
      context.quadraticCurveTo(x, y, x + corner, y);
      context.closePath();
    }

    function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
      const words = text.split(/\s+/);
      const lines = [];
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (context.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);

      lines.forEach((line, index) => {
        context.fillText(line, x, y + index * lineHeight);
      });
      return y + lines.length * lineHeight;
    }

    function fitNameFont(context, name, maxWidth) {
      let fontSize = 64;
      do {
        context.font = `600 ${fontSize}px Manrope, Arial, sans-serif`;
        fontSize -= 2;
      } while (context.measureText(name).width > maxWidth && fontSize > 38);
    }

    async function drawCertificate(name) {
      await document.fonts?.ready;
      const context = certificateCanvas.getContext("2d", { alpha: false });
      const width = certificateCanvas.width;
      const height = certificateCanvas.height;
      const date = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date());

      context.fillStyle = "#f2ebdd";
      context.fillRect(0, 0, width, height);

      context.fillStyle = "#203e29";
      context.fillRect(0, 0, 270, height);

      context.strokeStyle = "rgba(168, 201, 154, 0.16)";
      context.lineWidth = 1;
      for (let y = 0; y <= height; y += 56) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      for (let x = 0; x <= width; x += 56) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      context.save();
      context.strokeStyle = "#b5543c";
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 34;
      context.beginPath();
      context.moveTo(62, 955);
      context.bezierCurveTo(154, 890, 83, 779, 167, 720);
      context.bezierCurveTo(251, 660, 127, 564, 190, 485);
      context.bezierCurveTo(248, 414, 128, 321, 198, 235);
      context.bezierCurveTo(226, 199, 211, 151, 174, 125);
      context.stroke();
      context.strokeStyle = "#f2ebdd";
      context.lineWidth = 3;
      context.setLineDash([5, 13]);
      context.stroke();
      context.restore();

      context.strokeStyle = "#315c3b";
      context.lineWidth = 4;
      context.strokeRect(22, 22, width - 44, height - 44);
      context.strokeStyle = "rgba(181, 84, 60, 0.55)";
      context.lineWidth = 2;
      context.strokeRect(38, 38, width - 76, height - 76);

      context.fillStyle = "#f2ebdd";
      context.font = "700 24px Manrope, Arial, sans-serif";
      context.textAlign = "center";
      context.fillText("PÉ PEDAL", 135, 77);
      context.font = "600 13px Inter, Arial, sans-serif";
      context.letterSpacing = "3px";
      context.fillText("BENTINHO 2026", 135, 105);
      context.letterSpacing = "0px";

      context.save();
      context.translate(76, 1010);
      context.rotate(-Math.PI / 2);
      context.textAlign = "left";
      context.fillStyle = "rgba(242, 235, 221, 0.58)";
      context.font = "700 13px Inter, Arial, sans-serif";
      context.fillText("KARTÓDROMO DO TAQUARAL · CAMPINAS", 0, 0);
      context.restore();

      context.textAlign = "left";
      context.fillStyle = "#b5543c";
      context.font = "700 15px Inter, Arial, sans-serif";
      context.letterSpacing = "2px";
      context.fillText("CERTIFICADO DE PARTICIPAÇÃO", 350, 135);
      context.letterSpacing = "0px";

      context.fillStyle = "#203e29";
      context.font = "500 94px Manrope, Arial, sans-serif";
      const certificateTitleLead = "Uma volta";
      context.fillText(certificateTitleLead, 348, 240);
      const certificateTitleOffset =
        context.measureText(certificateTitleLead).width + 24;
      context.font = "italic 500 86px Lora, Georgia, serif";
      context.fillStyle = "#b5543c";
      context.fillText("que fica.", 348 + certificateTitleOffset, 240);

      context.fillStyle = "#59645d";
      context.font = "500 22px Inter, Arial, sans-serif";
      context.fillText("Certificamos que", 350, 350);

      context.fillStyle = "#203e29";
      fitNameFont(context, name, 690);
      const nameBottom = wrapCanvasText(context, name, 348, 425, 690, 70);

      context.fillStyle = "#59645d";
      context.font = "400 24px Inter, Arial, sans-serif";
      const bodyBottom = wrapCanvasText(
        context,
        "participou da escuta pública Pé Pedal Bentinho 2026 e deixou seu olhar no percurso do Espaço Afrânio Ferreira Júnior.",
        350,
        nameBottom + 42,
        680,
        37,
      );

      context.fillStyle = "#315c3b";
      context.font = "700 14px Inter, Arial, sans-serif";
      context.letterSpacing = "2px";
      context.fillText("REGISTRO DE CHEGADA", 1130, 184);
      context.letterSpacing = "0px";

      roundedRectPath(context, 1125, 220, 330, 440, 54);
      context.save();
      context.clip();
      context.drawImage(photoCanvas, 1125, 220, 330, 440);
      context.restore();
      context.strokeStyle = "#b5543c";
      context.lineWidth = 5;
      roundedRectPath(context, 1125, 220, 330, 440, 54);
      context.stroke();

      context.fillStyle = "#203e29";
      context.font = "700 18px Manrope, Arial, sans-serif";
      context.fillText("PÉ PEDAL BENTINHO", 1125, 705);
      context.fillStyle = "#59645d";
      context.font = "400 16px Inter, Arial, sans-serif";
      context.fillText("Campinas · 2026", 1125, 733);

      const metadataY = Math.max(bodyBottom + 95, 790);
      context.strokeStyle = "rgba(49, 92, 59, 0.35)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(350, metadataY);
      context.lineTo(700, metadataY);
      context.moveTo(760, metadataY);
      context.lineTo(1030, metadataY);
      context.stroke();

      context.fillStyle = "#203e29";
      context.font = "700 14px Inter, Arial, sans-serif";
      context.fillText("PÉ PEDAL BENTINHO 2026", 350, metadataY + 30);
      context.fillText(date.toUpperCase(), 760, metadataY + 30);
      context.fillStyle = "#59645d";
      context.font = "400 13px Inter, Arial, sans-serif";
      context.fillText("Participação registrada", 350, metadataY + 52);
      context.fillText("Campinas, SP", 760, metadataY + 52);

      context.fillStyle = "#315c3b";
      context.fillRect(270, 1008, width - 270, 123);
      context.fillStyle = "#f2ebdd";
      context.font = "600 16px Inter, Arial, sans-serif";
      context.fillText(
        "HISTÓRIAS QUE DÃO A VOLTA · KARTÓDROMO DO TAQUARAL",
        350,
        1078,
      );
      context.textAlign = "right";
      context.fillStyle = "rgba(242, 235, 221, 0.68)";
      context.font = "500 14px Inter, Arial, sans-serif";
      context.fillText("Foto processada somente neste aparelho", 1510, 1078);

      certificateDataUrl = certificateCanvas.toDataURL("image/png");
      certificateImage.src = certificateDataUrl;
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
      if (!certificateDataUrl) return;
      const link = document.createElement("a");
      link.href = certificateDataUrl;
      link.download = certificateFileName;
      link.click();
      showToast("Certificado baixado em PNG.");
    }

    function printCertificate() {
      if (!certificateDataUrl) return;
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
        "@page{size:A4 landscape;margin:0}html,body{margin:0;width:100%;height:100%;display:grid;place-items:center;background:#fff}img{width:100%;height:100%;object-fit:contain}";
      const image = frameDocument.createElement("img");
      image.alt = "Certificado Pé Pedal Bentinho 2026";
      image.src = certificateDataUrl;
      frameDocument.head.append(style);
      frameDocument.body.append(image);
      image.addEventListener("load", () => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        window.setTimeout(() => printFrame.remove(), 60000);
      });
    }

    async function shareCertificate() {
      if (!certificateDataUrl) return;

      try {
        const blob = await canvasToBlob();
        const file = new File([blob], certificateFileName, {
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

      certificateError.hidden = true;
      const submitButton = detailsForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Gerando certificado…";

      try {
        await drawCertificate(name);
        cameraStep.hidden = true;
        certificateStep.hidden = false;
        certificateStep.scrollIntoView({ block: "start" });
        certificateStep.querySelector("h2")?.focus?.();
      } catch (error) {
        console.error("Não foi possível gerar o certificado.", error);
        certificateError.textContent =
          "Não foi possível gerar o certificado neste aparelho. Tente novamente.";
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

      if (certificateDataUrl) {
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
      certificateDataUrl = "";
      certificateFileName = "certificado-pe-pedal-bentinho-2026.png";
      detailsForm.reset();
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
    window.addEventListener("pagehide", stopCamera);

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

  certificateExperience = initializeCertificateExperience();
  initializeCircuitMap();
  renderQuestion();
})();
