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
      title: "O que trouxe você ao Taquaral hoje?",
      help: "Escolha a atividade que melhor representa sua visita.",
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
      title: "Como seu corpo costuma sair do parque?",
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
      kicker: "Um parque melhor",
      title: "O que mais ajudaria você a se movimentar por aqui?",
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
      title: "Que ideia faria mais pessoas aproveitarem o parque?",
      help: `Escreva entre ${MIN_TEXT_LENGTH} e ${MAX_TEXT_LENGTH} caracteres. Não inclua dados pessoais.`,
      type: "textarea",
      placeholder: "Ex.: criar pontos de descanso perto das pistas...",
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

  renderQuestion();
})();
