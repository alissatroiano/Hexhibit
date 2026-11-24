// Multiple choice: pick one option. validate and evaluate are DOM-free;
// document is used only inside render. All text is written with textContent.

export const type = "choice";

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export function validate(puzzle, path) {
  const errors = [];
  const options = puzzle && puzzle.options;
  let optionsOk = false;
  if (!Array.isArray(options) || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    errors.push(`${path}.options must be an array of ${MIN_OPTIONS} to ${MAX_OPTIONS} strings`);
  } else {
    optionsOk = true;
    options.forEach((o, i) => {
      if (typeof o !== "string" || o.trim() === "") {
        optionsOk = false;
        errors.push(`${path}.options[${i}] must be a non-empty string`);
      }
    });
  }
  const idx = puzzle && puzzle.correctIndex;
  if (!Number.isInteger(idx)) {
    errors.push(`${path}.correctIndex must be an integer`);
  } else if (Array.isArray(options) && (idx < 0 || idx >= options.length)) {
    errors.push(`${path}.correctIndex must be between 0 and ${options.length - 1}`);
  }
  return errors;
}

export function evaluate(puzzle, answer) {
  return Number.isInteger(answer) && answer === (puzzle && puzzle.correctIndex)
    ? "correct"
    : "incorrect";
}

export function render(root, puzzle, ctx) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "choice";
  const legend = document.createElement("legend");
  legend.className = "prompt";
  legend.textContent = puzzle.prompt;
  fieldset.append(legend);

  const name = `${ctx.idPrefix}-choice`;
  const inputs = puzzle.options.map((text, i) => {
    const label = document.createElement("label");
    label.className = "opt";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = String(i);
    const span = document.createElement("span");
    span.textContent = text;
    label.append(input, span);
    fieldset.append(label);
    return input;
  });

  root.append(fieldset);
  return {
    getAnswer() {
      const i = inputs.findIndex((el) => el.checked);
      return i === -1 ? null : i;
    },
    focus() {
      const target = inputs.find((el) => el.checked) || inputs[0];
      if (target) target.focus();
    },
  };
}
