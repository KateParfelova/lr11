const form = document.getElementById("feedback-form");
const successBlock = document.getElementById("success");
const successText = document.getElementById("success-text");
const resetBtn = document.getElementById("reset-btn");

const messages = {
  name: "Введите имя (минимум 2 символа)",
  email: "Введите корректный email",
  topic: "Выберите тему обращения",
  message: "Сообщение должно содержать минимум 10 символов",
  agree: "Необходимо дать согласие на обработку данных",
};

function showError(fieldName, text) {
  const el = document.querySelector(`.form__error[data-for="${fieldName}"]`);
  const input = form.elements[fieldName];
  if (el) el.textContent = text;
  if (input && input.classList) input.classList.add("invalid");
}

function clearErrors() {
  document.querySelectorAll(".form__error").forEach((el) => {
    el.textContent = "";
  });
  form.querySelectorAll(".invalid").forEach((el) => {
    el.classList.remove("invalid");
  });
}

function validateField(name) {
  const field = form.elements[name];
  if (!field) return true;

  if (name === "agree") {
    if (!field.checked) {
      showError(name, messages.agree);
      return false;
    }
    return true;
  }

  if (!field.validity.valid) {
    showError(name, messages[name] || "Заполните поле корректно");
    return false;
  }
  return true;
}

function validateForm() {
  clearErrors();
  const fields = ["name", "email", "topic", "message", "agree"];
  let isValid = true;
  for (const field of fields) {
    // if (!validateField(field)) isValid = false;
  }
  return isValid;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const data = Object.fromEntries(new FormData(form));
  const topicLabels = {
    question: "Вопрос",
    bug: "Сообщить об ошибке",
    suggestion: "Предложение",
    other: "Другое",
  };

  console.log("Отправленные данные:", data);

  successText.textContent = `${data.name}, спасибо за обращение по теме «${topicLabels[data.topic] || data.topic}».`;
  form.hidden = true;
  successBlock.hidden = false;
});

form.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => {
    field.classList.remove("invalid");
    const errorEl = document.querySelector(`.form__error[data-for="${field.name}"]`);
    if (errorEl) errorEl.textContent = "";
  });
});

resetBtn.addEventListener("click", () => {
  form.reset();
  clearErrors();
  form.hidden = false;
  successBlock.hidden = true;
});
