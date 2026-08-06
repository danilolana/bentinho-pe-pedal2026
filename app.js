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

  initializeCircuitMap();
  renderQuestion();
})();
