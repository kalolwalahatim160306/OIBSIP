const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const themeToggleBtn = document.getElementById("themeToggle");
const buttonsContainer = document.querySelector(".buttons");

const OPERATOR_SYMBOLS = {
  "/": "÷",
  "*": "*",
  "-": "-",
  "+": "+",
};

let currentValue = "0";
let previousValue = "";
let operator = null;
let shouldResetDisplay = false;
let hasError = false;

function updateDisplay(expression = null) {
  resultEl.textContent = currentValue;
  expressionEl.textContent = expression !== null ? expression : "";
}

function showError(message) {
  hasError = true;
  resultEl.textContent = message;
  resultEl.classList.add("error");
  expressionEl.textContent = "";
}

function clearError() {
  hasError = false;
  resultEl.classList.remove("error");
}

function isValidNumber(value) {
  if (value === "" || value === "-" || value === ".") return false;
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num);
}

function truncateDisplay(value) {
  if (value.length <= 12) return value;
  const num = parseFloat(value);
  if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-6 && num !== 0)) {
    return num.toExponential(6);
  }
  return num.toPrecision(12).replace(/\.?0+$/, "");
}

function calculate(a, b, op) {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  if (!isValidNumber(a) || !isValidNumber(b)) {
    return null;
  }

  switch (op) {
    case "+":
      return numA + numB;
    case "-":
      return numA - numB;
    case "*":
      return numA * numB;
    case "/":
      if (numB === 0) return null;
      return numA / numB;
    default:
      return null;
  }
}

function formatResult(result) {
  if (result === null || !isFinite(result)) return null;
  const rounded = Math.round(result * 1e10) / 1e10;
  return truncateDisplay(String(rounded));
}

function inputNumber(value) {
  if (hasError) {
    clearAll();
  }

  if (shouldResetDisplay) {
    currentValue = value;
    shouldResetDisplay = false;
    updateDisplay();
    return;
  }

  if (currentValue === "0") {
    currentValue = value;
  } else {
    currentValue += value;
  }

  updateDisplay();
}

function inputDecimal() {
  if (hasError) {
    clearAll();
  }

  if (shouldResetDisplay) {
    currentValue = "0.";
    shouldResetDisplay = false;
    updateDisplay();
    return;
  }

  if (!currentValue.includes(".")) {
    currentValue += ".";
  }

  updateDisplay();
}

function applyPercent() {
  if (hasError) return;

  if (!isValidNumber(currentValue)) {
    showError("Invalid input");
    return;
  }

  const num = parseFloat(currentValue);
  let result;

  if (operator && previousValue !== "") {
    const base = parseFloat(previousValue);
    result = (base * num) / 100;
  } else {
    result = num / 100;
  }

  currentValue = formatResult(result) || "0";
  updateDisplay();
}

function setOperator(op) {
  if (hasError) return;

  if (operator && !shouldResetDisplay) {
    const result = calculate(previousValue, currentValue, operator);
    const formatted = formatResult(result);

    if (formatted === null) {
      showError("Cannot divide by zero");
      return;
    }

    currentValue = formatted;
    previousValue = formatted;
  } else {
    previousValue = currentValue;
  }

  operator = op;
  shouldResetDisplay = true;
  updateDisplay(buildExpression());
}

function buildExpression() {
  if (!operator) return "";
  const symbol = OPERATOR_SYMBOLS[operator] || operator;
  return `${previousValue} ${symbol}`;
}

function evaluate() {
  if (hasError || !operator) return;

  const result = calculate(previousValue, currentValue, operator);
  const formatted = formatResult(result);

  if (formatted === null) {
    showError("Cannot divide by zero");
    operator = null;
    previousValue = "";
    return;
  }

  expressionEl.textContent = `${previousValue} ${OPERATOR_SYMBOLS[operator]} ${currentValue} =`;
  currentValue = formatted;
  operator = null;
  previousValue = "";
  shouldResetDisplay = true;
  updateDisplay();
}

function clearAll() {
  currentValue = "0";
  previousValue = "";
  operator = null;
  shouldResetDisplay = false;
  clearError();
  updateDisplay();
}

function deleteLast() {
  if (hasError) {
    clearAll();
    return;
  }

  if (shouldResetDisplay) return;

  if (currentValue.length > 1) {
    currentValue = currentValue.slice(0, -1);
  } else {
    currentValue = "0";
  }

  updateDisplay();
}

function handleButtonClick(event) {
  const btn = event.target.closest(".btn");
  if (!btn) return;

  const action = btn.dataset.action;
  const value = btn.dataset.value;

  switch (action) {
    case "number":
      inputNumber(value);
      break;
    case "decimal":
      inputDecimal();
      break;
    case "operator":
      setOperator(value);
      break;
    case "percent":
      applyPercent();
      break;
    case "equals":
      evaluate();
      break;
    case "clear":
      clearAll();
      break;
    case "delete":
      deleteLast();
      break;
    default:
      break;
  }
}

function handleKeyboard(event) {
  const key = event.key;

  if (/^[0-9]$/.test(key)) {
    event.preventDefault();
    inputNumber(key);
    return;
  }

  if (key === "." || key === ",") {
    event.preventDefault();
    inputDecimal();
    return;
  }

  const operatorMap = {
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
  };

  if (operatorMap[key]) {
    event.preventDefault();
    setOperator(operatorMap[key]);
    return;
  }

  if (key === "Enter" || key === "=") {
    event.preventDefault();
    evaluate();
    return;
  }

  if (key === "%") {
    event.preventDefault();
    applyPercent();
    return;
  }

  if (key === "Escape" || key.toLowerCase() === "c") {
    event.preventDefault();
    clearAll();
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    deleteLast();
    return;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("calculatorTheme", theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.dataset.theme || "light";
  applyTheme(currentTheme === "light" ? "dark" : "light");
}

function loadTheme() {
  const saved = localStorage.getItem("calculatorTheme");
  applyTheme(saved === "dark" ? "dark" : "light");
}

buttonsContainer.addEventListener("click", handleButtonClick);
document.addEventListener("keydown", handleKeyboard);
themeToggleBtn.addEventListener("click", toggleTheme);

loadTheme();
updateDisplay();
